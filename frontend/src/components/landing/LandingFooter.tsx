'use client';

import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer className="landing-section" style={{ marginBottom: 40 }}>
      {/* Call to action card */}
      <div style={{
        background: '#0B0C0E',
        color: '#FFFFFF',
        borderRadius: 6,
        padding: '56px 48px',
        marginBottom: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 24,
      }}>
        <div>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: 'var(--cobalt-primary)',
            marginBottom: 12,
          }}>
            ■ READY FOR PRODUCTION
          </div>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1, maxWidth: 640, lineHeight: 1.2 }}>
            Transform Outage Chaos into Structured Clarity with EDITH.
          </h2>
        </div>

        <Link
          href="#incidents"
          className="btn-cobalt"
          style={{ padding: '14px 28px', fontSize: 13 }}
        >
          <span>LAUNCH LIVE WAR ROOM</span>
          <span style={{ fontSize: 16 }}>→</span>
        </Link>
      </div>

      {/* Swiss Footer Grid */}
      <div className="studio-footer-grid">
        {/* Left Links Column */}
        <div className="footer-nav-col">
          <div>
            <div className="footer-col-title">Product</div>
            <div className="footer-links-list">
              <a href="#overview" className="footer-link">Autonomous Commander</a>
              <a href="#voices" className="footer-link">AI Personas</a>
              <a href="#integrations" className="footer-link">Telemetry Connectors</a>
              <a href="#architecture" className="footer-link">State Machine</a>
              <a href="#incidents" className="footer-link">Incident War Rooms</a>
            </div>
          </div>

          <div>
            <div className="footer-col-title">Platform</div>
            <div className="footer-links-list">
              <span className="footer-link">Streaming STT</span>
              <span className="footer-link">Voice Synthesis</span>
              <span className="footer-link">Conflict Detection</span>
              <span className="footer-link">Executive ISR</span>
              <span className="footer-link">Tool Action Gate</span>
            </div>
          </div>

          <div>
            <div className="footer-col-title">Security</div>
            <div className="footer-links-list">
              <span className="footer-link">SOC-2 Type II</span>
              <span className="footer-link">HIPAA Eligible</span>
              <span className="footer-link">Zero Data Retention</span>
              <span className="footer-link">End-to-End Encryption</span>
              <span className="footer-link">Audit Trail</span>
            </div>
          </div>
        </div>

        {/* Right Cobalt Brand Pane */}
        <div className="footer-brand-pane">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <span style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#10B981',
                boxShadow: '0 0 10px #10B981',
              }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                All Systems Operational · Live
              </span>
            </div>
          </div>

          <div>
            <div className="footer-big-brand">
              EDITH
            </div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8, letterSpacing: 0.5 }}>
              © 2026 ALL RIGHTS RESERVED. EDITH INCIDENT AI
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
