"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentStateSchema = exports.TimelineEntrySchema = exports.ToolActionSchema = exports.ConflictSchema = exports.QuestionSchema = exports.ActionItemSchema = exports.DecisionSchema = exports.HypothesisSchema = exports.FactSchema = exports.ClassificationRecordSchema = exports.TranscriptEntrySchema = exports.ExtractedEntitiesSchema = exports.ParticipantSchema = exports.UserSchema = exports.OrganizationSchema = void 0;
const zod_1 = require("zod");
// ============================================================
// Core Entity Schemas (Zod — TypeScript runtime validation)
// ============================================================
// ─── Organization ────────────────────────────────────────────
exports.OrganizationSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    slug: zod_1.z.string(),
    settings: zod_1.z.record(zod_1.z.unknown()).default({}),
    createdAt: zod_1.z.string().datetime(),
});
// ─── User ─────────────────────────────────────────────────────
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    orgId: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    email: zod_1.z.string().email(),
    role: zod_1.z.enum(['INCIDENT_COMMANDER', 'RESPONDER', 'OBSERVER', 'BUSINESS_STAKEHOLDER', 'PLATFORM_ADMIN', 'VAIC_SYSTEM']),
    createdAt: zod_1.z.string().datetime(),
});
// ─── Participant ───────────────────────────────────────────────
exports.ParticipantSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    incidentId: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid().nullable(),
    speakerLabel: zod_1.z.string().nullable(),
    role: zod_1.z.enum(['INCIDENT_COMMANDER', 'RESPONDER', 'OBSERVER', 'BUSINESS_STAKEHOLDER', 'PLATFORM_ADMIN', 'VAIC_SYSTEM']),
    joinedAt: zod_1.z.string().datetime(),
    leftAt: zod_1.z.string().datetime().nullable(),
    speakingTimeSeconds: zod_1.z.number().int().default(0),
});
// ─── Entities (extracted from speech) ─────────────────────────
exports.ExtractedEntitiesSchema = zod_1.z.object({
    systems: zod_1.z.array(zod_1.z.string()).default([]),
    people: zod_1.z.array(zod_1.z.string()).default([]),
    timestamps: zod_1.z.array(zod_1.z.string()).default([]),
    metrics: zod_1.z.array(zod_1.z.string()).default([]),
    errorCodes: zod_1.z.array(zod_1.z.string()).default([]),
    urls: zod_1.z.array(zod_1.z.string()).default([]),
    tools: zod_1.z.array(zod_1.z.string()).default([]),
});
// ─── Transcript Entry ─────────────────────────────────────────
exports.TranscriptEntrySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    incidentId: zod_1.z.string().uuid(),
    participantId: zod_1.z.string().uuid().nullable(),
    speakerName: zod_1.z.string().optional(),
    speakerRole: zod_1.z.string().optional(),
    content: zod_1.z.string(),
    startTs: zod_1.z.string().datetime(),
    endTs: zod_1.z.string().datetime(),
    confidence: zod_1.z.number().min(0).max(1).default(1.0),
    audioRef: zod_1.z.string().nullable().optional(),
    createdAt: zod_1.z.string().datetime(),
});
// ─── Classification Record ────────────────────────────────────
exports.ClassificationRecordSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    transcriptEntryId: zod_1.z.string().uuid(),
    incidentId: zod_1.z.string().uuid(),
    type: zod_1.z.enum(['FACT', 'HYPOTHESIS', 'DECISION', 'ACTION_ITEM', 'QUESTION', 'STATUS_UPDATE', 'SOCIAL']),
    confidence: zod_1.z.number().min(0).max(1),
    summary: zod_1.z.string().nullable(),
    entities: exports.ExtractedEntitiesSchema,
    actionItemOwner: zod_1.z.string().nullable().optional(),
    requiresFollowup: zod_1.z.boolean().default(false),
    createdAt: zod_1.z.string().datetime(),
});
// ─── Fact ─────────────────────────────────────────────────────
exports.FactSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    incidentId: zod_1.z.string().uuid(),
    content: zod_1.z.string(),
    sourceClassificationId: zod_1.z.string().uuid().nullable(),
    status: zod_1.z.enum(['PENDING', 'IN_PROGRESS', 'CONFIRMED', 'REJECTED', 'RESOLVED']),
    confirmedBy: zod_1.z.string().uuid().nullable(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// ─── Hypothesis ───────────────────────────────────────────────
exports.HypothesisSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    incidentId: zod_1.z.string().uuid(),
    content: zod_1.z.string(),
    sourceClassificationId: zod_1.z.string().uuid().nullable(),
    status: zod_1.z.enum(['PENDING', 'IN_PROGRESS', 'CONFIRMED', 'REJECTED', 'RESOLVED']),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// ─── Decision ─────────────────────────────────────────────────
exports.DecisionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    incidentId: zod_1.z.string().uuid(),
    content: zod_1.z.string(),
    decidedBy: zod_1.z.string().uuid().nullable(),
    sourceClassificationId: zod_1.z.string().uuid().nullable(),
    createdAt: zod_1.z.string().datetime(),
});
// ─── Action Item ──────────────────────────────────────────────
exports.ActionItemSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    incidentId: zod_1.z.string().uuid(),
    content: zod_1.z.string(),
    ownerId: zod_1.z.string().uuid().nullable(),
    ownerName: zod_1.z.string().nullable().optional(),
    sourceClassificationId: zod_1.z.string().uuid().nullable(),
    status: zod_1.z.enum(['PENDING', 'IN_PROGRESS', 'CONFIRMED', 'REJECTED', 'RESOLVED']),
    dueHint: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// ─── Question ─────────────────────────────────────────────────
