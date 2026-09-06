'use client';

import React, { useState } from 'react';
import { useIncidentStore, ActionItem, ItemStatus } from '@/stores/incidentStore';

interface ActionItemsPanelProps {
  onViewAll?: () => void;
}

export function ActionItemsPanel({ onViewAll }: ActionItemsPanelProps) {
  const { actionItems, incident, toggleActionItemStatus, applyDelta } = useIncidentStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newOwner, setNewOwner] = useState('Alex Rivera');
  const [newPrio, setNewPrio] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const incidentId = incident?.id;

  const handleToggle = async (item: ActionItem) => {
    toggleActionItemStatus(item.id);

    if (!incidentId) return;

    const nextStatus: ItemStatus =
      item.status === 'RESOLVED' ? 'PENDING' : 'RESOLVED';

    try {
      await fetch(`/api/v1/incidents/${incidentId}/action-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch (err) {
      console.error('Failed to update action item on backend:', err);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const content = newTitle.trim();
    const ownerName = newOwner.trim() || 'Alex Rivera';

    // 1. Optimistic store update
    const tempId = crypto.randomUUID();
    applyDelta({
      incidentId: incidentId || 'demo',
      deltaType: 'ACTION_ITEM_ADDED',
      payload: {
        classificationId: tempId,
        summary: content,
        actionItemOwner: ownerName,
      },
      version: 1,
      timestamp: new Date().toISOString(),
    });

    // 2. Persist to API
    if (incidentId) {
      try {
        const res = await fetch(`/api/v1/incidents/${incidentId}/action-items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, ownerName }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data?.id) {
            // Updated item returned
          }
        }
      } catch (err) {
        console.error('Failed to save action item to backend:', err);
      }
    }

    setNewTitle('');
    setIsAdding(false);
    setIsSubmitting(false);
  };

  return (
    <div className="vaic-card" id="panel-actionItems">
      <div className="vaic-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 className="vaic-card-title">Action Items</h2>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            background: '#F1F5F9',
            color: '#475569',
            padding: '2px 7px',
            borderRadius: 12,
          }}>
            {actionItems.length}
          </span>
        </div>
        {onViewAll && (
          <button
            type="button"
            className="vaic-card-link"
            onClick={onViewAll}
            style={{ background: 'transparent', border: 'none', padding: 0 }}
          >
            View All →
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {actionItems.length === 0 ? (
          <div style={{
            padding: '24px 12px',
            textAlign: 'center',
            color: '#94A3B8',
            fontSize: 13,
          }}>
            No action items assigned yet. Click below to add tasks.
          </div>
        ) : (
          actionItems.map((item, idx) => {
            const isDone = item.status === 'RESOLVED';
            const owner = item.ownerName || 'Unassigned';
            const initials = owner
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();
            const colors = ['#2563EB', '#059669', '#D97706', '#7C3AED'];
            const avatarBg = colors[idx % colors.length];
            const prio = idx === 0 ? 'HIGH' : idx === 1 ? 'MEDIUM' : 'LOW';

            return (
              <div key={item.id} className="vaic-action-item">
                <div className="vaic-action-left">
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={() => handleToggle(item)}
                    className="vaic-checkbox"
                    title={isDone ? 'Mark as pending' : 'Mark as resolved'}
                  />
                  <span
                    className="vaic-action-title"
                    style={{
                      textDecoration: isDone ? 'line-through' : 'none',
                      color: isDone ? '#94A3B8' : '#0F172A',
                    }}
                  >
                    {item.content}
                  </span>
                </div>

                <div className="vaic-action-right">
                  <span className={`vaic-prio-badge ${prio.toLowerCase()}`}>
                    {prio}
                  </span>
                  <div
                    className="vaic-assignee-avatar"
                    style={{ background: avatarBg }}
                    title={`Assigned to ${owner}`}
                  >
                    {initials}
                  </div>
                  <span className="vaic-assignee-name">{owner}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isAdding ? (
        <form onSubmit={handleAddSubmit} style={{ marginTop: 14, padding: 12, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
          <input
            type="text"
            placeholder="Action item description..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px',
              fontSize: 13,
              borderRadius: 6,
              border: '1px solid #CBD5E1',
              marginBottom: 8,
              outline: 'none',
            }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <select
                value={newPrio}
                onChange={(e) => setNewPrio(e.target.value as any)}
                style={{ fontSize: 11, padding: '4px 6px', borderRadius: 4, border: '1px solid #CBD5E1' }}
              >
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
              <input
                type="text"
                placeholder="Assignee name"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, border: '1px solid #CBD5E1', width: 120 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, border: '1px solid #E2E8F0', background: '#FFFFFF', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{ fontSize: 11, padding: '4px 12px', borderRadius: 4, border: 'none', background: '#2563EB', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="vaic-add-action-btn"
          onClick={() => setIsAdding(true)}
        >
          + Add Action Item
        </button>
      )}
    </div>
  );
}
