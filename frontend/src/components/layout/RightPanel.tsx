'use client';

import { useState, useRef, useEffect } from 'react';
import { useIncidentStore } from '@/stores/incidentStore';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

// Right panel: Participants + Live Transcript Feed + Business Impact

function SpeakingBars() {
  return (
    <div className="speaking-indicator">
      <div className="speaking-bar" style={{ height: 8 }} />
      <div className="speaking-bar" style={{ height: 12 }} />
      <div className="speaking-bar" style={{ height: 6 }} />
    </div>
  );
}

const PARTICIPANT_NAMES: Record<string, { name: string; initials: string }> = {
  p1: { name: 'Alex Chen', initials: 'AC' },
  p2: { name: 'Priya Sharma', initials: 'PS' },
  p3: { name: 'Marcus Lee', initials: 'ML' },
  p4: { name: 'Dana Liu', initials: 'DL' },
};

const ROLE_LABELS: Record<string, string> = {
  INCIDENT_COMMANDER: 'Incident Commander',
  RESPONDER: 'Responder',
  OBSERVER: 'Observer',
  BUSINESS_STAKEHOLDER: 'Stakeholder',
};

export function RightPanel() {
  const { participants, recentTranscripts, incident, interimTranscript, submitUtterance } = useIncidentStore();
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const { isListening, isSupported, toggleListening, permissionError } = useSpeechRecognition({
    incidentId: incident?.id || 'demo',
  });

  // Auto-scroll transcript feed
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [recentTranscripts, interimTranscript]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSubmitting) return;

    const content = inputText.trim();
    setInputText('');
    setIsSubmitting(true);

    try {
      await submitUtterance(content, 'Alex Chen', 'INCIDENT_COMMANDER');
    } catch (err) {
      console.error('Failed to post utterance:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <aside className="app-rightpanel">
      {/* Participants */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
          color: 'var(--text-muted)', marginBottom: 10,
        }}>
          Participants ({participants.length})
        </div>

        {participants.map((p, idx) => {
          const info = PARTICIPANT_NAMES[p.id] || {
            name: p.speakerLabel || `Speaker ${p.id.slice(0, 4)}`,
            initials: (p.speakerLabel || p.id).slice(0, 2).toUpperCase(),
          };
          return (
            <div key={`${p.id}-${idx}`} className="participant-item">
              <div className="participant-avatar">{info.initials}</div>
              <div className="participant-info">
                <div className="participant-name">{info.name}</div>
                <div className="participant-role">{ROLE_LABELS[p.role] || p.role}</div>
              </div>
              {p.isSpeaking && <SpeakingBars />}
            </div>
          );
        })}
      </div>

      {/* Business Impact */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 20 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
          color: 'var(--text-muted)', marginBottom: 10,
        }}>
          Business Impact
        </div>

        <div className="impact-metric">
          <span className="impact-label">Duration</span>
          <span className="impact-value" style={{ color: 'var(--color-conflict)' }}>
            {incident ? `${Math.floor((Date.now() - new Date(incident.startTs).getTime()) / 60000)}m` : '—'}
          </span>
        </div>
        <div className="impact-metric">
          <span className="impact-label">Est. transactions affected</span>
          <span className="impact-value">
            {incident?.affectedSystems?.length ? `${incident.affectedSystems.length * 4200}+` : '—'}
          </span>
        </div>
        <div className="impact-metric">
          <span className="impact-label">Services degraded</span>
          <span className="impact-value" style={{ color: 'var(--severity-p2)' }}>
            {incident?.affectedSystems?.length || 3}
          </span>
        </div>
        <div className="impact-metric">
          <span className="impact-label">Customer-facing</span>
          <span className="impact-value" style={{ color: 'var(--color-conflict)' }}>Yes</span>
        </div>
      </div>

      {/* Live Transcript */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}>
            Live Transcript
          </div>
          <div className="live-indicator">
            <div className="live-dot" /> LIVE
          </div>
        </div>

        {recentTranscripts.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
            No live utterances yet. Speak on the call or submit an update below.
          </div>
        ) : (
          <div className="transcript-feed" style={{ maxHeight: 'calc(100vh - 480px)', overflowY: 'auto' }}>
            {recentTranscripts.map((entry, idx) => (
              <div key={`${entry.id}-${idx}`} className="transcript-entry">
                <div className="transcript-speaker">
                  {entry.speakerName ? entry.speakerName.split(' ')[0] : 'Responder'}
                </div>
                <div className={`transcript-text ${entry.classification ? `highlight-${entry.classification.toLowerCase()}` : ''}`}>
                  {entry.content}
                </div>
              </div>
            ))}

            {/* Live Interim Speech Bubble */}
            {isListening && (
              <div className="transcript-entry" style={{ borderLeft: '2px solid var(--color-hypothesis)', background: 'hsla(42, 100%, 60%, 0.08)' }}>
                <div className="transcript-speaker" style={{ color: 'var(--color-hypothesis)' }}>
                  Alex (Live Speech)
                </div>
                <div className="transcript-text" style={{ fontStyle: 'italic', color: 'var(--text-primary)' }}>
                  {interimTranscript || 'Listening to your voice...'}
                  <span style={{ display: 'inline-block', width: 4, height: 12, marginLeft: 4, background: 'var(--color-hypothesis)', animation: 'pulse 0.8s infinite' }} />
                </div>
              </div>
            )}

            <div ref={transcriptEndRef} />
          </div>
        )}

        {/* Permission Error Notification */}
        {permissionError && (
          <div style={{
            fontSize: 11,
            color: 'var(--color-conflict)',
            background: 'hsla(0, 85%, 62%, 0.1)',
            padding: '6px 8px',
            borderRadius: 6,
            marginTop: 8,
            border: '1px solid hsla(0, 85%, 62%, 0.3)',
          }}>
            ⚠️ {permissionError}
          </div>
        )}

        {/* Live Utterance Submission Form */}
        <form onSubmit={handleSubmit} style={{ marginTop: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="text"
            placeholder={isListening ? "Listening... speak now or type" : "Speak or type an update..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSubmitting}
            style={{
              flex: 1,
              fontSize: 12,
              padding: '7px 10px',
              borderRadius: 6,
              background: 'var(--bg-card, #1a1d24)',
              border: isListening ? '1px solid var(--color-conflict)' : '1px solid var(--border, #2d3340)',
              color: 'var(--text-primary, #fff)',
              outline: 'none',
            }}
          />
          {isSupported && (
            <button
              type="button"
              onClick={toggleListening}
              className={`btn btn-sm ${isListening ? 'btn-danger' : 'btn-secondary'}`}
              title={isListening ? "Stop live voice listening" : "Start live voice transcription"}
              style={{
                padding: '5px 8px',
                fontSize: 13,
                boxShadow: isListening ? '0 0 8px var(--color-conflict)' : 'none',
              }}
            >
              {isListening ? '🛑' : '🎙️'}
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !inputText.trim()}
            className="btn btn-primary btn-sm"
            style={{ padding: '5px 10px', fontSize: 12, fontWeight: 600 }}
          >
            {isSubmitting ? '...' : 'Send'}
          </button>
        </form>
      </div>
    </aside>
  );
}
