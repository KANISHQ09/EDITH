'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useIncidentStore } from '@/stores/incidentStore';
import { useElapsedTime } from '@/hooks/useElapsedTime';
import { useAgoraVoice } from '@/hooks/useAgoraVoice';
import { useVoiceSynthesis } from '@/hooks/useVoiceSynthesis';
import { ReportModal } from '@/components/ReportModal';

export function AppHeader() {
  const { incident, wsConnected, participants, setIncident } = useIncidentStore();
  const elapsed = useElapsedTime(incident?.startTs);
  const [briefingText, setBriefingText] = useState<string | null>(null);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

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

  const speakerCount = participants.filter(p => !p.leftAt).length;

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

  return (
    <>
      <header className="app-header">
        {/* Brand */}
        <div className="header-brand">
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}>
            <div className="logo-dot" />
            VAIC
          </Link>
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 13 }}>
            — Voice AI Incident Commander
          </span>
        </div>

        {/* Incident Info */}
        {incident && (
          <div className="header-incident-badge">
            <span className={`badge-severity ${incident.severity.toLowerCase()}`}>
              {incident.severity}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {incident.title}
            </span>
            <span className={`badge-status ${incident.status.toLowerCase()}`}>
              {incident.status}
            </span>
            <span className="elapsed-timer">{elapsed}</span>
          </div>
        )}

        {/* Status Controls */}
        <div className="header-actions">
          {/* Agora Voice Bridge Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px', borderRight: '1px solid var(--border-subtle)' }}>
            {!isJoined ? (
              <button
                onClick={joinVoice}
                disabled={isConnecting}
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                title="Join live Agora voice room"
              >
                {isConnecting ? '⏳ Connecting...' : '🎙️ Join Voice Call'}
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--color-fact)',
                  background: 'hsla(150, 70%, 45%, 0.15)',
                  padding: '3px 8px',
                  borderRadius: 12,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--color-fact)',
                    boxShadow: activeSpeakers.size > 0 ? '0 0 8px var(--color-fact)' : 'none'
                  }} />
                  Voice Live ({1 + remoteUsers.length})
                </span>

                <button
                  onClick={toggleMute}
                  className={`btn btn-sm ${isMuted ? 'btn-danger' : 'btn-secondary'}`}
                  style={{ fontSize: 12, padding: '4px 8px' }}
                  title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMuted ? '🔇 Unmute' : '🎤 Mute'}
                </button>

                <button
                  onClick={leaveVoice}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 12, padding: '4px 8px', color: 'var(--color-conflict)' }}
                  title="Leave voice bridge"
                >
                  Leave
                </button>
              </div>
            )}
            {voiceError && (
              <span style={{ color: 'var(--color-conflict)', fontSize: 10 }} title={voiceError}>
                ⚠️ Voice Error
              </span>
            )}
          </div>

          {/* Ask for Briefing */}
          <button
            onClick={handleRequestBriefing}
            disabled={isBriefingLoading}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
            title="Ask EDITH for a 30-second spoken situation update"
          >
            {isBriefingLoading ? '⏳ Synthesizing...' : isSpeaking ? '🔊 Speaking...' : '🗣️ Ask Briefing'}
          </button>

          {/* VAIC Listening Indicator */}
          <div className="vaic-status">
            <div className="vaic-dot" />
            VAIC listening
          </div>

          {/* WS Connection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: wsConnected ? 'var(--color-fact)' : 'var(--text-muted)' }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: wsConnected ? 'var(--color-fact)' : 'var(--color-conflict)',
            }} />
            {wsConnected ? 'Live' : 'Reconnecting'}
          </div>

          {/* Participant Count */}
          <button className="btn btn-ghost btn-sm">
            👥 {speakerCount} on call
          </button>

          {/* Resolve Incident or View Report */}
          {incident?.status === 'ACTIVE' ? (
            <button
              onClick={handleResolveIncident}
              disabled={isResolving}
              className="btn btn-success btn-sm"
              style={{ fontWeight: 600 }}
            >
              {isResolving ? '⏳ Generating ISR...' : '✓ Resolve Incident'}
            </button>
          ) : (
            <button
              onClick={() => setIsReportOpen(true)}
              className="btn btn-primary btn-sm"
              style={{ fontWeight: 600 }}
            >
              📄 View Report
            </button>
          )}
        </div>
      </header>

      {/* Spoken Briefing Banner */}
      {briefingText && (
        <div style={{
          background: 'linear-gradient(90deg, #1e1e2e, #181825)',
          borderBottom: '1px solid #fab387',
          padding: '8px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 13,
          color: '#cdd6f4',
          zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🗣️</span>
            <strong>EDITH Verbal Briefing:</strong>
            <span>{briefingText}</span>
          </div>
          <button
            onClick={() => {
              stopSpeaking();
              setBriefingText(null);
            }}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 12, padding: '2px 8px' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Post-Mortem Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        reportMarkdown={reportMarkdown || ''}
        incidentTitle={incident?.title || 'Incident'}
      />
    </>
  );
}
