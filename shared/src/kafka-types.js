"use strict";
// ============================================================
// VAIC Kafka Message Types
// Defines the shape of every message published to Kafka topics
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditEventMessageSchema = exports.ToolProposalMessageSchema = exports.StateDeltaMessageSchema = exports.ClassificationMessageSchema = exports.TranscriptEntryMessageSchema = exports.AudioRawMessageSchema = void 0;
const zod_1 = require("zod");
const schemas_1 = require("./schemas");
// ─── audio.raw.{incident_id} ─────────────────────────────────
exports.AudioRawMessageSchema = zod_1.z.object({
    incidentId: zod_1.z.string().uuid(),
    participantId: zod_1.z.string().uuid(),
    speakerLabel: zod_1.z.string().optional(),
    audioChunk: zod_1.z.string(), // Base64-encoded PCM audio (16kHz, 16-bit mono)
    sequenceNumber: zod_1.z.number().int(),
    timestamp: zod_1.z.string().datetime(),
    durationMs: zod_1.z.number().int().default(500),
});
// ─── transcript.entries.{incident_id} ────────────────────────
exports.TranscriptEntryMessageSchema = zod_1.z.object({
    incidentId: zod_1.z.string().uuid(),
    participantId: zod_1.z.string().uuid().nullable(),
    speakerLabel: zod_1.z.string().nullable(),
    speakerName: zod_1.z.string().nullable(),
    speakerRole: zod_1.z.string().nullable(),
    content: zod_1.z.string(),
    startTs: zod_1.z.string().datetime(),
    endTs: zod_1.z.string().datetime(),
    confidence: zod_1.z.number().min(0).max(1),
    audioRef: zod_1.z.string().nullable().optional(),
});
// ─── classifications.{incident_id} ───────────────────────────
exports.ClassificationMessageSchema = schemas_1.ClassificationRecordSchema;
// ─── state.deltas.{incident_id} ──────────────────────────────
exports.StateDeltaMessageSchema = zod_1.z.object({
    incidentId: zod_1.z.string().uuid(),
    deltaType: zod_1.z.enum([
        'FACT_ADDED', 'FACT_UPDATED',
        'HYPOTHESIS_ADDED', 'HYPOTHESIS_UPDATED',
        'DECISION_ADDED',
        'ACTION_ITEM_ADDED', 'ACTION_ITEM_UPDATED',
        'QUESTION_ADDED', 'QUESTION_RESOLVED',
        'CONFLICT_DETECTED', 'CONFLICT_RESOLVED',
        'TOOL_ACTION_PROPOSED', 'TOOL_ACTION_CONFIRMED', 'TOOL_ACTION_REJECTED', 'TOOL_ACTION_EXECUTED',
        'PARTICIPANT_JOINED', 'PARTICIPANT_LEFT',
        'INCIDENT_STATUS_CHANGED',
        'TIMELINE_ENTRY_ADDED',
    ]),
    payload: zod_1.z.record(zod_1.z.unknown()),
    version: zod_1.z.number().int(),
    timestamp: zod_1.z.string().datetime(),
});
// ─── tool.proposals.{incident_id} ────────────────────────────
exports.ToolProposalMessageSchema = zod_1.z.object({
    incidentId: zod_1.z.string().uuid(),
    proposalId: zod_1.z.string().uuid(),
    tool: zod_1.z.enum(['slack', 'jira', 'pagerduty', 'datadog']),
    actionType: zod_1.z.string(),
    payload: zod_1.z.record(zod_1.z.unknown()),
    humanReadableSummary: zod_1.z.string(), // What VAIC will speak to the IC
    proposedAt: zod_1.z.string().datetime(),
});
// ─── audit.events ────────────────────────────────────────────
exports.AuditEventMessageSchema = zod_1.z.object({
    incidentId: zod_1.z.string().uuid().nullable(),
    service: zod_1.z.string(),
    actorId: zod_1.z.string(),
    action: zod_1.z.string(),
    details: zod_1.z.record(zod_1.z.unknown()).default({}),
    correlationId: zod_1.z.string().optional(),
    timestamp: zod_1.z.string().datetime(),
});
//# sourceMappingURL=kafka-types.js.map