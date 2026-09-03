'use client';

import { useState, useEffect, useRef } from 'react';

interface VoicePersona {
  num: string;
  name: string;
  role: string;
  description: string;
  sphereClass: string;
  speechText: string;
  rate: number;
  pitch: number;
}

const PERSONAS: VoicePersona[] = [
  {
    num: '01',
    name: 'Alex',
    role: 'Direct & High-Velocity',
    description: 'Swift, concise guidance for rapid triage and urgent canary rollbacks.',
    sphereClass: 'sphere-amber',
    speechText: 'Immediate canary rollback initiated on cluster us-east-1. Ingress traffic safely rerouted.',
    rate: 1.1,
    pitch: 0.95,
  },
  {
    num: '02',
    name: 'Noah',
    role: 'Warm & Reassuring',
    description: 'Calm and grounded communications for complex distributed incidents.',
    sphereClass: 'sphere-ruby',
    speechText: 'We have isolated the cache desynchronization. Responders are stabilizing the primary database pool.',
    rate: 1.0,
    pitch: 0.9,
  },
  {
    num: '03',
    name: 'Elliot',
    role: 'Calm & Professional',
    description: 'Clear and composed for high-stakes, mission-critical infrastructure leadership.',
    sphereClass: 'sphere-blue',
    speechText: 'Incident command established. Service degradation mitigated across all regional clusters.',
    rate: 1.05,
    pitch: 1.0,
  },
  {
    num: '04',
    name: 'Sofia',
    role: 'Analytical & Diagnostic',
    description: 'Deep forensic analysis of latency anomalies, lock contention, and traces.',
    sphereClass: 'sphere-violet',
    speechText: 'Distributed trace analysis complete. Root cause identified in payment microservice lock contention.',
    rate: 1.05,
    pitch: 1.1,
  },
  {
    num: '05',
    name: 'Maya',
    role: 'Executive & Strategic',
    description: 'Synthesizes multi-team telemetry into executive briefings and public ISR summaries.',
    sphereClass: 'sphere-emerald',
    speechText: 'Executive briefing ready. Customer impact minimized, post-mortem timeline generated.',
    rate: 1.0,
    pitch: 1.05,
  },
];

