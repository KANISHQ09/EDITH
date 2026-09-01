'use client';

import { useState } from 'react';
import { useIncidentStore, ToolAction } from '@/stores/incidentStore';

export function ConfirmationModal() {
  const { pendingToolActions, confirmToolAction, rejectToolAction } = useIncidentStore();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = pendingToolActions.filter(a => !dismissed.has(a.id));

  if (visible.length === 0) return null;

  const action = visible[0]; // Show one at a time

  const handleConfirm = () => {
    confirmToolAction(action.id);
    setDismissed(prev => new Set([...prev, action.id]));
  };

  const handleReject = () => {
    rejectToolAction(action.id);
    setDismissed(prev => new Set([...prev, action.id]));
  };

  const toolIcon = action.tool === 'slack' ? '💬' : action.tool === 'jira' ? '📋' : action.tool === 'pagerduty' ? '🚨' : '🔧';

  const payloadPreview = action.tool === 'slack'
    ? (action.payload as any)?.text || JSON.stringify(action.payload)
    : JSON.stringify(action.payload, null, 2);

  return (
    <div className="modal-overlay" onClick={handleReject}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-icon">{toolIcon}</div>
          <div>
            <div className="modal-title">VAIC Confirmation Required</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              VAIC notice: I'd like to execute a {action.tool} action. Your approval is required.
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
            Tool: <strong style={{ color: 'var(--text-secondary)' }}>{action.tool}</strong>
            &nbsp;·&nbsp;Action: <strong style={{ color: 'var(--text-secondary)' }}>{action.actionType}</strong>
          </div>
        </div>

        <div className="modal-body">
          {payloadPreview}
        </div>

        <div className="modal-footer">
          <button className="btn btn-danger" onClick={handleReject}>
            ✕ Reject
          </button>
          <button className="btn btn-success" onClick={handleConfirm}>
            ✓ Confirm &amp; Execute
          </button>
        </div>

        {visible.length > 1 && (
          <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
            {visible.length - 1} more pending action{visible.length > 2 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
