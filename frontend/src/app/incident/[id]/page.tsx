'use client';

import { useEffect, use } from 'react';
import { useIncidentStore } from '@/stores/incidentStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useElapsedTime } from '@/hooks/useElapsedTime';

import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { RightPanel } from '@/components/layout/RightPanel';
import { FactsPanel } from '@/components/panels/FactsPanel';
import { HypothesesPanel } from '@/components/panels/HypothesesPanel';
import { DecisionsPanel } from '@/components/panels/DecisionsPanel';
import { ActionItemsPanel } from '@/components/panels/ActionItemsPanel';
import { QuestionsPanel } from '@/components/panels/QuestionsPanel';
import { ConflictsPanel } from '@/components/panels/ConflictsPanel';
import { TimelinePanel } from '@/components/panels/TimelinePanel';
import { ConfirmationModal } from '@/components/ConfirmationModal';

export default function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { setInitialState, setTranscripts } = useIncidentStore();

  // Load real incident state and transcripts from API
  useEffect(() => {
    async function loadIncident() {
      try {
        const [incRes, transRes] = await Promise.all([
          fetch(`/api/v1/incidents/${id}`),
          fetch(`/api/v1/incidents/${id}/transcripts`),
        ]);

        if (incRes.ok) {
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
        }

        if (transRes.ok) {
          const transJson = await transRes.json();
          const items = (transJson.data || []).map((t: any) => ({
            id: t.id,
            speakerName: t.speaker_name || 'Alex Chen',
            speakerRole: t.speaker_role || 'RESPONDER',
            content: t.content,
            startTs: t.start_ts,
            confidence: t.confidence || 0.98,
            classification: t.classification_type,
          }));
          setTranscripts(items);
        }
      } catch (err) {
        console.error('Failed to load incident state from API:', err);
      }
    }

    loadIncident();
  }, [id, setInitialState, setTranscripts]);

  // Connect WebSocket (no token for demo)
  useWebSocket(id);

  return (
    <>
      <div className="app-layout">
        <AppHeader />
        <AppSidebar />
        <main className="app-main">
          <div className="dashboard-grid">
            <TimelinePanel />
            <FactsPanel />
            <HypothesesPanel />
            <DecisionsPanel />
            <ActionItemsPanel />
            <QuestionsPanel />
            <ConflictsPanel />
          </div>
        </main>
        <RightPanel />
      </div>
      <ConfirmationModal />
    </>
  );
}
