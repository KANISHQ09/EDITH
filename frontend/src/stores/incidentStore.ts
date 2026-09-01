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

  // Actions
  setIncident: (incident: Incident) => void;
  setInitialState: (state: Partial<IncidentStore>) => void;
  applyDelta: (delta: StateDelta) => void;
  setWsConnected: (connected: boolean) => void;
  setVaicListening: (listening: boolean) => void;
  addTranscript: (entry: TranscriptEntry) => void;
  setTranscripts: (entries: TranscriptEntry[]) => void;
  setSpeaking: (participantId: string, isSpeaking: boolean) => void;
  confirmToolAction: (actionId: string) => void;
  rejectToolAction: (actionId: string) => void;
  resolveConflict: (conflictId: string) => void;
}

export interface StateDelta {
  incidentId: string;
  deltaType: string;
  payload: Record<string, unknown>;
  version: number;
  timestamp: string;
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

  setIncident: (incident) => set({ incident }),

  setInitialState: (state) => set(state),

  applyDelta: (delta: StateDelta) => {
    const { deltaType, payload, timestamp } = delta;

    set((state) => {
      switch (deltaType) {
        case 'FACT_ADDED':
          return {
            facts: [...state.facts, {
              id: (payload.classificationId as string) || crypto.randomUUID(),
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

        case 'HYPOTHESIS_ADDED':
          return {
            hypotheses: [...state.hypotheses, {
              id: (payload.classificationId as string) || crypto.randomUUID(),
              incidentId: delta.incidentId,
              content: (payload.summary as string) || '',
              status: 'PENDING' as ItemStatus,
              confidence: payload.confidence as number,
              createdAt: timestamp,
              updatedAt: timestamp,
            }],
          };

        case 'DECISION_ADDED':
          return {
            decisions: [...state.decisions, {
              id: (payload.classificationId as string) || crypto.randomUUID(),
              incidentId: delta.incidentId,
              content: (payload.summary as string) || '',
              createdAt: timestamp,
            }],
          };

        case 'ACTION_ITEM_ADDED':
          return {
            actionItems: [...state.actionItems, {
              id: (payload.classificationId as string) || crypto.randomUUID(),
              incidentId: delta.incidentId,
              content: (payload.summary as string) || '',
              ownerName: (payload.actionItemOwner as string) || undefined,
              status: 'PENDING' as ItemStatus,
              createdAt: timestamp,
              updatedAt: timestamp,
            }],
          };

        case 'QUESTION_ADDED':
          return {
            questions: [...state.questions, {
              id: (payload.classificationId as string) || crypto.randomUUID(),
              incidentId: delta.incidentId,
              content: (payload.summary as string) || '',
              status: 'PENDING' as ItemStatus,
              createdAt: timestamp,
            }],
          };

        case 'CONFLICT_DETECTED':
          return {
            conflicts: [...state.conflicts, {
              id: (payload.id as string) || crypto.randomUUID(),
              incidentId: delta.incidentId,
              description: (payload.description as string) || 'Conflicting statements detected',
              status: 'OPEN' as ConflictStatus,
              factAId: payload.fact_a_id as string,
              factBId: payload.fact_b_id as string,
              createdAt: timestamp,
              updatedAt: timestamp,
            }],
          };

        case 'CONFLICT_RESOLVED':
          return {
            conflicts: state.conflicts.map(c =>
              c.id === (payload.conflictId as string)
                ? { ...c, status: 'RESOLVED' as ConflictStatus, updatedAt: timestamp }
                : c
            ),
          };

        case 'TOOL_ACTION_PROPOSED':
          return {
            pendingToolActions: [...state.pendingToolActions, {
              id: (payload.proposalId as string) || crypto.randomUUID(),
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

        case 'TOOL_ACTION_CONFIRMED':
        case 'TOOL_ACTION_REJECTED':
        case 'TOOL_ACTION_EXECUTED': {
          const newStatus = deltaType === 'TOOL_ACTION_CONFIRMED' ? 'CONFIRMED'
            : deltaType === 'TOOL_ACTION_REJECTED' ? 'REJECTED' : 'EXECUTED';
          return {
            pendingToolActions: state.pendingToolActions.filter(a => a.id !== payload.toolActionId),
          };
        }

        case 'PARTICIPANT_JOINED':
          return {
            participants: [...state.participants, {
              id: (payload.participantId as string) || crypto.randomUUID(),
              incidentId: delta.incidentId,
              role: (payload.role as string) || 'RESPONDER',
              joinedAt: timestamp,
              speakingTimeSeconds: 0,
            }],
          };

        default:
          return state;
      }
    });
  },

  setWsConnected: (connected) => set({ wsConnected: connected }),
  setVaicListening: (listening) => set({ vaicListening: listening }),

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
    // Optimistic UI update
    set((state) => ({
      pendingToolActions: state.pendingToolActions.filter(a => a.id !== actionId)
    }));
    fetch(`/api/v1/incidents/${get().incident?.id}/tool-actions/${actionId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
  },

  rejectToolAction: (actionId) => {
    // Optimistic UI update
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
}));
