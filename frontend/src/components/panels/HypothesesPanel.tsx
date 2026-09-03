'use client';

import { useIncidentStore } from '@/stores/incidentStore';

export function HypothesesPanel() {
  const { hypotheses, promoteHypothesisToFact, dismissHypothesis } = useIncidentStore();

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
          hypotheses.map((h, idx) => (
            <div key={`${h.id}-${idx}`} className="item-card hypothesis">
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
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => promoteHypothesisToFact(h.id)}
                  title="Promote this hypothesis to confirmed Fact"
                >
                  ✓ Promote to Fact
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => dismissHypothesis(h.id)}
                  title="Dismiss hypothesis"
                >
                  ✕ Dismiss
                </button>
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
          decisions.map((d, idx) => (
            <div key={`${d.id}-${idx}`} className="item-card decision">
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
  const { actionItems, toggleActionItemStatus } = useIncidentStore();
  const active = actionItems.filter(a => a.status !== 'REJECTED');

  const statusColor = (status: string) => {
    if (status === 'RESOLVED') return 'var(--color-fact)';
    if (status === 'IN_PROGRESS') return 'var(--color-decision)';
    return 'var(--color-hypothesis)';
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
          active.map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="item-card action_item">
              <div className="item-header">
                <span className="item-type-badge action_item">Action</span>
                <button
                  onClick={() => toggleActionItemStatus(item.id)}
                  className="btn btn-ghost btn-sm"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: statusColor(item.status),
                    padding: '2px 8px',
                    border: `1px solid ${statusColor(item.status)}`,
                    borderRadius: 12,
                    cursor: 'pointer',
                  }}
                  title="Click to cycle status (Pending → In Progress → Resolved)"
                >
                  {item.status.replace('_', ' ')} ↻
                </button>
              </div>
              <div className="item-content" style={{ textDecoration: item.status === 'RESOLVED' ? 'line-through' : 'none', opacity: item.status === 'RESOLVED' ? 0.6 : 1 }}>
                {item.content}
              </div>
              <div className="item-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {item.ownerName ? (
                    <span>👤 {item.ownerName}</span>
                  ) : (
                    <span style={{ color: 'var(--color-conflict)' }}>⚠️ Unassigned</span>
                  )}
                  <span> · {new Date(item.createdAt).toLocaleTimeString()}</span>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 11, padding: '2px 6px' }}
                  onClick={() => toggleActionItemStatus(item.id)}
                >
                  {item.status === 'RESOLVED' ? 'Reopen' : 'Mark Done ✓'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function QuestionsPanel() {
  const { questions, answerQuestion } = useIncidentStore();
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
          open.map((q, idx) => {
            const ageMs = Date.now() - new Date(q.createdAt).getTime();
            const ageMin = Math.floor(ageMs / 60000);
            const isStale = ageMin >= 5;

            return (
              <div key={`${q.id}-${idx}`} className="item-card question">
                <div className="item-header">
                  <span className="item-type-badge question">Question</span>
                  <span style={{ fontSize: 11, color: isStale ? 'var(--color-conflict)' : 'var(--text-muted)' }}>
                    {isStale ? '⚠️ ' : ''}{ageMin}m unanswered
                  </span>
                </div>
                <div className="item-content">{q.content}</div>
                <div className="item-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <span>{new Date(q.createdAt).toLocaleTimeString()}</span>
                  <button
                    className="btn btn-success btn-sm"
                    style={{ fontSize: 11, padding: '2px 8px' }}
                    onClick={() => answerQuestion(q.id)}
                    title="Mark this question as answered"
                  >
                    ✓ Mark Answered
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
