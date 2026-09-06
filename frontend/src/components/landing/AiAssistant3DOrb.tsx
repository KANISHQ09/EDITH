'use client';

import { useState, useRef, useCallback } from 'react';

interface AiAssistant3DOrbProps {
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
  size?: number;
  interactive?: boolean;
}

const EDITH_INTRO_SCRIPT =
  "Hello. I am EDITH — Even In Downtime, I'll Triage Hazards. Tactical networks online, global telemetry synchronized. Monitoring all microservice clusters. Standing by for incident command directive.";

export function AiAssistant3DOrb({
  onSpeakStart,
  onSpeakEnd,
  size = 360,
  interactive = true,
}: AiAssistant3DOrbProps) {
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Helper to pick natural authoritative voice
  const selectMaleVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const preferredNames = [
      'Google UK English Male',
      'Microsoft George Online (Natural)',
      'Microsoft George',
      'Microsoft David',
      'Google हिन्दी',
      'Microsoft Swara',
      'Daniel',
      'Arthur',
      'Male',
    ];

    for (const name of preferredNames) {
      const match = voices.find((v) => v.name.toLowerCase().includes(name.toLowerCase()));
      if (match) return match;
    }

    return voices.find((v) => v.lang.startsWith('en')) || voices[0];
  }, []);

  // Speak function
  const speakEdithLine = useCallback(
    (text = EDITH_INTRO_SCRIPT) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);

      const voice = selectMaleVoice();
      if (voice) {
        utterance.voice = voice;
      }

      utterance.pitch = 0.94;
      utterance.rate = 1.02;

      utterance.onstart = () => {
        setIsPlayingVoice(true);
        onSpeakStart?.();
      };

      utterance.onend = () => {
        setIsPlayingVoice(false);
        onSpeakEnd?.();
      };

      utterance.onerror = () => {
        setIsPlayingVoice(false);
        onSpeakEnd?.();
      };

      window.speechSynthesis.speak(utterance);
    },
    [selectMaleVoice, onSpeakStart, onSpeakEnd]
  );

  const handlePlayVoice = useCallback(() => {
    if (isPlayingVoice) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingVoice(false);
      onSpeakEnd?.();
    } else {
      speakEdithLine();
    }
  }, [isPlayingVoice, speakEdithLine, onSpeakEnd]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={interactive ? handlePlayVoice : undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: interactive ? 'pointer' : 'default',
        userSelect: 'none',
        width: size,
        height: size,
      }}
      title={interactive ? (isPlayingVoice ? 'Click to pause voice' : 'Click to interact with EDITH') : undefined}
    >
      {/* Outer Glow Pulse Ring when voice is active */}
      <div
        style={{
          position: 'absolute',
          inset: -8,
          borderRadius: '50%',
          border: isPlayingVoice ? '2px solid rgba(168, 85, 247, 0.6)' : '1px solid rgba(129, 140, 248, 0.2)',
          boxShadow: isPlayingVoice
            ? '0 0 35px rgba(168, 85, 247, 0.5), inset 0 0 20px rgba(168, 85, 247, 0.3)'
            : '0 0 15px rgba(129, 140, 248, 0.15)',
          animation: isPlayingVoice ? 'pulse 1.2s infinite ease-in-out' : 'none',
          pointerEvents: 'none',
          transition: 'all 0.3s ease',
        }}
      />

      {/* Video element rendering edith.mp4 */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          backgroundColor: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transform: isHovered && interactive ? 'scale(1.03)' : 'scale(1.0)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease',
          boxShadow: isPlayingVoice
            ? '0 0 45px rgba(168, 85, 247, 0.6), inset 0 0 25px rgba(168, 85, 247, 0.4)'
            : '0 0 25px rgba(129, 140, 248, 0.3)',
        }}
      >
        <video
          ref={videoRef}
          src="/edith.mp4"
          autoPlay
          loop
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            pointerEvents: 'none',
            filter: isPlayingVoice ? 'brightness(1.15) contrast(1.05)' : 'none',
            transition: 'filter 0.3s ease',
          }}
        />
      </div>

      {/* Floating status badge when playing voice */}
      {isPlayingVoice && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            background: 'rgba(15, 23, 42, 0.88)',
            border: '1px solid #A855F7',
            boxShadow: '0 0 18px rgba(168, 85, 247, 0.5)',
            backdropFilter: 'blur(8px)',
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: 700,
            padding: '4px 12px',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            zIndex: 10,
            animation: 'pulse 1.5s infinite',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#A855F7' }} />
          <span>EDITH VOICE ACTIVE</span>
        </div>
      )}
    </div>
  );
}
