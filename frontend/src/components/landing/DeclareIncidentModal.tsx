'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useIncidentStore } from '@/stores/incidentStore';
import { apiFetch } from '@/lib/api';

interface DeclareIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIncidentCreated?: (newInc: any) => void;
}

export function DeclareIncidentModal({ isOpen, onClose, onIncidentCreated }: DeclareIncidentModalProps) {
  const router = useRouter();
  const { setUserName, setUserRole } = useIncidentStore();
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<'P1' | 'P2' | 'P3' | 'P4'>('P1');
  const [systems, setSystems] = useState('checkout-api, redis-primary');
  const [showOptional, setShowOptional] = useState(false);
  const [activeTab, setActiveTab] = useState<'elevenlabs' | 'slack' | 'jira' | 'pagerduty'>('elevenlabs');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Integration credentials
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState('');
  const [elevenLabsVoiceId, setElevenLabsVoiceId] = useState('21m00Tcm4TlvDq8ikWAM');
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [slackChannel, setSlackChannel] = useState('');
  const [jiraBaseUrl, setJiraBaseUrl] = useState('');
  const [jiraProjectKey, setJiraProjectKey] = useState('');
  const [jiraApiToken, setJiraApiToken] = useState('');
  const [pagerdutyRoutingKey, setPagerdutyRoutingKey] = useState('');

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setElevenLabsApiKey(localStorage.getItem('edith_elevenlabs_api_key') || '');
      setElevenLabsVoiceId(localStorage.getItem('edith_elevenlabs_voice_id') || '21m00Tcm4TlvDq8ikWAM');
      setSlackWebhookUrl(localStorage.getItem('edith_slack_webhook') || '');
      setSlackChannel(localStorage.getItem('edith_slack_channel') || '');
      setJiraBaseUrl(localStorage.getItem('edith_jira_url') || '');
      setJiraProjectKey(localStorage.getItem('edith_jira_key') || '');
      setJiraApiToken(localStorage.getItem('edith_jira_token') || '');
      setPagerdutyRoutingKey(localStorage.getItem('edith_pagerduty_key') || '');
    }
  }, []);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const affectedSystems = systems
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      // Persist user integrations to localStorage for future war rooms
      if (typeof window !== 'undefined') {
        if (elevenLabsApiKey) localStorage.setItem('edith_elevenlabs_api_key', elevenLabsApiKey.trim());
        if (elevenLabsVoiceId) localStorage.setItem('edith_elevenlabs_voice_id', elevenLabsVoiceId.trim());
        if (slackWebhookUrl) localStorage.setItem('edith_slack_webhook', slackWebhookUrl.trim());
        if (slackChannel) localStorage.setItem('edith_slack_channel', slackChannel.trim());
        if (jiraBaseUrl) localStorage.setItem('edith_jira_url', jiraBaseUrl.trim());
        if (jiraProjectKey) localStorage.setItem('edith_jira_key', jiraProjectKey.trim());
        if (jiraApiToken) localStorage.setItem('edith_jira_token', jiraApiToken.trim());
        if (pagerdutyRoutingKey) localStorage.setItem('edith_pagerduty_key', pagerdutyRoutingKey.trim());
      }

      const res = await apiFetch('/api/v1/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          severity,
          affectedSystems: affectedSystems.length > 0 ? affectedSystems : ['core-services'],
          integrations: {
            elevenLabsApiKey: elevenLabsApiKey.trim() || undefined,
            elevenLabsVoiceId: elevenLabsVoiceId.trim() || undefined,
            slackWebhookUrl: slackWebhookUrl.trim() || undefined,
            slackChannel: slackChannel.trim() || undefined,
            jiraBaseUrl: jiraBaseUrl.trim() || undefined,
            jiraProjectKey: jiraProjectKey.trim() || undefined,
            jiraApiToken: jiraApiToken.trim() || undefined,
            pagerdutyRoutingKey: pagerdutyRoutingKey.trim() || undefined,
          },
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

  return createPortal(
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 99999,
    }}>
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
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--studio-text)' }}>
                Declare Outage Incident
              </div>
              <div style={{ fontSize: 11, color: 'var(--studio-muted)' }}>
                Assemble EDITH AI incident room &amp; responder bridge
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

          {/* Optional Integrations & Customization Toggle */}
          <div style={{
            borderTop: '1px solid var(--studio-border)',
            paddingTop: 12,
            marginTop: 4,
          }}>
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--cobalt-primary)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: 0,
                marginBottom: 10,
              }}
            >
              <span>{showOptional ? '▾' : '▸'}</span>
              <span>Optional Integrations &amp; AI Voice (ElevenLabs, Slack, Jira, PagerDuty)</span>
            </button>

            {showOptional && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 6,
                padding: 14,
              }}>
                {/* Integration Category Tabs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 6 }}>
                  {[
                    { id: 'elevenlabs', label: '🎙️ ElevenLabs' },
                    { id: 'slack', label: '💬 Slack' },
                    { id: 'jira', label: '📋 Jira' },
                    { id: 'pagerduty', label: '🚨 PagerDuty' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as any)}
                      style={{
                        padding: '6px 4px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        border: activeTab === tab.id ? '1px solid var(--cobalt-primary)' : '1px solid #CBD5E1',
                        background: activeTab === tab.id ? 'var(--cobalt-primary)' : '#FFFFFF',
                        color: activeTab === tab.id ? '#FFFFFF' : '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab 1: ElevenLabs */}
                {activeTab === 'elevenlabs' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.4 }}>
                      Configure ElevenLabs Neural TTS for ultra-realistic spoken incident briefings and responses.
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--studio-muted)', display: 'block', marginBottom: 4 }}>
                        ElevenLabs API Key
                      </label>
                      <input
                        type="password"
                        placeholder="xi-api-key (e.g. sk_...)"
                        value={elevenLabsApiKey}
                        onChange={(e) => setElevenLabsApiKey(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 4,
                          border: '1px solid var(--studio-border)',
                          background: '#FFFFFF',
                          color: 'var(--studio-text)',
                          fontSize: 12,
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--studio-muted)' }}>
                          Voice ID
                        </label>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {[
                            { name: 'Rachel', id: '21m00Tcm4TlvDq8ikWAM' },
                            { name: 'Adam', id: 'pNInz6obpgDQGcFmaJgB' },
                            { name: 'Antoni', id: 'ErXwobaYiN019PkySvjV' },
                          ].map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setElevenLabsVoiceId(v.id)}
                              style={{
                                fontSize: 9,
                                padding: '2px 5px',
                                borderRadius: 3,
                                border: '1px solid #CBD5E1',
                                background: elevenLabsVoiceId === v.id ? '#E2E8F0' : '#FFFFFF',
                                cursor: 'pointer',
                              }}
                            >
                              {v.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. 21m00Tcm4TlvDq8ikWAM (Rachel)"
                        value={elevenLabsVoiceId}
                        onChange={(e) => setElevenLabsVoiceId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 4,
                          border: '1px solid var(--studio-border)',
                          background: '#FFFFFF',
                          color: 'var(--studio-text)',
                          fontSize: 12,
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Tab 2: Slack */}
                {activeTab === 'slack' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.4 }}>
                      Stream incident timeline, critical action items, and status briefings directly into your team Slack channel.
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--studio-muted)', display: 'block', marginBottom: 4 }}>
                        Slack Incoming Webhook URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://hooks.slack.com/services/T000/B000/XXXX"
                        value={slackWebhookUrl}
                        onChange={(e) => setSlackWebhookUrl(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 4,
                          border: '1px solid var(--studio-border)',
                          background: '#FFFFFF',
                          color: 'var(--studio-text)',
                          fontSize: 12,
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--studio-muted)', display: 'block', marginBottom: 4 }}>
                        Slack Channel Name
                      </label>
                      <input
                        type="text"
                        placeholder="#incident-warroom or #ops-alerts"
                        value={slackChannel}
                        onChange={(e) => setSlackChannel(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 4,
                          border: '1px solid var(--studio-border)',
                          background: '#FFFFFF',
                          color: 'var(--studio-text)',
                          fontSize: 12,
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Tab 3: Jira */}
                {activeTab === 'jira' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.4 }}>
                      Enable EDITH to automatically generate Jira issues and post-mortem sub-tasks with one click.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--studio-muted)', display: 'block', marginBottom: 4 }}>
                          Jira Base URL
                        </label>
                        <input
                          type="url"
                          placeholder="https://your-org.atlassian.net"
                          value={jiraBaseUrl}
                          onChange={(e) => setJiraBaseUrl(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: 4,
                            border: '1px solid var(--studio-border)',
                            background: '#FFFFFF',
                            color: 'var(--studio-text)',
                            fontSize: 12,
                            outline: 'none',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--studio-muted)', display: 'block', marginBottom: 4 }}>
                          Project Key
                        </label>
                        <input
                          type="text"
                          placeholder="INC or OPS"
                          value={jiraProjectKey}
                          onChange={(e) => setJiraProjectKey(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: 4,
                            border: '1px solid var(--studio-border)',
                            background: '#FFFFFF',
                            color: 'var(--studio-text)',
                            fontSize: 12,
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--studio-muted)', display: 'block', marginBottom: 4 }}>
                        Jira API Token
                      </label>
                      <input
                        type="password"
                        placeholder="Atlassian API Token"
                        value={jiraApiToken}
                        onChange={(e) => setJiraApiToken(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 4,
                          border: '1px solid var(--studio-border)',
                          background: '#FFFFFF',
                          color: 'var(--studio-text)',
                          fontSize: 12,
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Tab 4: PagerDuty */}
                {activeTab === 'pagerduty' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.4 }}>
                      Trigger and escalate on-call responder pages directly from the EDITH incident room.
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--studio-muted)', display: 'block', marginBottom: 4 }}>
                        PagerDuty Events API v2 Routing Key
                      </label>
                      <input
                        type="password"
                        placeholder="32-character integration routing key"
                        value={pagerdutyRoutingKey}
                        onChange={(e) => setPagerdutyRoutingKey(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 4,
                          border: '1px solid var(--studio-border)',
                          background: '#FFFFFF',
                          color: 'var(--studio-text)',
                          fontSize: 12,
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
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
              {isSubmitting ? 'Assembling...' : 'Assemble Incident Room →'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
