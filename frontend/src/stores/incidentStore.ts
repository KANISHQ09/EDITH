import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────

export type ClassificationType = 'FACT' | 'HYPOTHESIS' | 'DECISION' | 'ACTION_ITEM' | 'QUESTION' | 'STATUS_UPDATE' | 'SOCIAL';
export type ItemStatus = 'PENDING' | 'IN_PROGRESS' | 'CONFIRMED' | 'REJECTED' | 'RESOLVED';
export type ConflictStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED';
export type ToolActionStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'EXECUTING' | 'EXECUTED' | 'FAILED';
export type IncidentSeverity = 'P1' | 'P2' | 'P3' | 'P4';
export type IncidentStatus = 'ACTIVE' | 'MITIGATED' | 'RESOLVED' | 'CANCELLED';

export interface Participant {
  id: string;
  incidentId: string;
  userId?: string;
  speakerLabel?: string;
  role: string;
  joinedAt: string;
  leftAt?: string;
  speakingTimeSeconds: number;
  isSpeaking?: boolean; // Live indicator
}

export interface Fact {
  id: string;
  incidentId: string;
  content: string;
  sourceClassificationId?: string;
  status: ItemStatus;
  confirmedBy?: string;
  confidence?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Hypothesis {
  id: string;
  incidentId: string;
  content: string;
  sourceClassificationId?: string;
  status: ItemStatus;
  confidence?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Decision {
  id: string;
  incidentId: string;
  content: string;
  decidedBy?: string;
  sourceClassificationId?: string;
  createdAt: string;
}

export interface ActionItem {
  id: string;
  incidentId: string;
  content: string;
  ownerId?: string;
  ownerName?: string;
  sourceClassificationId?: string;
  status: ItemStatus;
  dueHint?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  incidentId: string;
  content: string;
  askedBy?: string;
  sourceClassificationId?: string;
  status: ItemStatus;
  answeredAt?: string;
  createdAt: string;
}

export interface Conflict {
  id: string;
  incidentId: string;
  factAId?: string;
  factBId?: string;
  description: string;
  status: ConflictStatus;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ToolAction {
  id: string;
  incidentId: string;
  tool: string;
  actionType: string;
  payload: Record<string, unknown>;
  proposedBy: string;
  confirmedBy?: string;
  status: ToolActionStatus;
  executedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEntry {
  id: string;
  incidentId: string;
  ts: string;
  type: ClassificationType | 'CONFLICT' | 'TOOL_ACTION' | 'PARTICIPANT_JOIN' | 'PARTICIPANT_LEAVE' | 'INCIDENT_CREATED' | 'INCIDENT_RESOLVED';
  title: string;
  description?: string;
  actorName?: string;
  sourceId?: string;
}

export interface TranscriptEntry {
  id: string;
  speakerName?: string;
  speakerRole?: string;
  content: string;
  startTs: string;
  confidence: number;
  classification?: ClassificationType;
}

export interface Incident {
  id: string;
  orgId: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  startTs: string;
  resolvedTs?: string;
  conferenceUrl?: string;
  affectedSystems: string[];
}

// ─── Store ────────────────────────────────────────────────────

interface IncidentStore {
  incident: Incident | null;
  facts: Fact[];
  hypotheses: Hypothesis[];
  decisions: Decision[];
  actionItems: ActionItem[];
  questions: Question[];
  conflicts: Conflict[];
  pendingToolActions: ToolAction[];
  participants: Participant[];
  timeline: TimelineEntry[];
  recentTranscripts: TranscriptEntry[];
  wsConnected: boolean;
  vaicListening: boolean;

  isSpeechListening: boolean;
  interimTranscript: string;

  // Actions
  setIncident: (incident: Incident) => void;
  setInitialState: (state: Partial<IncidentStore>) => void;
  applyDelta: (delta: StateDelta) => void;
  setWsConnected: (connected: boolean) => void;
  setVaicListening: (listening: boolean) => void;
  setIsSpeechListening: (listening: boolean) => void;
  setInterimTranscript: (text: string) => void;
  addTranscript: (entry: TranscriptEntry) => void;
  setTranscripts: (entries: TranscriptEntry[]) => void;
  setSpeaking: (participantId: string, isSpeaking: boolean) => void;
  confirmToolAction: (actionId: string) => void;
  rejectToolAction: (actionId: string) => void;
  resolveConflict: (conflictId: string) => void;
  dismissConflict: (conflictId: string) => void;
  promoteHypothesisToFact: (hypothesisId: string) => Promise<void>;
  dismissHypothesis: (hypothesisId: string) => void;
  toggleActionItemStatus: (actionItemId: string) => void;
  answerQuestion: (questionId: string) => void;
  submitUtterance: (content: string, speakerName?: string, speakerRole?: string) => Promise<void>;
}

export interface StateDelta {
  incidentId: string;
  deltaType: string;
  payload: Record<string, unknown>;
  version: number;
  timestamp: string;
}

function dedupeArray<T extends { id?: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    if (!item.id) return true;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export const useIncidentStore = create<IncidentStore>((set, get) => ({
  incident: null,
  facts: [],
  hypotheses: [],
  decisions: [],
  actionItems: [],
  questions: [],
  conflicts: [],
  pendingToolActions: [],
  participants: [],
  timeline: [],
  recentTranscripts: [],
  wsConnected: false,
  vaicListening: false,
  isSpeechListening: false,
  interimTranscript: '',

  setIncident: (incident) => set({ incident }),

  setInitialState: (state) => set((prev) => ({
    ...state,
    facts: state.facts ? dedupeArray(state.facts) : prev.facts,
    hypotheses: state.hypotheses ? dedupeArray(state.hypotheses) : prev.hypotheses,
    decisions: state.decisions ? dedupeArray(state.decisions) : prev.decisions,
    actionItems: state.actionItems ? dedupeArray(state.actionItems) : prev.actionItems,
    questions: state.questions ? dedupeArray(state.questions) : prev.questions,
    conflicts: state.conflicts ? dedupeArray(state.conflicts) : prev.conflicts,
    participants: state.participants ? dedupeArray(state.participants) : prev.participants,
    timeline: state.timeline ? dedupeArray(state.timeline) : prev.timeline,
  })),

  applyDelta: (delta: StateDelta) => {
    const { deltaType, payload, timestamp } = delta;

    set((state) => {
      switch (deltaType) {
        case 'FACT_ADDED': {
          const id = (payload.classificationId as string) || crypto.randomUUID();
          if (state.facts.some(f => f.id === id)) return state;
          return {
            facts: [...state.facts, {
              id,
              incidentId: delta.incidentId,
              content: (payload.summary as string) || '',
              status: 'CONFIRMED' as ItemStatus,
              confidence: payload.confidence as number,
              createdAt: timestamp,
              updatedAt: timestamp,
            }],
            timeline: [...state.timeline, {
              id: crypto.randomUUID(),
              incidentId: delta.incidentId,
              ts: timestamp,
              type: 'FACT' as const,
              title: (payload.summary as string) || '',
              actorName: payload.speakerName as string,
            }],
          };
        }

        case 'HYPOTHESIS_ADDED': {
          const id = (payload.classificationId as string) || crypto.randomUUID();
          if (state.hypotheses.some(h => h.id === id)) return state;
          return {
            hypotheses: [...state.hypotheses, {
              id,
              incidentId: delta.incidentId,
              content: (payload.summary as string) || '',
              status: 'PENDING' as ItemStatus,
              confidence: payload.confidence as number,
              createdAt: timestamp,
              updatedAt: timestamp,
            }],
          };
        }

        case 'DECISION_ADDED': {
          const id = (payload.classificationId as string) || crypto.randomUUID();
          if (state.decisions.some(d => d.id === id)) return state;
          return {
            decisions: [...state.decisions, {
              id,
              incidentId: delta.incidentId,
              content: (payload.summary as string) || '',
              createdAt: timestamp,
            }],
          };
        }

        case 'ACTION_ITEM_ADDED': {
          const id = (payload.classificationId as string) || crypto.randomUUID();
          if (state.actionItems.some(a => a.id === id)) return state;
          return {
            actionItems: [...state.actionItems, {
              id,
              incidentId: delta.incidentId,
              content: (payload.summary as string) || '',
              ownerName: (payload.actionItemOwner as string) || undefined,
              status: 'PENDING' as ItemStatus,
              createdAt: timestamp,
              updatedAt: timestamp,
            }],
          };
        }

        case 'QUESTION_ADDED': {
          const id = (payload.classificationId as string) || crypto.randomUUID();
          if (state.questions.some(q => q.id === id)) return state;
          return {
            questions: [...state.questions, {
              id,
              incidentId: delta.incidentId,
              content: (payload.summary as string) || '',
              status: 'PENDING' as ItemStatus,
              createdAt: timestamp,
            }],
          };
        }

        case 'CONFLICT_DETECTED': {
          const id = (payload.id as string) || crypto.randomUUID();
          if (state.conflicts.some(c => c.id === id)) return state;
          return {
            conflicts: [...state.conflicts, {
              id,
              incidentId: delta.incidentId,
              description: (payload.description as string) || 'Conflicting statements detected',
              status: 'OPEN' as ConflictStatus,
              factAId: payload.fact_a_id as string,
              factBId: payload.fact_b_id as string,
              createdAt: timestamp,
              updatedAt: timestamp,
            }],
          };
        }

        case 'CONFLICT_RESOLVED':
          return {
            conflicts: state.conflicts.map(c =>
              c.id === (payload.conflictId as string)
                ? { ...c, status: 'RESOLVED' as ConflictStatus, updatedAt: timestamp }
                : c
            ),
          };

        case 'TOOL_ACTION_PROPOSED': {
          const id = (payload.proposalId as string) || crypto.randomUUID();
          if (state.pendingToolActions.some(a => a.id === id)) return state;
          return {
            pendingToolActions: [...state.pendingToolActions, {
              id,
              incidentId: delta.incidentId,
              tool: payload.tool as string,
              actionType: payload.actionType as string,
              payload: payload.payload as Record<string, unknown> || {},
              proposedBy: 'VAIC_SYSTEM',
              status: 'PENDING' as ToolActionStatus,
              createdAt: timestamp,
              updatedAt: timestamp,
            }],
          };
        }

        case 'TOOL_ACTION_CONFIRMED':
        case 'TOOL_ACTION_REJECTED':
        case 'TOOL_ACTION_EXECUTED':
          return {
            pendingToolActions: state.pendingToolActions.filter(a => a.id !== payload.toolActionId),
          };

        case 'PARTICIPANT_JOINED': {
          const id = (payload.participantId as string) || crypto.randomUUID();
          if (state.participants.some(p => p.id === id)) return state;
          return {
            participants: [...state.participants, {
              id,
              incidentId: delta.incidentId,
              role: (payload.role as string) || 'RESPONDER',
              joinedAt: timestamp,
              speakingTimeSeconds: 0,
            }],
          };
        }

        default:
          return state;
      }
    });
  },

  setWsConnected: (connected) => set({ wsConnected: connected }),
  setVaicListening: (listening) => set({ vaicListening: listening }),
  setIsSpeechListening: (listening) => set({ isSpeechListening: listening }),
  setInterimTranscript: (text) => set({ interimTranscript: text }),

  addTranscript: (entry) => set((state) => {
    if (state.recentTranscripts.some((t) => t.id === entry.id)) {
      return state;
    }
    return {
      recentTranscripts: [...state.recentTranscripts.slice(-99), entry],
    };
  }),

  setTranscripts: (entries) => set({ recentTranscripts: entries.slice(-100) }),

  setSpeaking: (participantId, isSpeaking) => set((state) => ({
    participants: state.participants.map(p =>
      p.id === participantId ? { ...p, isSpeaking } : p
    ),
  })),

  confirmToolAction: (actionId) => {
    set((state) => ({
      pendingToolActions: state.pendingToolActions.filter(a => a.id !== actionId)
    }));
    fetch(`/api/v1/incidents/${get().incident?.id}/tool-actions/${actionId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
  },

  rejectToolAction: (actionId) => {
    set((state) => ({
      pendingToolActions: state.pendingToolActions.filter(a => a.id !== actionId)
    }));
    fetch(`/api/v1/incidents/${get().incident?.id}/tool-actions/${actionId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
  },

  resolveConflict: (conflictId: string) => {
    set((state) => ({
      conflicts: state.conflicts.map(c =>
        c.id === conflictId ? { ...c, status: 'RESOLVED' as const } : c
      )
    }));
    fetch(`/api/v1/incidents/${get().incident?.id}/conflicts/${conflictId}/resolve`, {
      method: 'POST',
    }).catch(() => {});
  },

  dismissConflict: (conflictId: string) => {
    set((state) => ({
      conflicts: state.conflicts.filter(c => c.id !== conflictId),
    }));
  },

  promoteHypothesisToFact: async (hypothesisId: string) => {
    const hyp = get().hypotheses.find(h => h.id === hypothesisId);
    if (!hyp) return;

    const newFact: Fact = {
      id: crypto.randomUUID(),
      incidentId: hyp.incidentId,
      content: hyp.content,
      status: 'CONFIRMED',
      confidence: 1.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      hypotheses: state.hypotheses.filter(h => h.id !== hypothesisId),
      facts: [newFact, ...state.facts],
      timeline: [
        ...state.timeline,
        {
          id: crypto.randomUUID(),
          incidentId: hyp.incidentId,
          ts: new Date().toISOString(),
          type: 'FACT',
          title: `Promoted to Fact: ${hyp.content}`,
          actorName: 'Alex Chen',
        },
      ],
    }));

    try {
      await fetch(`/api/v1/incidents/${hyp.incidentId}/facts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: hyp.content }),
      });
    } catch (err) {
      console.warn('Failed to persist promoted fact to API', err);
    }
  },

  dismissHypothesis: (hypothesisId: string) => {
    set((state) => ({
      hypotheses: state.hypotheses.filter(h => h.id !== hypothesisId),
    }));
  },

  toggleActionItemStatus: (actionItemId: string) => {
    set((state) => ({
      actionItems: state.actionItems.map(item => {
        if (item.id !== actionItemId) return item;
        const nextStatus: ItemStatus =
          item.status === 'PENDING' ? 'IN_PROGRESS' :
          item.status === 'IN_PROGRESS' ? 'RESOLVED' : 'PENDING';
        return { ...item, status: nextStatus, updatedAt: new Date().toISOString() };
      }),
    }));
  },

  answerQuestion: (questionId: string) => {
    set((state) => ({
      questions: state.questions.map(q =>
        q.id === questionId
          ? { ...q, status: 'RESOLVED' as ItemStatus, answeredAt: new Date().toISOString() }
          : q
      ),
    }));
  },

  submitUtterance: async (content: string, speakerName = 'Alex Chen', speakerRole = 'INCIDENT_COMMANDER') => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const incidentId = get().incident?.id || 'demo';
    const localId = crypto.randomUUID();
    const now = new Date().toISOString();

    // 1. Optimistically display in transcript feed right away
    get().addTranscript({
      id: localId,
      content: trimmed,
      speakerName: `${speakerName} (You)`,
      speakerRole,
      startTs: now,
      confidence: 1.0,
    });

    // 2. Post to backend for persistence & Gemini classification
    try {
      const res = await fetch(`/api/v1/incidents/${incidentId}/utterances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: trimmed,
          speakerName,
          speakerRole,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const data = json.data;
        const classification = data?.classification;

        if (classification) {
          const type = classification.type;
          const summary = classification.summary || trimmed;
          const confidence = classification.confidence || 0.95;

          if (type === 'FACT') {
            get().applyDelta({
              incidentId,
              deltaType: 'FACT_ADDED',
              payload: { summary, confidence, speakerName },
              version: 1,
              timestamp: now,
            });
          } else if (type === 'HYPOTHESIS') {
            get().applyDelta({
              incidentId,
              deltaType: 'HYPOTHESIS_ADDED',
              payload: { summary, confidence },
              version: 1,
              timestamp: now,
            });
          } else if (type === 'ACTION_ITEM') {
            get().applyDelta({
              incidentId,
              deltaType: 'ACTION_ITEM_ADDED',
              payload: { summary, actionItemOwner: classification.action_item_owner },
              version: 1,
              timestamp: now,
            });
          } else if (type === 'DECISION') {
            get().applyDelta({
              incidentId,
              deltaType: 'DECISION_ADDED',
              payload: { summary },
              version: 1,
              timestamp: now,
            });
          } else if (type === 'QUESTION') {
            get().applyDelta({
              incidentId,
              deltaType: 'QUESTION_ADDED',
              payload: { summary },
              version: 1,
              timestamp: now,
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to submit utterance to server:', err);
    }
  },
}));