exports.QuestionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    incidentId: zod_1.z.string().uuid(),
    content: zod_1.z.string(),
    askedBy: zod_1.z.string().uuid().nullable(),
    sourceClassificationId: zod_1.z.string().uuid().nullable(),
    status: zod_1.z.enum(['PENDING', 'IN_PROGRESS', 'CONFIRMED', 'REJECTED', 'RESOLVED']),
    answeredAt: zod_1.z.string().datetime().nullable(),
    createdAt: zod_1.z.string().datetime(),
});
// ─── Conflict ─────────────────────────────────────────────────
exports.ConflictSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    incidentId: zod_1.z.string().uuid(),
    factAId: zod_1.z.string().uuid().nullable(),
    factBId: zod_1.z.string().uuid().nullable(),
    description: zod_1.z.string(),
    status: zod_1.z.enum(['OPEN', 'RESOLVED', 'DISMISSED']),
    resolvedBy: zod_1.z.string().uuid().nullable(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// ─── Tool Action ──────────────────────────────────────────────
exports.ToolActionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    incidentId: zod_1.z.string().uuid(),
    tool: zod_1.z.enum(['slack', 'jira', 'pagerduty', 'datadog']),
    actionType: zod_1.z.string(),
    payload: zod_1.z.record(zod_1.z.unknown()),
    proposedBy: zod_1.z.string().default('VAIC_SYSTEM'),
    confirmedBy: zod_1.z.string().uuid().nullable(),
    status: zod_1.z.enum(['PENDING', 'CONFIRMED', 'REJECTED', 'EXECUTING', 'EXECUTED', 'FAILED']),
    executedAt: zod_1.z.string().datetime().nullable(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// ─── Timeline Entry ───────────────────────────────────────────
exports.TimelineEntrySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    incidentId: zod_1.z.string().uuid(),
    ts: zod_1.z.string().datetime(),
    type: zod_1.z.enum(['FACT', 'HYPOTHESIS', 'DECISION', 'ACTION_ITEM', 'QUESTION', 'STATUS_UPDATE', 'CONFLICT', 'TOOL_ACTION', 'PARTICIPANT_JOIN', 'PARTICIPANT_LEAVE', 'INCIDENT_CREATED', 'INCIDENT_RESOLVED']),
    title: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    actorName: zod_1.z.string().optional(),
    sourceId: zod_1.z.string().uuid().optional(),
});
// ─── Full Incident State (ISM-02) ─────────────────────────────
exports.IncidentStateSchema = zod_1.z.object({
    incidentId: zod_1.z.string().uuid(),
    orgId: zod_1.z.string().uuid(),
    title: zod_1.z.string(),
    severity: zod_1.z.enum(['P1', 'P2', 'P3', 'P4']),
    status: zod_1.z.enum(['ACTIVE', 'MITIGATED', 'RESOLVED', 'CANCELLED']),
    startTs: zod_1.z.string().datetime(),
    resolvedTs: zod_1.z.string().datetime().nullable(),
    conferenceUrl: zod_1.z.string().nullable(),
    affectedSystems: zod_1.z.array(zod_1.z.string()).default([]),
    timeline: zod_1.z.array(exports.TimelineEntrySchema).default([]),
    facts: zod_1.z.array(exports.FactSchema).default([]),
    hypotheses: zod_1.z.array(exports.HypothesisSchema).default([]),
    decisions: zod_1.z.array(exports.DecisionSchema).default([]),
    actionItems: zod_1.z.array(exports.ActionItemSchema).default([]),
    questions: zod_1.z.array(exports.QuestionSchema).default([]),
    conflicts: zod_1.z.array(exports.ConflictSchema).default([]),
    pendingToolActions: zod_1.z.array(exports.ToolActionSchema).default([]),
    participants: zod_1.z.array(exports.ParticipantSchema).default([]),
    lastUpdated: zod_1.z.string().datetime(),
    version: zod_1.z.number().int().default(0), // Optimistic locking
});
//# sourceMappingURL=schemas.js.map