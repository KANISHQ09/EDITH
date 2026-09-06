'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useIncidentStore, TranscriptEntry } from '@/stores/incidentStore';

interface LiveTranscriptPanelProps {
  onViewAll?: () => void;
  isFullView?: boolean;
}

export function LiveTranscriptPanel({ onViewAll, isFullView = false }: LiveTranscriptPanelProps) {
  const {
    recentTranscripts,
    isSpeechListening,
    setIsSpeechListening,
    interimTranscript,
    submitUtterance,
    userName,
    userRole,
  } = useIncidentStore();

  const [inputVal, setInputVal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'MINE' | 'FACTS'>('ALL');
  const scrollBottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest transcript
  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [recentTranscripts, interimTranscript]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isSubmitting) return;

    const text = inputVal.trim();
    setInputVal('');
    setIsSubmitting(true);

    try {
      await submitUtterance(text, userName || 'Responder', userRole || 'INCIDENT_COMMANDER');
    } catch (err) {
      console.error('Failed to submit transcript:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = recentTranscripts.filter((t) => {
    if (filter === 'MINE') {
      const myName = (userName || 'You').toLowerCase();
      return (t.speakerName || '').toLowerCase().includes(myName) || (t.speakerName || '').includes('(You)');
    }
    if (filter === 'FACTS') {
      return t.classification === 'FACT' || t.classification === 'HYPOTHESIS' || t.classification === 'DECISION';
    }
    return true;
  });

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const clean = name.replace('(You)', '').trim();
    return clean
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';
  };

  const getSpeakerColor = (name?: string) => {
    const colors = ['#2563EB', '#059669', '#7C3AED', '#D97706', '#DB2777', '#0891B2'];
    let hash = 0;
    const str = name || 'Anonymous';
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="vaic-card" id="panel-transcripts" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="vaic-card-header" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🎙️</span>
          <h2 className="vaic-card-title">{isFullView ? 'Full Audio & Speech Transcripts' : 'Live Speech Transcripts'}</h2>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            background: isSpeechListening ? '#DCFCE7' : '#F1F5F9',
            color: isSpeechListening ? '#16A34A' : '#475569',
            padding: '2px 8px',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}>
            {isSpeechListening && <span className="vaic-live-dot" />}
            {isSpeechListening ? 'Listening' : `${recentTranscripts.length} entries`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isFullView && onViewAll && (
            <button
              type="button"
              className="vaic-card-link"
              onClick={onViewAll}
              style={{ background: 'transparent', border: 'none', padding: 0 }}
            >
              Full Log →
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          { id: 'ALL', label: 'All Speech' },
          { id: 'MINE', label: 'What I Said' },
          { id: 'FACTS', label: 'Findings & Facts' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id as any)}
            style={{
              fontSize: 11,
              fontWeight: filter === tab.id ? 700 : 500,
              padding: '4px 10px',
              borderRadius: 6,
              border: filter === tab.id ? '1px solid #2563EB' : '1px solid #E2E8F0',
              background: filter === tab.id ? '#EFF6FF' : '#F8FAFC',
              color: filter === tab.id ? '#2563EB' : '#64748B',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transcript Scroll Container */}
      <div
        style={{
          maxHeight: isFullView ? '600px' : '320px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          paddingRight: 4,
          marginBottom: 14,
        }}
      >
        {filtered.length === 0 && !interimTranscript ? (
          <div style={{
            padding: '36px 16px',
            textAlign: 'center',
            color: '#94A3B8',
            fontSize: 13,
            background: '#F8FAFC',
            borderRadius: 8,
            border: '1px dashed #E2E8F0',
          }}>
            <p style={{ margin: 0, fontWeight: 600, color: '#64748B' }}>No speech recorded yet</p>
            <p style={{ margin: '4px 0 0 0', fontSize: 12 }}>
              Speak into your microphone or type below. All spoken statements are transcribed and analyzed by VAIC in real time.
            </p>
          </div>
        ) : (
          filtered.map((t) => {
            const isMe = (t.speakerName || '').includes('(You)') || (userName && (t.speakerName || '').includes(userName));
            const initials = getInitials(t.speakerName);
            const color = getSpeakerColor(t.speakerName);
            const timeStr = t.startTs
              ? new Date(t.startTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : 'just now';

            return (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: isMe ? '#F0F9FF' : '#F8FAFC',
                  border: isMe ? '1px solid #BAE6FD' : '1px solid #E2E8F0',
                }}
              >
                {/* Speaker Avatar */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: color,
                    color: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                  title={t.speakerName || 'Speaker'}
                >
                  {initials}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: isMe ? '#0369A1' : '#0F172A' }}>
                        {t.speakerName || 'Responder'}
                      </span>
                      {t.speakerRole && (
                        <span style={{ fontSize: 10, background: '#E2E8F0', color: '#475569', padding: '1px 5px', borderRadius: 4 }}>
                          {t.speakerRole.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>{timeStr}</span>
                  </div>

                  <p style={{ margin: 0, fontSize: 13, color: '#1E293B', lineHeight: 1.45, wordBreak: 'break-word' }}>
                    {t.content}
                  </p>

                  {/* AI Classification Tag */}
                  {t.classification && (
                    <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background:
                            t.classification === 'FACT' ? '#DCFCE7' :
                            t.classification === 'HYPOTHESIS' ? '#FEF3C7' :
                            t.classification === 'DECISION' ? '#DBEAFE' :
                            t.classification === 'ACTION_ITEM' ? '#F3E8FF' : '#F1F5F9',
                          color:
                            t.classification === 'FACT' ? '#16A34A' :
                            t.classification === 'HYPOTHESIS' ? '#D97706' :
                            t.classification === 'DECISION' ? '#2563EB' :
                            t.classification === 'ACTION_ITEM' ? '#9333EA' : '#64748B',
                        }}
                      >
                        AI: {t.classification.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Live Streaming Words as User Speaks */}
        {interimTranscript && (
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              padding: '10px 12px',
              borderRadius: 8,
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              animation: 'pulse 1.5s infinite',
            }}
          >
            <span style={{ fontSize: 16 }}>🎙️</span>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#DC2626' }}>
                {userName || 'You'} (Speaking now...):
              </span>
              <p style={{ margin: '2px 0 0 0', fontSize: 13, color: '#991B1B', fontStyle: 'italic' }}>
                "{interimTranscript}"
              </p>
            </div>
          </div>
        )}

        <div ref={scrollBottomRef} />
      </div>

      {/* Integrated Input & Speech Dictation Form */}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
        <button
          type="button"
          onClick={() => setIsSpeechListening(!isSpeechListening)}
          className={`vaic-mic-btn ${isSpeechListening ? 'active' : ''}`}
          title={isSpeechListening ? 'Microphone Active (Streaming to VAIC)' : 'Enable Speech-to-Text Microphone'}
          style={{ width: 36, height: 36, flexShrink: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </button>

        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={`Speak or type finding as ${userName || 'Responder'} (e.g. "Database pool is at 100%")...`}
          disabled={isSubmitting}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: 13,
            borderRadius: 8,
            border: '1px solid #CBD5E1',
            background: '#F8FAFC',
            outline: 'none',
          }}
        />

        <button
          type="submit"
          disabled={!inputVal.trim() || isSubmitting}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: inputVal.trim() ? '#2563EB' : '#CBD5E1',
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 600,
            cursor: inputVal.trim() ? 'pointer' : 'default',
            whiteSpace: 'nowrap',
          }}
        >
          {isSubmitting ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
