'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useIncidentStore } from '@/stores/incidentStore';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidentId?: string;
  isInitialJoin?: boolean;
}

export function UserProfileModal({ isOpen, onClose, incidentId, isInitialJoin = false }: UserProfileModalProps) {
  const [mounted, setMounted] = useState(false);
  const { userName, userRole, setUserName, setUserRole } = useIncidentStore();
  const [nameInput, setNameInput] = useState(userName || '');
  const [roleInput, setRoleInput] = useState(userRole || 'INCIDENT_COMMANDER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveName = nameInput.trim() || 'Responder';

    setIsSubmitting(true);
    setUserName(effectiveName);
    setUserRole(roleInput);

    // Register on backend if incidentId is available
    if (incidentId) {
      try {
        await fetch(`/api/v1/incidents/${incidentId}/participants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: effectiveName,
            role: roleInput,
          }),
        });
      } catch (err) {
        console.error('Failed to register participant:', err);
      }
    }

    setIsSubmitting(false);
    onClose();
  };

  return createPortal(
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
      }}
      onClick={onClose}
    >
      <div
        className="vaic-card profile-modal-card"
        style={{
          width: '92vw',
          maxWidth: 440,
          maxHeight: '90dvh',
          overflowY: 'auto',
          padding: 'clamp(16px, 4vw, 24px)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>👤</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                {isInitialJoin ? 'Join Incident Room' : 'Your Responder Profile'}
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>
                Define how your voice and actions appear to other responders
              </p>
            </div>
          </div>

          {!isInitialJoin && (
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94A3B8' }}
            >
              ✕
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Your Full Name or Call-Sign *
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Alex Rivera, Sarah Chen, SRE-Oncall"
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: 13,
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                outline: 'none',
              }}
              autoFocus
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Incident Role
            </label>
            <select
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: 13,
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                outline: 'none',
              }}
            >
              <option value="INCIDENT_COMMANDER">Incident Commander (IC)</option>
              <option value="RESPONDER">Core Responder / SRE</option>
              <option value="OBSERVER">Observer / Stakeholder</option>
              <option value="BUSINESS_STAKEHOLDER">Business Stakeholder</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            {!isInitialJoin && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting || !nameInput.trim()}
              style={{
                padding: '8px 20px',
                borderRadius: 6,
                border: 'none',
                background: nameInput.trim() ? '#2563EB' : '#94A3B8',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: 13,
                cursor: nameInput.trim() ? 'pointer' : 'default',
              }}
            >
              {isSubmitting ? 'Joining...' : isInitialJoin ? 'Join Incident Room →' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
