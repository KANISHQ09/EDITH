'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AiAssistant3DOrb } from '@/components/landing/AiAssistant3DOrb';

const HERO_STATS = [
  {
    metric: '80%',
    label: '[ FASTER INCIDENT RESOLUTION ]',
  },
  {
    metric: '< 90s',
    label: '[ AVERAGE TIME TO TRIAGE ]',
  },
  {
    metric: '100%',
    label: '[ ROOT CAUSE SYNCHRONIZATION ]',
  },
  {
    metric: '4.8x',
    label: '[ SRE VELOCITY MULTIPLIER ]',
  },
];

interface HeroSectionProps {
  primaryIncidentId: string;
}

export function HeroSection({ primaryIncidentId }: HeroSectionProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeStatIndex, setActiveStatIndex] = useState(0);
  const [isStatAnimating, setIsStatAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsStatAnimating(true);
      setTimeout(() => {
        setActiveStatIndex((prev) => (prev + 1) % HERO_STATS.length);
        setIsStatAnimating(false);
      }, 350);
    }, 3200);

    return () => clearInterval(timer);
  }, []);

  const handleNextStat = () => {
    if (isStatAnimating) return;
    setIsStatAnimating(true);
    setTimeout(() => {
      setActiveStatIndex((prev) => (prev + 1) % HERO_STATS.length);
      setIsStatAnimating(false);
    }, 350);
  };

  const handlePlayVoice = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    const message = new SpeechSynthesisUtterance(
      "Hello. I am EDITH — Even In Downtime, I'll Triage Hazards. Tactical networks online, global telemetry synchronized. Monitoring 14 microservice clusters. Standing by for incident command directive."
    );

    const voices = window.speechSynthesis.getVoices();
    const preferredMaleNames = ['Google UK English Male', 'Microsoft George', 'Microsoft David', 'Daniel', 'Arthur', 'Male'];
    for (const name of preferredMaleNames) {
      const match = voices.find(v => v.name.toLowerCase().includes(name.toLowerCase()));
      if (match) {
        message.voice = match;
        break;
      }
    }

    message.pitch = 0.92;
    message.rate = 1.02;
    message.onend = () => setIsPlayingAudio(false);
    message.onerror = () => setIsPlayingAudio(false);

    setIsPlayingAudio(true);
    window.speechSynthesis.speak(message);
  };

  return (
    <section className="landing-hero">
      <div className="hero-grid">
        {/* Left Pane */}
        <div className="hero-left-pane">
          <div>
            <div className="section-badge">Voice AI Incident Commander</div>
            <h1 className="hero-title">
              Autonomous Incident Commander for High-Scale Systems.
            </h1>
          </div>

          <div 
            className="hero-stat-card" 
            onClick={handleNextStat}
            role="button"
            tabIndex={0}
            title="Click to view next metric"
          >
            <div className="stat-expand-icon">↗</div>
            <div className={`stat-content-slider ${isStatAnimating ? 'animating' : ''}`}>
              <div className="stat-metric-lcd">{HERO_STATS[activeStatIndex].metric}</div>
              <div className="stat-label-brackets">{HERO_STATS[activeStatIndex].label}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 14, alignItems: 'center' }}>
              {HERO_STATS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isStatAnimating || activeStatIndex === idx) return;
                    setIsStatAnimating(true);
                    setTimeout(() => {
                      setActiveStatIndex(idx);
                      setIsStatAnimating(false);
                    }, 350);
                  }}
                  style={{
                    height: 2,
                    width: activeStatIndex === idx ? 16 : 6,
                    background: activeStatIndex === idx ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                    borderRadius: 1,
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  aria-label={`Show metric ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Pane */}
        <div className="hero-right-pane" style={{ padding: '40px 32px' }}>
          <AiAssistant3DOrb
            onSpeakStart={() => setIsPlayingAudio(true)}
            onSpeakEnd={() => setIsPlayingAudio(false)}
          />

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 32 }}>
            <Link
              href={`/incident/${primaryIncidentId}`}
              className="btn-studio-black"
            >
              <span>LAUNCH COMMAND CENTER</span>
              <span>→</span>
            </Link>

            <button
              onClick={handlePlayVoice}
              className="btn-studio-outline"
            >
              <span>{isPlayingAudio ? 'PAUSE VOICE' : 'HEAR EDITH IN ACTION'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-Time Telemetry & System Status Strip */}
      <div className="hero-telemetry-strip">
        <div className="telemetry-strip-card">
          <div className="telemetry-strip-header">
            <span className="telemetry-live-dot" />
            <span className="telemetry-strip-tag">[ SYSTEM STATUS ]</span>
          </div>
          <div className="telemetry-strip-title">Autonomous Voice Bridge Active</div>
          <div className="telemetry-strip-desc">Real-time bi-directional audio coordination via Agora RTC</div>
        </div>

        <div className="telemetry-strip-card">
          <div className="telemetry-strip-header">
            <span className="telemetry-wave-bars">
              <span className="wave-bar bar-1" />
              <span className="wave-bar bar-2" />
              <span className="wave-bar bar-3" />
              <span className="wave-bar bar-4" />
            </span>
            <span className="telemetry-strip-tag">[ VOICE TRIAGE ]</span>
          </div>
          <div className="telemetry-strip-title">&lt; 90s Time-to-Mitigate</div>
          <div className="telemetry-strip-desc">Synthesizes responder audio into verified actionable facts</div>
        </div>

        <div className="telemetry-strip-card">
          <div className="telemetry-strip-header">
            <span style={{ fontSize: 12, color: 'var(--cobalt-primary)' }}>⚡</span>
            <span className="telemetry-strip-tag">[ TELEMETRY INGESTION ]</span>
          </div>
          <div className="telemetry-strip-title">2.4M Events / Second</div>
          <div className="telemetry-strip-desc">Cross-correlation across PagerDuty, Datadog &amp; Kubernetes</div>
        </div>
      </div>
    </section>
  );
}
