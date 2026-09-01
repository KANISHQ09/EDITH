'use client';

import { useIncidentStore } from '@/stores/incidentStore';

export function ConflictsPanel() {
  const { conflicts, incident, resolveConflict } = useIncidentStore();
  const open = conflicts.filter(c => c.status === 'OPEN');

  return (
    <div className="panel panel-wide" id="panel-conflicts">
      <div className="panel-header">
        <div className="panel-title" style={{ color: open.length > 0 ? 'var(--color-conflict)' : undefined }}>
          <span className="icon">⚠️</span>
          Conflicts
          {open.length > 0 && <span style={{ fontSize: 10, opacity: 0.7 }}>— requires IC review</span>}
        </div>
        <span className="panel-count" style={{ background: open.length > 0 ? 'hsla(0,85%,62%,0.15)' : undefined, color: open.length > 0 ? 'var(--color-conflict)' : undefined }}>
          {open.length}
        </span>
      </div>
      <div className="panel-body" style={{ maxHeight: 'none' }}>
        {open.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" style={{ color: 'var(--color-fact)' }}>✓</div>
            No conflicting statements detected
          </div>
        ) : (
          open.map((conflict) => (
            <div key={conflict.id} className="conflict-alert">
              <div className="conflict-alert-header">
                <span>⚡</span>
                Conflicting Statements Detected
              </div>
              <div className="conflict-alert-body">
                {conflict.description}
              </div>
              <div className="conflict-alert-actions">
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => resolveConflict(conflict.id)}
                >
                  ✓ Mark Resolved
                </button>
                <button className="btn btn-ghost btn-sm">Dismiss</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
