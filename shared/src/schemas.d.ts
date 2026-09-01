import { z } from 'zod';
export declare const OrganizationSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    slug: z.ZodString;
    settings: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    slug: string;
    settings: Record<string, unknown>;
    createdAt: string;
}, {
    id: string;
    name: string;
    slug: string;
    createdAt: string;
    settings?: Record<string, unknown> | undefined;
}>;
export type Organization = z.infer<typeof OrganizationSchema>;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    orgId: z.ZodString;
    name: z.ZodString;
    email: z.ZodString;
    role: z.ZodEnum<["INCIDENT_COMMANDER", "RESPONDER", "OBSERVER", "BUSINESS_STAKEHOLDER", "PLATFORM_ADMIN", "VAIC_SYSTEM"]>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    createdAt: string;
    orgId: string;
    email: string;
    role: "INCIDENT_COMMANDER" | "RESPONDER" | "OBSERVER" | "BUSINESS_STAKEHOLDER" | "PLATFORM_ADMIN" | "VAIC_SYSTEM";
}, {
    id: string;
    name: string;
    createdAt: string;
    orgId: string;
    email: string;
    role: "INCIDENT_COMMANDER" | "RESPONDER" | "OBSERVER" | "BUSINESS_STAKEHOLDER" | "PLATFORM_ADMIN" | "VAIC_SYSTEM";
}>;
export type User = z.infer<typeof UserSchema>;
export declare const ParticipantSchema: z.ZodObject<{
    id: z.ZodString;
    incidentId: z.ZodString;
    userId: z.ZodNullable<z.ZodString>;
    speakerLabel: z.ZodNullable<z.ZodString>;
    role: z.ZodEnum<["INCIDENT_COMMANDER", "RESPONDER", "OBSERVER", "BUSINESS_STAKEHOLDER", "PLATFORM_ADMIN", "VAIC_SYSTEM"]>;
    joinedAt: z.ZodString;
    leftAt: z.ZodNullable<z.ZodString>;
    speakingTimeSeconds: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    role: "INCIDENT_COMMANDER" | "RESPONDER" | "OBSERVER" | "BUSINESS_STAKEHOLDER" | "PLATFORM_ADMIN" | "VAIC_SYSTEM";
    incidentId: string;
    userId: string | null;
    speakerLabel: string | null;
    joinedAt: string;
    leftAt: string | null;
    speakingTimeSeconds: number;
}, {
    id: string;
    role: "INCIDENT_COMMANDER" | "RESPONDER" | "OBSERVER" | "BUSINESS_STAKEHOLDER" | "PLATFORM_ADMIN" | "VAIC_SYSTEM";
    incidentId: string;
    userId: string | null;
    speakerLabel: string | null;
    joinedAt: string;
    leftAt: string | null;
    speakingTimeSeconds?: number | undefined;
}>;
export type Participant = z.infer<typeof ParticipantSchema>;
export declare const ExtractedEntitiesSchema: z.ZodObject<{
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
export type ExtractedEntities = z.infer<typeof ExtractedEntitiesSchema>;
export declare const TranscriptEntrySchema: z.ZodObject<{
    id: z.ZodString;
    incidentId: z.ZodString;
    participantId: z.ZodNullable<z.ZodString>;
    speakerName: z.ZodOptional<z.ZodString>;
    speakerRole: z.ZodOptional<z.ZodString>;
    content: z.ZodString;
    startTs: z.ZodString;
    endTs: z.ZodString;
    confidence: z.ZodDefault<z.ZodNumber>;
    audioRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    incidentId: string;
    participantId: string | null;
    content: string;
    startTs: string;
    endTs: string;
    confidence: number;
    speakerName?: string | undefined;
    speakerRole?: string | undefined;
    audioRef?: string | null | undefined;
}, {
    id: string;
    createdAt: string;
    incidentId: string;
    participantId: string | null;
    content: string;
    startTs: string;
    endTs: string;
    speakerName?: string | undefined;
    speakerRole?: string | undefined;
    confidence?: number | undefined;
    audioRef?: string | null | undefined;
}>;
export type TranscriptEntry = z.infer<typeof TranscriptEntrySchema>;
export declare const ClassificationRecordSchema: z.ZodObject<{
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
export type ClassificationRecord = z.infer<typeof ClassificationRecordSchema>;
export declare const FactSchema: z.ZodObject<{
    id: z.ZodString;
    incidentId: z.ZodString;
    content: z.ZodString;
    sourceClassificationId: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["PENDING", "IN_PROGRESS", "CONFIRMED", "REJECTED", "RESOLVED"]>;
    confirmedBy: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "RESOLVED" | "PENDING" | "IN_PROGRESS" | "CONFIRMED" | "REJECTED";
    id: string;
    createdAt: string;
    incidentId: string;
    content: string;
    sourceClassificationId: string | null;
    confirmedBy: string | null;
    updatedAt: string;
}, {
    status: "RESOLVED" | "PENDING" | "IN_PROGRESS" | "CONFIRMED" | "REJECTED";
    id: string;
    createdAt: string;
    incidentId: string;
    content: string;
    sourceClassificationId: string | null;
    confirmedBy: string | null;
    updatedAt: string;
}>;
export type Fact = z.infer<typeof FactSchema>;
export declare const HypothesisSchema: z.ZodObject<{
    id: z.ZodString;
    incidentId: z.ZodString;
    content: z.ZodString;
    sourceClassificationId: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["PENDING", "IN_PROGRESS", "CONFIRMED", "REJECTED", "RESOLVED"]>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "RESOLVED" | "PENDING" | "IN_PROGRESS" | "CONFIRMED" | "REJECTED";
    id: string;
    createdAt: string;
    incidentId: string;
    content: string;
    sourceClassificationId: string | null;
    updatedAt: string;
}, {
    status: "RESOLVED" | "PENDING" | "IN_PROGRESS" | "CONFIRMED" | "REJECTED";
    id: string;
    createdAt: string;
    incidentId: string;
    content: string;
    sourceClassificationId: string | null;
    updatedAt: string;
}>;
export type Hypothesis = z.infer<typeof HypothesisSchema>;
export declare const DecisionSchema: z.ZodObject<{
    id: z.ZodString;
    incidentId: z.ZodString;
    content: z.ZodString;
    decidedBy: z.ZodNullable<z.ZodString>;
    sourceClassificationId: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    incidentId: string;
    content: string;
    sourceClassificationId: string | null;
    decidedBy: string | null;
}, {
    id: string;
    createdAt: string;
    incidentId: string;
    content: string;
    sourceClassificationId: string | null;
    decidedBy: string | null;
}>;
export type Decision = z.infer<typeof DecisionSchema>;
export declare const ActionItemSchema: z.ZodObject<{
    id: z.ZodString;
    incidentId: z.ZodString;
    content: z.ZodString;
    ownerId: z.ZodNullable<z.ZodString>;
    ownerName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sourceClassificationId: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["PENDING", "IN_PROGRESS", "CONFIRMED", "REJECTED", "RESOLVED"]>;
    dueHint: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "RESOLVED" | "PENDING" | "IN_PROGRESS" | "CONFIRMED" | "REJECTED";
    id: string;
    createdAt: string;
    incidentId: string;
    content: string;
    sourceClassificationId: string | null;
    updatedAt: string;
    ownerId: string | null;
    dueHint: string | null;
    ownerName?: string | null | undefined;
}, {
    status: "RESOLVED" | "PENDING" | "IN_PROGRESS" | "CONFIRMED" | "REJECTED";
    id: string;
    createdAt: string;
    incidentId: string;
    content: string;
    sourceClassificationId: string | null;
    updatedAt: string;
    ownerId: string | null;
    dueHint: string | null;
    ownerName?: string | null | undefined;
}>;
export type ActionItem = z.infer<typeof ActionItemSchema>;
export declare const QuestionSchema: z.ZodObject<{
    id: z.ZodString;
    incidentId: z.ZodString;
    content: z.ZodString;
    askedBy: z.ZodNullable<z.ZodString>;
    sourceClassificationId: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["PENDING", "IN_PROGRESS", "CONFIRMED", "REJECTED", "RESOLVED"]>;
    answeredAt: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "RESOLVED" | "PENDING" | "IN_PROGRESS" | "CONFIRMED" | "REJECTED";
    id: string;
    createdAt: string;
    incidentId: string;
    content: string;
    sourceClassificationId: string | null;
    askedBy: string | null;
    answeredAt: string | null;
}, {
    status: "RESOLVED" | "PENDING" | "IN_PROGRESS" | "CONFIRMED" | "REJECTED";
    id: string;
    createdAt: string;
    incidentId: string;
    content: string;
    sourceClassificationId: string | null;
    askedBy: string | null;
    answeredAt: string | null;
}>;
export type Question = z.infer<typeof QuestionSchema>;
export declare const ConflictSchema: z.ZodObject<{
    id: z.ZodString;
    incidentId: z.ZodString;
    factAId: z.ZodNullable<z.ZodString>;
    factBId: z.ZodNullable<z.ZodString>;
    description: z.ZodString;
    status: z.ZodEnum<["OPEN", "RESOLVED", "DISMISSED"]>;
    resolvedBy: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "RESOLVED" | "OPEN" | "DISMISSED";
    id: string;
    createdAt: string;
    incidentId: string;
    updatedAt: string;
    factAId: string | null;
    factBId: string | null;
    description: string;
    resolvedBy: string | null;
}, {
    status: "RESOLVED" | "OPEN" | "DISMISSED";
    id: string;
    createdAt: string;
    incidentId: string;
    updatedAt: string;
    factAId: string | null;
    factBId: string | null;
    description: string;
    resolvedBy: string | null;
}>;
export type Conflict = z.infer<typeof ConflictSchema>;
export declare const ToolActionSchema: z.ZodObject<{
    id: z.ZodString;
    incidentId: z.ZodString;
    tool: z.ZodEnum<["slack", "jira", "pagerduty", "datadog"]>;
    actionType: z.ZodString;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    proposedBy: z.ZodDefault<z.ZodString>;
    confirmedBy: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["PENDING", "CONFIRMED", "REJECTED", "EXECUTING", "EXECUTED", "FAILED"]>;
    executedAt: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "PENDING" | "CONFIRMED" | "REJECTED" | "EXECUTING" | "EXECUTED" | "FAILED";
    id: string;
    createdAt: string;
    incidentId: string;
    confirmedBy: string | null;
    updatedAt: string;
    tool: "slack" | "jira" | "pagerduty" | "datadog";
    actionType: string;
    payload: Record<string, unknown>;
    proposedBy: string;
    executedAt: string | null;
}, {
    status: "PENDING" | "CONFIRMED" | "REJECTED" | "EXECUTING" | "EXECUTED" | "FAILED";
    id: string;
    createdAt: string;
    incidentId: string;
    confirmedBy: string | null;
    updatedAt: string;
    tool: "slack" | "jira" | "pagerduty" | "datadog";
    actionType: string;
    payload: Record<string, unknown>;
    executedAt: string | null;
    proposedBy?: string | undefined;
}>;
export type ToolAction = z.infer<typeof ToolActionSchema>;
export declare const TimelineEntrySchema: z.ZodObject<{
    id: z.ZodString;
    incidentId: z.ZodString;
    ts: z.ZodString;
    type: z.ZodEnum<["FACT", "HYPOTHESIS", "DECISION", "ACTION_ITEM", "QUESTION", "STATUS_UPDATE", "CONFLICT", "TOOL_ACTION", "PARTICIPANT_JOIN", "PARTICIPANT_LEAVE", "INCIDENT_CREATED", "INCIDENT_RESOLVED"]>;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    actorName: z.ZodOptional<z.ZodString>;
    sourceId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "CONFLICT" | "FACT" | "HYPOTHESIS" | "DECISION" | "ACTION_ITEM" | "QUESTION" | "STATUS_UPDATE" | "INCIDENT_RESOLVED" | "TOOL_ACTION" | "PARTICIPANT_JOIN" | "PARTICIPANT_LEAVE" | "INCIDENT_CREATED";
    incidentId: string;
    ts: string;
    title: string;
    description?: string | undefined;
    actorName?: string | undefined;
    sourceId?: string | undefined;
}, {
    id: string;
    type: "CONFLICT" | "FACT" | "HYPOTHESIS" | "DECISION" | "ACTION_ITEM" | "QUESTION" | "STATUS_UPDATE" | "INCIDENT_RESOLVED" | "TOOL_ACTION" | "PARTICIPANT_JOIN" | "PARTICIPANT_LEAVE" | "INCIDENT_CREATED";
    incidentId: string;
    ts: string;
    title: string;
    description?: string | undefined;
    actorName?: string | undefined;
    sourceId?: string | undefined;
}>;
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;
export declare const IncidentStateSchema: z.ZodObject<{
    incidentId: z.ZodString;
    orgId: z.ZodString;
    title: z.ZodString;
    severity: z.ZodEnum<["P1", "P2", "P3", "P4"]>;
    status: z.ZodEnum<["ACTIVE", "MITIGATED", "RESOLVED", "CANCELLED"]>;
    startTs: z.ZodString;
    resolvedTs: z.ZodNullable<z.ZodString>;
    conferenceUrl: z.ZodNullable<z.ZodString>;
    affectedSystems: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    timeline: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        incidentId: z.ZodString;
        ts: z.ZodString;
        type: z.ZodEnum<["FACT", "HYPOTHESIS", "DECISION", "ACTION_ITEM", "QUESTION", "STATUS_UPDATE", "CONFLICT", "TOOL_ACTION", "PARTICIPANT_JOIN", "PARTICIPANT_LEAVE", "INCIDENT_CREATED", "INCIDENT_RESOLVED"]>;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        actorName: z.ZodOptional<z.ZodString>;
        sourceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        type: "CONFLICT" | "FACT" | "HYPOTHESIS" | "DECISION" | "ACTION_ITEM" | "QUESTION" | "STATUS_UPDATE" | "INCIDENT_RESOLVED" | "TOOL_ACTION" | "PARTICIPANT_JOIN" | "PARTICIPANT_LEAVE" | "INCIDENT_CREATED";
        incidentId: string;
        ts: string;
        title: string;
        description?: string | undefined;
        actorName?: string | undefined;
        sourceId?: string | undefined;
    }, {
        id: string;
        type: "CONFLICT" | "FACT" | "HYPOTHESIS" | "DECISION" | "ACTION_ITEM" | "QUESTION" | "STATUS_UPDATE" | "INCIDENT_RESOLVED" | "TOOL_ACTION" | "PARTICIPANT_JOIN" | "PARTICIPANT_LEAVE" | "INCIDENT_CREATED";
        incidentId: string;
        ts: string;
        title: string;
        description?: string | undefined;
        actorName?: string | undefined;
        sourceId?: string | undefined;
    }>, "many">>;
    facts: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        incidentId: z.ZodString;
        content: z.ZodString;
        sourceClassificationId: z.ZodNullable<z.ZodString>;
        status: z.ZodEnum<["PENDING", "IN_PROGRESS", "CONFIRMED", "REJECTED", "RESOLVED"]>;
        confirmedBy: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: "RESOLVED" | "PENDING" | "IN_PROGRESS" | "CONFIRMED" | "REJECTED";
        id: string;
        createdAt: string;
        incidentId: string;
        content: string;
        sourceClassificationId: string | null;
        confirmedBy: string | null;
        updatedAt: string;
    }, {
        status: "RESOLVED" | "PENDING" | "IN_PROGRESS" | "CONFIRMED" | "REJECTED";
        id: string;
        createdAt: string;
        incidentId: string;
        content: string;
        sourceClassificationId: string | null;
        confirmedBy: string | null;
        updatedAt: string;
    }>, "many">>;
    hypotheses: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        incidentId: z.ZodString;
        content: z.ZodString;
        sourceClassificationId: z.ZodNullable<z.ZodString>;
        status: z.ZodEnum<["PENDING", "IN_PROGRESS", "CONFIRMED", "REJECTED", "RESOLVED"]>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: "RESOLVED" | "PENDING" | "IN_PROGRESS" | "CONFIRMED" | "REJECTED";
        id: string;
        createdAt: string;
        incidentId: string;
        content: string;
        sourceClassificationId: string | null;
        updatedAt: string;
    }, {
        status: "RESOLVED" | "PENDING" | "IN_PROGRESS" | "CONFIRMED" | "REJECTED";
        id: string;
        createdAt: string;
        incidentId: string;
        content: string;
        sourceClassificationId: string | null;
        updatedAt: string;
    }>, "many">>;
    decisions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        incidentId: z.ZodString;
        content: z.ZodString;
        decidedBy: z.ZodNullable<z.ZodString>;
        sourceClassificationId: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        incidentId: string;
        content: string;
        sourceClassificationId: string | null;
        decidedBy: string | null;
    }, {
        id: string;
        createdAt: string;
        incidentId: string;
        content: string;
        sourceClassificationId: string | null;
        decidedBy: string | null;
    }>, "many">>;
    actionItems: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        incidentId: z.ZodString;
        content: z.ZodString;
        ownerId: z.ZodNullable<z.ZodString>;
        ownerName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        sourceClassificationId: z.ZodNullable<z.ZodString>;
        status: z.ZodEnum<["PENDING", "IN_PROGRESS", "CONFIRMED", "REJECTED", "RESOLVED"]>;
        dueHint: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: "RESOLVED" | "PENDING" | "IN_PROGRESS" | "CONFIRMED" | "REJECTED";
        id: string;
        createdAt: string;
        incidentId: string;
        content: string;
        sourceClassificationId: string | null;
        updatedAt: string;
        ownerId: string | null;
        dueHint: string | null;
        ownerName?: string | null | undefined;
    }, {
        status: "RESOLVED" | "PENDING" | "IN_PROGRESS" | "CONFIRMED" | "REJECTED";
        id: string;
        createdAt: string;
        incidentId: string;
        content: string;
        sourceClassificationId: string | null;
        updatedAt: string;
        ownerId: string | null;
        dueHint: string | null;
        ownerName?: string | null | undefined;
    }>, "many">>;
    questions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        incidentId: z.ZodString;
        content: z.ZodString;
        askedBy: z.ZodNullable<z.ZodString>;
        sourceClassificationId: z.ZodNullable<z.ZodString>;
        status: z.ZodEnum<["PENDING", "IN_PROGRESS", "CONFIRMED", "REJECTED", "RESOLVED"]>;
        answeredAt: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: "RESOLVED" | "PENDING" | "IN_PROGRESS" | "CONFIRMED" | "REJECTED";
        id: string;
        createdAt: string;
        incidentId: string;
        content: string;
        sourceClassificationId: string | null;
        askedBy: string | null;
        answeredAt: string | null;
    }, {
        status: "RESOLVED" | "PENDING" | "IN_PROGRESS" | "CONFIRMED" | "REJECTED";
        id: string;
        createdAt: string;
        incidentId: string;
        content: string;
        sourceClassificationId: string | null;
        askedBy: string | null;
        answeredAt: string | null;
    }>, "many">>;
    conflicts: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        incidentId: z.ZodString;
        factAId: z.ZodNullable<z.ZodString>;
        factBId: z.ZodNullable<z.ZodString>;
        description: z.ZodString;
        status: z.ZodEnum<["OPEN", "RESOLVED", "DISMISSED"]>;
        resolvedBy: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: "RESOLVED" | "OPEN" | "DISMISSED";
        id: string;
        createdAt: string;
        incidentId: string;
        updatedAt: string;
        factAId: string | null;
        factBId: string | null;
        description: string;
        resolvedBy: string | null;
    }, {
        status: "RESOLVED" | "OPEN" | "DISMISSED";
        id: string;
        createdAt: string;
        incidentId: string;
        updatedAt: string;
        factAId: string | null;
        factBId: string | null;
        description: string;
        resolvedBy: string | null;
    }>, "many">>;
    pendingToolActions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        incidentId: z.ZodString;
        tool: z.ZodEnum<["slack", "jira", "pagerduty", "datadog"]>;
        actionType: z.ZodString;
        payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        proposedBy: z.ZodDefault<z.ZodString>;
        confirmedBy: z.ZodNullable<z.ZodString>;
        status: z.ZodEnum<["PENDING", "CONFIRMED", "REJECTED", "EXECUTING", "EXECUTED", "FAILED"]>;
        executedAt: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: "PENDING" | "CONFIRMED" | "REJECTED" | "EXECUTING" | "EXECUTED" | "FAILED";
        id: string;
        createdAt: string;
        incidentId: string;
        confirmedBy: string | null;
        updatedAt: string;
        tool: "slack" | "jira" | "pagerduty" | "datadog";
        actionType: string;
        payload: Record<string, unknown>;
        proposedBy: string;
        executedAt: string | null;
    }, {
        status: "PENDING" | "CONFIRMED" | "REJECTED" | "EXECUTING" | "EXECUTED" | "FAILED";
        id: string;
        createdAt: string;
        incidentId: string;
        confirmedBy: string | null;
        updatedAt: string;
        tool: "slack" | "jira" | "pagerduty" | "datadog";
        actionType: string;
        payload: Record<string, unknown>;
        executedAt: string | null;
        proposedBy?: string | undefined;
    }>, "many">>;
    participants: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        incidentId: z.ZodString;
        userId: z.ZodNullable<z.ZodString>;
        speakerLabel: z.ZodNullable<z.ZodString>;
        role: z.ZodEnum<["INCIDENT_COMMANDER", "RESPONDER", "OBSERVER", "BUSINESS_STAKEHOLDER", "PLATFORM_ADMIN", "VAIC_SYSTEM"]>;
        joinedAt: z.ZodString;
        leftAt: z.ZodNullable<z.ZodString>;
        speakingTimeSeconds: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        role: "INCIDENT_COMMANDER" | "RESPONDER" | "OBSERVER" | "BUSINESS_STAKEHOLDER" | "PLATFORM_ADMIN" | "VAIC_SYSTEM";
        incidentId: string;
        userId: string | null;
        speakerLabel: string | null;
        joinedAt: string;
        leftAt: string | null;
        speakingTimeSeconds: number;
    }, {
        id: string;
        role: "INCIDENT_COMMANDER" | "RESPONDER" | "OBSERVER" | "BUSINESS_STAKEHOLDER" | "PLATFORM_ADMIN" | "VAIC_SYSTEM";
        incidentId: string;
        userId: string | null;
        speakerLabel: string | null;
        joinedAt: string;
        leftAt: string | null;
        speakingTimeSeconds?: number | undefined;
    }>, "many">>;
    lastUpdated: z.ZodString;
    version: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "ACTIVE" | "MITIGATED" | "RESOLVED" | "CANCELLED";
    orgId: string;
    incidentId: string;
    startTs: string;
    title: string;
    severity: "P1" | "P2" | "P3" | "P4";
    resolvedTs: string | null;
    conferenceUrl: string | null;
    affectedSystems: string[];
    timeline: {
        id: string;
        type: "CONFLICT" | "FACT" | "HYPOTHESIS" | "DECISION" | "ACTION_ITEM" | "QUESTION" | "STATUS_UPDATE" | "INCIDENT_RESOLVED" | "TOOL_ACTION" | "PARTICIPANT_JOIN" | "PARTICIPANT_LEAVE" | "INCIDENT_CREATED";
        incidentId: string;
        ts: string;
        title: string;
        description?: string | undefined;
        actorName?: string | undefined;
        sourceId?: string | undefined;
    }[];
    facts: {
        status: "RESOLVED" | "PENDING" | "IN_PROGRESS" | "CONFIRMED" | "REJECTED";
        id: string;
        createdAt: string;
        incidentId: string;
        content: string;
        sourceClassificationId: string | null;
        confirmedBy: string | null;
        updatedAt: string;
    }[];
    hypotheses: {
        status: "RESOLVED" | "PENDING" | "IN_PROGRESS" | "CONFIRMED" | "REJECTED";
        id: string;
        createdAt: string;
        incidentId: string;
        content: string;
        sourceClassificationId: string | null;
        updatedAt: string;
    }[];
    decisions: {
        id: string;
        createdAt: string;
        incidentId: string;
        content: string;
        sourceClassificationId: string | null;
        decidedBy: string | null;
    }[];
    actionItems: {
        status: "RESOLVED" | "PENDING" | "IN_PROGRESS" | "CONFIRMED" | "REJECTED";
        id: string;
        createdAt: string;
        incidentId: string;
        content: string;
        sourceClassificationId: string | null;
        updatedAt: string;
        ownerId: string | null;
        dueHint: string | null;
        ownerName?: string | null | undefined;
    }[];
    questions: {
        status: "RESOLVED" | "PENDING" | "IN_PROGRESS" | "CONFIRMED" | "REJECTED";
        id: string;
        createdAt: string;
        incidentId: string;
        content: string;
        sourceClassificationId: string | null;
        askedBy: string | null;
        answeredAt: string | null;
    }[];
    conflicts: {
        status: "RESOLVED" | "OPEN" | "DISMISSED";
        id: string;
        createdAt: string;
        incidentId: string;
        updatedAt: string;
        factAId: string | null;
        factBId: string | null;
        description: string;
        resolvedBy: string | null;
    }[];
    pendingToolActions: {
        status: "PENDING" | "CONFIRMED" | "REJECTED" | "EXECUTING" | "EXECUTED" | "FAILED";
        id: string;
        createdAt: string;
        incidentId: string;
        confirmedBy: string | null;
        updatedAt: string;
        tool: "slack" | "jira" | "pagerduty" | "datadog";
        actionType: string;
        payload: Record<string, unknown>;
        proposedBy: string;
        executedAt: string | null;
    }[];
    participants: {
        id: string;
        role: "INCIDENT_COMMANDER" | "RESPONDER" | "OBSERVER" | "BUSINESS_STAKEHOLDER" | "PLATFORM_ADMIN" | "VAIC_SYSTEM";
        incidentId: string;
        userId: string | null;
        speakerLabel: string | null;
        joinedAt: string;
        leftAt: string | null;
        speakingTimeSeconds: number;
    }[];
    lastUpdated: string;
    version: number;
}, {
    status: "ACTIVE" | "MITIGATED" | "RESOLVED" | "CANCELLED";
    orgId: string;
    incidentId: string;
    startTs: string;
    title: string;
    severity: "P1" | "P2" | "P3" | "P4";
    resolvedTs: string | null;
    conferenceUrl: string | null;
    lastUpdated: string;
    affectedSystems?: string[] | undefined;
    timeline?: {
        id: string;
        type: "CONFLICT" | "FACT" | "HYPOTHESIS" | "DECISION" | "ACTION_ITEM" | "QUESTION" | "STATUS_UPDATE" | "INCIDENT_RESOLVED" | "TOOL_ACTION" | "PARTICIPANT_JOIN" | "PARTICIPANT_LEAVE" | "INCIDENT_CREATED";
        incidentId: string;
        ts: string;
        title: string;
        description?: string | undefined;
        actorName?: string | undefined;
        sourceId?: string | undefined;
    }[] | undefined;
    facts?: {
        status: "RESOLVED" | "PENDING" | "IN_PROGRESS" | "CONFIRMED" | "REJECTED";
        id: string;
        createdAt: string;
        incidentId: string;
        content: string;
        sourceClassificationId: string | null;
        confirmedBy: string | null;
        updatedAt: string;
    }[] | undefined;
    hypotheses?: {
        status: "RESOLVED" | "PENDING" | "IN_PROGRESS" | "CONFIRMED" | "REJECTED";
        id: string;
        createdAt: string;
        incidentId: string;
        content: string;
        sourceClassificationId: string | null;
        updatedAt: string;
    }[] | undefined;
    decisions?: {
        id: string;
        createdAt: string;
        incidentId: string;
        content: string;
        sourceClassificationId: string | null;
        decidedBy: string | null;
    }[] | undefined;
    actionItems?: {
        status: "RESOLVED" | "PENDING" | "IN_PROGRESS" | "CONFIRMED" | "REJECTED";
        id: string;
        createdAt: string;
        incidentId: string;
        content: string;
        sourceClassificationId: string | null;
        updatedAt: string;
        ownerId: string | null;
        dueHint: string | null;
        ownerName?: string | null | undefined;
    }[] | undefined;
    questions?: {
        status: "RESOLVED" | "PENDING" | "IN_PROGRESS" | "CONFIRMED" | "REJECTED";
        id: string;
        createdAt: string;
        incidentId: string;
        content: string;
        sourceClassificationId: string | null;
        askedBy: string | null;
        answeredAt: string | null;
    }[] | undefined;
    conflicts?: {
        status: "RESOLVED" | "OPEN" | "DISMISSED";
        id: string;
        createdAt: string;
        incidentId: string;
        updatedAt: string;
        factAId: string | null;
        factBId: string | null;
        description: string;
        resolvedBy: string | null;
    }[] | undefined;
    pendingToolActions?: {
        status: "PENDING" | "CONFIRMED" | "REJECTED" | "EXECUTING" | "EXECUTED" | "FAILED";
        id: string;
        createdAt: string;
        incidentId: string;
        confirmedBy: string | null;
        updatedAt: string;
        tool: "slack" | "jira" | "pagerduty" | "datadog";
        actionType: string;
        payload: Record<string, unknown>;
        executedAt: string | null;
        proposedBy?: string | undefined;
    }[] | undefined;
    participants?: {
        id: string;
        role: "INCIDENT_COMMANDER" | "RESPONDER" | "OBSERVER" | "BUSINESS_STAKEHOLDER" | "PLATFORM_ADMIN" | "VAIC_SYSTEM";
        incidentId: string;
        userId: string | null;
        speakerLabel: string | null;
        joinedAt: string;
        leftAt: string | null;
        speakingTimeSeconds?: number | undefined;
    }[] | undefined;
    version?: number | undefined;
}>;
export type IncidentState = z.infer<typeof IncidentStateSchema>;
//# sourceMappingURL=schemas.d.ts.map