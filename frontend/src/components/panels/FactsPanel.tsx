'use client';

import { useIncidentStore } from '@/stores/incidentStore';

function ConfidenceBadge({ confidence }: { confidence?: number }) {
  if (!confidence) return null;
  const pct = Math.round(confidence * 100);
  const cls = pct >= 85 ? 'high' : pct >= 65 ? 'medium' : 'low';
  return (
    <div className="confidence-bar">
      <div className="confidence-track">
        <div className={`confidence-fill ${cls}`} style={{ width: `${pct}%` }} />
      </div>
      <span>{pct}%</span>
    </div>
  );
}

export function FactsPanel() {
  const { facts } = useIncidentStore();
  const confirmed = facts.filter(f => f.status === 'CONFIRMED');

  return (
    <div className="panel" id="panel-facts">
      <div className="panel-header">
        <div className="panel-title">
          <span className="icon">✅</span>
          Confirmed Facts
        </div>
        <span className="panel-count">{confirmed.length}</span>
      </div>
      <div className="panel-body">
        {confirmed.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            No facts confirmed yet
          </div>
        ) : (
          confirmed.map((fact, idx) => (
            <div key={`${fact.id}-${idx}`} className="item-card fact">
              <div className="item-header">
                <span className="item-type-badge fact">Fact</span>
                <ConfidenceBadge confidence={fact.confidence} />
              </div>
              <div className="item-content">{fact.content}</div>
              <div className="item-meta">
                <span>{new Date(fact.createdAt).toLocaleTimeString()}</span>
                {fact.confirmedBy && <span>· confirmed</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
