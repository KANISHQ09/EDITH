'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useIncidentStore } from '@/stores/incidentStore';
import { useElapsedTime } from '@/hooks/useElapsedTime';
import { useAgoraVoice } from '@/hooks/useAgoraVoice';
import { useVoiceSynthesis } from '@/hooks/useVoiceSynthesis';
import { ReportModal } from '@/components/ReportModal';
import { UserProfileModal } from '@/components/UserProfileModal';

export function AppHeader() {
  const {
    incident,
    wsConnected,
    participants,
    setIncident,
    userName,
    userRole,
    warRoomView,
    setWarRoomView,
  } = useIncidentStore();
  const elapsed = useElapsedTime(incident?.startTs);
  const [briefingText, setBriefingText] = useState<string | null>(null);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const { speak, stop: stopSpeaking, isSpeaking } = useVoiceSynthesis();

  const {
    isJoined,
    isConnecting,
    isMuted,
    activeSpeakers,
    remoteUsers,
    error: voiceError,
    joinVoice,
    leaveVoice,
    toggleMute,
  } = useAgoraVoice(incident?.id || 'demo');

  const handleRequestBriefing = async () => {
    if (isBriefingLoading) return;
    setIsBriefingLoading(true);
    setBriefingText(null);

    try {
      const res = await fetch(`/api/v1/incidents/${incident?.id || 'demo'}/briefing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      const text = data.data?.briefingText;
      if (text) {
        setBriefingText(text);
        speak(text);
      }
    } catch (err) {
      console.error('Failed to get briefing:', err);
    } finally {
      setIsBriefingLoading(false);
    }
  };

  const handleResolveIncident = async () => {
    if (isResolving) return;
    const confirm = window.confirm(
      'Are you sure you want to resolve this incident? This will close active investigation and generate the Executive Post-Mortem ISR.'
    );
    if (!confirm) return;

    setIsResolving(true);
    try {
      const res = await fetch(`/api/v1/incidents/${incident?.id || 'demo'}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.data?.reportMarkdown) {
        setReportMarkdown(data.data.reportMarkdown);
        setIsReportOpen(true);
        if (incident) {
          setIncident({ ...incident, status: 'RESOLVED', resolvedTs: new Date().toISOString() });
        }
      }
    } catch (err) {
      console.error('Failed to resolve incident:', err);
    } finally {
      setIsResolving(false);
    }
  };

  const title = incident?.title || 'Network Intrusion – DB Server';
  const incidentCode = incident?.id && incident.id.length < 24 ? incident.id : 'INC-2025-06-19-0007';
  const severity = incident?.severity || 'HIGH';
  const isLive = (incident?.status || 'ACTIVE') === 'ACTIVE';

  const formatStarted = (ts?: string) => {
    if (!ts) return '19 Jun 2025, 10:24 AM';
    try {
      const d = new Date(ts);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
        ', ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '19 Jun 2025, 10:24 AM';
    }
  };

  return (
    <>
      <header className="vaic-topbar">
        {/* Left: Incident Title, Badges, ID */}
        <div>
          <div className="vaic-title-row">
            <h1 className="vaic-incident-title">{title}</h1>
            <span className="vaic-pill-high">{severity}</span>
            {isLive && (
              <span className="vaic-pill-live">
                <span className="vaic-live-dot" /> LIVE
              </span>
            )}
          </div>
          <div className="vaic-incident-id">{incidentCode}</div>
        </div>

        {/* Right: Started, Response Time, Voice status, Bell, User Profile */}
        <div className="vaic-topbar-right">
          {/* Started Timestamp */}
          <div className="vaic-meta-item" title="Incident Initiation Time">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>
              Started <strong style={{ color: '#0F172A', marginLeft: 4 }}>{formatStarted(incident?.startTs)}</strong>
            </span>
          </div>

          {/* Response / Elapsed Time */}
          <div className="vaic-meta-item" title="Elapsed Active Response Time">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>
              Response Time <strong style={{ color: '#0F172A', marginLeft: 4 }}>{elapsed || '00:42:18'}</strong>
            </span>
          </div>

          {/* Live Agora Voice controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isJoined ? (
              <button
                type="button"
                onClick={async () => {
                  setWarRoomView('meet');
                  await joinVoice();
                }}
                disabled={isConnecting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '5px 10px',
                  borderRadius: 8,
                  border: '1px solid #BFDBFE',
                  background: '#EFF6FF',
                  color: '#2563EB',
                  cursor: 'pointer',
                }}
                title="Enter Google Meet Style Incident Room Call"
              >
                <span>{isConnecting ? '⏳' : '📞'}</span>
                <span>{isConnecting ? 'Connecting...' : 'Join Call'}</span>
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#16A34A',
                  background: '#DCFCE7',
                  padding: '4px 8px',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A' }} />
                  Call Live ({1 + remoteUsers.length})
                </span>
                <button
                  type="button"
                  onClick={toggleMute}
                  style={{
                    fontSize: 11,
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  {isMuted ? '🔇' : '🎤'}
                </button>
                <button
                  type="button"
                  onClick={leaveVoice}
                  style={{
                    fontSize: 11,
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid #FCA5A5',
                    background: '#FEE2E2',
                    color: '#DC2626',
                    cursor: 'pointer',
                  }}
                >
                  Leave
                </button>
              </div>
            )}
          </div>

          {/* User Profile Pill: Define Name & Role */}
          <div
            className="vaic-user-pill"
            style={{ cursor: 'pointer' }}
            title="Click to edit your responder name & role"
            onClick={() => setIsProfileModalOpen(true)}
          >
            <div className="vaic-user-avatar" style={{ background: userName ? '#2563EB' : '#64748B' }}>
              {userName
                ? userName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                : '?'}
            </div>
            <span className="vaic-user-name">
              {userName || 'Define Name'}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </div>
        </div>
      </header>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        incidentId={incident?.id}
      />

      {/* Spoken Briefing Banner */}
      {briefingText && (
        <div style={{
          background: '#EFF6FF',
          borderBottom: '1px solid #BFDBFE',
          padding: '10px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 13,
          color: '#1E40AF',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>🔊 <strong>VAIC Spoken Briefing:</strong></span>
            <span>{briefingText}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => isSpeaking ? stopSpeaking() : speak(briefingText)}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 6,
                background: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {isSpeaking ? 'Stop Audio' : 'Play Again'}
            </button>
            <button
              onClick={() => setBriefingText(null)}
              style={{
                fontSize: 11,
                padding: '4px 8px',
                borderRadius: 6,
                background: 'transparent',
                border: '1px solid #BFDBFE',
                color: '#2563EB',
                cursor: 'pointer',
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Post-Mortem ISR Modal */}
      {isReportOpen && reportMarkdown && (
        <ReportModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          reportMarkdown={reportMarkdown}
          incidentTitle={title}
        />
      )}
    </>
  );
}
