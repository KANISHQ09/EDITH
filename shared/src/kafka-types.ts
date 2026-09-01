// ============================================================
// VAIC Kafka Message Types
// Defines the shape of every message published to Kafka topics
// ============================================================

import { z } from 'zod';
import { ExtractedEntitiesSchema, ClassificationRecordSchema } from './schemas';

// ─── audio.raw.{incident_id} ─────────────────────────────────
export const AudioRawMessageSchema = z.object({
  incidentId: z.string().uuid(),
  participantId: z.string().uuid(),
  speakerLabel: z.string().optional(),
  audioChunk: z.string(), // Base64-encoded PCM audio (16kHz, 16-bit mono)
  sequenceNumber: z.number().int(),
  timestamp: z.string().datetime(),
  durationMs: z.number().int().default(500),
});
export type AudioRawMessage = z.infer<typeof AudioRawMessageSchema>;

// ─── transcript.entries.{incident_id} ────────────────────────
export const TranscriptEntryMessageSchema = z.object({
  incidentId: z.string().uuid(),
  participantId: z.string().uuid().nullable(),
  speakerLabel: z.string().nullable(),
  speakerName: z.string().nullable(),
  speakerRole: z.string().nullable(),
  content: z.string(),
  startTs: z.string().datetime(),
  endTs: z.string().datetime(),
  confidence: z.number().min(0).max(1),
  audioRef: z.string().nullable().optional(),
});
export type TranscriptEntryMessage = z.infer<typeof TranscriptEntryMessageSchema>;

// ─── classifications.{incident_id} ───────────────────────────
export const ClassificationMessageSchema = ClassificationRecordSchema;
export type ClassificationMessage = z.infer<typeof ClassificationMessageSchema>;

// ─── state.deltas.{incident_id} ──────────────────────────────
export const StateDeltaMessageSchema = z.object({
  incidentId: z.string().uuid(),
  deltaType: z.enum([
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
  payload: z.record(z.unknown()),
  version: z.number().int(),
  timestamp: z.string().datetime(),
});
export type StateDeltaMessage = z.infer<typeof StateDeltaMessageSchema>;

// ─── tool.proposals.{incident_id} ────────────────────────────
export const ToolProposalMessageSchema = z.object({
  incidentId: z.string().uuid(),
  proposalId: z.string().uuid(),
  tool: z.enum(['slack', 'jira', 'pagerduty', 'datadog']),
  actionType: z.string(),
  payload: z.record(z.unknown()),
  humanReadableSummary: z.string(), // What VAIC will speak to the IC
  proposedAt: z.string().datetime(),
});
export type ToolProposalMessage = z.infer<typeof ToolProposalMessageSchema>;

// ─── audit.events ────────────────────────────────────────────
export const AuditEventMessageSchema = z.object({
  incidentId: z.string().uuid().nullable(),
  service: z.string(),
  actorId: z.string(),
  action: z.string(),
  details: z.record(z.unknown()).default({}),
  correlationId: z.string().optional(),
  timestamp: z.string().datetime(),
});
export type AuditEventMessage = z.infer<typeof AuditEventMessageSchema>;
