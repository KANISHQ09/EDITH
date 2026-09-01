export declare const INCIDENT_SEVERITY: {
    readonly P1: "P1";
    readonly P2: "P2";
    readonly P3: "P3";
    readonly P4: "P4";
};
export type IncidentSeverity = (typeof INCIDENT_SEVERITY)[keyof typeof INCIDENT_SEVERITY];
export declare const INCIDENT_STATUS: {
    readonly ACTIVE: "ACTIVE";
    readonly MITIGATED: "MITIGATED";
    readonly RESOLVED: "RESOLVED";
    readonly CANCELLED: "CANCELLED";
};
export type IncidentStatus = (typeof INCIDENT_STATUS)[keyof typeof INCIDENT_STATUS];
export declare const PARTICIPANT_ROLE: {
    readonly INCIDENT_COMMANDER: "INCIDENT_COMMANDER";
    readonly RESPONDER: "RESPONDER";
    readonly OBSERVER: "OBSERVER";
    readonly BUSINESS_STAKEHOLDER: "BUSINESS_STAKEHOLDER";
    readonly PLATFORM_ADMIN: "PLATFORM_ADMIN";
    readonly VAIC_SYSTEM: "VAIC_SYSTEM";
};
export type ParticipantRole = (typeof PARTICIPANT_ROLE)[keyof typeof PARTICIPANT_ROLE];
export declare const CLASSIFICATION_TYPE: {
    readonly FACT: "FACT";
    readonly HYPOTHESIS: "HYPOTHESIS";
    readonly DECISION: "DECISION";
    readonly ACTION_ITEM: "ACTION_ITEM";
    readonly QUESTION: "QUESTION";
    readonly STATUS_UPDATE: "STATUS_UPDATE";
    readonly SOCIAL: "SOCIAL";
};
export type ClassificationType = (typeof CLASSIFICATION_TYPE)[keyof typeof CLASSIFICATION_TYPE];
export declare const ITEM_STATUS: {
    readonly PENDING: "PENDING";
    readonly IN_PROGRESS: "IN_PROGRESS";
    readonly CONFIRMED: "CONFIRMED";
    readonly REJECTED: "REJECTED";
    readonly RESOLVED: "RESOLVED";
};
export type ItemStatus = (typeof ITEM_STATUS)[keyof typeof ITEM_STATUS];
export declare const TOOL_ACTION_STATUS: {
    readonly PENDING: "PENDING";
    readonly CONFIRMED: "CONFIRMED";
    readonly REJECTED: "REJECTED";
    readonly EXECUTING: "EXECUTING";
    readonly EXECUTED: "EXECUTED";
    readonly FAILED: "FAILED";
};
export type ToolActionStatus = (typeof TOOL_ACTION_STATUS)[keyof typeof TOOL_ACTION_STATUS];
export declare const CONFLICT_STATUS: {
    readonly OPEN: "OPEN";
    readonly RESOLVED: "RESOLVED";
    readonly DISMISSED: "DISMISSED";
};
export type ConflictStatus = (typeof CONFLICT_STATUS)[keyof typeof CONFLICT_STATUS];
export declare const INTEGRATION_TOOL: {
    readonly SLACK: "slack";
    readonly JIRA: "jira";
    readonly PAGERDUTY: "pagerduty";
    readonly DATADOG: "datadog";
};
export type IntegrationTool = (typeof INTEGRATION_TOOL)[keyof typeof INTEGRATION_TOOL];
export declare const KAFKA_TOPICS: {
    readonly AUDIO_RAW: "audio.raw";
    readonly TRANSCRIPT_ENTRIES: "transcript.entries";
    readonly CLASSIFICATIONS: "classifications";
    readonly STATE_DELTAS: "state.deltas";
    readonly TOOL_PROPOSALS: "tool.proposals";
    readonly AUDIT_EVENTS: "audit.events";
};
export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];
export declare const incidentTopic: (base: KafkaTopic, incidentId: string) => string;
export declare const WS_EVENTS: {
    readonly STATE_DELTA: "state.delta";
    readonly NEW_TRANSCRIPT: "new.transcript";
    readonly NEW_CLASSIFICATION: "new.classification";
    readonly NEW_CONFLICT: "new.conflict";
    readonly ACTION_PROPOSED: "action.proposed";
    readonly ACTION_EXECUTED: "action.executed";
    readonly INCIDENT_RESOLVED: "incident.resolved";
};
export type WsEvent = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];
export declare const VOICE_COMMANDS: readonly ["VAIC, status", "VAIC, open actions", "VAIC, what do we know?", "VAIC, conflicts", "VAIC, confirm", "VAIC, reject"];
export type VoiceCommand = (typeof VOICE_COMMANDS)[number];
export declare const TTS_PREFIX: {
    readonly SUMMARY: "VAIC summary: ";
    readonly NOTICE: "VAIC notice: ";
};
export declare const DEFAULTS: {
    readonly SUMMARY_INTERVAL_MINUTES: 15;
    readonly LLM_CONTEXT_WINDOW_SIZE: 50;
    readonly UNRESOLVED_QUESTION_TIMEOUT_MINUTES: 5;
    readonly CONFLICT_SIMILARITY_THRESHOLD: 0.85;
    readonly MAX_RETRY_ATTEMPTS: 3;
    readonly RETRY_BASE_DELAY_MS: 1000;
    readonly TRANSCRIPT_RETENTION_DAYS: 90;
    readonly WEBSOCKET_HEARTBEAT_MS: 30000;
    readonly WEBSOCKET_REPLAY_COUNT: 100;
    readonly MAX_AUDIO_PARTICIPANTS: 50;
    readonly AUDIO_BUFFER_MS: 500;
    readonly CLASSIFICATION_TIMEOUT_MS: 5000;
};
//# sourceMappingURL=constants.d.ts.map