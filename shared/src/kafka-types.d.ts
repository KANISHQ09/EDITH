import { z } from 'zod';
export declare const AudioRawMessageSchema: z.ZodObject<{
    incidentId: z.ZodString;
    participantId: z.ZodString;
    speakerLabel: z.ZodOptional<z.ZodString>;
    audioChunk: z.ZodString;
    sequenceNumber: z.ZodNumber;
    timestamp: z.ZodString;
    durationMs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    durationMs: number;
    incidentId: string;
    participantId: string;
    audioChunk: string;
    sequenceNumber: number;
    speakerLabel?: string | undefined;
}, {
    timestamp: string;
    incidentId: string;
    participantId: string;
    audioChunk: string;
    sequenceNumber: number;
    durationMs?: number | undefined;
    speakerLabel?: string | undefined;
}>;
export type AudioRawMessage = z.infer<typeof AudioRawMessageSchema>;
export declare const TranscriptEntryMessageSchema: z.ZodObject<{
    incidentId: z.ZodString;
    participantId: z.ZodNullable<z.ZodString>;
    speakerLabel: z.ZodNullable<z.ZodString>;
    speakerName: z.ZodNullable<z.ZodString>;
    speakerRole: z.ZodNullable<z.ZodString>;
    content: z.ZodString;
    startTs: z.ZodString;
    endTs: z.ZodString;
    confidence: z.ZodNumber;
    audioRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    incidentId: string;
    speakerLabel: string | null;
    participantId: string | null;
    speakerName: string | null;
    speakerRole: string | null;
    content: string;
    startTs: string;
    endTs: string;
    confidence: number;
    audioRef?: string | null | undefined;
}, {
    incidentId: string;
    speakerLabel: string | null;
    participantId: string | null;
    speakerName: string | null;
    speakerRole: string | null;
    content: string;
    startTs: string;
    endTs: string;
    confidence: number;
    audioRef?: string | null | undefined;
}>;
export type TranscriptEntryMessage = z.infer<typeof TranscriptEntryMessageSchema>;
export declare const ClassificationMessageSchema: z.ZodObject<{
    id: z.ZodString;
    transcriptEntryId: z.ZodString;
    incidentId: z.ZodString;
    type: z.ZodEnum<["FACT", "HYPOTHESIS", "DECISION", "ACTION_ITEM", "QUESTION", "STATUS_UPDATE", "SOCIAL"]>;
    confidence: z.ZodNumber;
    summary: z.ZodNullable<z.ZodString>;
    entities: z.ZodObject<{
        systems: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        people: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        timestamps: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        metrics: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        errorCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        urls: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        tools: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        systems: string[];
        people: string[];
        timestamps: string[];
        metrics: string[];
        errorCodes: string[];
        urls: string[];
        tools: string[];
    }, {
        systems?: string[] | undefined;
        people?: string[] | undefined;
        timestamps?: string[] | undefined;
        metrics?: string[] | undefined;
        errorCodes?: string[] | undefined;
        urls?: string[] | undefined;
        tools?: string[] | undefined;
    }>;
    actionItemOwner: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    requiresFollowup: z.ZodDefault<z.ZodBoolean>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "FACT" | "HYPOTHESIS" | "DECISION" | "ACTION_ITEM" | "QUESTION" | "STATUS_UPDATE" | "SOCIAL";
    createdAt: string;
    incidentId: string;
    confidence: number;
    transcriptEntryId: string;
    summary: string | null;
    entities: {
        systems: string[];
        people: string[];
        timestamps: string[];
        metrics: string[];
        errorCodes: string[];
        urls: string[];
        tools: string[];
    };
    requiresFollowup: boolean;
    actionItemOwner?: string | null | undefined;
}, {
    id: string;
    type: "FACT" | "HYPOTHESIS" | "DECISION" | "ACTION_ITEM" | "QUESTION" | "STATUS_UPDATE" | "SOCIAL";
    createdAt: string;
    incidentId: string;
    confidence: number;
    transcriptEntryId: string;
    summary: string | null;
    entities: {
        systems?: string[] | undefined;
        people?: string[] | undefined;
        timestamps?: string[] | undefined;
        metrics?: string[] | undefined;
        errorCodes?: string[] | undefined;
        urls?: string[] | undefined;
        tools?: string[] | undefined;
    };
    actionItemOwner?: string | null | undefined;
    requiresFollowup?: boolean | undefined;
}>;
export type ClassificationMessage = z.infer<typeof ClassificationMessageSchema>;
export declare const StateDeltaMessageSchema: z.ZodObject<{
    incidentId: z.ZodString;
    deltaType: z.ZodEnum<["FACT_ADDED", "FACT_UPDATED", "HYPOTHESIS_ADDED", "HYPOTHESIS_UPDATED", "DECISION_ADDED", "ACTION_ITEM_ADDED", "ACTION_ITEM_UPDATED", "QUESTION_ADDED", "QUESTION_RESOLVED", "CONFLICT_DETECTED", "CONFLICT_RESOLVED", "TOOL_ACTION_PROPOSED", "TOOL_ACTION_CONFIRMED", "TOOL_ACTION_REJECTED", "TOOL_ACTION_EXECUTED", "PARTICIPANT_JOINED", "PARTICIPANT_LEFT", "INCIDENT_STATUS_CHANGED", "TIMELINE_ENTRY_ADDED"]>;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    version: z.ZodNumber;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    incidentId: string;
    payload: Record<string, unknown>;
    version: number;
    deltaType: "FACT_ADDED" | "FACT_UPDATED" | "HYPOTHESIS_ADDED" | "HYPOTHESIS_UPDATED" | "DECISION_ADDED" | "ACTION_ITEM_ADDED" | "ACTION_ITEM_UPDATED" | "QUESTION_ADDED" | "QUESTION_RESOLVED" | "CONFLICT_DETECTED" | "CONFLICT_RESOLVED" | "TOOL_ACTION_PROPOSED" | "TOOL_ACTION_CONFIRMED" | "TOOL_ACTION_REJECTED" | "TOOL_ACTION_EXECUTED" | "PARTICIPANT_JOINED" | "PARTICIPANT_LEFT" | "INCIDENT_STATUS_CHANGED" | "TIMELINE_ENTRY_ADDED";
}, {
    timestamp: string;
    incidentId: string;
    payload: Record<string, unknown>;
    version: number;
    deltaType: "FACT_ADDED" | "FACT_UPDATED" | "HYPOTHESIS_ADDED" | "HYPOTHESIS_UPDATED" | "DECISION_ADDED" | "ACTION_ITEM_ADDED" | "ACTION_ITEM_UPDATED" | "QUESTION_ADDED" | "QUESTION_RESOLVED" | "CONFLICT_DETECTED" | "CONFLICT_RESOLVED" | "TOOL_ACTION_PROPOSED" | "TOOL_ACTION_CONFIRMED" | "TOOL_ACTION_REJECTED" | "TOOL_ACTION_EXECUTED" | "PARTICIPANT_JOINED" | "PARTICIPANT_LEFT" | "INCIDENT_STATUS_CHANGED" | "TIMELINE_ENTRY_ADDED";
}>;
export type StateDeltaMessage = z.infer<typeof StateDeltaMessageSchema>;
export declare const ToolProposalMessageSchema: z.ZodObject<{
    incidentId: z.ZodString;
    proposalId: z.ZodString;
    tool: z.ZodEnum<["slack", "jira", "pagerduty", "datadog"]>;
    actionType: z.ZodString;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    humanReadableSummary: z.ZodString;
    proposedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    incidentId: string;
    tool: "slack" | "jira" | "pagerduty" | "datadog";
    actionType: string;
    payload: Record<string, unknown>;
    proposalId: string;
    humanReadableSummary: string;
    proposedAt: string;
}, {
    incidentId: string;
    tool: "slack" | "jira" | "pagerduty" | "datadog";
    actionType: string;
    payload: Record<string, unknown>;
    proposalId: string;
    humanReadableSummary: string;
    proposedAt: string;
}>;
export type ToolProposalMessage = z.infer<typeof ToolProposalMessageSchema>;
export declare const AuditEventMessageSchema: z.ZodObject<{
    incidentId: z.ZodNullable<z.ZodString>;
    service: z.ZodString;
    actorId: z.ZodString;
    action: z.ZodString;
    details: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    correlationId: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    service: string;
    incidentId: string | null;
    actorId: string;
    action: string;
    details: Record<string, unknown>;
    correlationId?: string | undefined;
}, {
    timestamp: string;
    service: string;
    incidentId: string | null;
    actorId: string;
    action: string;
    correlationId?: string | undefined;
    details?: Record<string, unknown> | undefined;
}>;
export type AuditEventMessage = z.infer<typeof AuditEventMessageSchema>;
//# sourceMappingURL=kafka-types.d.ts.map