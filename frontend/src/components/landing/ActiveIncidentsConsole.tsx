'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

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
  onIncidentDeleted?: (deletedId: string) => void;
}

export function ActiveIncidentsConsole({
  incidents,
  onOpenDeclareModal,
  onIncidentDeleted,
}: ActiveIncidentsConsoleProps) {
  const [mounted, setMounted] = useState(false);
  const [incidentToDelete, setIncidentToDelete] = useState<IncidentSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleDeleteConfirm() {
    if (!incidentToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await apiFetch(`/api/v1/incidents/${incidentToDelete.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to delete incident');
      }

      if (onIncidentDeleted) {
        onIncidentDeleted(incidentToDelete.id);
      }
      setIncidentToDelete(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Error deleting incident');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="landing-section" id="incidents">
      <div className="active-incidents-header">
        <div>
          <div className="section-badge">Live Incident Command Console</div>
          <h2 className="active-incidents-heading">
            Active Incident Rooms
          </h2>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onOpenDeclareModal}
            className="btn-cobalt active-incidents-top-btn"
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
                  className="active-incident-row"
                  style={{
                    borderBottom: idx === incidents.length - 1 ? 'none' : '1px solid var(--studio-border)',
                  }}
                >
                  <div className="active-incident-main">
                    <span
                      className="active-incident-badge"
                      style={{
                        background: isP1 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                        color: isP1 ? '#EF4444' : '#F59E0B',
                        border: `1px solid ${isP1 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                      }}
                    >
                      {inc.severity}
                    </span>

                    <div className="active-incident-info">
                      <div className="active-incident-title">
                        {inc.title}
                      </div>

                      <div className="active-incident-meta">
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

                  <div className="active-incident-actions">
                    <Link
                      href={`/incident/${inc.id}`}
                      className="btn-studio-black active-incident-btn"
                      style={{ fontSize: 12, padding: '10px 18px' }}
                    >
                      <span>ENTER INCIDENT ROOM</span>
                      <span>→</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => setIncidentToDelete(inc)}
                      title={`Delete "${inc.title}"`}
                      style={{
                        padding: '9px 12px',
                        borderRadius: 4,
                        border: '1px solid #fee2e2',
                        background: '#fff5f5',
                        color: '#dc2626',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#fee2e2';
                        e.currentTarget.style.borderColor = '#fca5a5';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fff5f5';
                        e.currentTarget.style.borderColor = '#fee2e2';
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {mounted && incidentToDelete && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: 20,
          boxSizing: 'border-box',
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 16,
            width: '100%',
            maxWidth: 440,
            padding: 28,
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            border: '1px solid #E2E8F0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Delete Incident Room?
                </h3>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  This action cannot be undone.
                </div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, marginBottom: 20 }}>
              Are you sure you want to permanently delete <strong style={{ color: '#0F172A' }}>"{incidentToDelete.title}"</strong>? All live audio transcripts, hypotheses, decisions, and action items in this incident room will be erased.
            </p>

            {deleteError && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#DC2626',
                fontSize: 12,
                marginBottom: 16,
              }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setIncidentToDelete(null)}
                disabled={isDeleting}
                style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                style={{
                  padding: '10px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                }}
              >
                {isDeleting ? 'Deleting Room...' : 'Delete Incident Room'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
