'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeclareOpen, setIsDeclareOpen] = useState(false);

  useEffect(() => {
    async function fetchIncidents() {
      try {
        const res = await fetch('/api/v1/incidents');
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
    <div style={{ minHeight: '100vh', background: 'var(--studio-bg)', color: 'var(--studio-text)', fontFamily: 'var(--font-sans)', padding: '40px' }}>
      {/* Top Header */}
      <div style={{ maxWidth: 1200, margin: '0 auto', marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
              width: 300,
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

              <Link
                href={`/incident/${inc.id}`}
                className="btn-studio-black"
                style={{ fontSize: 12, padding: '8px 16px' }}
              >
                ENTER WAR ROOM →
              </Link>
            </div>
          ))
        )}
      </div>

      <DeclareIncidentModal
        isOpen={isDeclareOpen}
        onClose={() => setIsDeclareOpen(false)}
        onIncidentCreated={(newInc) => setIncidents(prev => [newInc, ...prev])}
      />
    </div>
  );
}
