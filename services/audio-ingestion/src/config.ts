import 'dotenv/config';

// ─── Agora Configuration ──────────────────────────────────────
export const config = {
  // Agora credentials
  appId: process.env.AGORA_APP_ID!,
  appCertificate: process.env.AGORA_APP_CERTIFICATE!,
  customerKey: process.env.AGORA_CUSTOMER_KEY!,
  customerSecret: process.env.AGORA_CUSTOMER_SECRET!,
  botUid: parseInt(process.env.AGORA_BOT_UID || '1000', 10),
  tokenExpirySecs: parseInt(process.env.AGORA_TOKEN_EXPIRY_S || '86400', 10),

  // Agora Cloud Recording
  cloudRecordingBucket: process.env.AGORA_CLOUD_RECORDING_BUCKET || 'vaic-audio-raw',
  awsAccessKey: process.env.AWS_ACCESS_KEY_ID!,
  awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY!,
  awsRegion: process.env.AWS_REGION || 'us-east-1',

  // Audio settings
  sampleRate: parseInt(process.env.AGORA_AUDIO_SAMPLE_RATE || '16000', 10),
  channels: parseInt(process.env.AGORA_AUDIO_CHANNELS || '1', 10),
  chunkDurationMs: 500, // 500ms PCM segments

  // Kafka
  kafkaBrokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  kafkaClientId: 'vaic-audio-ingestion',

  // Service
  port: parseInt(process.env.AIS_PORT || '3005', 10),

  // Feature flags
  mockAudioMode: process.env.MOCK_AUDIO_MODE === 'true',
  enableAudioIngestion: process.env.ENABLE_AUDIO_INGESTION === 'true',
  audioPersist: process.env.AGORA_AUDIO_PERSIST === 'true',

  // Mock audio fixtures directory (used when MOCK_AUDIO_MODE=true)
  mockAudioDir: process.env.MOCK_AUDIO_DIR || './fixtures/audio',
};

export function validateConfig(): void {
  if (!config.mockAudioMode) {
    const required = ['appId', 'appCertificate', 'customerKey', 'customerSecret'] as const;
    for (const key of required) {
      if (!config[key]) {
        throw new Error(`Missing required Agora config: AGORA_${key.toUpperCase()}`);
      }
    }
  }
}
