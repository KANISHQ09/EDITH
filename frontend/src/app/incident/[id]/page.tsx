'use client';

import { useEffect, useState, use } from 'react';
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

type ActiveTab = 'all' | 'investigation' | 'actions' | 'timeline';

export default function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const {
    incident,
    facts,
    hypotheses,
    decisions,
    actionItems,
    questions,
    conflicts,
    setInitialState,
    setTranscripts,
  } = useIncidentStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const elapsed = useElapsedTime(incident?.startTs);

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

  // Connect WebSocket
  useWebSocket(id);

  const pendingActionsCount = actionItems.filter(a => a.status !== 'RESOLVED').length;
  const openConflictsCount = conflicts.filter(c => c.status === 'OPEN').length;
  const openQuestionsCount = questions.filter(q => q.status === 'PENDING').length;

  return (
    <>
      <div className="app-layout">
        <AppHeader />
        <AppSidebar />
        <main className="app-main">
          {/* Incident Hero Banner */}
          <div className="incident-hero-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span className={`badge-severity ${(incident?.severity || 'P1').toLowerCase()}`}>
                    {incident?.severity || 'P1'}
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {incident?.title || 'Loading incident...'}
                  </span>
                  <span className={`badge-status ${(incident?.status || 'ACTIVE').toLowerCase()}`}>
                    {incident?.status || 'ACTIVE'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span>Elapsed: <strong style={{ color: 'var(--text-secondary)' }}>{elapsed}</strong></span>
                  {incident?.affectedSystems && incident.affectedSystems.length > 0 && (
                    <span>Systems: <strong style={{ color: 'var(--color-conflict)' }}>{incident.affectedSystems.join(', ')}</strong></span>
                  )}
                </div>
              </div>

              {/* View Selector Tabs */}
              <div className="view-tabs">
                <button
                  className={`view-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  All Panels
                </button>
                <button
                  className={`view-tab-btn ${activeTab === 'investigation' ? 'active' : ''}`}
                  onClick={() => setActiveTab('investigation')}
                >
                  Facts &amp; Hypotheses ({facts.length + hypotheses.length})
                </button>
                <button
                  className={`view-tab-btn ${activeTab === 'actions' ? 'active' : ''}`}
                  onClick={() => setActiveTab('actions')}
                >
                  Actions &amp; Decisions ({actionItems.length + decisions.length})
                </button>
                <button
                  className={`view-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
                  onClick={() => setActiveTab('timeline')}
                >
                  Timeline &amp; Audit
                </button>
              </div>
            </div>

            {/* Quick KPI Strip */}
            <div className="kpi-strip">
              <div className="kpi-item">
                <span className="kpi-label">Facts Confirmed</span>
                <span className="kpi-value" style={{ color: 'var(--color-fact)' }}>{facts.length}</span>
              </div>
              <div className="kpi-item">
                <span className="kpi-label">Hypotheses</span>
                <span className="kpi-value" style={{ color: 'var(--color-hypothesis)' }}>{hypotheses.length}</span>
              </div>
              <div className="kpi-item">
                <span className="kpi-label">Actions Pending</span>
                <span className="kpi-value" style={{ color: pendingActionsCount > 0 ? 'var(--color-action)' : 'var(--text-muted)' }}>
                  {pendingActionsCount}
                </span>
              </div>
              <div className="kpi-item">
                <span className="kpi-label">Decisions</span>
                <span className="kpi-value" style={{ color: 'var(--color-decision)' }}>{decisions.length}</span>
              </div>
              <div className="kpi-item">
                <span className="kpi-label">Open Conflicts</span>
                <span className="kpi-value" style={{ color: openConflictsCount > 0 ? 'var(--color-conflict)' : 'var(--text-muted)' }}>
                  {openConflictsCount}
                </span>
              </div>
              <div className="kpi-item">
                <span className="kpi-label">Unanswered Qs</span>
                <span className="kpi-value" style={{ color: openQuestionsCount > 0 ? 'var(--color-hypothesis)' : 'var(--text-muted)' }}>
                  {openQuestionsCount}
                </span>
              </div>
            </div>
          </div>

          {/* Clean Dashboard View Rendering */}
          {activeTab === 'all' && (
            <>
              <div className="clean-two-column">
                {/* Column 1: Investigation */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <FactsPanel />
                  <HypothesesPanel />
                  <DecisionsPanel />
                </div>

                {/* Column 2: Actions & Questions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <ActionItemsPanel />
                  <QuestionsPanel />
                  <ConflictsPanel />
                </div>
              </div>

              {/* Full-width Timeline at bottom */}
              <div style={{ marginTop: 8 }}>
                <TimelinePanel />
              </div>
            </>
          )}

          {activeTab === 'investigation' && (
            <div className="clean-two-column">
              <FactsPanel />
              <HypothesesPanel />
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="clean-two-column">
              <ActionItemsPanel />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <DecisionsPanel />
                <QuestionsPanel />
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <TimelinePanel />
              <ConflictsPanel />
            </div>
          )}
        </main>
        <RightPanel />
      </div>
      <ConfirmationModal />
    </>
  );
}
