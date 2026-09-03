'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DeclareIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIncidentCreated?: (newInc: any) => void;
}

export function DeclareIncidentModal({ isOpen, onClose, onIncidentCreated }: DeclareIncidentModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<'P1' | 'P2' | 'P3' | 'P4'>('P1');
  const [systems, setSystems] = useState('checkout-api, redis-primary');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const affectedSystems = systems
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const res = await fetch('/api/v1/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          severity,
          affectedSystems: affectedSystems.length > 0 ? affectedSystems : ['core-services'],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newInc = data.data;
        onIncidentCreated?.(newInc);
        onClose();
        router.push(`/incident/${newInc.id}`);
      }
    } catch (err) {
      console.error('Failed to declare incident:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          color: '#0B0C0E',
          maxWidth: 520,
          border: '1px solid var(--studio-border)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 28,
              height: 28,
              borderRadius: 4,
              background: 'var(--cobalt-primary)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 800,
            }}>
              🚨
            </span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--studio-text)' }}>
                Declare Outage Incident
              </div>
              <div style={{ fontSize: 11, color: 'var(--studio-muted)' }}>
                Assemble EDITH AI war room &amp; responder bridge
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 16, padding: '2px 8px', color: 'var(--studio-muted)' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--studio-muted)', display: 'block', marginBottom: 6 }}>
              Incident Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Checkout API latency spike and connection drops"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 4,
                border: '1px solid var(--studio-border)',
                background: '#FAFAFC',
                color: 'var(--studio-text)',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--studio-muted)', display: 'block', marginBottom: 6 }}>
              Severity Level
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {(['P1', 'P2', 'P3', 'P4'] as const).map((lvl) => {
                const isSelected = severity === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSeverity(lvl)}
                    style={{
                      padding: '8px 0',
                      borderRadius: 4,
                      fontFamily: 'var(--dot-matrix-font)',
                      fontWeight: 800,
                      fontSize: 12,
                      border: `1px solid ${isSelected ? 'var(--cobalt-primary)' : 'var(--studio-border)'}`,
                      background: isSelected ? 'var(--cobalt-primary)' : '#FAFAFC',
                      color: isSelected ? '#FFFFFF' : 'var(--studio-text)',
                      cursor: 'pointer',
                    }}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--studio-muted)', display: 'block', marginBottom: 6 }}>
              Affected Systems (comma-separated)
            </label>
            <input
              type="text"
              placeholder="e.g. api-gateway, postgres-primary, redis-cache"
              value={systems}
              onChange={(e) => setSystems(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 4,
                border: '1px solid var(--studio-border)',
                background: '#FAFAFC',
                color: 'var(--studio-text)',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-studio-outline"
              style={{ padding: '8px 16px', fontSize: 12 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="btn-cobalt"
              style={{ padding: '8px 18px', fontSize: 12 }}
            >
              {isSubmitting ? 'Assembling...' : 'Assemble War Room →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
