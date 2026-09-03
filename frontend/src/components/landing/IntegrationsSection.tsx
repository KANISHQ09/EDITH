'use client';

import React, { useState, useEffect } from 'react';

interface IntegrationItem {
  id: string;
  name: string;
  category: string;
  logo: React.ReactNode;
  quote: string;
  author: string;
  role: string;
  impactMetric: string;
}

const INTEGRATIONS: IntegrationItem[] = [
  {
    id: 'pagerduty',
    name: 'PagerDuty',
    category: 'Alerting',
    logo: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M4.5 3h8c4.14 0 7.5 3.36 7.5 7.5S16.64 18 12.5 18H8v4.5H4.5V3zm3.5 11.5h4.5a4 4 0 1 0 0-8H8v8z"
          fill="currentColor"
        />
      </svg>
    ),
    quote: 'EDITH ingests PagerDuty alert cascades and instantly suppresses duplicate pages, cutting responder cognitive overload by 75%.',
    author: 'Elena Rostova',
    role: 'Head of Infrastructure, FinFlow Global',
    impactMetric: '75% Alert Fatigue Reduction',
  },
  {
    id: 'datadog',
    name: 'Datadog',
    category: 'Observability',
    logo: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.5 9.5c-.45-1-1.3-1.8-2.38-2.2V6.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.12c-.66-.08-1.34-.02-2 .18-1.08.33-1.99 1.07-2.52 2.05L7.4 9.47C6.54 9.99 6 10.93 6 11.95v4.55c0 1.93 1.57 3.5 3.5 3.5h7c1.93 0 3.5-1.57 3.5-3.5v-5c0-.74-.2-1.45-.58-2.07zM10 13.5a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm4.5 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
      </svg>
    ),
    quote: 'When APM traces spike, EDITH automatically correlates p99 latencies with recent Kubernetes deployments before responders finish joining the bridge.',
    author: 'Marcus Vance',
    role: 'Staff SRE, CloudScale Systems',
    impactMetric: '4.2x Faster Triage',
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'War Room',
    logo: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.17a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
      </svg>
    ),
    quote: 'EDITH synchronizes audio voice transcripts directly into the #incident-war-room Slack channel with classified action items and fact badges.',
    author: 'Sarah Chen',
    role: 'Principal Engineer, Stripe Ecosystem',
    impactMetric: '100% Real-Time Transcription',
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes',
    category: 'Orchestration',
    logo: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1.5a10.5 10.5 0 1 0 10.5 10.5A10.5 10.5 0 0 0 12 1.5zm0 2.2a8.3 8.3 0 0 1 7.6 5.1h-3.4a4.8 4.8 0 0 0-3.1-2.5V3.8zm-1.1 0v2.5a4.8 4.8 0 0 0-3.1 2.5H4.4a8.3 8.3 0 0 1 6.5-5zm-7.1 7.3h3.5a4.8 4.8 0 0 0 0 2H3.8a8.3 8.3 0 0 1 0-2zm1 4.2h3.4a4.8 4.8 0 0 0 3.1 2.5v2.5a8.3 8.3 0 0 1-6.5-5zm7.2 5v-2.5a4.8 4.8 0 0 0 3.1-2.5h3.4a8.3 8.3 0 0 1-6.5 5zm7.3-6.2h-3.5a4.8 4.8 0 0 0 0-2h3.5a8.3 8.3 0 0 1 0 2zM12 9.5a2.5 2.5 0 1 1-2.5 2.5 2.5 2.5 0 0 1 2.5-2.5z" />
      </svg>
    ),
    quote: 'Pod crashloops and OOM kills are parsed in milliseconds. EDITH proposes automated rollback actions with one-click human-in-the-loop safety.',
    author: 'Devon Miller',
    role: 'VP of Platform, DataVoxel',
    impactMetric: 'Zero-Touch Triage Proposal',
  },
  {
    id: 'aws',
    name: 'AWS Cloud',
    category: 'Infrastructure',
    logo: (
      <svg width="24" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6.96 11.5c0-.62.09-1.13.27-1.51.18-.38.44-.66.78-.84.34-.18.76-.27 1.25-.27.64 0 1.18.16 1.61.49.43.33.69.8.78 1.42h-1.46c-.06-.33-.19-.57-.4-.72-.2-.15-.49-.23-.85-.23-.38 0-.66.09-.84.28-.18.19-.27.48-.27.89v.12c.22-.18.5-.32.82-.42.33-.1.67-.15 1.05-.15.72 0 1.28.19 1.69.57.4.38.61.92.61 1.61 0 .74-.23 1.33-.7 1.75-.47.43-1.1.64-1.91.64-.41 0-.78-.06-1.1-.19-.33-.12-.58-.3-.76-.52v.57h-1.47v-3.45zm1.47.97v.72c.14.2.34.35.58.45.24.1.53.14.88.14.46 0 .8-.12 1.03-.36.23-.24.34-.58.34-1.03 0-.42-.11-.74-.34-.95-.23-.22-.55-.32-.96-.32-.36 0-.67.08-.94.23-.26.16-.47.39-.61.7l.02.42z" />
        <path d="M12.9 8.2h1.54l1.39 5.34 1.39-5.34h1.5l1.42 5.34 1.39-5.34h1.51l-2.09 7.31h-1.57l-1.42-5.11-1.42 5.11h-1.57l-2.07-7.31z" />
        <path d="M3.8 17.14c3.55 1.78 7.64 1.78 11.2 0 .25-.13.3-.4.12-.6-.18-.2-.48-.25-.72-.13-3.14 1.57-6.77 1.57-9.91 0-.24-.12-.54-.07-.72.13-.18.2-.13.47.12.6z" />
        <path d="M16.2 15.75c-.23-.29-.74-.11-1.09-.04-.35.07-.7.2-1.04.34-.13.05-.17.19-.08.3.08.11.23.13.36.08.32-.12.65-.24.97-.29.32-.05.61-.04.72.11.11.14.05.42-.18.67-.23.25-.53.48-.85.67-.11.06-.14.22-.07.32.07.11.23.14.35.07.36-.2.71-.46.97-.74.28-.3.38-.66.22-.89-.12-.14-.16-.14-.24-.14z" />
      </svg>
    ),
    quote: 'Direct integration with CloudWatch and RDS Read Replica failovers gives EDITH full situational awareness across multi-region clusters.',
    author: 'Aria Thorne',
    role: 'Director of Cloud Operations, NexaBank',
    impactMetric: '99.99% Reliability Floor',
  },
];

