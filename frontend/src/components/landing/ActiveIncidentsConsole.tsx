'use client';

import Link from 'next/link';

interface IncidentSummary {
  id: string;
  title: string;
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'ACTIVE' | 'RESOLVED' | 'MITIGATED';
  start_ts: string;
  affected_systems: string[];
}

interface ActiveIncidentsConsoleProps {
  incidents: IncidentSummary[];
  onOpenDeclareModal: () => void;
}

export function ActiveIncidentsConsole({ incidents, onOpenDeclareModal }: ActiveIncidentsConsoleProps) {
  return (
    <section className="landing-section" id="incidents">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20, marginBottom: 24 }}>
        <div>
          <div className="section-badge">Live Incident Command Console</div>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1, color: 'var(--studio-text)' }}>
            Active Incident War Rooms
          </h2>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onOpenDeclareModal}
            className="btn-cobalt"
          >
            <span>+ DECLARE INCIDENT</span>
          </button>
        </div>
      </div>

      <div className="studio-grid-box">
        {incidents.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--studio-muted)' }}>
            No active incidents reported. All systems nominal.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {incidents.map((inc, idx) => {
              const isP1 = inc.severity === 'P1';
              return (
                <div
                  key={inc.id}
                  style={{
                    padding: '24px 32px',
                    borderBottom: idx === incidents.length - 1 ? 'none' : '1px solid var(--studio-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 16,
                    background: '#FFFFFF',
                    transition: 'background 0.2s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 4,
                        fontFamily: 'var(--dot-matrix-font)',
                        fontSize: 12,
                        fontWeight: 800,
                        background: isP1 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                        color: isP1 ? '#EF4444' : '#F59E0B',
                        border: `1px solid ${isP1 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                      }}
                    >
                      {inc.severity}
                    </span>

                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--studio-text)', marginBottom: 4 }}>
                        {inc.title}
                      </div>

                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 12, color: 'var(--studio-muted)' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          color: inc.status === 'ACTIVE' ? '#EF4444' : '#10B981',
                          fontWeight: 600,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: inc.status === 'ACTIVE' ? '#EF4444' : '#10B981', animation: inc.status === 'ACTIVE' ? 'pulse 1.5s infinite' : 'none' }} />
                          {inc.status}
                        </span>

                        <span>·</span>
                        <span>Started: {new Date(inc.start_ts).toLocaleTimeString()}</span>

                        {inc.affected_systems && inc.affected_systems.length > 0 && (
                          <>
                            <span>·</span>
                            <span>Affected: <strong style={{ color: 'var(--studio-text)' }}>{inc.affected_systems.join(', ')}</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/incident/${inc.id}`}
                    className="btn-studio-black"
                    style={{ fontSize: 12, padding: '10px 18px' }}
                  >
                    <span>ENTER WAR ROOM</span>
                    <span>→</span>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
