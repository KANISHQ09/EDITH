// ============================================================
// VAIC Shared Constants
// Single source of truth for all enum values used across
// TypeScript services. Python services mirror these in
// shared/schemas/constants.py
// ============================================================

export const INCIDENT_SEVERITY = {
  P1: 'P1',
  P2: 'P2',
  P3: 'P3',
  P4: 'P4',
} as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITY)[keyof typeof INCIDENT_SEVERITY];

export const INCIDENT_STATUS = {
  ACTIVE: 'ACTIVE',
  MITIGATED: 'MITIGATED',
  RESOLVED: 'RESOLVED',
  CANCELLED: 'CANCELLED',
} as const;
export type IncidentStatus = (typeof INCIDENT_STATUS)[keyof typeof INCIDENT_STATUS];

export const PARTICIPANT_ROLE = {
  INCIDENT_COMMANDER: 'INCIDENT_COMMANDER',
  RESPONDER: 'RESPONDER',
  OBSERVER: 'OBSERVER',
  BUSINESS_STAKEHOLDER: 'BUSINESS_STAKEHOLDER',
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  VAIC_SYSTEM: 'VAIC_SYSTEM',
} as const;
export type ParticipantRole = (typeof PARTICIPANT_ROLE)[keyof typeof PARTICIPANT_ROLE];

export const CLASSIFICATION_TYPE = {
  FACT: 'FACT',
  HYPOTHESIS: 'HYPOTHESIS',
  DECISION: 'DECISION',
  ACTION_ITEM: 'ACTION_ITEM',
  QUESTION: 'QUESTION',
  STATUS_UPDATE: 'STATUS_UPDATE',
  SOCIAL: 'SOCIAL',
} as const;
export type ClassificationType = (typeof CLASSIFICATION_TYPE)[keyof typeof CLASSIFICATION_TYPE];

export const ITEM_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
  RESOLVED: 'RESOLVED',
} as const;
export type ItemStatus = (typeof ITEM_STATUS)[keyof typeof ITEM_STATUS];

export const TOOL_ACTION_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
  EXECUTING: 'EXECUTING',
  EXECUTED: 'EXECUTED',
  FAILED: 'FAILED',
} as const;
export type ToolActionStatus = (typeof TOOL_ACTION_STATUS)[keyof typeof TOOL_ACTION_STATUS];

export const CONFLICT_STATUS = {
  OPEN: 'OPEN',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED',
} as const;
export type ConflictStatus = (typeof CONFLICT_STATUS)[keyof typeof CONFLICT_STATUS];

export const INTEGRATION_TOOL = {
  SLACK: 'slack',
  JIRA: 'jira',
  PAGERDUTY: 'pagerduty',
  DATADOG: 'datadog',
} as const;
export type IntegrationTool = (typeof INTEGRATION_TOOL)[keyof typeof INTEGRATION_TOOL];

// ─── Kafka Topics ────────────────────────────────────────────
export const KAFKA_TOPICS = {
  AUDIO_RAW: 'audio.raw',
  TRANSCRIPT_ENTRIES: 'transcript.entries',
  CLASSIFICATIONS: 'classifications',
  STATE_DELTAS: 'state.deltas',
  TOOL_PROPOSALS: 'tool.proposals',
  AUDIT_EVENTS: 'audit.events',
} as const;
export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];

// Per-incident topic names (suffixed with incident ID)
export const incidentTopic = (base: KafkaTopic, incidentId: string) =>
  `${base}.${incidentId}`;

// ─── WebSocket Event Types ────────────────────────────────────
export const WS_EVENTS = {
  STATE_DELTA: 'state.delta',
  NEW_TRANSCRIPT: 'new.transcript',
  NEW_CLASSIFICATION: 'new.classification',
  NEW_CONFLICT: 'new.conflict',
  ACTION_PROPOSED: 'action.proposed',
  ACTION_EXECUTED: 'action.executed',
  INCIDENT_RESOLVED: 'incident.resolved',
} as const;
export type WsEvent = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];

// ─── Voice Commands ───────────────────────────────────────────
export const VOICE_COMMANDS = [
  'VAIC, status',
  'VAIC, open actions',
  'VAIC, what do we know?',
  'VAIC, conflicts',
  'VAIC, confirm',
  'VAIC, reject',
] as const;
export type VoiceCommand = (typeof VOICE_COMMANDS)[number];

// ─── TTS Prefixes (VSE-02) ───────────────────────────────────
export const TTS_PREFIX = {
  SUMMARY: 'VAIC summary: ',
  NOTICE: 'VAIC notice: ',
} as const;

// ─── Defaults ────────────────────────────────────────────────
export const DEFAULTS = {
  SUMMARY_INTERVAL_MINUTES: 15,
  LLM_CONTEXT_WINDOW_SIZE: 50,
  UNRESOLVED_QUESTION_TIMEOUT_MINUTES: 5,
  CONFLICT_SIMILARITY_THRESHOLD: 0.85,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_BASE_DELAY_MS: 1000,
  TRANSCRIPT_RETENTION_DAYS: 90,
  WEBSOCKET_HEARTBEAT_MS: 30_000,
  WEBSOCKET_REPLAY_COUNT: 100,
  MAX_AUDIO_PARTICIPANTS: 50,
  AUDIO_BUFFER_MS: 500,
  CLASSIFICATION_TIMEOUT_MS: 5000,
} as const;
