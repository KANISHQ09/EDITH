"use strict";
// ============================================================
// VAIC Shared Constants
// Single source of truth for all enum values used across
// TypeScript services. Python services mirror these in
// shared/schemas/constants.py
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULTS = exports.TTS_PREFIX = exports.VOICE_COMMANDS = exports.WS_EVENTS = exports.incidentTopic = exports.KAFKA_TOPICS = exports.INTEGRATION_TOOL = exports.CONFLICT_STATUS = exports.TOOL_ACTION_STATUS = exports.ITEM_STATUS = exports.CLASSIFICATION_TYPE = exports.PARTICIPANT_ROLE = exports.INCIDENT_STATUS = exports.INCIDENT_SEVERITY = void 0;
exports.INCIDENT_SEVERITY = {
    P1: 'P1',
    P2: 'P2',
    P3: 'P3',
    P4: 'P4',
};
exports.INCIDENT_STATUS = {
    ACTIVE: 'ACTIVE',
    MITIGATED: 'MITIGATED',
    RESOLVED: 'RESOLVED',
    CANCELLED: 'CANCELLED',
};
exports.PARTICIPANT_ROLE = {
    INCIDENT_COMMANDER: 'INCIDENT_COMMANDER',
    RESPONDER: 'RESPONDER',
    OBSERVER: 'OBSERVER',
    BUSINESS_STAKEHOLDER: 'BUSINESS_STAKEHOLDER',
    PLATFORM_ADMIN: 'PLATFORM_ADMIN',
    VAIC_SYSTEM: 'VAIC_SYSTEM',
};
exports.CLASSIFICATION_TYPE = {
    FACT: 'FACT',
    HYPOTHESIS: 'HYPOTHESIS',
    DECISION: 'DECISION',
    ACTION_ITEM: 'ACTION_ITEM',
    QUESTION: 'QUESTION',
    STATUS_UPDATE: 'STATUS_UPDATE',
    SOCIAL: 'SOCIAL',
};
exports.ITEM_STATUS = {
    PENDING: 'PENDING',
    IN_PROGRESS: 'IN_PROGRESS',
    CONFIRMED: 'CONFIRMED',
    REJECTED: 'REJECTED',
    RESOLVED: 'RESOLVED',
};
exports.TOOL_ACTION_STATUS = {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    REJECTED: 'REJECTED',
    EXECUTING: 'EXECUTING',
    EXECUTED: 'EXECUTED',
    FAILED: 'FAILED',
};
exports.CONFLICT_STATUS = {
    OPEN: 'OPEN',
    RESOLVED: 'RESOLVED',
    DISMISSED: 'DISMISSED',
};
exports.INTEGRATION_TOOL = {
    SLACK: 'slack',
    JIRA: 'jira',
    PAGERDUTY: 'pagerduty',
    DATADOG: 'datadog',
};
// ─── Kafka Topics ────────────────────────────────────────────
exports.KAFKA_TOPICS = {
    AUDIO_RAW: 'audio.raw',
    TRANSCRIPT_ENTRIES: 'transcript.entries',
    CLASSIFICATIONS: 'classifications',
    STATE_DELTAS: 'state.deltas',
    TOOL_PROPOSALS: 'tool.proposals',
    AUDIT_EVENTS: 'audit.events',
};
// Per-incident topic names (suffixed with incident ID)
const incidentTopic = (base, incidentId) => `${base}.${incidentId}`;
exports.incidentTopic = incidentTopic;
// ─── WebSocket Event Types ────────────────────────────────────
exports.WS_EVENTS = {
    STATE_DELTA: 'state.delta',
    NEW_TRANSCRIPT: 'new.transcript',
    NEW_CLASSIFICATION: 'new.classification',
    NEW_CONFLICT: 'new.conflict',
    ACTION_PROPOSED: 'action.proposed',
    ACTION_EXECUTED: 'action.executed',
    INCIDENT_RESOLVED: 'incident.resolved',
};
// ─── Voice Commands ───────────────────────────────────────────
exports.VOICE_COMMANDS = [
    'VAIC, status',
    'VAIC, open actions',
    'VAIC, what do we know?',
    'VAIC, conflicts',
    'VAIC, confirm',
    'VAIC, reject',
];
// ─── TTS Prefixes (VSE-02) ───────────────────────────────────
exports.TTS_PREFIX = {
    SUMMARY: 'VAIC summary: ',
    NOTICE: 'VAIC notice: ',
};
// ─── Defaults ────────────────────────────────────────────────
exports.DEFAULTS = {
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
};
//# sourceMappingURL=constants.js.map