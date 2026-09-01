'use client';

import { useIncidentStore } from '@/stores/incidentStore';

export function HypothesesPanel() {
  const { hypotheses } = useIncidentStore();

  return (
    <div className="panel" id="panel-hypotheses">
      <div className="panel-header">
        <div className="panel-title"><span className="icon">🔬</span> Hypotheses</div>
        <span className="panel-count">{hypotheses.length}</span>
      </div>
      <div className="panel-body">
        {hypotheses.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🧪</div>No hypotheses raised</div>
        ) : (
          hypotheses.map((h) => (
            <div key={h.id} className="item-card hypothesis">
              <div className="item-header">
                <span className="item-type-badge hypothesis">Hypothesis</span>
                {h.confidence && (
                  <div className="confidence-bar">
                    <div className="confidence-track">
                      <div className={`confidence-fill ${h.confidence >= 0.8 ? 'high' : 'medium'}`}
                        style={{ width: `${Math.round(h.confidence * 100)}%` }} />
                    </div>
                    <span>{Math.round(h.confidence * 100)}%</span>
                  </div>
                )}
              </div>
              <div className="item-content">{h.content}</div>
              <div className="item-meta">
                <span>{new Date(h.createdAt).toLocaleTimeString()}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <button className="btn btn-success btn-sm">Promote to Fact</button>
                <button className="btn btn-ghost btn-sm">Dismiss</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function DecisionsPanel() {
  const { decisions } = useIncidentStore();

  return (
    <div className="panel" id="panel-decisions">
      <div className="panel-header">
        <div className="panel-title"><span className="icon">🎯</span> Decisions</div>
        <span className="panel-count">{decisions.length}</span>
      </div>
      <div className="panel-body">
        {decisions.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🎯</div>No decisions recorded</div>
        ) : (
          decisions.map((d) => (
            <div key={d.id} className="item-card decision">
              <div className="item-header">
                <span className="item-type-badge decision">Decision</span>
              </div>
              <div className="item-content">{d.content}</div>
              <div className="item-meta">
                <span>{new Date(d.createdAt).toLocaleTimeString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function ActionItemsPanel() {
  const { actionItems } = useIncidentStore();
  const active = actionItems.filter(a => a.status !== 'RESOLVED' && a.status !== 'REJECTED');

  const statusColor = (status: string) => {
    if (status === 'IN_PROGRESS') return 'var(--color-decision)';
    if (status === 'PENDING') return 'var(--color-hypothesis)';
    return 'var(--color-fact)';
  };

  return (
    <div className="panel" id="panel-actionItems">
      <div className="panel-header">
        <div className="panel-title"><span className="icon">⚡</span> Action Items</div>
        <span className="panel-count">{active.length}</span>
      </div>
      <div className="panel-body">
        {active.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">✓</div>All actions resolved</div>
        ) : (
          active.map((item) => (
            <div key={item.id} className="item-card action_item">
              <div className="item-header">
                <span className="item-type-badge action_item">Action</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(item.status) }}>
                  {item.status.replace('_', ' ')}
                </span>
              </div>
              <div className="item-content">{item.content}</div>
              <div className="item-meta">
                {item.ownerName ? (
                  <span>👤 {item.ownerName}</span>
                ) : (
                  <span style={{ color: 'var(--color-conflict)' }}>⚠️ Unassigned</span>
                )}
                <span>· {new Date(item.createdAt).toLocaleTimeString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function QuestionsPanel() {
  const { questions } = useIncidentStore();
  const open = questions.filter(q => q.status === 'PENDING');

  return (
    <div className="panel" id="panel-questions">
      <div className="panel-header">
        <div className="panel-title"><span className="icon">❓</span> Open Questions</div>
        <span className="panel-count">{open.length}</span>
      </div>
      <div className="panel-body">
        {open.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">💬</div>No open questions</div>
        ) : (
          open.map((q) => {
            const ageMs = Date.now() - new Date(q.createdAt).getTime();
            const ageMin = Math.floor(ageMs / 60000);
            const isStale = ageMin >= 5;

            return (
              <div key={q.id} className="item-card question">
                <div className="item-header">
                  <span className="item-type-badge question">Question</span>
                  <span style={{ fontSize: 11, color: isStale ? 'var(--color-conflict)' : 'var(--text-muted)' }}>
                    {isStale ? '⚠️ ' : ''}{ageMin}m unanswered
                  </span>
                </div>
                <div className="item-content">{q.content}</div>
                <div className="item-meta">
                  <span>{new Date(q.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
