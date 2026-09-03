'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface AiAssistant3DOrbProps {
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
}

const EDITH_INTRO_SCRIPT =
  "Hello. I am EDITH — Even In Downtime, I'll Triage Hazards. Tactical networks online, global telemetry synchronized. Monitoring 14 microservice clusters. Standing by for incident command directive.";

export function AiAssistant3DOrb({ onSpeakStart, onSpeakEnd }: AiAssistant3DOrbProps) {
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);

  // Helper to pick authoritative Marvel E.D.I.T.H. / Jarvis male voice
  const selectMaleVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const preferredMaleNames = [
      'Google UK English Male',
      'Microsoft George Online (Natural) - English (United Kingdom)',
      'Microsoft George - English (United Kingdom)',
      'Microsoft David - English (United States)',
      'Microsoft Mark - English (United States)',
      'Daniel',
      'Arthur',
      'Oliver',
      'Male',
    ];

    for (const name of preferredMaleNames) {
      const match = voices.find(v => v.name.toLowerCase().includes(name.toLowerCase()));
      if (match) return match;
    }

    // Fallback: any English male voice or standard English voice
    const anyMale = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('male'));
    if (anyMale) return anyMale;

    return voices.find(v => v.lang === 'en-GB') || voices.find(v => v.lang.startsWith('en')) || voices[0];
  }, []);

  // Speak function with male voice
  const speakEdithLine = useCallback((text = EDITH_INTRO_SCRIPT) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    const voice = selectMaleVoice();
    if (voice) {
      utterance.voice = voice;
    }

    // Deep, crisp, intelligent male resonance (Marvel E.D.I.T.H. tone)
    utterance.pitch = 0.92;
    utterance.rate = 1.02;

    utterance.onstart = () => {
      setIsPlayingVoice(true);
      setVoiceText(text);
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
  }, [selectMaleVoice, onSpeakStart, onSpeakEnd]);

  // Auto-play voice on load (with automatic fallback on first user gesture)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let voicesLoaded = false;
    const tryAutoplay = () => {
      if (hasAutoPlayed) return;
      try {
        speakEdithLine();
        setHasAutoPlayed(true);
      } catch {
        // Autoplay policy prevented audio, will trigger on first interaction
      }
    };

    // Chrome/Edge load voices asynchronously
    if (window.speechSynthesis.getVoices().length > 0) {
      voicesLoaded = true;
      setTimeout(tryAutoplay, 800);
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        if (!voicesLoaded) {
          voicesLoaded = true;
          setTimeout(tryAutoplay, 600);
        }
      };
    }

    // User gesture listener to guarantee autoplay even if browser strictly blocks initial call
    const handleFirstGesture = () => {
      if (!hasAutoPlayed) {
        setHasAutoPlayed(true);
        speakEdithLine();
      }
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };

    window.addEventListener('pointerdown', handleFirstGesture, { once: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true });

    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, [hasAutoPlayed, speakEdithLine]);

  // Canvas 3D AI Neural Core Animation (Clean, high-tech Marvel HUD visuals)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Constellation particle system
    const particles = Array.from({ length: 32 }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: 40 + Math.random() * 85,
      speed: (Math.random() * 0.015 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
      size: Math.random() * 2.2 + 0.8,
      pulse: Math.random() * Math.PI,
    }));

    const render = () => {
      time += 0.03;
      ctx.clearRect(0, 0, 260, 260);

      const centerX = 130;
      const centerY = 130;
      const activePulse = isPlayingVoice || isListeningMic ? 1.4 : 1.0;

      // 1. Deep radial ambient core glow
      const grad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, 120);
      grad.addColorStop(0, isPlayingVoice ? 'rgba(59, 130, 246, 0.45)' : 'rgba(0, 56, 255, 0.35)');
      grad.addColorStop(0.6, 'rgba(0, 32, 160, 0.15)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 260, 260);

      // 2. Concentric E.D.I.T.H. HUD target rings
      for (let i = 0; i < 3; i++) {
        const ringRad = 45 + i * 32 + Math.sin(time * 1.5 + i) * 4 * activePulse;
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRad, 0, Math.PI * 2);
        ctx.strokeStyle = i === 0
          ? 'rgba(147, 197, 253, 0.5)'
          : i === 1
          ? 'rgba(96, 165, 250, 0.3)'
          : 'rgba(59, 130, 246, 0.18)';
        ctx.lineWidth = i === 0 ? 1.5 : 1;
        ctx.stroke();
      }

      // 3. Rotating HUD arc segments
      ctx.beginPath();
      ctx.arc(centerX, centerY, 95, time * 0.8, time * 0.8 + Math.PI * 0.5);
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, 112, -time * 0.6, -time * 0.6 + Math.PI * 0.35);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 4. Acoustic harmonic wave ribbons (audio visualizer core)
      for (let w = 0; w < 4; w++) {
        ctx.beginPath();
        const yBase = centerY - 25 + w * 18;
        const amp = (isPlayingVoice || isListeningMic ? 18 : 8) + w * 2.5;
        const freq = 0.03 + w * 0.006;
        const phase = time * (1.6 + w * 0.3);

        for (let x = 24; x <= 236; x += 3) {
          const dx = (x - centerX) / 106;
          const damp = Math.max(0, 1 - dx * dx);
          const y = yBase + Math.sin(x * freq + phase) * amp * damp;

          if (x === 24) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.strokeStyle = w === 1
          ? 'rgba(191, 219, 254, 0.7)'
          : w === 2
          ? 'rgba(96, 165, 250, 0.55)'
          : 'rgba(59, 130, 246, 0.4)';
        ctx.lineWidth = w === 1 ? 2.2 : 1.4;
        ctx.stroke();
      }

      // 5. Orbiting neural constellation particles
      particles.forEach((p) => {
        p.angle += p.speed * (isPlayingVoice || isListeningMic ? 1.8 : 1.0);
        p.pulse += 0.05;
        const px = centerX + Math.cos(p.angle) * p.radius;
        const py = centerY + Math.sin(p.angle) * (p.radius * 0.85);

        ctx.beginPath();
        ctx.arc(px, py, p.size + Math.sin(p.pulse) * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = isPlayingVoice ? '#93C5FD' : '#60A5FA';
        ctx.shadowColor = '#3B82F6';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 6. Central iris aperture pulse
      const centerGlowRad = 20 + Math.sin(time * 2.5) * (isPlayingVoice ? 8 : 4);
      ctx.beginPath();
      ctx.arc(centerX, centerY, centerGlowRad, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isPlayingVoice, isListeningMic]);

  // Smooth 3D tilt tracking
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
    setIsHovered(false);
  };

  // Toggle voice speaking
  const toggleVoicePlayback = () => {
    if (isPlayingVoice) {
      window.speechSynthesis.cancel();
      setIsPlayingVoice(false);
      onSpeakEnd?.();
    } else {
      speakEdithLine();
    }
  };

  // Live microphone recognition
  const toggleMicListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please try Chrome or Edge.');
      return;
    }

    if (isListeningMic) {
      recognitionRef.current?.stop();
      setIsListeningMic(false);
      setVoiceText('');
      return;
    }

    window.speechSynthesis.cancel();
    setIsPlayingVoice(false);

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let current = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        current += event.results[i][0].transcript;
      }
      setVoiceText(current.trim());
    };

    recognition.onerror = () => setIsListeningMic(false);
    recognition.onend = () => setIsListeningMic(false);

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsListeningMic(true);
      setVoiceText('Listening to your voice...');
    } catch {
      setIsListeningMic(false);
    }
  }, [isListeningMic]);

  const rotX = -mousePos.y * 30;
  const rotY = mousePos.x * 30;
  const glareX = (mousePos.x + 0.5) * 100;
  const glareY = (mousePos.y + 0.5) * 100;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        cursor: 'pointer',
        perspective: '1000px',
        userSelect: 'none',
        padding: '36px 0',
      }}
    >
      {/* 3D Gyroscopic Container */}
      <div
        style={{
          width: 320,
          height: 320,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${isHovered ? 1.04 : 1.0})`,
          transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Outer Gyroscopic Ring 1 (Tick Marks) */}
        <div
          style={{
            position: 'absolute',
            inset: -14,
            borderRadius: '50%',
            border: '1px dashed rgba(0, 56, 255, 0.35)',
            animation: 'rotateClockwise 28s linear infinite',
            pointerEvents: 'none',
          }}
        />

        {/* Outer Gyroscopic Ring 2 (3D Tilted Orbit with Satellite Node) */}
        <div
          style={{
            position: 'absolute',
            inset: -28,
            borderRadius: '50%',
            border: '1px solid rgba(0, 56, 255, 0.2)',
            transform: 'rotateX(65deg) rotateZ(20deg)',
            animation: 'rotateClockwise 18s linear infinite reverse',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: -4,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#0038FF',
              boxShadow: '0 0 12px #0038FF, 0 0 20px rgba(0, 56, 255, 0.8)',
            }}
          />
        </div>

        {/* HUD Crosshairs */}
        <div
          style={{
            position: 'absolute',
            inset: -6,
            borderRadius: '50%',
            border: '1px solid rgba(0, 56, 255, 0.15)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ position: 'absolute', top: -3, left: '50%', width: 6, height: 6, background: '#0038FF', transform: 'translateX(-50%)' }} />
          <div style={{ position: 'absolute', bottom: -3, left: '50%', width: 6, height: 6, background: '#0038FF', transform: 'translateX(-50%)' }} />
          <div style={{ position: 'absolute', left: -3, top: '50%', width: 6, height: 6, background: '#0038FF', transform: 'translateY(-50%)' }} />
          <div style={{ position: 'absolute', right: -3, top: '50%', width: 6, height: 6, background: '#0038FF', transform: 'translateY(-50%)' }} />
        </div>

        {/* 36 Dynamic Radial Equalizer Frequency Bars */}
        <div
          style={{
            position: 'absolute',
            inset: -4,
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        >
          {Array.from({ length: 36 }).map((_, idx) => {
            const angle = (idx / 36) * 360;
            const barHeight = isPlayingVoice || isListeningMic
              ? 6 + Math.sin((idx * 1.5) + Date.now() / 150) * 10 + Math.random() * 8
              : 3 + (idx % 3 === 0 ? 3 : 1);
            return (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: 2,
                  height: Math.max(2, barHeight),
                  background: isPlayingVoice || isListeningMic ? '#0038FF' : 'rgba(0, 56, 255, 0.4)',
                  boxShadow: isPlayingVoice || isListeningMic ? '0 0 6px rgba(0, 56, 255, 0.8)' : 'none',
                  transformOrigin: '0 148px',
                  transform: `translate(-50%, -148px) rotate(${angle}deg)`,
                  transition: 'height 0.15s ease',
                }}
              />
            );
          })}
        </div>

        {/* 3D Orb Sphere (Clean Neural Core — NO external video text) */}
        <div
          onClick={toggleVoicePlayback}
          style={{
            width: 260,
            height: 260,
            borderRadius: '50%',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: isPlayingVoice || isListeningMic
              ? '0 0 60px rgba(0, 56, 255, 0.65), inset 0 0 40px rgba(255, 255, 255, 0.8)'
              : '0 20px 50px rgba(0, 56, 255, 0.35), inset 0 0 30px rgba(255, 255, 255, 0.4)',
            background: 'radial-gradient(circle at 35% 30%, #3B82F6 0%, #0038FF 55%, #051A68 85%, #020A2E 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'box-shadow 0.3s ease',
          }}
        >
          {/* Animated 3D Neural Plasma Canvas */}
          <canvas
            ref={canvasRef}
            width={260}
            height={260}
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
            }}
          />

          {/* Clean Holographic Slat Overlay (Marvel HUD style) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'repeating-linear-gradient(0deg, transparent, transparent 7px, rgba(255, 255, 255, 0.15) 7px, rgba(255, 255, 255, 0.15) 11px)',
              pointerEvents: 'none',
              mixBlendMode: 'overlay',
              animation: 'scanlines 6s linear infinite',
            }}
          />

          {/* Dynamic 3D Specular Light Glare tracking mouse */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.1) 30%, transparent 65%)`,
              pointerEvents: 'none',
              transition: 'background 0.05s ease-out',
            }}
          />

          {/* Real-Time Acoustic Equalizer Waves inside Core */}
          <div
            style={{
              position: 'absolute',
              bottom: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              zIndex: 5,
            }}
          >
            {[4, 10, 16, 8, 14, 6, 12, 5].map((h, i) => (
              <span
                key={i}
                style={{
                  width: 2,
                  height: isPlayingVoice || isListeningMic ? h * 1.5 : h * 0.6,
                  background: 'rgba(255, 255, 255, 0.85)',
                  borderRadius: 2,
                  animation: `pulse ${(i % 3 + 1) * 0.4}s infinite ease-in-out`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
