'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
} from 'agora-rtc-sdk-ng';

export interface AgoraVoiceState {
  isJoined: boolean;
  isConnecting: boolean;
  isMuted: boolean;
  activeSpeakers: Set<number | string>;
  remoteUsers: IAgoraRTCRemoteUser[];
  error: string | null;
  joinVoice: () => Promise<void>;
  leaveVoice: () => Promise<void>;
  toggleMute: () => void;
}

export function useAgoraVoice(incidentId: string): AgoraVoiceState {
  const [isJoined, setIsJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeSpeakers, setActiveSpeakers] = useState<Set<number | string>>(new Set());
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);

  const joinVoice = useCallback(async () => {
    if (isJoined || isConnecting) return;
    setIsConnecting(true);
    setError(null);

    try {
      // Dynamic import to prevent SSR issues with window/navigator
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
      AgoraRTC.setLogLevel(2); // Warning level

      // 1. Fetch token from backend
      const res = await fetch(`/api/v1/incidents/${incidentId}/agora-token`);
      if (!res.ok) {
        throw new Error('Failed to get voice credentials from server');
      }
      const { data } = await res.json();
      const { appId, channel, token, uid } = data;

      // 2. Initialize RTC client
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      // Remote user management
      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === 'audio' && user.audioTrack) {
          user.audioTrack.play();
        }
        setRemoteUsers(Array.from(client.remoteUsers));
      });

      client.on('user-unpublished', () => {
        setRemoteUsers(Array.from(client.remoteUsers));
      });

      client.on('user-left', () => {
        setRemoteUsers(Array.from(client.remoteUsers));
      });

      // Volume indicator for live speech detection
      client.enableAudioVolumeIndicator();
      client.on('volume-indicator', (volumes) => {
        const speaking = new Set<number | string>();
        volumes.forEach((v) => {
          if (v.level > 15) {
            speaking.add(v.uid);
          }
        });
        setActiveSpeakers(speaking);
      });

      // 3. Join channel
      await client.join(appId, channel, token, uid);

      // 4. Create and publish microphone track
      const localTrack = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: 'speech_standard',
        AEC: true,
        ANS: true,
      });
      localAudioTrackRef.current = localTrack;

      await client.publish([localTrack]);

      setIsJoined(true);
      setIsMuted(false);
      console.log('🎙️ Successfully joined Agora Voice Call:', channel, 'as UID:', uid);
    } catch (err: any) {
      console.error('Failed to join Agora voice bridge:', err);
      setError(err.message || 'Could not connect to microphone or voice channel');
    } finally {
      setIsConnecting(false);
    }
  }, [incidentId, isJoined, isConnecting]);

  const leaveVoice = useCallback(async () => {
    try {
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }
      if (clientRef.current) {
        await clientRef.current.leave();
        clientRef.current = null;
      }
      setIsJoined(false);
      setIsMuted(false);
      setRemoteUsers([]);
      setActiveSpeakers(new Set());
      console.log('🔇 Left Agora Voice Call');
    } catch (err: any) {
      console.error('Error leaving voice call:', err);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (localAudioTrackRef.current) {
      const nextMuted = !isMuted;
      localAudioTrackRef.current.setMuted(nextMuted);
      setIsMuted(nextMuted);
    }
  }, [isMuted]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
      }
      if (clientRef.current) {
        clientRef.current.leave();
      }
    };
  }, []);

  return {
    isJoined,
    isConnecting,
    isMuted,
    activeSpeakers,
    remoteUsers,
    error,
    joinVoice,
    leaveVoice,
    toggleMute,
  };
}
