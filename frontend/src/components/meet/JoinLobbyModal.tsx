'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useIncidentStore } from '@/stores/incidentStore';

interface JoinLobbyModalProps {
  incidentId: string;
  incidentTitle?: string;
  incidentSeverity?: string;
  activeParticipantsCount?: number;
  onAdmitted: (name: string, role: string) => void;
  sendMessage: (data: any) => void;
  lastWsMessage?: any;
}

export function JoinLobbyModal({
  incidentId,
  incidentTitle = 'Active Incident War Room',
  incidentSeverity = 'P1',
  activeParticipantsCount = 0,
  onAdmitted,
  sendMessage,
  lastWsMessage,
}: JoinLobbyModalProps) {
  const router = useRouter();
  const { userName, userRole, setUserName, setUserRole } = useIncidentStore();

  const [nameInput, setNameInput] = useState(userName || '');
  const [roleInput, setRoleInput] = useState(userRole || 'SRE');
  const [lobbyState, setLobbyState] = useState<'READY' | 'KNOCKING' | 'JOINING' | 'DENIED'>('READY');
  const [knockId, setKnockId] = useState<string>('');

  // Initial name from localStorage if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('vaic_user_name');
      if (stored && !nameInput) {
        setNameInput(stored);
      }
    }
  }, [nameInput]);

  // Listen for host response to our knock via WebSocket
  useEffect(() => {
    if (!lastWsMessage || lobbyState !== 'KNOCKING') return;

    if (lastWsMessage.type === 'knock.response') {
      const isTarget =
        lastWsMessage.knockId === knockId ||
        (lastWsMessage.userName &&
          lastWsMessage.userName.trim().toLowerCase() === nameInput.trim().toLowerCase());

      if (isTarget) {
        if (lastWsMessage.action === 'ADMIT') {
          console.log('🎉 Admitted to war room by host!');
          const effectiveName = nameInput.trim() || 'Responder';
          setUserName(effectiveName);
          setUserRole(roleInput);
          if (typeof window !== 'undefined') {
            localStorage.setItem('vaic_user_name', effectiveName);
            localStorage.setItem('vaic_user_role', roleInput);
            localStorage.setItem(`incident_${incidentId}_admitted`, 'true');
          }

          // Transition to the "Joining..." loading screen before entering the call
          setLobbyState('JOINING');
          setTimeout(() => {
            onAdmitted(effectiveName, roleInput);
          }, 1200);
        } else if (lastWsMessage.action === 'DENY') {
          console.warn('⛔ Join request denied by host');
          setLobbyState('DENIED');
        }
      }
    }
  }, [lastWsMessage, lobbyState, knockId, nameInput, roleInput, setUserName, setUserRole, incidentId, onAdmitted]);

  const handleAskToJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveName = nameInput.trim() || 'Responder';
    const newKnockId = `knock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    setKnockId(newKnockId);
    setLobbyState('KNOCKING');
    setUserName(effectiveName);
    setUserRole(roleInput);

    if (typeof window !== 'undefined') {
      localStorage.setItem('vaic_user_name', effectiveName);
      localStorage.setItem('vaic_user_role', roleInput);
    }

    // Broadcast knock request to host via WebSocket gateway
    sendMessage({
      type: 'knock.request',
      knockId: newKnockId,
      userName: effectiveName,
      userRole: roleInput,
      timestamp: new Date().toISOString(),
    });
  };

  const handleCancelKnock = () => {
    setLobbyState('READY');
    if (knockId) {
      sendMessage({
        type: 'knock.cancel',
        knockId,
        userName: nameInput,
      });
    }
  };

  // Helper for initials
  const initials = (nameInput.trim() || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // ─────────────────────────────────────────────────────────────
  // 1. FULL-SCREEN WAITING ("KNOCKING") & "JOINING..." LOADING SCREENS
  // ─────────────────────────────────────────────────────────────
  if (lobbyState === 'KNOCKING' || lobbyState === 'JOINING') {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#1E1F20',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-sans, "Google Sans", -apple-system, Roboto, sans-serif)',
        color: '#FFFFFF',
        padding: 24,
      }}>
        <style>{`
          @keyframes gmSpinner {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.97); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>
        {/* Google Meet Style Top-Left Branding */}
        <div style={{
          position: 'absolute',
          top: 24,
          left: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #1A73E8 0%, #7C3AED 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 14,
            color: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(26, 115, 232, 0.4)',
          }}>
            E
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#E8EAED', letterSpacing: '-0.2px' }}>
            EDITH <span style={{ color: '#9AA0A6', fontWeight: 400, fontSize: 13 }}>Incident War Room</span>
          </span>
        </div>

        {/* Central Card with Spinner */}
        <div style={{
          background: '#282A2C',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 24,
          padding: '48px 40px',
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'fadeIn 0.25s ease-out',
        }}>
          {lobbyState === 'KNOCKING' ? (
            <>
              {/* Spinner */}
              <div style={{
                position: 'relative',
                width: 56,
                height: 56,
                marginBottom: 24,
              }}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  border: '4px solid rgba(255, 255, 255, 0.12)',
                  borderTopColor: '#1A73E8',
                  borderRightColor: '#1A73E8',
                  animation: 'gmSpinner 0.8s linear infinite',
                }} />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}>
                  ⏳
                </div>
              </div>

              <h2 style={{
                fontSize: 22,
                fontWeight: 600,
                color: '#FFFFFF',
                margin: '0 0 10px 0',
                letterSpacing: '-0.3px',
              }}>
                Asking to join...
              </h2>

              <p style={{
                fontSize: 14,
                color: '#9AA0A6',
                lineHeight: 1.5,
                margin: '0 0 24px 0',
                maxWidth: 360,
              }}>
                You'll join the call when someone in the call lets you in.
              </p>

              {/* Requested Identity Badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 30,
                padding: '8px 18px 8px 10px',
                marginBottom: 28,
              }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#1A73E8',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                }}>
                  {initials}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>{nameInput || 'Responder'}</div>
                  <div style={{ fontSize: 11, color: '#A855F7', fontWeight: 600 }}>{roleInput.replace('_', ' ')}</div>
                </div>
              </div>

              {/* Cancel Request Button */}
              <button
                type="button"
                onClick={handleCancelKnock}
                style={{
                  padding: '10px 24px',
                  borderRadius: 20,
                  background: 'transparent',
                  color: '#8AB4F8',
                  border: '1px solid rgba(138, 180, 248, 0.35)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(138, 180, 248, 0.08)';
                  e.currentTarget.style.borderColor = '#8AB4F8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(138, 180, 248, 0.35)';
                }}
              >
                Cancel request
              </button>
            </>
          ) : (
            <>
              {/* Admitted & Joining State */}
              <div style={{
                position: 'relative',
                width: 56,
                height: 56,
                marginBottom: 24,
              }}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  border: '4px solid rgba(52, 211, 153, 0.2)',
                  borderTopColor: '#10B981',
                  borderRightColor: '#10B981',
                  animation: 'gmSpinner 0.8s linear infinite',
                }} />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  color: '#10B981',
                  fontWeight: 800,
                }}>
                  ✓
                </div>
              </div>

              <h2 style={{
                fontSize: 22,
                fontWeight: 600,
                color: '#FFFFFF',
                margin: '0 0 10px 0',
                letterSpacing: '-0.3px',
              }}>
                Joining...
              </h2>

              <p style={{
                fontSize: 14,
                color: '#34D399',
                lineHeight: 1.5,
                margin: '0 0 10px 0',
                fontWeight: 500,
              }}>
                Admitted by Incident Commander. Connecting to war room...
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. DENIED SCREEN
  // ─────────────────────────────────────────────────────────────
  if (lobbyState === 'DENIED') {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#1E1F20',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-sans, "Google Sans", -apple-system, Roboto, sans-serif)',
        color: '#FFFFFF',
        padding: 24,
      }}>
        <div style={{
          background: '#282A2C',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 24,
          padding: '48px 40px',
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🚫</div>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: '#EF4444', margin: '0 0 10px 0' }}>
            You can't join this call
          </h2>
          <p style={{
            fontSize: 14,
            color: '#9AA0A6',
            lineHeight: 1.5,
            margin: '0 0 28px 0',
          }}>
            Someone in the call denied your request to join. If you believe this was an error, please contact the Incident Commander.
          </p>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={() => setLobbyState('READY')}
              style={{
                padding: '10px 24px',
                borderRadius: 20,
                background: '#1A73E8',
                color: '#FFFFFF',
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => router.push('/incidents')}
              style={{
                padding: '10px 20px',
                borderRadius: 20,
                background: 'transparent',
                color: '#9AA0A6',
                border: '1px solid rgba(255,255,255,0.15)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Return to directory
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. READY TO JOIN FORM (Pre-Join Lobby)
  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: '#1E1F20',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-sans, "Google Sans", -apple-system, Roboto, sans-serif)',
      color: '#FFFFFF',
      padding: 24,
      boxSizing: 'border-box',
    }}>
      {/* Top Header Branding */}
      <div style={{
        position: 'absolute',
        top: 24,
        left: 28,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #1A73E8 0%, #7C3AED 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: 14,
          color: '#FFFFFF',
          boxShadow: '0 2px 8px rgba(26, 115, 232, 0.4)',
        }}>
          E
        </div>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#E8EAED', letterSpacing: '-0.2px' }}>
          EDITH <span style={{ color: '#9AA0A6', fontWeight: 400, fontSize: 13 }}>Incident War Room</span>
        </span>
      </div>

      {/* Centered Modal Card Container */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 36,
        maxWidth: 960,
        width: '100%',
      }}>
        {/* Left Side: Avatar Preview Tile */}
        <div style={{
          width: 380,
          height: 260,
          background: '#282A2C',
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {/* Avatar circle */}
          <div style={{
            width: 88,
            height: 88,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 34,
            fontWeight: 700,
            color: '#FFFFFF',
            boxShadow: '0 4px 20px rgba(59, 130, 246, 0.35)',
            marginBottom: 12,
          }}>
            {initials}
          </div>

          <span style={{ fontSize: 15, fontWeight: 600, color: '#E8EAED' }}>
            {nameInput.trim() || 'Your Name'}
          </span>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#A855F7',
            background: 'rgba(168, 85, 247, 0.12)',
            padding: '2px 8px',
            borderRadius: 6,
            marginTop: 6,
            letterSpacing: '0.04em',
          }}>
            {roleInput.replace('_', ' ')}
          </span>

          {/* Bottom Audio Indicator Badge */}
          <div style={{
            position: 'absolute',
            bottom: 14,
            left: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            padding: '4px 10px',
            borderRadius: 14,
            fontSize: 11,
            color: '#9AA0A6',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
            <span>Audio ready</span>
          </div>
        </div>

        {/* Right Side: Join Controls & Status */}
        <div style={{
          flex: 1,
          minWidth: 300,
          maxWidth: 420,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <form onSubmit={handleAskToJoin} style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Incident Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                color: incidentSeverity === 'P1' ? '#EF4444' : '#F59E0B',
                background: incidentSeverity === 'P1' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                padding: '3px 8px',
                borderRadius: 4,
              }}>
                {incidentSeverity}
              </span>
              <span style={{ fontSize: 13, color: '#9AA0A6' }}>
                {activeParticipantsCount > 0 ? `${activeParticipantsCount} responder${activeParticipantsCount > 1 ? 's' : ''} in call` : 'Waiting for host'}
              </span>
            </div>

            <h1 style={{
              fontSize: 26,
              fontWeight: 600,
              color: '#FFFFFF',
              margin: '0 0 8px 0',
              letterSpacing: '-0.4px',
            }}>
              Ready to join?
            </h1>

            <p style={{
              fontSize: 13,
              color: '#9AA0A6',
              margin: '0 0 24px 0',
              lineHeight: 1.5,
            }}>
              Enter your name and role. The Incident Commander will let you into the room once approved.
            </p>

            {/* Name Input */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#9AA0A6', marginBottom: 6, fontWeight: 500 }}>
                Your Name
              </label>
              <input
                type="text"
                required
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g. Sarah Chen"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 8,
                  background: '#282A2C',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#FFFFFF',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#1A73E8')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
              />
            </div>

            {/* Role Selector */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#9AA0A6', marginBottom: 6, fontWeight: 500 }}>
                Incident Role
              </label>
              <select
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 8,
                  background: '#282A2C',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#FFFFFF',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                }}
              >
                <option value="SRE">Site Reliability Engineer (SRE)</option>
                <option value="INCIDENT_COMMANDER">Incident Commander (IC)</option>
                <option value="COMMUNICATIONS_LEAD">Communications Lead</option>
                <option value="DATABASE_SPECIALIST">Database Specialist</option>
                <option value="SECURITY_LEAD">Security Lead</option>
                <option value="NETWORK_ENGINEER">Network Engineer</option>
                <option value="ENGINEER">Software Engineer</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  borderRadius: 24,
                  background: '#1A73E8',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(26, 115, 232, 0.4)',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#1557B0')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#1A73E8')}
              >
                Ask to join
              </button>
              <button
                type="button"
                onClick={() => router.push('/incidents')}
                style={{
                  padding: '12px 20px',
                  borderRadius: 24,
                  background: 'transparent',
                  color: '#9AA0A6',
                  border: '1px solid rgba(255,255,255,0.15)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
