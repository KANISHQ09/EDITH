'use client';

import { useIncidentStore } from '@/stores/incidentStore';

// Build timeline from all classified items
function useTimelineEntries() {
  const { facts, hypotheses, decisions, actionItems, questions, conflicts, incident } = useIncidentStore();

  const rawEntries = [
    ...(incident ? [{
      id: 'incident-created',
      ts: incident.startTs,
      type: 'INCIDENT_CREATED' as const,
      title: `Incident declared: ${incident.title}`,
      label: 'Incident',
      dotClass: 'fact',
    }] : []),
    ...facts.map(f => ({ id: f.id, ts: f.createdAt, type: 'FACT' as const, title: f.content, label: 'Fact', dotClass: 'fact' })),
    ...hypotheses.map(h => ({ id: h.id, ts: h.createdAt, type: 'HYPOTHESIS' as const, title: h.content, label: 'Hypothesis', dotClass: 'hypothesis' })),
    ...decisions.map(d => ({ id: d.id, ts: d.createdAt, type: 'DECISION' as const, title: d.content, label: 'Decision', dotClass: 'decision' })),
    ...actionItems.map(a => ({ id: a.id, ts: a.createdAt, type: 'ACTION_ITEM' as const, title: a.content, label: 'Action', dotClass: 'action_item' })),
    ...questions.map(q => ({ id: q.id, ts: q.createdAt, type: 'QUESTION' as const, title: q.content, label: 'Question', dotClass: 'question' })),
    ...conflicts.map(c => ({ id: c.id, ts: c.createdAt, type: 'CONFLICT' as const, title: c.description, label: 'Conflict', dotClass: 'conflict' })),
  ].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

  const seen = new Set<string>();
  return rawEntries.filter(entry => {
    const key = `${entry.type}-${entry.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function TimelinePanel() {
  const entries = useTimelineEntries();

  return (
    <div className="panel panel-wide" id="panel-timeline">
      <div className="panel-header">
        <div className="panel-title"><span className="icon">📋</span> Incident Timeline</div>
        <span className="panel-count">{entries.length}</span>
      </div>
      <div className="panel-body" style={{ maxHeight: 360 }}>
        {entries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">⏱️</div>
            Timeline will populate as the incident unfolds
          </div>
        ) : (
          <div className="timeline">
            {entries.map((entry, idx) => (
              <div key={`${entry.type}-${entry.id}-${idx}`} className="timeline-item">
                <div className="timeline-ts">
                  {new Date(entry.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="timeline-line-col">
                  <div className={`timeline-dot ${entry.dotClass}`} />
                  {idx < entries.length - 1 && <div className="timeline-connector" />}
                </div>
                <div className="timeline-content">
                  <p>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      marginRight: 6,
                      color: entry.dotClass === 'conflict' ? 'var(--color-conflict)'
                        : entry.dotClass === 'fact' ? 'var(--color-fact)'
                        : entry.dotClass === 'hypothesis' ? 'var(--color-hypothesis)'
                        : entry.dotClass === 'decision' ? 'var(--color-decision)'
                        : entry.dotClass === 'action_item' ? 'var(--color-action)'
                        : entry.dotClass === 'question' ? 'var(--color-question)'
                        : 'var(--text-muted)',
                    }}>
                      [{entry.label}]
                    </span>
                    {entry.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
