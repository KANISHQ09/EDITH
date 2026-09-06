'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useIncidentStore, Participant, ClassificationType } from '@/stores/incidentStore';
import { useAgoraVoice } from '@/hooks/useAgoraVoice';
import { useVoiceSynthesis } from '@/hooks/useVoiceSynthesis';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { AiAssistant3DOrb } from '@/components/landing/AiAssistant3DOrb';

interface GoogleMeetWarRoomProps {
  incidentId: string;
  onDeclareResolved?: () => void;
  onOpenReport?: () => void;
}

export function GoogleMeetWarRoom({
  incidentId,
  onDeclareResolved,
  onOpenReport,
}: GoogleMeetWarRoomProps) {
  const router = useRouter();
  const {
    incident,
    participants,
    recentTranscripts,
    facts,
    hypotheses,
    actionItems,
    decisions,
    conflicts,
    pendingToolActions,
    confirmToolAction,
    rejectToolAction,
    userName,
    userRole,
    speechLanguage,
    setSpeechLanguage,
    isSpeechListening,
    setIsSpeechListening,
    interimTranscript,
    activeBriefing,
    setActiveBriefing,
    submitUtterance,
    toggleActionItemStatus,
    setInitialState,
  } = useIncidentStore();

  // Agora Voice conference call integration
  const {
    isJoined,
    isConnecting,
    isMuted,
    activeSpeakers,
    remoteUsers,
    joinVoice,
    leaveVoice,
    toggleMute,
  } = useAgoraVoice(incidentId);

  // Speech Recognition & Web Audio volume monitoring
  const { audioLevel, permissionError } = useSpeechRecognition({
    incidentId,
    speakerName: userName || 'Incident Commander',
    speakerRole: userRole || 'INCIDENT_COMMANDER',
  });

  // Voice synthesis for spoken EDITH briefings
  const { speak, stop: stopSpeaking, isSpeaking } = useVoiceSynthesis();

  // UI state
  const [activeDrawer, setActiveDrawer] = useState<'transcripts' | 'people' | 'intelligence' | 'timeline' | 'controls' | null>(null);
  const [showCaptions, setShowCaptions] = useState(true);
  const [showKpiBar, setShowKpiBar] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showAskModal, setShowAskModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [askQuery, setAskQuery] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isVoiceQueryActive, setIsVoiceQueryActive] = useState(false);
  const [voiceQueryTranscript, setVoiceQueryTranscript] = useState('');
  const [isEdithThinking, setIsEdithThinking] = useState(false);
  const voiceRecognitionRef = useRef<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [transcriptFilter, setTranscriptFilter] = useState<'ALL' | 'MINE' | 'FACTS'>('ALL');
  const [currentTime, setCurrentTime] = useState('');
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Manual Intel / Finding Entry in Drawer 2
  const [showAddIntelForm, setShowAddIntelForm] = useState(false);
  const [newIntelType, setNewIntelType] = useState<'FACT' | 'ACTION_ITEM' | 'HYPOTHESIS' | 'DECISION'>('FACT');
  const [newIntelContent, setNewIntelContent] = useState('');
  const [newIntelOwner, setNewIntelOwner] = useState('');
  const [isAddingIntel, setIsAddingIntel] = useState(false);

  // Integrations & API configuration modal
  const [showIntegrationsModal, setShowIntegrationsModal] = useState(false);
  const [integrationActiveTab, setIntegrationActiveTab] = useState<'elevenlabs' | 'slack' | 'jira' | 'pagerduty'>('elevenlabs');
  const [roomIntegrations, setRoomIntegrations] = useState<any>({
    elevenLabsApiKey: '',
    elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
    slackWebhookUrl: '',
    slackChannel: '',
    jiraBaseUrl: '',
    jiraProjectKey: '',
    jiraApiToken: '',
    pagerdutyRoutingKey: '',
  });
  const [isSavingIntegrations, setIsSavingIntegrations] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const storedInc = (incident?.settings as any)?.integrations || {};
      setRoomIntegrations({
        elevenLabsApiKey: localStorage.getItem('edith_elevenlabs_api_key') || storedInc.elevenLabsApiKey || '',
        elevenLabsVoiceId: localStorage.getItem('edith_elevenlabs_voice_id') || storedInc.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM',
        slackWebhookUrl: localStorage.getItem('edith_slack_webhook') || storedInc.slackWebhookUrl || '',
        slackChannel: localStorage.getItem('edith_slack_channel') || storedInc.slackChannel || '',
        jiraBaseUrl: localStorage.getItem('edith_jira_url') || storedInc.jiraBaseUrl || '',
        jiraProjectKey: localStorage.getItem('edith_jira_key') || storedInc.jiraProjectKey || '',
        jiraApiToken: localStorage.getItem('edith_jira_token') || storedInc.jiraApiToken || '',
        pagerdutyRoutingKey: localStorage.getItem('edith_pagerduty_key') || storedInc.pagerdutyRoutingKey || '',
      });
    }
  }, [incident?.settings]);

  // Call duration stopwatch timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCallDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Floating Closed Captions state with automatic dismiss after silence
  const [activeCaption, setActiveCaption] = useState<{ speaker: string; text: string; isLive: boolean } | null>(null);
  const captionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Live interim speech caption
  useEffect(() => {
    if (interimTranscript && interimTranscript.trim()) {
      if (captionTimerRef.current) {
        clearTimeout(captionTimerRef.current);
        captionTimerRef.current = null;
      }
      setActiveCaption({
        speaker: userName || 'You',
        text: interimTranscript.trim(),
        isLive: true,
      });
    } else if (activeCaption?.isLive) {
      if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
      captionTimerRef.current = setTimeout(() => {
        setActiveCaption(null);
      }, 3000);
    }
  }, [interimTranscript, userName, activeCaption?.isLive]);

  // When a finalized transcript entry arrives, show it and auto-hide after 3.5 seconds
  const latestTranscript = recentTranscripts[0];
  const latestTranscriptKey = latestTranscript ? `${latestTranscript.id || ''}-${latestTranscript.startTs || ''}-${latestTranscript.content}` : '';

  useEffect(() => {
    if (!latestTranscript) return;

    if (captionTimerRef.current) {
      clearTimeout(captionTimerRef.current);
      captionTimerRef.current = null;
    }

    setActiveCaption({
      speaker: latestTranscript.speakerName || 'Speaker',
      text: latestTranscript.content,
      isLive: false,
    });

    // Auto-dismiss after 3.5 seconds of silence
    captionTimerRef.current = setTimeout(() => {
      setActiveCaption(null);
    }, 3500);

    return () => {
      if (captionTimerRef.current) {
        clearTimeout(captionTimerRef.current);
      }
    };
  }, [latestTranscriptKey]);

  // Clock in Google Meet header
  useEffect(() => {
    const updateClock = () => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Synchronize mic button with Agora audio and speech recognition
  const handleToggleMic = async () => {
    if (!isJoined) {
      await joinVoice();
      setIsSpeechListening(true);
    } else {
      toggleMute();
      setIsSpeechListening(!isSpeechListening);
    }
  };

  // Copy shareable meeting invite link
  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Trigger verbal and text situation briefing
  const handleRequestBriefing = async () => {
    if (isGeneratingBriefing) return;
    setIsGeneratingBriefing(true);

    try {
      const res = await fetch(`/api/v1/incidents/${incidentId}/briefing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      const briefingText = data.data?.briefingText;

      if (briefingText) {
        setActiveBriefing({
          text: briefingText,
          isSpeaking: true,
          timestamp: new Date().toISOString(),
        });
        speak(briefingText, speechLanguage);
      } else {
        const fallbackText = `Situation update: We are tracking ${incident?.severity || 'P1'} incident ${incident?.title || 'active alert'} with ${facts.length} confirmed facts and ${actionItems.length} action items.`;
        setActiveBriefing({
          text: fallbackText,
          isSpeaking: true,
          timestamp: new Date().toISOString(),
        });
        speak(fallbackText, speechLanguage);
      }
    } catch (err) {
      console.error('Failed to get verbal briefing:', err);
      const errText = `EDITH Briefing: Tracking ${facts.length} confirmed facts and ${hypotheses.length} hypotheses.`;
      setActiveBriefing({
        text: errText,
        isSpeaking: true,
        timestamp: new Date().toISOString(),
      });
      speak(errText, speechLanguage);
    } finally {
      setIsGeneratingBriefing(false);
    }
  };

  // Core: Ask EDITH query execution (used by both direct voice talk & modal text input)
  const executeEdithQuery = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || isAsking) return;

    setIsAsking(true);
    setIsEdithThinking(true);
    try {
      const res = await fetch(`/api/v1/incidents/${incidentId}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      });
      const data = await res.json();
      const rawAnswer = data.data?.answer || 'EDITH has analyzed the available telemetry.';

      // Strictly sanitize: remove any "A:", "Answer:", markdown prefixes
      const cleanAnswer = rawAnswer
        .replace(/^(\s*(\*\*A:\*\*|\*\*Answer:\*\*|A:|Answer:)\s*)/i, '')
        .replace(/[`*#_]/g, '')
        .trim();

      setActiveBriefing({
        text: cleanAnswer,
        isSpeaking: true,
        timestamp: new Date().toISOString(),
      });
      speak(cleanAnswer, speechLanguage);
      setAskQuery('');
      setShowAskModal(false);
    } catch (err) {
      console.error('EDITH query failed:', err);
    } finally {
      setIsAsking(false);
      setIsEdithThinking(false);
    }
  };

  // Direct Voice Interaction: Talk directly to EDITH in real time
  const startVoiceQuery = () => {
    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setShowAskModal(true);
      return;
    }

    stopSpeaking();

    try {
      if (voiceRecognitionRef.current) {
        voiceRecognitionRef.current.abort();
      }

      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';

      setIsVoiceQueryActive(true);
      setVoiceQueryTranscript('');

      rec.onresult = (event: any) => {
        let current = '';
        let isFinal = false;
        for (let i = 0; i < event.results.length; i++) {
          current += event.results[i][0].transcript;
          if (event.results[i].isFinal) isFinal = true;
        }
        setVoiceQueryTranscript(current);

        if (isFinal && current.trim()) {
          try { rec.stop(); } catch {}
          setIsVoiceQueryActive(false);
          executeEdithQuery(current.trim());
        }
      };

      rec.onerror = (e: any) => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn('Voice query error:', e.error);
        }
        setIsVoiceQueryActive(false);
      };

      rec.onend = () => {
        setIsVoiceQueryActive(false);
      };

      rec.start();
      voiceRecognitionRef.current = rec;
    } catch (err) {
      console.error('Failed to start voice query:', err);
      setShowAskModal(true);
    }
  };

  const stopVoiceQuery = () => {
    if (voiceRecognitionRef.current) {
      try { voiceRecognitionRef.current.stop(); } catch {}
    }
    setIsVoiceQueryActive(false);
    if (voiceQueryTranscript.trim()) {
      executeEdithQuery(voiceQueryTranscript.trim());
    }
  };

  // Ask EDITH custom query via modal form
  const handleAskVaicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    executeEdithQuery(askQuery);
  };

  // Manually add finding / action item / decision / hypothesis to war room
  const handleManualIntelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIntelContent.trim() || isAddingIntel) return;

    setIsAddingIntel(true);
    try {
      if (newIntelType === 'FACT') {
        const res = await fetch(`/api/v1/incidents/${incidentId}/facts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: newIntelContent.trim() }),
        });
        const data = await res.json();
        if (data.data) {
          setInitialState({ facts: [...facts, data.data] });
        }
      } else if (newIntelType === 'ACTION_ITEM') {
        const res = await fetch(`/api/v1/incidents/${incidentId}/action-items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: newIntelContent.trim(),
            ownerName: newIntelOwner.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (data.data) {
          setInitialState({ actionItems: [...actionItems, data.data] });
        }
      } else if (newIntelType === 'HYPOTHESIS') {
        const res = await fetch(`/api/v1/incidents/${incidentId}/hypotheses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: newIntelContent.trim() }),
        });
        const data = await res.json();
        if (data.data) {
          setInitialState({ hypotheses: [...hypotheses, data.data] });
        }
      } else if (newIntelType === 'DECISION') {
        const res = await fetch(`/api/v1/incidents/${incidentId}/decisions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: newIntelContent.trim() }),
        });
        const data = await res.json();
        if (data.data) {
          setInitialState({ decisions: [...decisions, data.data] });
        }
      }

      setNewIntelContent('');
      setNewIntelOwner('');
      setShowAddIntelForm(false);
    } catch (err) {
      console.error('Failed to add intel manually:', err);
    } finally {
      setIsAddingIntel(false);
    }
  };

  // Save updated room integrations
  const handleSaveIntegrations = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingIntegrations(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('edith_elevenlabs_api_key', roomIntegrations.elevenLabsApiKey || '');
        localStorage.setItem('edith_elevenlabs_voice_id', roomIntegrations.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM');
        localStorage.setItem('edith_slack_webhook', roomIntegrations.slackWebhookUrl || '');
        localStorage.setItem('edith_slack_channel', roomIntegrations.slackChannel || '');
        localStorage.setItem('edith_jira_url', roomIntegrations.jiraBaseUrl || '');
        localStorage.setItem('edith_jira_key', roomIntegrations.jiraProjectKey || '');
        localStorage.setItem('edith_jira_token', roomIntegrations.jiraApiToken || '');
        localStorage.setItem('edith_pagerduty_key', roomIntegrations.pagerdutyRoutingKey || '');
      }
      await fetch(`/api/v1/incidents/${incidentId}/integrations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomIntegrations),
      });
      setShowIntegrationsModal(false);
    } catch (err) {
      console.error('Failed to update integrations:', err);
    } finally {
      setIsSavingIntegrations(false);
    }
  };

  // Delete Room Permanently
  const handleDeleteRoom = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/v1/incidents/${incidentId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to delete room');
      }
      router.push('/');
    } catch (err: any) {
      setDeleteError(err.message || 'Error deleting incident room');
      setIsDeleting(false);
    }
  };

  // Submit manual chat / transcript message
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput('');
    await submitUtterance(text, userName || 'Incident Commander', userRole || 'INCIDENT_COMMANDER');
  };

  // User initials helper
  const getInitials = (name?: string) => {
    if (!name) return 'IC';
    return name
      .replace('(You)', '')
      .trim()
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'IC';
  };

  // KPI Calculations
  const totalActions = actionItems.length;
  const resolvedActions = actionItems.filter((a) => a.status === 'RESOLVED').length;

  // Real-time lifecycle incident progress calculation:
  // Starts at 15% triage baseline -> +25% for facts -> +20% for hypotheses -> +20% for decisions -> +20% for action items -> 100% on resolved
  let progressPercent = 15;
  if (incident?.status === 'RESOLVED') {
    progressPercent = 100;
  } else {
    if (facts.length > 0) progressPercent += Math.min(25, facts.length * 10);
    if (hypotheses.length > 0) progressPercent += Math.min(20, hypotheses.length * 10);
    if (decisions.length > 0) progressPercent += Math.min(20, decisions.length * 10);
    if (totalActions > 0) {
      progressPercent += Math.round((resolvedActions / totalActions) * 20);
    }
    progressPercent = Math.min(95, progressPercent);
  }

  const allConfidenceItems = [...facts, ...hypotheses].filter((x) => x.confidence !== undefined);
  const avgConfidence =
    allConfidenceItems.length > 0
      ? Math.round(
          (allConfidenceItems.reduce((acc, curr) => acc + (curr.confidence || 0.8), 0) /
            allConfidenceItems.length) *
            100
        )
      : 85;

  const meetingCode = incident?.id ? incident.id.slice(0, 12) : 'inc-war-room';
  const isSelfSpeaking = (audioLevel > 18 && isSpeechListening) || activeSpeakers.has(0);

  return (
    <div className="gm-container">
      {/* ───────────────────────────────────────────────────────── */}
      {/* Google Meet Top Bar */}
      {/* ───────────────────────────────────────────────────────── */}
      <header className="gm-topbar">
        <div className="gm-topbar-left">
          {/* Home Button on Left */}
          <button
            type="button"
            onClick={() => {
              leaveVoice();
              setIsSpeechListening(false);
              router.push('/');
            }}
            className="gm-home-top-btn"
            title="Return to EDITH Landing Page"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>Home</span>
          </button>

          {/* Call Duration Timer on Left */}
          <div className="gm-call-timer" title="Elapsed Call Duration">
            <span className="gm-call-timer-dot" />
            <span>{formatCallDuration(callDuration)}</span>
          </div>
        </div>

        <div className="gm-topbar-right">
          {/* Toggle KPI Telemetry Strip */}
          <button
            type="button"
            onClick={() => setShowKpiBar(!showKpiBar)}
            className={`gm-switch-btn ${showKpiBar ? 'active' : ''}`}
            title="Toggle Live Incident Telemetry KPIs HUD"
          >
            <span>⚡ Telemetry HUD</span>
          </button>

          {/* Audio Bridge Status */}
          <div className="gm-voice-status">
            <span className={`gm-dot ${isJoined ? 'live' : ''}`} />
            <span>{isJoined ? `Audio Bridge (${1 + remoteUsers.length})` : 'Audio Bridge Idle'}</span>
          </div>

          {/* Share Room Button */}
          <button
            type="button"
            className="gm-share-top-btn"
            onClick={handleCopyLink}
            title="Copy real-time invite link"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span>{copiedLink ? 'Copied Link!' : 'Invite Responders'}</span>
          </button>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────── */}
      {/* Integrated Live KPI Telemetry HUD Strip */}
      {/* ───────────────────────────────────────────────────────── */}
      {showKpiBar && (
        <div style={{
          background: 'rgba(30, 31, 32, 0.95)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '8px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          fontSize: 12,
          zIndex: 15,
        }}>
          {/* KPI 1: Severity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#F87171' }}>🛡️</span>
            <div>
              <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Severity</div>
              <strong style={{ color: '#EF4444' }}>{incident?.severity || 'P1'} Critical</strong>
            </div>
          </div>

          {/* KPI 2: Confidence Score */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#60A5FA' }}>📊</span>
            <div>
              <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Confidence Score</div>
              <strong style={{ color: '#38BDF8' }}>{avgConfidence}% High Confidence</strong>
            </div>
          </div>

          {/* KPI 3: Resolution Progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 160 }}>
            <span style={{ color: '#34D399' }}>🎯</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94A3B8' }}>
                <span>PROGRESS</span>
                <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{progressPercent}%</span>
              </div>
              <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                <div style={{ width: `${progressPercent}%`, height: '100%', background: '#38BDF8', transition: 'width 0.3s ease' }} />
              </div>
            </div>
          </div>

          {/* KPI 4: Assets at Risk */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#FBBF24' }}>📦</span>
            <div>
              <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Affected Systems</div>
              <span style={{ color: '#F1F5F9', fontFamily: 'var(--font-mono)' }}>
                {(incident?.affectedSystems || ['checkout-api', 'redis-primary']).join(', ')}
              </span>
            </div>
          </div>

          {/* KPI 5: Team Response */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#4ADE80' }}>⚡</span>
            <div>
              <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Team Status</div>
              <strong style={{ color: incident?.status === 'RESOLVED' ? '#4ADE80' : '#38BDF8' }}>
                {incident?.status === 'RESOLVED' ? 'RESOLVED (ISR Ready)' : 'ALL SYSTEMS ENGAGED'}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Permission Warning Banner if mic blocked */}
      {permissionError && (
        <div className="gm-permission-banner">
          <span>⚠️ {permissionError}</span>
        </div>
      )}

      {/* Pending Tool Action Confirmation Strip */}
      {pendingToolActions && pendingToolActions.length > 0 && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.15)',
          borderBottom: '1px solid rgba(245, 158, 11, 0.4)',
          padding: '8px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 15,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <strong style={{ color: '#FBBF24', fontSize: 12 }}>
                VAIC Proposed Action: {pendingToolActions[0].tool.toUpperCase()}
              </strong>
              <div style={{ color: '#E2E8F0', fontSize: 11 }}>
                {(pendingToolActions[0].payload as any)?.text || JSON.stringify(pendingToolActions[0].payload)}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => confirmToolAction(pendingToolActions[0].id)}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                border: 'none',
                background: '#16A34A',
                color: '#FFFFFF',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => rejectToolAction(pendingToolActions[0].id)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: '#CBD5E1',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* Center Video / Audio Meeting Stage */}
      {/* ───────────────────────────────────────────────────────── */}
      <main className="gm-stage-area">
        <div className={`gm-stage-grid ${remoteUsers.length > 0 ? 'multi-user' : 'solo'}`}>
          {/* 1. LOCAL USER CARD (You) */}
          <div className={`gm-card ${isSelfSpeaking ? 'is-speaking' : ''}`}>
            {/* Top-Right Mute / Audio Indicator */}
            <div className="gm-card-status">
              {!isSpeechListening ? (
                <div className="gm-mute-badge" title="Microphone Muted">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </div>
              ) : (
                <div className="gm-live-mic-badge" title="Microphone Active">
                  <span className="gm-wave-bar bar1" />
                  <span className="gm-wave-bar bar2" />
                  <span className="gm-wave-bar bar3" />
                </div>
              )}
            </div>

            {/* Center Avatar with Speaking Pulse */}
            <div className="gm-avatar-wrapper">
              <div className={`gm-pulse-ring ${isSelfSpeaking ? 'active' : ''}`} />
              <div className="gm-avatar-circle">
                <span className="gm-avatar-text">{getInitials(userName)}</span>
              </div>
            </div>

            {/* Bottom-Left Name Badge */}
            <div className="gm-card-name">
              <span>{userName || 'Kantik'} (You)</span>
              <span className="gm-role-tag">{userRole ? userRole.replace('_', ' ') : 'INCIDENT COMMANDER'}</span>
            </div>
          </div>

          {/* 2. EDITH AI CO-PILOT CARD (Powered by edith.mp4 video) */}
          <div className={`gm-card gm-edith-card ${isSpeaking ? 'is-speaking' : ''}`}>
            {/* Top Right AI Status */}
            <div className="gm-card-status">
              <span className="gm-ai-badge">
                <span className="gm-ai-dot" />
                <span>AI CO-PILOT</span>
              </span>
            </div>

            {/* Center Video Orb (edith.mp4) */}
            <div className="gm-edith-center">
              <AiAssistant3DOrb
                size={220}
                interactive={true}
                onSpeakStart={() => setActiveBriefing(activeBriefing ? { ...activeBriefing, isSpeaking: true } : null)}
                onSpeakEnd={() => setActiveBriefing(activeBriefing ? { ...activeBriefing, isSpeaking: false } : null)}
              />

              {/* Synchronized Text Briefing Overlay Card */}
              {activeBriefing && (
                <div className="gm-briefing-overlay">
                  <div className="gm-briefing-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13 }}>⚡</span>
                      <strong style={{ fontSize: 12, color: '#A855F7' }}>EDITH SITUATION BRIEFING</strong>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (isSpeaking) {
                            stopSpeaking();
                          } else {
                            speak(activeBriefing.text, speechLanguage);
                          }
                        }}
                        className="gm-briefing-audio-btn"
                        title={isSpeaking ? 'Mute Spoken Audio' : 'Play Spoken Audio'}
                      >
                        {isSpeaking ? '🔊 Speaking...' : '▶ Replay Audio'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveBriefing(null)}
                        className="gm-briefing-close-btn"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="gm-briefing-content">
                    {activeBriefing.text}
                  </div>
                </div>
              )}

              {/* Real-time Voice Query HUD */}
              {(isVoiceQueryActive || isEdithThinking) && (
                <div style={{
                  position: 'absolute',
                  bottom: activeBriefing ? 135 : 20,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(15, 23, 42, 0.95)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(168, 85, 247, 0.6)',
                  boxShadow: '0 8px 30px rgba(147, 51, 234, 0.4)',
                  borderRadius: 24,
                  padding: '8px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  zIndex: 35,
                  minWidth: 260,
                  maxWidth: 440,
                }}>
                  <span style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: isEdithThinking ? '#38BDF8' : '#EF4444',
                    boxShadow: isEdithThinking ? '0 0 10px #38BDF8' : '0 0 10px #EF4444',
                    animation: 'pulse 1s infinite',
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 12, color: '#F1F5F9', fontStyle: voiceQueryTranscript ? 'normal' : 'italic' }}>
                    {isEdithThinking
                      ? 'EDITH is analyzing...'
                      : voiceQueryTranscript
                      ? `"${voiceQueryTranscript}"`
                      : 'Listening... Ask EDITH anything'}
                  </span>
                  {voiceQueryTranscript && !isEdithThinking && (
                    <button
                      type="button"
                      onClick={stopVoiceQuery}
                      style={{
                        background: '#7C3AED',
                        border: 'none',
                        borderRadius: 12,
                        color: '#FFFFFF',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 10px',
                        cursor: 'pointer',
                        marginLeft: 'auto',
                        flexShrink: 0,
                      }}
                    >
                      Send ↵
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bottom-Left Name Badge */}
            <div className="gm-card-name">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#C084FC', fontWeight: 700 }}>EDITH</span>
                <span style={{ color: '#94A3B8' }}>· Virtual AI Co-Investigator</span>
              </div>
              <span className="gm-edith-activity">
                {isSpeaking ? 'SPOKEN BRIEFING ACTIVE' : isSpeechListening ? 'LIVE TRANSCRIBING & MONITORING' : 'TACTICAL STANDBY'}
              </span>
            </div>
          </div>

          {/* 3. REMOTE PARTICIPANTS CARDS (Real Responders from DB/Agora) */}
          {remoteUsers.map((user) => {
            const isSpeakingRemote = activeSpeakers.has(user.uid);
            return (
              <div key={user.uid} className={`gm-card ${isSpeakingRemote ? 'is-speaking' : ''}`}>
                <div className="gm-card-status">
                  <div className="gm-live-mic-badge">
                    <span className="gm-wave-bar bar1" />
                    <span className="gm-wave-bar bar2" />
                  </div>
                </div>
                <div className="gm-avatar-wrapper">
                  <div className={`gm-pulse-ring ${isSpeakingRemote ? 'active' : ''}`} />
                  <div className="gm-avatar-circle remote">
                    <span className="gm-avatar-text">R</span>
                  </div>
                </div>
                <div className="gm-card-name">
                  <span>Responder #{user.uid}</span>
                  <span className="gm-role-tag">ENGINEER</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Closed Captions (CC) Overlay (Auto-hides after speaking) */}
        {showCaptions && activeCaption && (
          <div className="gm-captions-container">
            <div className={`gm-caption-box ${activeCaption.isLive ? 'live' : ''}`}>
              <span className="gm-caption-speaker">{activeCaption.speaker}:</span>
              <span className="gm-caption-text">{activeCaption.text}</span>
            </div>
          </div>
        )}
      </main>

      <footer className="gm-dock-wrapper">
        <div className="gm-dock-pill">
          {/* 1. Microphone Toggle */}
          <button
            type="button"
            onClick={handleToggleMic}
            className={`gm-pill-btn ${isSpeechListening ? 'active' : 'danger'}`}
            title={isSpeechListening ? 'Mute Microphone & Transcripts' : 'Unmute Microphone & Start Transcribing'}
          >
            {isSpeechListening ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </button>

          {/* 2. Closed Captions (CC) Toggle */}
          <button
            type="button"
            onClick={() => setShowCaptions(!showCaptions)}
            className={`gm-pill-btn ${showCaptions ? 'active-white' : ''}`}
            title="Toggle Live Closed Captions"
          >
            <span style={{ fontSize: 13, fontWeight: 800 }}>CC</span>
          </button>

          {/* 4. EDITH Verbal & Text Situation Briefing */}
          <button
            type="button"
            onClick={handleRequestBriefing}
            disabled={isGeneratingBriefing}
            className="gm-pill-btn ai-action"
            title="Ask EDITH for an instant audio & text situation briefing"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
            </svg>
            <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 6 }}>
              {isGeneratingBriefing ? 'Synthesizing...' : 'Situation Briefing'}
            </span>
          </button>

          {/* 5. Direct Real-Time Talk to EDITH Voice Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => {
                if (isSpeaking) {
                  stopSpeaking();
                } else if (isVoiceQueryActive) {
                  stopVoiceQuery();
                } else {
                  startVoiceQuery();
                }
              }}
              className={`gm-pill-btn ask-edith-action ${isVoiceQueryActive ? 'recording-active' : ''} ${isSpeaking ? 'speaking-active' : ''}`}
              title={
                isSpeaking
                  ? 'Click to Stop EDITH Voice'
                  : isVoiceQueryActive
                  ? 'Listening to your question... Click to Send'
                  : 'Click to speak directly to EDITH in real time'
              }
              style={{
                background: isVoiceQueryActive
                  ? 'linear-gradient(135deg, #DC2626, #EF4444)'
                  : isSpeaking
                  ? 'linear-gradient(135deg, #9333EA, #A855F7)'
                  : 'linear-gradient(135deg, #2563EB, #7C3AED)',
                color: '#FFFFFF',
                border: isVoiceQueryActive ? '1px solid #FCA5A5' : '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: isVoiceQueryActive
                  ? '0 0 16px rgba(239, 68, 68, 0.6)'
                  : '0 0 12px rgba(124, 58, 237, 0.4)',
                padding: '0 16px',
                height: 48,
                borderRadius: 24,
                display: 'inline-flex',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {isVoiceQueryActive ? (
                <>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFFFFF', animation: 'pulse 1s infinite' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 8 }}>
                    Listening...
                  </span>
                </>
              ) : isSpeaking ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                  <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 8 }}>
                    Stop EDITH
                  </span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                  <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 8 }}>
                    Talk to EDITH
                  </span>
                </>
              )}
            </button>
          </div>

          {/* 6. Share / Copy Invite Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="gm-pill-btn"
            title="Copy Incident Room Invite Link"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
          </button>

          {/* 7. Leave / Return to Landing Page */}
          <button
            type="button"
            onClick={() => {
              leaveVoice();
              setIsSpeechListening(false);
              router.push('/');
            }}
            className="gm-pill-btn end-call"
            title="Exit Incident Room & Return to Landing Page"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.8 19.8 0 0 1-3.12-8.69A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
              <line x1="23" y1="1" x2="1" y2="23" />
            </svg>
          </button>
        </div>

        {/* ───────────────────────────────────────────────────────── */}
        {/* Google Meet Right Dock (Side Drawer Triggers) */}
        {/* ───────────────────────────────────────────────────────── */}
        <div className="gm-right-dock">
          {/* 1. Transcripts & Chat Drawer */}
          <button
            type="button"
            onClick={() => setActiveDrawer(activeDrawer === 'transcripts' ? null : 'transcripts')}
            className={`gm-dock-btn ${activeDrawer === 'transcripts' ? 'active' : ''}`}
            title="Live Speech Transcripts & Chat"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {recentTranscripts.length > 0 && (
              <span className="gm-dock-badge">{recentTranscripts.length}</span>
            )}
          </button>

          {/* 2. EDITH Intelligence & Action Items Drawer */}
          <button
            type="button"
            onClick={() => setActiveDrawer(activeDrawer === 'intelligence' ? null : 'intelligence')}
            className={`gm-dock-btn ${activeDrawer === 'intelligence' ? 'active' : ''}`}
            title="EDITH Intelligence (Facts, Hypotheses, Decisions, Actions)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            {(facts.length + actionItems.length + hypotheses.length) > 0 && (
              <span className="gm-dock-badge purple">{facts.length + actionItems.length}</span>
            )}
          </button>

          {/* 3. Timeline & Activity Log Drawer */}
          <button
            type="button"
            onClick={() => setActiveDrawer(activeDrawer === 'timeline' ? null : 'timeline')}
            className={`gm-dock-btn ${activeDrawer === 'timeline' ? 'active' : ''}`}
            title="Chronological Incident Timeline & Activity Log"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>

          {/* 4. Team & Responders Drawer */}
          <button
            type="button"
            onClick={() => setActiveDrawer(activeDrawer === 'people' ? null : 'people')}
            className={`gm-dock-btn ${activeDrawer === 'people' ? 'active' : ''}`}
            title="Connected Incident Responders"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="gm-dock-badge">{1 + remoteUsers.length}</span>
          </button>

          {/* 5. Incident Operations & Post-Mortem ISR Drawer */}
          <button
            type="button"
            onClick={() => setActiveDrawer(activeDrawer === 'controls' ? null : 'controls')}
            className={`gm-dock-btn ${activeDrawer === 'controls' ? 'active' : ''}`}
            title="Incident Ops, Post-Mortem ISR & Room Destruction"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </button>
        </div>
      </footer>

      {/* ───────────────────────────────────────────────────────── */}
      {/* Slide-Out Side Panels (Authentic Google Meet Drawer) */}
      {/* ───────────────────────────────────────────────────────── */}
      {activeDrawer && (
        <aside className="gm-side-drawer">
          <div className="gm-drawer-header">
            <h3 className="gm-drawer-title">
              {activeDrawer === 'transcripts' && 'Live Transcripts & Chat'}
              {activeDrawer === 'intelligence' && 'EDITH Intelligence Hub'}
              {activeDrawer === 'timeline' && 'Chronological Timeline'}
              {activeDrawer === 'people' && `Incident Responders (${1 + remoteUsers.length})`}
              {activeDrawer === 'controls' && 'Incident Operations & ISR'}
            </h3>
            <button
              type="button"
              onClick={() => setActiveDrawer(null)}
              className="gm-drawer-close-btn"
            >
              ✕
            </button>
          </div>

          {/* DRAWER 1: TRANSCRIPTS & CHAT */}
          {activeDrawer === 'transcripts' && (
            <div className="gm-drawer-content transcripts-view">
              {/* Filter Tabs */}
              <div className="gm-filter-tabs">
                {(['ALL', 'MINE', 'FACTS'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setTranscriptFilter(tab)}
                    className={`gm-filter-tab ${transcriptFilter === tab ? 'active' : ''}`}
                  >
                    {tab === 'ALL' ? 'All Speech' : tab === 'MINE' ? 'What I Said' : 'Findings & Facts'}
                  </button>
                ))}
              </div>

              {/* Transcripts List */}
              <div className="gm-transcripts-scroll">
                {recentTranscripts.length === 0 ? (
                  <div className="gm-empty-hint" style={{ padding: '24px 12px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontWeight: 600, color: '#94A3B8' }}>No speech recorded yet</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: 11, color: '#64748B' }}>
                      Click the microphone button below to speak. All spoken statements are transcribed in real-time.
                    </p>
                  </div>
                ) : (
                  recentTranscripts
                    .filter((t) => {
                      if (transcriptFilter === 'MINE') {
                        return (t.speakerName || '').includes('(You)') || (userName && (t.speakerName || '').includes(userName));
                      }
                      if (transcriptFilter === 'FACTS') {
                        return t.classification === 'FACT' || t.classification === 'HYPOTHESIS' || t.classification === 'ACTION_ITEM';
                      }
                      return true;
                    })
                    .map((entry) => (
                      <div key={entry.id} className="gm-transcript-item">
                        <div className="gm-transcript-top">
                          <strong className="gm-transcript-speaker">{entry.speakerName || 'Speaker'}</strong>
                          <span className="gm-transcript-time">
                            {entry.startTs ? new Date(entry.startTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now'}
                          </span>
                        </div>
                        <p className="gm-transcript-text">{entry.content}</p>
                        {entry.classification && (
                          <span className={`gm-tag gm-tag-${entry.classification.toLowerCase()}`}>
                            AI: {entry.classification.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    ))
                )}
              </div>

              {/* Live Speech Recognition Input & Manual Form */}
              <form onSubmit={handleSendChat} className="gm-chat-form">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={
                    isSpeechListening
                      ? 'Listening to speech... or type here'
                      : 'Type a statement or turn on mic...'
                  }
                  className="gm-chat-input"
                />
                <button type="submit" className="gm-chat-send-btn">
                  Send
                </button>
              </form>
            </div>
          )}

          {/* DRAWER 2: EDITH INTELLIGENCE */}
          {activeDrawer === 'intelligence' && (
            <div className="gm-drawer-content">
              {/* Interactive Add Finding / Action Item Form */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13 }}>➕</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#E2E8F0' }}>Manual Entry</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddIntelForm(!showAddIntelForm)}
                    style={{
                      background: showAddIntelForm ? 'rgba(239, 68, 68, 0.15)' : 'rgba(37, 99, 235, 0.2)',
                      color: showAddIntelForm ? '#F87171' : '#60A5FA',
                      border: '1px solid ' + (showAddIntelForm ? 'rgba(239, 68, 68, 0.3)' : 'rgba(37, 99, 235, 0.4)'),
                      borderRadius: 4,
                      padding: '3px 8px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {showAddIntelForm ? 'Close' : '+ Add Item'}
                  </button>
                </div>

                {showAddIntelForm && (
                  <form onSubmit={handleManualIntelSubmit} style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                        Category Type
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                        {(['FACT', 'ACTION_ITEM', 'HYPOTHESIS', 'DECISION'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setNewIntelType(t)}
                            style={{
                              padding: '6px 2px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              border: newIntelType === t ? '1px solid #7C3AED' : '1px solid rgba(255,255,255,0.1)',
                              background: newIntelType === t ? '#7C3AED' : 'rgba(255,255,255,0.05)',
                              color: '#FFFFFF',
                              cursor: 'pointer',
                            }}
                          >
                            {t === 'FACT' ? '🛡️ Fact' : t === 'ACTION_ITEM' ? '⚡ Action' : t === 'HYPOTHESIS' ? '⭕ Hypo' : '⚖️ Decision'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                        Finding / Content
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={newIntelContent}
                        onChange={(e) => setNewIntelContent(e.target.value)}
                        placeholder={
                          newIntelType === 'FACT'
                            ? 'e.g. Database CPU dropped back to 35% after cache warm'
                            : newIntelType === 'ACTION_ITEM'
                            ? 'e.g. Verify Redis replication lag on replica 2'
                            : newIntelType === 'HYPOTHESIS'
                            ? 'e.g. Memory leak suspected in payment webhook handler'
                            : 'e.g. Agreed to keep rollback deployed until Monday morning'
                        }
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 4,
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          background: '#0F172A',
                          color: '#FFFFFF',
                          fontSize: 12,
                          outline: 'none',
                          resize: 'vertical',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    {newIntelType === 'ACTION_ITEM' && (
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                          Assigned Owner (Optional)
                        </label>
                        <input
                          type="text"
                          value={newIntelOwner}
                          onChange={(e) => setNewIntelOwner(e.target.value)}
                          placeholder="e.g. Rahul or Sarah"
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: 4,
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            background: '#0F172A',
                            color: '#FFFFFF',
                            fontSize: 12,
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isAddingIntel || !newIntelContent.trim()}
                      style={{
                        background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 4,
                        padding: '7px 14px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: isAddingIntel || !newIntelContent.trim() ? 'not-allowed' : 'pointer',
                        marginTop: 2,
                      }}
                    >
                      {isAddingIntel ? 'Saving...' : 'Add to Room Board →'}
                    </button>
                  </form>
                )}
              </div>

              {/* Confirmed Facts */}
              <div className="gm-intel-section">
                <div className="gm-intel-header">
                  <span style={{ color: '#16A34A', fontWeight: 700, fontSize: 12 }}>
                    🛡️ CONFIRMED FACTS ({facts.length})
                  </span>
                </div>
                {facts.length === 0 ? (
                  <div className="gm-empty-hint">No facts confirmed yet</div>
                ) : (
                  facts.map((f) => (
                    <div key={f.id} className="gm-intel-item fact">
                      <span>✓ {f.content}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Action Items with Checkbox */}
              <div className="gm-intel-section">
                <div className="gm-intel-header">
                  <span style={{ color: '#9333EA', fontWeight: 700, fontSize: 12 }}>
                    ⚡ ACTION ITEMS ({actionItems.length})
                  </span>
                </div>
                {actionItems.length === 0 ? (
                  <div className="gm-empty-hint">No action items assigned</div>
                ) : (
                  actionItems.map((a) => (
                    <div key={a.id} className="gm-intel-item action">
                      <input
                        type="checkbox"
                        checked={a.status === 'RESOLVED'}
                        onChange={() => toggleActionItemStatus(a.id)}
                      />
                      <span style={{ textDecoration: a.status === 'RESOLVED' ? 'line-through' : 'none' }}>
                        {a.content}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Active Hypotheses */}
              <div className="gm-intel-section">
                <div className="gm-intel-header">
                  <span style={{ color: '#D97706', fontWeight: 700, fontSize: 12 }}>
                    ⭕ HYPOTHESES ({hypotheses.length})
                  </span>
                </div>
                {hypotheses.length === 0 ? (
                  <div className="gm-empty-hint">No active hypotheses</div>
                ) : (
                  hypotheses.map((h) => (
                    <div key={h.id} className="gm-intel-item hypothesis">
                      <span>? {h.content}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Decisions Made */}
              <div className="gm-intel-section">
                <div className="gm-intel-header">
                  <span style={{ color: '#38BDF8', fontWeight: 700, fontSize: 12 }}>
                    ⚖️ DECISIONS ({decisions.length})
                  </span>
                </div>
                {decisions.length === 0 ? (
                  <div className="gm-empty-hint">No decisions logged yet</div>
                ) : (
                  decisions.map((d) => (
                    <div key={d.id} className="gm-intel-item">
                      <span>• {d.content}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* DRAWER 3: TIMELINE */}
          {activeDrawer === 'timeline' && (
            <div className="gm-drawer-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {recentTranscripts.length === 0 && facts.length === 0 ? (
                  <div className="gm-empty-hint" style={{ padding: '24px 12px', textAlign: 'center' }}>
                    Incident initialized. Speak into your microphone to populate real-time activity.
                  </div>
                ) : (
                  [...facts.map(f => ({ type: 'FACT', text: f.content, time: f.createdAt })),
                   ...actionItems.map(a => ({ type: 'ACTION', text: a.content, time: a.createdAt })),
                   ...decisions.map(d => ({ type: 'DECISION', text: d.content, time: d.createdAt }))]
                    .sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime())
                    .map((item, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        gap: 10,
                        alignItems: 'flex-start',
                        padding: '8px 10px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 6,
                        borderLeft: `3px solid ${item.type === 'FACT' ? '#16A34A' : item.type === 'ACTION' ? '#9333EA' : '#2563EB'}`,
                      }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: item.type === 'FACT' ? '#81C995' : item.type === 'ACTION' ? '#D8B4FE' : '#8AB4F8' }}>
                            {item.type}
                          </span>
                          <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#E2E8F0' }}>{item.text}</p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {/* DRAWER 4: PEOPLE & RESPONDERS */}
          {activeDrawer === 'people' && (
            <div className="gm-drawer-content">
              <div className="gm-people-invite-box">
                <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8 }}>
                  Anyone with this link can join this real-time incident room instantly.
                </p>
                <button type="button" onClick={handleCopyLink} className="gm-btn-outline-wide">
                  <span>{copiedLink ? 'Copied Link!' : 'Copy Shareable Link'}</span>
                </button>
              </div>

              <div className="gm-people-list">
                {/* Local user */}
                <div className="gm-person-row">
                  <div className="gm-person-avatar">{getInitials(userName)}</div>
                  <div className="gm-person-info">
                    <span className="gm-person-name">{userName || 'Kantik'} (You)</span>
                    <span className="gm-person-role">{userRole || 'INCIDENT COMMANDER'}</span>
                  </div>
                  <span className="gm-person-badge">Host</span>
                </div>

                {/* Remote Agora participants */}
                {remoteUsers.map((u) => (
                  <div key={u.uid} className="gm-person-row">
                    <div className="gm-person-avatar remote">R</div>
                    <div className="gm-person-info">
                      <span className="gm-person-name">Responder #{u.uid}</span>
                      <span className="gm-person-role">RESPONDER</span>
                    </div>
                    <span className="gm-person-badge">Audio Connected</span>
                  </div>
                ))}

                {/* Stored DB participants */}
                {participants
                  .filter((p) => p.speakerLabel && !p.speakerLabel.includes(userName || '---'))
                  .map((p) => (
                    <div key={p.id} className="gm-person-row">
                      <div className="gm-person-avatar">{getInitials(p.speakerLabel)}</div>
                      <div className="gm-person-info">
                        <span className="gm-person-name">{p.speakerLabel}</span>
                        <span className="gm-person-role">{p.role}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* DRAWER 5: INCIDENT CONTROLS & ISR */}
          {activeDrawer === 'controls' && (
            <div className="gm-drawer-content">
              <div className="gm-intel-section">
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: '#94A3B8', display: 'block', marginBottom: 4 }}>
                    Incident Severity
                  </label>
                  <span className="gm-pill-severity">{incident?.severity || 'P1'} CRITICAL</span>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, color: '#94A3B8', display: 'block', marginBottom: 4 }}>
                    Affected Systems
                  </label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(incident?.affectedSystems || ['checkout-api', 'redis-primary']).map((s) => (
                      <span key={s} className="gm-system-pill">{s}</span>
                    ))}
                  </div>
                </div>

                {/* Optional Room Metadata */}
                {(incident?.settings?.leadName || incident?.settings?.description || incident?.conferenceUrl) && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      📋 Room Information
                    </span>
                    {incident?.settings?.leadName && (
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#64748B', display: 'block' }}>INCIDENT LEAD / IC</span>
                        <span style={{ fontSize: 12, color: '#E2E8F0', fontWeight: 600 }}>👤 {incident.settings.leadName}</span>
                      </div>
                    )}
                    {incident?.settings?.description && (
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#64748B', display: 'block' }}>ALERT SUMMARY / DETAILS</span>
                        <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#CBD5E1', lineHeight: 1.4 }}>{incident.settings.description}</p>
                      </div>
                    )}
                    {incident?.conferenceUrl && (
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#64748B', display: 'block' }}>EXTERNAL BRIDGE</span>
                        <a
                          href={incident.conferenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            marginTop: 4,
                            color: '#60A5FA',
                            fontSize: 11,
                            textDecoration: 'none',
                            background: 'rgba(37, 99, 235, 0.15)',
                            padding: '4px 8px',
                            borderRadius: 4,
                            border: '1px solid rgba(37, 99, 235, 0.3)',
                          }}
                        >
                          🔗 Open Conference Bridge ↗
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Integrations Status & Configuration Card */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase' }}>
                      🔌 Active Integrations
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowIntegrationsModal(true)}
                      style={{
                        background: 'rgba(37, 99, 235, 0.2)',
                        border: '1px solid rgba(37, 99, 235, 0.4)',
                        color: '#93C5FD',
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ⚙️ Configure
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: '#CBD5E1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>🎙️ ElevenLabs Voice:</span>
                      <span style={{ color: (roomIntegrations.elevenLabsApiKey || (incident?.settings as any)?.integrations?.elevenLabsApiKey) ? '#4ADE80' : '#94A3B8' }}>
                        {(roomIntegrations.elevenLabsApiKey || (incident?.settings as any)?.integrations?.elevenLabsApiKey) ? 'Active' : 'Browser TTS'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>💬 Slack Bridge:</span>
                      <span style={{ color: (roomIntegrations.slackWebhookUrl || (incident?.settings as any)?.integrations?.slackWebhookUrl) ? '#4ADE80' : '#94A3B8' }}>
                        {(roomIntegrations.slackWebhookUrl || (incident?.settings as any)?.integrations?.slackWebhookUrl) ? 'Connected' : 'Not Configured'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>📋 Jira Tracking:</span>
                      <span style={{ color: (roomIntegrations.jiraBaseUrl || (incident?.settings as any)?.integrations?.jiraBaseUrl) ? '#4ADE80' : '#94A3B8' }}>
                        {(roomIntegrations.jiraBaseUrl || (incident?.settings as any)?.integrations?.jiraBaseUrl) ? 'Connected' : 'Not Configured'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onOpenReport) onOpenReport();
                    else if (onDeclareResolved) onDeclareResolved();
                  }}
                  className="gm-btn-solid-green"
                  style={{ marginBottom: 12 }}
                >
                  {incident?.status === 'RESOLVED' ? '📄 View Executive Post-Mortem ISR' : '✓ Declare Resolved & Generate ISR'}
                </button>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14, marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      leaveVoice();
                      setIsSpeechListening(false);
                      router.push('/');
                    }}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#E2E8F0',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '9px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                    <span>Return to Landing Page</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    style={{
                      width: '100%',
                      background: 'rgba(220, 38, 38, 0.15)',
                      border: '1px solid rgba(220, 38, 38, 0.4)',
                      color: '#F87171',
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '10px',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    🗑️ Permanently Delete Incident Room
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* Ask EDITH Modal */}
      {/* ───────────────────────────────────────────────────────── */}
      {mounted && showAskModal && createPortal(
        <div className="gm-modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99999 }}>
          <div className="gm-modal-card">
            <div className="gm-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>⚡</span>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Ask EDITH Co-Investigator</h3>
              </div>
              <button type="button" onClick={() => setShowAskModal(false)} className="gm-drawer-close-btn">
                ✕
              </button>
            </div>
            <form onSubmit={handleAskVaicSubmit} style={{ marginTop: 14 }}>
              <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12 }}>
                EDITH will analyze telemetry, confirmed facts, and spoken utterances to provide an instant verbal and text answer.
              </p>
              <textarea
                value={askQuery}
                onChange={(e) => setAskQuery(e.target.value)}
                placeholder="e.g. What is our current hypothesis on the database pool exhaustion?"
                rows={3}
                className="gm-modal-textarea"
                autoFocus
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowAskModal(false)}
                  className="gm-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAsking || !askQuery.trim()}
                  className="gm-btn-primary"
                >
                  {isAsking ? 'Analyzing...' : 'Ask EDITH'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* Delete Incident Room Modal */}
      {/* ───────────────────────────────────────────────────────── */}
      {mounted && showDeleteModal && createPortal(
        <div className="gm-modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99999 }}>
          <div className="gm-modal-card">
            <div className="gm-modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#EF4444' }}>
                Delete This Incident Room?
              </h3>
              <button type="button" onClick={() => setShowDeleteModal(false)} className="gm-drawer-close-btn">
                ✕
              </button>
            </div>
            <p style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.5, marginTop: 12 }}>
              Are you sure you want to permanently delete <strong>"{incident?.title}"</strong>? All voice transcripts, active hypotheses, decisions, and action items in this room will be completely destroyed.
            </p>
            {deleteError && (
              <div style={{ background: '#7F1D1D', color: '#FCA5A5', padding: '8px 12px', borderRadius: 6, fontSize: 12, marginTop: 8 }}>
                {deleteError}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button type="button" onClick={() => setShowDeleteModal(false)} className="gm-btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteRoom}
                disabled={isDeleting}
                style={{
                  background: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                }}
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* Info Modal */}
      {/* ───────────────────────────────────────────────────────── */}
      {mounted && showInfoModal && createPortal(
        <div className="gm-modal-backdrop" onClick={() => setShowInfoModal(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99999 }}>
          <div className="gm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="gm-modal-header">
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Incident Room Details</h3>
              <button type="button" onClick={() => setShowInfoModal(false)} className="gm-drawer-close-btn">
                ✕
              </button>
            </div>
            <div style={{ marginTop: 12, fontSize: 13, color: '#CBD5E1', lineHeight: 1.6 }}>
              <p><strong>Title:</strong> {incident?.title || 'Network Intrusion – DB Server'}</p>
              <p><strong>Incident ID:</strong> <code>{incident?.id}</code></p>
              <p><strong>Started:</strong> {incident?.startTs ? new Date(incident.startTs).toLocaleString() : 'Active'}</p>
              {incident?.settings?.leadName && (
                <p><strong>Incident Commander:</strong> {incident.settings.leadName}</p>
              )}
              {incident?.settings?.description && (
                <p><strong>Description / Summary:</strong> {incident.settings.description}</p>
              )}
              {incident?.conferenceUrl && (
                <p>
                  <strong>External Bridge:</strong>{' '}
                  <a
                    href={incident.conferenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#60A5FA', textDecoration: 'underline' }}
                  >
                    {incident.conferenceUrl} ↗
                  </a>
                </p>
              )}
              <div style={{ marginTop: 14 }}>
                <button type="button" onClick={handleCopyLink} className="gm-btn-primary">
                  {copiedLink ? 'Copied Link!' : 'Copy Shareable Link'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* Integrations Configuration Modal */}
      {/* ───────────────────────────────────────────────────────── */}
      {mounted && showIntegrationsModal && createPortal(
        <div className="gm-modal-backdrop" onClick={() => setShowIntegrationsModal(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99999 }}>
          <div className="gm-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="gm-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>🔌</span>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Custom Integrations &amp; AI Voice</h3>
              </div>
              <button type="button" onClick={() => setShowIntegrationsModal(false)} className="gm-drawer-close-btn">
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 6, marginTop: 14 }}>
              {[
                { id: 'elevenlabs', label: '🎙️ ElevenLabs' },
                { id: 'slack', label: '💬 Slack' },
                { id: 'jira', label: '📋 Jira' },
                { id: 'pagerduty', label: '🚨 PagerDuty' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setIntegrationActiveTab(tab.id as any)}
                  style={{
                    padding: '6px 4px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    border: integrationActiveTab === tab.id ? '1px solid #7C3AED' : '1px solid rgba(255,255,255,0.1)',
                    background: integrationActiveTab === tab.id ? '#7C3AED' : 'rgba(255,255,255,0.05)',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveIntegrations} style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {integrationActiveTab === 'elevenlabs' && (
                <>
                  <div>
                    <label style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                      ElevenLabs API Key
                    </label>
                    <input
                      type="password"
                      placeholder="xi-api-key (sk_...)"
                      value={roomIntegrations.elevenLabsApiKey || ''}
                      onChange={(e) => setRoomIntegrations({ ...roomIntegrations, elevenLabsApiKey: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 4,
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: '#0F172A',
                        color: '#FFFFFF',
                        fontSize: 12,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                      Voice ID
                    </label>
                    <input
                      type="text"
                      placeholder="21m00Tcm4TlvDq8ikWAM"
                      value={roomIntegrations.elevenLabsVoiceId || ''}
                      onChange={(e) => setRoomIntegrations({ ...roomIntegrations, elevenLabsVoiceId: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 4,
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: '#0F172A',
                        color: '#FFFFFF',
                        fontSize: 12,
                        outline: 'none',
                      }}
                    />
                  </div>
                </>
              )}

              {integrationActiveTab === 'slack' && (
                <>
                  <div>
                    <label style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                      Slack Webhook URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://hooks.slack.com/services/..."
                      value={roomIntegrations.slackWebhookUrl || ''}
                      onChange={(e) => setRoomIntegrations({ ...roomIntegrations, slackWebhookUrl: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 4,
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: '#0F172A',
                        color: '#FFFFFF',
                        fontSize: 12,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                      Slack Channel
                    </label>
                    <input
                      type="text"
                      placeholder="#incident-warroom"
                      value={roomIntegrations.slackChannel || ''}
                      onChange={(e) => setRoomIntegrations({ ...roomIntegrations, slackChannel: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 4,
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: '#0F172A',
                        color: '#FFFFFF',
                        fontSize: 12,
                        outline: 'none',
                      }}
                    />
                  </div>
                </>
              )}

              {integrationActiveTab === 'jira' && (
                <>
                  <div>
                    <label style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                      Jira Base URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://yourdomain.atlassian.net"
                      value={roomIntegrations.jiraBaseUrl || ''}
                      onChange={(e) => setRoomIntegrations({ ...roomIntegrations, jiraBaseUrl: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 4,
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: '#0F172A',
                        color: '#FFFFFF',
                        fontSize: 12,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                        Project Key
                      </label>
                      <input
                        type="text"
                        placeholder="INC"
                        value={roomIntegrations.jiraProjectKey || ''}
                        onChange={(e) => setRoomIntegrations({ ...roomIntegrations, jiraProjectKey: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 4,
                          border: '1px solid rgba(255,255,255,0.15)',
                          background: '#0F172A',
                          color: '#FFFFFF',
                          fontSize: 12,
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                        API Token
                      </label>
                      <input
                        type="password"
                        placeholder="Jira API Token"
                        value={roomIntegrations.jiraApiToken || ''}
                        onChange={(e) => setRoomIntegrations({ ...roomIntegrations, jiraApiToken: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 4,
                          border: '1px solid rgba(255,255,255,0.15)',
                          background: '#0F172A',
                          color: '#FFFFFF',
                          fontSize: 12,
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              {integrationActiveTab === 'pagerduty' && (
                <div>
                  <label style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    PagerDuty Events API v2 Routing Key
                  </label>
                  <input
                    type="password"
                    placeholder="32-character routing key"
                    value={roomIntegrations.pagerdutyRoutingKey || ''}
                    onChange={(e) => setRoomIntegrations({ ...roomIntegrations, pagerdutyRoutingKey: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 4,
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: '#0F172A',
                      color: '#FFFFFF',
                      fontSize: 12,
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowIntegrationsModal(false)}
                  className="gm-btn-secondary"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSavingIntegrations}
                  className="gm-btn-primary"
                >
                  {isSavingIntegrations ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
