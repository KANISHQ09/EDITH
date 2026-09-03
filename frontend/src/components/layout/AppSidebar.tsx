'use client';

import Link from 'next/link';
import { useIncidentStore } from '@/stores/incidentStore';

type PanelKey = 'timeline' | 'facts' | 'hypotheses' | 'decisions' | 'actionItems' | 'questions' | 'conflicts';

const PANELS: { key: PanelKey; label: string; icon: string }[] = [
  { key: 'timeline',     label: 'Timeline',      icon: '📋' },
  { key: 'facts',        label: 'Facts',          icon: '✅' },
  { key: 'hypotheses',   label: 'Hypotheses',     icon: '🔬' },
  { key: 'decisions',    label: 'Decisions',      icon: '🎯' },
  { key: 'actionItems',  label: 'Action Items',   icon: '⚡' },
  { key: 'questions',    label: 'Questions',      icon: '❓' },
  { key: 'conflicts',    label: 'Conflicts',      icon: '⚠️' },
];

export function AppSidebar() {
  const { facts, hypotheses, decisions, actionItems, questions, conflicts, incident } = useIncidentStore();

  const counts: Record<PanelKey, number> = {
    timeline:    0,
    facts:       facts.length,
    hypotheses:  hypotheses.length,
    decisions:   decisions.length,
    actionItems: actionItems.filter(a => a.status === 'PENDING' || a.status === 'IN_PROGRESS').length,
    questions:   questions.filter(q => q.status === 'PENDING').length,
    conflicts:   conflicts.filter(c => c.status === 'OPEN').length,
  };

  const scrollToPanel = (key: PanelKey) => {
    document.getElementById(`panel-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <aside className="app-sidebar">
      {/* Back to Home navigation */}
      <div style={{ padding: '0 14px 14px', borderBottom: '1px solid var(--border)' }}>
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{ fontSize: 14 }}>←</span>
          <span>Back to All Incidents</span>
        </Link>
      </div>

      {/* Affected Systems */}
      {incident?.affectedSystems && incident.affectedSystems.length > 0 && (
        <div style={{ padding: '12px 16px', marginBottom: 8, borderBottom: '1px solid var(--border)' }}>
          <div className="sidebar-section" style={{ padding: 0, marginBottom: 8 }}>Affected Systems</div>
          {incident.affectedSystems.map((sys) => (
            <div key={sys} style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-conflict)',
              padding: '3px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{ color: 'var(--color-conflict)' }}>●</span> {sys}
            </div>
          ))}
        </div>
      )}

      <div className="sidebar-section">Navigation</div>

      {PANELS.map(({ key, label, icon }) => (
        <div
          key={key}
          className="sidebar-item"
          onClick={() => scrollToPanel(key)}
          role="button"
          tabIndex={0}
        >
          <span className="sidebar-item-icon">{icon}</span>
          <span style={{ flex: 1 }}>{label}</span>
          {counts[key] > 0 && (
            <span className={`sidebar-item-count ${key === 'conflicts' && counts[key] > 0 ? 'has-conflicts' : ''}`}>
              {counts[key]}
            </span>
          )}
        </div>
      ))}

      {/* Summary stats */}
      <div style={{ padding: '16px', marginTop: 'auto', borderTop: '1px solid var(--border)' }}>
        <div className="sidebar-section" style={{ padding: 0, marginBottom: 10 }}>Session</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Facts confirmed', value: facts.length, color: 'var(--color-fact)' },
            { label: 'Actions pending', value: counts.actionItems, color: 'var(--color-action)' },
            { label: 'Open conflicts', value: counts.conflicts, color: 'var(--color-conflict)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
