'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { DeclareIncidentModal } from '@/components/landing/DeclareIncidentModal';

interface IncidentSummary {
  id: string;
  title: string;
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'ACTIVE' | 'RESOLVED' | 'MITIGATED';
  start_ts: string;
  affected_systems: string[];
}

export default function IncidentsDirectoryPage() {
  const [mounted, setMounted] = useState(false);
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeclareOpen, setIsDeclareOpen] = useState(false);
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

      setIncidents(prev => prev.filter(i => i.id !== incidentToDelete.id));
      setIncidentToDelete(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Error deleting incident');
    } finally {
      setIsDeleting(false);
    }
  }

  useEffect(() => {
    async function fetchIncidents() {
      try {
        const res = await apiFetch('/api/v1/incidents');
        if (res.ok) {
          const data = await res.json();
          setIncidents(data.data || []);
        }
      } catch (err) {
        console.error('Failed to load incidents directory:', err);
      }
    }
    fetchIncidents();
  }, []);

  const filtered = incidents.filter((inc) => {
    const matchesSev = filterSeverity === 'ALL' || inc.severity === filterSeverity;
    const matchesSearch = inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inc.affected_systems || []).some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSev && matchesSearch;
  });

  return (
    <div className="incidents-page-container" style={{ minHeight: '100vh', background: 'var(--studio-bg)', color: 'var(--studio-text)', fontFamily: 'var(--font-sans)' }}>
      {/* Top Header */}
      <div style={{ maxWidth: 1200, margin: '0 auto', marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Link
            href="/"
            className="btn-studio-outline"
            style={{ fontSize: 12, padding: '8px 14px' }}
          >
            ← Back to Product
          </Link>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>
              Incident Command Directory
            </h1>
            <div style={{ fontSize: 12, color: 'var(--studio-muted)' }}>
              Active and resolved enterprise incidents
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsDeclareOpen(true)}
          className="btn-cobalt"
        >
          + DECLARE INCIDENT
        </button>
      </div>

      {/* Main Console Box */}
      <div style={{ maxWidth: 1200, margin: '0 auto' }} className="studio-grid-box">
        {/* Filter bar */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--studio-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, background: '#FFFFFF' }}>
          <input
            type="text"
            placeholder="Search by title or affected system..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: 4,
              border: '1px solid var(--studio-border)',
              background: '#FAFAFC',
              fontSize: 13,
              width: '100%',
              maxWidth: 300,
              outline: 'none',
            }}
          />

          <div style={{ display: 'flex', gap: 6 }}>
            {['ALL', 'P1', 'P2', 'P3', 'P4'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterSeverity(lvl)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: 'var(--dot-matrix-font)',
                  border: `1px solid ${filterSeverity === lvl ? 'var(--cobalt-primary)' : 'var(--studio-border)'}`,
                  background: filterSeverity === lvl ? 'var(--cobalt-primary)' : '#FFFFFF',
                  color: filterSeverity === lvl ? '#FFFFFF' : 'var(--studio-text)',
                  cursor: 'pointer',
                }}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* List items */}
        {filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--studio-muted)' }}>
            No matching incidents found.
          </div>
        ) : (
          filtered.map((inc, idx) => (
            <div
              key={inc.id}
              style={{
                padding: '20px 24px',
                borderBottom: idx === filtered.length - 1 ? 'none' : '1px solid var(--studio-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
                background: '#FFFFFF',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontFamily: 'var(--dot-matrix-font)',
                  fontSize: 11,
                  fontWeight: 800,
                  background: inc.severity === 'P1' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                  color: inc.severity === 'P1' ? '#EF4444' : '#F59E0B',
                }}>
                  {inc.severity}
                </span>

                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--studio-text)' }}>
                    {inc.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--studio-muted)', marginTop: 2 }}>
                    {inc.status} · Started {new Date(inc.start_ts).toLocaleString()} · {inc.affected_systems?.join(', ') || 'core-system'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Link
                  href={`/incident/${inc.id}`}
                  className="btn-studio-black"
                  style={{ fontSize: 12, padding: '8px 16px' }}
                >
                  ENTER INCIDENT ROOM →
                </Link>

                <button
                  type="button"
                  onClick={() => setIncidentToDelete(inc)}
                  title={`Delete "${inc.title}"`}
                  style={{
                    padding: '8px 12px',
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
          ))
        )}
      </div>

      <DeclareIncidentModal
        isOpen={isDeclareOpen}
        onClose={() => setIsDeclareOpen(false)}
        onIncidentCreated={(newInc) => setIncidents(prev => [newInc, ...prev])}
      />

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
    </div>
  );
}
