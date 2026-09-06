'use client';

import React from 'react';
import { useIncidentStore } from '@/stores/incidentStore';

export interface TimelineEventItem {
  id: string;
  time: string;
  relTime: string;
  category: 'CONFLICT' | 'ACTION' | 'HYPOTHESIS' | 'FACT' | 'DECISION';
  title: string;
  meta: string;
  author?: string;
  source?: string;
  confidence?: string;
}

function CategoryIcon({ category }: { category: TimelineEventItem['category'] }) {
  switch (category) {
    case 'CONFLICT':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case 'ACTION':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9333EA" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      );
    case 'HYPOTHESIS':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7M9 21h6" />
        </svg>
      );
    case 'FACT':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case 'DECISION':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <circle cx="12" cy="12" r="2" fill="#2563EB" />
        </svg>
      );
  }
}

interface TimelinePanelProps {
  onViewFullTimeline?: () => void;
  isFullView?: boolean;
}

export function TimelinePanel({ onViewFullTimeline, isFullView = false }: TimelinePanelProps) {
  const { facts, hypotheses, decisions, actionItems, conflicts } = useIncidentStore();

  const combined: Array<{ ts: string; item: TimelineEventItem }> = [];

  const formatRelTime = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      return `${hrs}h ago`;
    } catch {
      return 'recent';
    }
  };

  conflicts.forEach((c) => {
    combined.push({
      ts: c.createdAt,
      item: {
        id: c.id,
        time: new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        relTime: formatRelTime(c.createdAt),
        category: 'CONFLICT',
        title: c.description,
        meta: 'Flagged by VAIC Conflict Engine',
      },
    });
  });

  actionItems.forEach((a) => {
    combined.push({
      ts: a.createdAt,
      item: {
        id: a.id,
        time: new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        relTime: formatRelTime(a.createdAt),
        category: 'ACTION',
        title: a.content,
        meta: `Status: ${a.status.replace('_', ' ')}`,
        author: a.ownerName || 'Unassigned',
      },
    });
  });

  hypotheses.forEach((h) => {
    combined.push({
      ts: h.createdAt,
      item: {
        id: h.id,
        time: new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        relTime: formatRelTime(h.createdAt),
        category: 'HYPOTHESIS',
        title: h.content,
        meta: h.confidence ? `Confidence: ${Math.round(h.confidence * 100)}%` : 'Confidence: Medium',
        author: 'VAIC',
      },
    });
  });

  facts.forEach((f) => {
    combined.push({
      ts: f.createdAt,
      item: {
        id: f.id,
        time: new Date(f.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        relTime: formatRelTime(f.createdAt),
        category: 'FACT',
        title: f.content,
        meta: f.confidence ? `Source: Investigation • Confidence: ${Math.round(f.confidence * 100)}%` : 'Confirmed Fact',
        author: f.confirmedBy || 'Analyst',
      },
    });
  });

  decisions.forEach((d) => {
    combined.push({
      ts: d.createdAt,
      item: {
        id: d.id,
        time: new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        relTime: formatRelTime(d.createdAt),
        category: 'DECISION',
        title: d.content,
        meta: '',
        author: d.decidedBy || 'Incident Commander',
      },
    });
  });

  // Sort descending by time
  combined.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  const events = isFullView ? combined.map((c) => c.item) : combined.slice(0, 5).map((c) => c.item);

  return (
    <div className="vaic-card" id="panel-timeline">
      <div className="vaic-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 className="vaic-card-title">{isFullView ? 'Full Audit Timeline' : 'Recent Activity'}</h2>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            background: '#F1F5F9',
            color: '#475569',
            padding: '2px 7px',
            borderRadius: 12,
          }}>
            {combined.length}
          </span>
        </div>
        {!isFullView && onViewFullTimeline && (
          <button
            type="button"
            className="vaic-card-link"
            onClick={onViewFullTimeline}
            style={{ background: 'transparent', border: 'none', padding: 0 }}
          >
            View Full Timeline →
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <div style={{
          padding: '36px 16px',
          textAlign: 'center',
          color: '#94A3B8',
          fontSize: 13,
        }}>
          No activity recorded yet. Start speaking into the mic or enter commands below to populate the incident timeline in real time.
        </div>
      ) : (
        <div className="vaic-timeline-list">
          {events.map((event) => {
            const catLower = event.category.toLowerCase();
            return (
              <div key={event.id} className="vaic-timeline-row">
                <div className="vaic-timeline-time-col">
                  <div>{event.time}</div>
                  <div className="vaic-timeline-rel-time">{event.relTime}</div>
                </div>

                <div className={`vaic-timeline-icon-badge ${catLower}`}>
                  <CategoryIcon category={event.category} />
                </div>

                <div className="vaic-timeline-content">
                  <span className={`vaic-timeline-tag ${catLower}`}>
                    {event.category}
                  </span>
                  <div className="vaic-timeline-text">{event.title}</div>
                  <div className="vaic-timeline-meta">
                    {event.meta && <span>{event.meta}</span>}
                    {event.author && (
                      <span style={{ marginLeft: event.meta ? 'auto' : 0, color: '#64748B', fontWeight: 500 }}>
                        by {event.author}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isFullView && onViewFullTimeline && events.length > 0 && (
        <button
          type="button"
          onClick={onViewFullTimeline}
          style={{
            width: '100%',
            marginTop: 20,
            padding: '10px',
            borderRadius: 8,
            border: '1px solid #E2E8F0',
            background: '#F8FAFC',
            color: '#2563EB',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#EFF6FF')}
          onMouseOut={(e) => (e.currentTarget.style.background = '#F8FAFC')}
        >
          View Full Timeline
        </button>
      )}
    </div>
  );
}