export function IntegrationsSection() {
  const [activeId, setActiveId] = useState('pagerduty');
  const [isAnimating, setIsAnimating] = useState(false);

  // Auto-cycle continuously every 3.8s through the integrations
  useEffect(() => {
    const timer = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setActiveId((current) => {
          const currentIndex = INTEGRATIONS.findIndex((i) => i.id === current);
          const nextIndex = (currentIndex + 1) % INTEGRATIONS.length;
          return INTEGRATIONS[nextIndex].id;
        });
        setIsAnimating(false);
      }, 350);
    }, 3800);

    return () => clearInterval(timer);
  }, []);

  const handleSelectIntegration = (id: string) => {
    if (id === activeId || isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      setActiveId(id);
      setIsAnimating(false);
    }, 350);
  };

  const active = INTEGRATIONS.find((i) => i.id === activeId) || INTEGRATIONS[0];

  return (
    <section className="landing-section" id="integrations">
      <div className="section-badge">Integrations &amp; Telemetry Ecosystem</div>

      <div className="studio-grid-box">
        {/* Modern Vector Logo Grid Tabs */}
        <div
          className="logo-grid"
          style={{ gridTemplateColumns: `repeat(${INTEGRATIONS.length}, 1fr)` }}
        >
          {INTEGRATIONS.map((item) => {
            const isActive = item.id === activeId;
            return (
              <div
                key={item.id}
                className={`logo-grid-item ${isActive ? 'active' : ''}`}
                onClick={() => handleSelectIntegration(item.id)}
                role="button"
                tabIndex={0}
              >
                {item.logo}
                <span>{item.name}</span>
                {isActive && (
                  <div
                    className="tab-progress-line"
                    style={{
                      animation: 'fillLine 3.8s linear forwards',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Full-width Animated Testimonial & Case Study Pane */}
        <div className="testimonial-pane">
          <div className={`testimonial-slide-content ${isAnimating ? 'animating' : ''}`}>
            <div>
              <div className="testimonial-quote-icon">“</div>
              <div className="testimonial-quote">{active.quote}</div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                flexWrap: 'wrap',
                gap: 20,
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    color: 'var(--studio-text)',
                  }}
                >
                  {active.author}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--studio-muted)',
                    marginTop: 3,
                  }}
                >
                  {active.role}
                </div>
              </div>

              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--studio-border)',
                  padding: '9px 18px',
                  borderRadius: 4,
                  fontFamily: 'var(--dot-matrix-font)',
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: 'var(--cobalt-primary)',
                  letterSpacing: 0.5,
                }}
              >
                [ {active.impactMetric} ]
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
