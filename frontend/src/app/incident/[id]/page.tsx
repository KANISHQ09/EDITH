'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useIncidentStore } from '@/stores/incidentStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { GoogleMeetWarRoom } from '@/components/meet/GoogleMeetWarRoom';
import { JoinLobbyModal } from '@/components/meet/JoinLobbyModal';
import { ReportModal } from '@/components/ReportModal';
import { UserProfileModal } from '@/components/UserProfileModal';
import { apiFetch } from '@/lib/api';

export default function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const {
    incident,
    participants,
    setInitialState,
    setTranscripts,
    setIncident,
    userName,
    userRole,
  } = useIncidentStore();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [lastWsMessage, setLastWsMessage] = useState<any>(null);
  const [isAdmitted, setIsAdmitted] = useState<boolean>(false);
  const [isHost, setIsHost] = useState<boolean>(false);

  // Connect WebSocket gateway in real-time with incoming message listener
  const handleWsMessage = useCallback((msg: any) => {
    if (
      msg?.type === 'knock.request' ||
      msg?.type === 'knock.response' ||
      msg?.type === 'knock.cancel'
    ) {
      setLastWsMessage(msg);
    }
  }, []);

  const { sendMessage } = useWebSocket(id, undefined, undefined, handleWsMessage);

  // Prompt user to define their name if not set yet on this device
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('vaic_user_name');
      if (!stored) {
        setShowJoinModal(true);
      }
    }
  }, []);

  // Load real incident state and transcripts from API
  useEffect(() => {
    async function loadIncident() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [incRes, transRes] = await Promise.all([
          apiFetch(`/api/v1/incidents/${id}`),
          apiFetch(`/api/v1/incidents/${id}/transcripts`),
        ]);

        if (!incRes.ok) {
          if (incRes.status === 404) {
            setLoadError('Incident not found in the database. Please check the ID or select one from the directory.');
          } else {
            setLoadError(`Failed to load incident (status ${incRes.status})`);
          }
          setIsLoading(false);
          return;
        }

        const { data } = await incRes.json();
        const inc = data.incident || {};

        setInitialState({
          incident: {
            id: inc.id || id,
            orgId: inc.org_id || '00000000-0000-0000-0000-000000000001',
            title: inc.title || 'Active Incident',
            severity: inc.severity || 'P1',
            status: inc.status || 'ACTIVE',
            startTs: inc.start_ts || new Date().toISOString(),
            resolvedTs: inc.resolved_ts,
            conferenceUrl: inc.conference_url,
            affectedSystems: inc.affected_systems || [],
            settings: inc.settings || {},
          },
          participants: (data.participants || []).map((p: any) => ({
            id: p.id,
            incidentId: p.incident_id,
            role: p.role,
            speakerLabel: p.speaker_label,
            joinedAt: p.joined_at,
            speakingTimeSeconds: p.speaking_time_seconds || 0,
          })),
          facts: (data.facts || []).map((f: any) => ({
            id: f.id,
            incidentId: f.incident_id,
            content: f.content,
            status: f.status,
            confidence: f.confidence,
            createdAt: f.created_at,
            updatedAt: f.updated_at,
          })),
          hypotheses: (data.hypotheses || []).map((h: any) => ({
            id: h.id,
            incidentId: h.incident_id,
            content: h.content,
            status: h.status,
            confidence: h.confidence,
            createdAt: h.created_at,
            updatedAt: h.updated_at,
          })),
          decisions: (data.decisions || []).map((d: any) => ({
            id: d.id,
            incidentId: d.incident_id,
            content: d.content,
            createdAt: d.created_at,
          })),
          actionItems: (data.actionItems || []).map((a: any) => ({
            id: a.id,
            incidentId: a.incident_id,
            content: a.content,
            ownerName: a.owner_name,
            status: a.status,
            createdAt: a.created_at,
            updatedAt: a.updated_at,
          })),
          questions: (data.questions || []).map((q: any) => ({
            id: q.id,
            incidentId: q.incident_id,
            content: q.content,
            status: q.status,
            createdAt: q.created_at,
          })),
          conflicts: (data.conflicts || []).map((c: any) => ({
            id: c.id,
            incidentId: c.incident_id,
            description: c.description,
            factAId: c.fact_a_id,
            factBId: c.fact_b_id,
            status: c.status,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          })),
          pendingToolActions: (data.pendingToolActions || []).map((t: any) => ({
            id: t.id,
            incidentId: t.incident_id,
            tool: t.tool,
            actionType: t.action_type,
            payload: t.payload,
            proposedBy: t.proposed_by,
            status: t.status,
            createdAt: t.created_at,
            updatedAt: t.updated_at,
          })),
          timeline: [],
        });

        // Set transcripts
        if (transRes.ok) {
          const transJson = await transRes.json();
          if (Array.isArray(transJson.data)) {
            setTranscripts(
              transJson.data.map((t: any) => ({
                id: t.id,
                speakerName: t.speaker_name,
                speakerRole: t.speaker_role,
                content: t.content,
                startTs: t.start_ts,
                confidence: t.confidence || 0.95,
                classification: t.classification_type,
              }))
            );
          }
        }

        // Set ISR report if available
        if (inc.settings?.isrReport) {
          setReportMarkdown(inc.settings.isrReport);
        }

        // Determine host & admission status
        const currentParticipants = data.participants || [];
        const alreadyAdmitted = typeof window !== 'undefined' && localStorage.getItem(`incident_${id}_admitted`) === 'true';
        const storedName = typeof window !== 'undefined' ? localStorage.getItem('vaic_user_name') : null;
        
        // Host is strictly the creator whose name matches the declared incident leadName,
        // or the creator on the device that just declared the incident (empty room + stored name).
        const isCreator = Boolean(
          storedName &&
          inc.settings?.leadName &&
          storedName.trim().toLowerCase() === inc.settings.leadName.trim().toLowerCase()
        );
        const isInitialHost = isCreator || (currentParticipants.length === 0 && Boolean(storedName));

        if (isInitialHost) {
          setIsHost(true);
          setIsAdmitted(true);
          if (typeof window !== 'undefined') {
            localStorage.setItem(`incident_${id}_admitted`, 'true');
          }
        } else if (alreadyAdmitted) {
          setIsAdmitted(true);
          setIsHost(false);
        } else {
          setIsAdmitted(false);
          setIsHost(false);
        }
      } catch (err: any) {
        console.error('Failed to load incident:', err);
        setLoadError(err.message || 'Error connecting to backend API');
      } finally {
        setIsLoading(false);
      }
    }

    loadIncident();
  }, [id, setInitialState, setTranscripts, userRole]);

  // Ensure current user is auto-registered as a participant only after being admitted
  useEffect(() => {
    if (!isAdmitted || !userName || !id || isLoading) return;
    const register = async () => {
      try {
        await apiFetch(`/api/v1/incidents/${id}/participants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: userName, role: userRole }),
        });
        if (sendMessage) {
          sendMessage({
            type: 'presence.join',
            userName,
            userRole,
            participant: {
              speakerLabel: userName,
              role: userRole,
            },
          });
        }
      } catch (err) {
        console.warn('Failed to auto-register participant:', err);
      }
    };
    register();
  }, [isAdmitted, id, userName, userRole, isLoading, sendMessage]);

  // Handle Declare Resolved
  const handleDeclareResolved = async () => {
    if (isResolving) return;
    const confirm = window.confirm(
      'Are you sure you want to declare this incident resolved? This will generate the Executive Post-Mortem ISR.'
    );
    if (!confirm) return;

    setIsResolving(true);
    try {
      const res = await apiFetch(`/api/v1/incidents/${id}/resolve`, {
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
      alert('Failed to resolve incident on backend.');
    } finally {
      setIsResolving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        height: '100vh',
        width: '100%',
        backgroundColor: '#1E1F20',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
        fontFamily: 'var(--font-sans)',
        userSelect: 'none',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}>
          {/* Authentic Google Meet Circular Spinner */}
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: '3px solid rgba(255, 255, 255, 0.18)',
              borderTopColor: '#1A73E8',
              borderRightColor: '#1A73E8',
              animation: 'gmSpinner 0.8s linear infinite',
              flexShrink: 0,
            }}
          />
          <span style={{
            fontSize: 16,
            fontWeight: 400,
            letterSpacing: '0.2px',
            color: '#FFFFFF',
          }}>
            Loading...
          </span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{
        height: '100vh',
        width: '100%',
        backgroundColor: '#1E1F20',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#E8EAED',
        fontFamily: 'var(--font-sans)',
      }}>
        <div style={{
          background: '#282A2C',
          padding: 32,
          borderRadius: 12,
          textAlign: 'center',
          maxWidth: 440,
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px 0' }}>Incident Not Found</h2>
          <p style={{ fontSize: 13, color: '#9AA0A6', lineHeight: 1.5, marginBottom: 20 }}>{loadError}</p>
          <Link
            href="/incidents"
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              background: '#1A73E8',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Go to Incidents Directory
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmitted) {
    return (
      <>
        <JoinLobbyModal
          incidentId={id}
          incidentTitle={incident?.title}
          incidentSeverity={incident?.severity}
          activeParticipantsCount={participants.length}
          onAdmitted={(name, role) => {
            setIsAdmitted(true);
          }}
          sendMessage={sendMessage}
          lastWsMessage={lastWsMessage}
        />

        {/* Post-Mortem ISR Modal if opened */}
        {isReportOpen && reportMarkdown && (
          <ReportModal
            isOpen={isReportOpen}
            onClose={() => setIsReportOpen(false)}
            reportMarkdown={reportMarkdown}
            incidentTitle={incident?.title || id}
          />
        )}
      </>
    );
  }

  return (
    <>
      {/* Full-Screen Google Meet Style War Room */}
      <GoogleMeetWarRoom
        incidentId={id}
        sendMessage={sendMessage}
        lastWsMessage={lastWsMessage}
        isHost={isHost}
        onDeclareResolved={handleDeclareResolved}
        onOpenReport={() => {
          if (reportMarkdown) setIsReportOpen(true);
          else handleDeclareResolved();
        }}
      />

      {/* Post-Mortem ISR Modal */}
      {isReportOpen && reportMarkdown && (
        <ReportModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          reportMarkdown={reportMarkdown}
          incidentTitle={incident?.title || id}
        />
      )}
    </>
  );
}