export function VoicesSection() {
  // Center active persona index (default: Elliot at index 2)
  const [currentIndex, setCurrentIndex] = useState(2);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-shift to next persona continuously every 3.8s in slow, graceful 3.4s motion
  useEffect(() => {
    if (isPlayingVoice) return;

    autoPlayTimerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % PERSONAS.length);
    }, 3800);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isPlayingVoice]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + PERSONAS.length) % PERSONAS.length);
    if (isPlayingVoice) {
      window.speechSynthesis?.cancel();
      setIsPlayingVoice(false);
    }
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % PERSONAS.length);
    if (isPlayingVoice) {
      window.speechSynthesis?.cancel();
      setIsPlayingVoice(false);
    }
  };

  const handleToggleVoice = (persona: VoicePersona) => {
    if (typeof window === 'undefined') return;

    if (isPlayingVoice) {
      window.speechSynthesis.cancel();
      setIsPlayingVoice(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(persona.speechText);
    utterance.rate = persona.rate;
    utterance.pitch = persona.pitch;

    utterance.onend = () => setIsPlayingVoice(false);
    utterance.onerror = () => setIsPlayingVoice(false);

    setIsPlayingVoice(true);
    window.speechSynthesis.speak(utterance);
  };

  const centerPersona = PERSONAS[currentIndex];

  return (
    <section className="landing-section" id="voices">
      <div className="personas-section-box">
        {/* Header Section */}
        <div className="personas-header">
          <div>
            <div className="section-badge">
              Meet the Voices
            </div>
            <h2 className="personas-heading">
              A Voice for Every<br />
              Outage Moment.
            </h2>
          </div>

          <div className="personas-header-right">
            <p className="personas-header-desc">
              EDITH offers flexible voice profiles that help every incident interaction feel decisive, consistent, and contextually appropriate.
            </p>

            <button
              onClick={() => handleToggleVoice(centerPersona)}
              className="btn-studio-black"
              style={{ padding: '12px 24px', fontSize: 13 }}
            >
              <span>{isPlayingVoice ? 'PAUSE VOICE' : 'HEAR IN ACTION'}</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {/* Coverflow Stage with Slow Motion Traveling Orbs */}
        <div className="personas-stage">
          {PERSONAS.map((persona, i) => {
            // Compute relative distance in infinite 5-step loop [-2, 2]
            let diff = i - currentIndex;
            while (diff > 2) diff -= 5;
            while (diff < -2) diff += 5;

            const isCenter = diff === 0;

            // X-coordinates strictly inside container:
            // Center = 0, Side = ±295px, Peeking = ±505px
            let xPos = 0;
            let scale = 1;
            let opacity = 1;
            let zIndex = 5;

            if (diff === 0) {
              xPos = 0;
              scale = 1;
              opacity = 1;
              zIndex = 5;
            } else if (diff === 1) {
              xPos = 295;
              scale = 0.68;
              opacity = 0.85;
              zIndex = 3;
            } else if (diff === -1) {
              xPos = -295;
              scale = 0.68;
              opacity = 0.85;
              zIndex = 3;
            } else if (diff === 2) {
              xPos = 505;
              scale = 0.42;
              opacity = 0.28;
              zIndex = 1;
            } else if (diff === -2) {
              xPos = -505;
              scale = 0.42;
              opacity = 0.28;
              zIndex = 1;
            }

            return (
              <div
                key={persona.name}
                onClick={() => {
                  if (!isCenter) {
                    setCurrentIndex(i);
                  }
                }}
                className="persona-orb-card"
                style={{
                  transform: `translate3d(${xPos}px, 0, 0) scale(${scale})`,
                  opacity,
                  zIndex,
                  pointerEvents: Math.abs(diff) <= 1 ? 'auto' : 'none',
                }}
              >
                {/* Persona Top Label */}
                <div
                  className="persona-top-label"
                  style={{
                    fontSize: isCenter ? 15 : 13,
                    opacity: isCenter ? 1 : 0.75,
                  }}
                >
                  <span className="persona-top-num">{persona.num}</span>
                  <span>{persona.name}</span>
                </div>

                {/* Orb Wrapper */}
                <div className="persona-orb-wrapper">
                  <div className={`persona-sphere ${persona.sphereClass}`} />

                  {/* Precision Orbital Watchmaker Dial Ticks on Center Orb */}
                  {isCenter && (
                    <svg className="orb-dial-ring" viewBox="0 0 280 280">
                      {Array.from({ length: 72 }).map((_, idx) => (
                        <line
                          key={idx}
                          x1="140"
                          y1="7"
                          x2="140"
                          y2={idx % 6 === 0 ? '16' : '11'}
                          stroke={idx % 6 === 0 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)'}
                          strokeWidth={idx % 6 === 0 ? '1.5' : '1'}
                          transform={`rotate(${idx * 5} 140 140)`}
                        />
                      ))}
                    </svg>
                  )}

                  {/* Translucent Glass Play Button on Center Orb */}
                  {isCenter && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleVoice(persona);
                      }}
                      className="persona-play-btn"
                      title={isPlayingVoice ? 'Pause voice' : `Listen to ${persona.name}`}
                      aria-label={isPlayingVoice ? 'Pause voice' : `Listen to ${persona.name}`}
                    >
                      {isPlayingVoice ? (
                        <span style={{ fontSize: 16, fontWeight: 800 }}>❚❚</span>
                      ) : (
                        <span style={{ fontSize: 15, marginLeft: 3 }}>▶</span>
                      )}
                    </button>
                  )}
                </div>

                {/* Persona Bottom Meta */}
                <div
                  className="persona-bottom-meta"
                  style={{
                    maxWidth: isCenter ? 280 : 220,
                    opacity: isCenter ? 1 : 0.75,
                  }}
                >
                  <div
                    className="persona-bottom-title"
                    style={{ fontSize: isCenter ? 19 : 15 }}
                  >
                    {persona.role}
                  </div>
                  <div
                    className="persona-bottom-desc"
                    style={{ fontSize: isCenter ? 13.5 : 12 }}
                  >
                    {persona.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
