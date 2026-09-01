import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../lib/logger';
import { config } from '../config';

const AGORA_API_BASE = 'https://api.agora.io/v1';

/**
 * Agora Cloud Recording REST API Client
 *
 * Cloud Recording captures raw audio per participant to S3.
 * This runs ALONGSIDE the real-time streaming pipeline —
 * it's our audit trail / audio backup (when AGORA_AUDIO_PERSIST=true).
 *
 * Flow:
 *  1. acquire()    → get resourceId
 *  2. start()      → begin recording (returns sid)
 *  3. query()      → monitor recording status
 *  4. stop()       → end recording, files uploaded to S3
 */
export class AgoraCloudRecorder {
  private client: AxiosInstance;
  private resourceId: string | null = null;
  private sid: string | null = null;

  constructor() {
    const credentials = Buffer.from(
      `${config.customerKey}:${config.customerSecret}`
    ).toString('base64');

    this.client = axios.create({
      baseURL: AGORA_API_BASE,
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      timeout: 10_000,
    });
  }

  /**
   * Step 1: Acquire a resource ID for recording.
   * Must be called before start(). ResourceId expires in 5 minutes if not used.
   */
  async acquire(channelName: string): Promise<string> {
    const response = await this.client.post(
      `/apps/${config.appId}/cloud_recording/acquire`,
      {
        cname: channelName,
        uid: String(config.botUid),
        clientRequest: {
          scene: 0, // 0 = Communication (audio/video)
          resourceExpiredHour: 24,
        },
      }
    );

    this.resourceId = response.data.resourceId;
    logger.info({
      message: 'Agora Cloud Recording resource acquired',
      resourceId: this.resourceId,
      channelName,
      service: 'ais',
    });

    return this.resourceId!;
  }

  /**
   * Step 2: Start recording.
   * Configures raw audio recording (not mixed — separate file per participant).
   */
  async start(channelName: string, token: string): Promise<string> {
    if (!this.resourceId) throw new Error('Must call acquire() before start()');

    const response = await this.client.post(
      `/apps/${config.appId}/cloud_recording/resourceid/${this.resourceId}/mode/individual/start`,
      {
        cname: channelName,
        uid: String(config.botUid),
        clientRequest: {
          token,
          recordingConfig: {
            maxIdleTime: 120,         // Stop after 2 minutes of silence
            streamTypes: 0,            // Audio only (0 = audio only, 1 = video only, 2 = both)
            channelType: 0,            // 0 = Communication mode
            subscribeAudioUids: ['#allstream#'], // Record ALL participants
            subscribeUidGroup: 0,
          },
          storageConfig: {
            vendor: 1,                 // AWS S3
            region: this._awsRegionCode(),
            bucket: config.cloudRecordingBucket,
            accessKey: config.awsAccessKey,
            secretKey: config.awsSecretKey,
            fileNamePrefix: ['vaic', 'audio', channelName],
          },
        },
      }
    );

    this.sid = response.data.sid;
    logger.info({
      message: 'Agora Cloud Recording started',
      sid: this.sid,
      channelName,
      service: 'ais',
    });

    return this.sid!;
  }

  /**
   * Step 3: Query current recording status.
   * Returns file list uploaded so far.
   */
  async query(): Promise<Record<string, unknown>> {
    if (!this.resourceId || !this.sid) throw new Error('Recording not started');

    const response = await this.client.get(
      `/apps/${config.appId}/cloud_recording/resourceid/${this.resourceId}/sid/${this.sid}/mode/individual/query`
    );

    return response.data;
  }

  /**
   * Step 4: Stop recording and finalize S3 upload.
   */
  async stop(channelName: string): Promise<Record<string, unknown>> {
    if (!this.resourceId || !this.sid) {
      logger.warn({ message: 'Stop called but recording not active', service: 'ais' });
      return {};
    }

    const response = await this.client.post(
      `/apps/${config.appId}/cloud_recording/resourceid/${this.resourceId}/sid/${this.sid}/mode/individual/stop`,
      {
        cname: channelName,
        uid: String(config.botUid),
        clientRequest: {},
      }
    );

    logger.info({
      message: 'Agora Cloud Recording stopped',
      channelName,
      fileList: response.data?.serverResponse?.fileList,
      service: 'ais',
    });

    this.resourceId = null;
    this.sid = null;

    return response.data;
  }

  /**
   * Map AWS region string to Agora region code.
   */
  private _awsRegionCode(): number {
    const regionMap: Record<string, number> = {
      'us-east-1': 0, 'us-east-2': 0, 'us-west-2': 1,
      'eu-west-1': 2, 'ap-southeast-1': 3, 'ap-northeast-1': 4,
    };
    return regionMap[config.awsRegion] ?? 0;
  }
}
