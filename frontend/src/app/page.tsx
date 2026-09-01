'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface IncidentSummary {
  id: string;
  title: string;
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'ACTIVE' | 'RESOLVED' | 'MITIGATED';
  start_ts: string;
  affected_systems: string[];
}

export default function Home() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<'P1' | 'P2' | 'P3' | 'P4'>('P1');
  const [systems, setSystems] = useState('');

  useEffect(() => {
    async function loadIncidents() {
      try {
        const res = await fetch('/api/v1/incidents');
        if (res.ok) {
          const data = await res.json();
          setIncidents(data.data || []);
        }
      } catch (err) {
        console.error('Failed to load incidents:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadIncidents();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const affectedSystems = systems
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch('/api/v1/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          severity,
          affectedSystems: affectedSystems.length > 0 ? affectedSystems : ['core-api'],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newIncident = data.data;
        router.push(`/incident/${newIncident.id}`);
      }
    } catch (err) {
      console.error('Failed to create incident:', err);
      setIsCreating(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base, #0d1117)', color: 'var(--text-primary, #fff)', fontFamily: 'var(--font-sans, system-ui)' }}>
      {/* Header */}
      <header style={{
        height: 60,
        borderBottom: '1px solid var(--border, #2d3340)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        background: 'var(--bg-panel, #161b22)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 16 }}>
          <div className="logo-dot" style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-fact, #2ea043)' }} />
          EDITH — Voice AI Incident Commander
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
        >
          + Create New Incident
        </button>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Incident Response Hub</h1>
            <p style={{ color: 'var(--text-muted, #8b949e)', fontSize: 14, margin: '6px 0 0 0' }}>
              Autonomous voice-assisted command center for engineering war rooms
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Link
              href="/incident/demo"
              className="btn btn-secondary btn-sm"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              🚀 Open Demo War Room
            </Link>
          </div>
        </div>

        {/* Incident Cards Grid */}
        {isLoading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading incidents from Neon PostgreSQL...
          </div>
        ) : incidents.length === 0 ? (
          <div style={{
            background: 'var(--bg-panel, #161b22)',
            border: '1px solid var(--border, #2d3340)',
            borderRadius: 12,
            padding: 48,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🛡️</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>No Active Incidents</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 400, margin: '8px auto 20px auto' }}>
              All systems are operating normally. Click below to initiate an emergency war room.
            </p>
            <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
              + Declare Emergency Incident
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
            {incidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => router.push(`/incident/${inc.id}`)}
                style={{
                  background: 'var(--bg-panel, #161b22)',
                  border: '1px solid var(--border, #2d3340)',
                  borderRadius: 10,
                  padding: 20,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-fact, #2ea043)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border, #2d3340)')}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span className={`badge-severity ${inc.severity.toLowerCase()}`}>
                      {inc.severity}
                    </span>
                    <span className={`badge-status ${inc.status.toLowerCase()}`}>
                      {inc.status}
                    </span>
                  </div>

                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>
                    {inc.title}
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--text-muted, #8b949e)', marginBottom: 16 }}>
                    Started {new Date(inc.start_ts).toLocaleString()}
                  </div>

                  {inc.affected_systems && inc.affected_systems.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                      {inc.affected_systems.map((sys) => (
                        <span
                          key={sys}
                          style={{
                            fontSize: 11,
                            fontFamily: 'monospace',
                            padding: '2px 8px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: 4,
                            color: '#e6edf3',
                          }}
                        >
                          {sys}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border, #2d3340)', paddingTop: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-fact, #2ea043)' }}>
                    Enter War Room →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Incident Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 24,
        }}>
          <div style={{
            background: 'var(--bg-panel, #161b22)',
            border: '1px solid var(--border, #2d3340)',
            borderRadius: 12,
            width: '100%',
            maxWidth: 520,
            padding: 28,
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>🚨 Declare New Incident</h2>
              <button onClick={() => setIsModalOpen(false)} className="btn btn-ghost btn-sm" style={{ fontSize: 16 }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Incident Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stripe Webhook Processing Failure"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: 'var(--bg-base, #0d1117)',
                    border: '1px solid var(--border, #2d3340)',
                    color: '#fff',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Severity Level
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {(['P1', 'P2', 'P3', 'P4'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSeverity(lvl)}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: 6,
                        border: severity === lvl ? '2px solid #fff' : '1px solid var(--border, #2d3340)',
                        background: severity === lvl ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                        color: '#fff',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Affected Systems (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. checkout-api, payment-gateway, postgres-primary"
                  value={systems}
                  onChange={(e) => setSystems(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: 'var(--bg-base, #0d1117)',
                    border: '1px solid var(--border, #2d3340)',
                    color: '#fff',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={isCreating || !title.trim()} className="btn btn-primary" style={{ fontWeight: 600 }}>
                  {isCreating ? 'Creating Room...' : 'Launch Incident Room →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
