import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import { config } from '../config';

/**
 * Generate a short-lived Agora RTC token for the VAIC bot.
 * The bot uses a fixed UID (1000) across all channels.
 *
 * @param channelName - The Agora channel name (== incidentId in VAIC)
 * @returns A signed RTC token valid for tokenExpirySecs
 */
export function generateBotToken(channelName: string): string {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpireTs = currentTimestamp + config.tokenExpirySecs;

  return RtcTokenBuilder.buildTokenWithUid(
    config.appId,
    config.appCertificate,
    channelName,
    config.botUid,
    RtcRole.PUBLISHER, // Bot publishes TTS audio; subscribes to all participant streams
    privilegeExpireTs
  );
}

/**
 * Generate a user token for a participant joining from the web SDK.
 * Called by the REST API when a user joins an incident channel.
 */
export function generateUserToken(channelName: string, uid: number): string {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpireTs = currentTimestamp + config.tokenExpirySecs;

  return RtcTokenBuilder.buildTokenWithUid(
    config.appId,
    config.appCertificate,
    channelName,
    uid,
    RtcRole.PUBLISHER,
    privilegeExpireTs
  );
}
