import { z } from 'zod';
import {
  IncidentSeverity,
  IncidentStatus,
  ParticipantRole,
  ClassificationType,
  ItemStatus,
  ToolActionStatus,
  ConflictStatus,
} from './constants';

// ============================================================
// Core Entity Schemas (Zod — TypeScript runtime validation)
// ============================================================

// ─── Organization ────────────────────────────────────────────
export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  settings: z.record(z.unknown()).default({}),
  createdAt: z.string().datetime(),
});
export type Organization = z.infer<typeof OrganizationSchema>;

// ─── User ─────────────────────────────────────────────────────
export const UserSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['INCIDENT_COMMANDER', 'RESPONDER', 'OBSERVER', 'BUSINESS_STAKEHOLDER', 'PLATFORM_ADMIN', 'VAIC_SYSTEM']),
  createdAt: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;

// ─── Participant ───────────────────────────────────────────────
export const ParticipantSchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  speakerLabel: z.string().nullable(),
  role: z.enum(['INCIDENT_COMMANDER', 'RESPONDER', 'OBSERVER', 'BUSINESS_STAKEHOLDER', 'PLATFORM_ADMIN', 'VAIC_SYSTEM']),
  joinedAt: z.string().datetime(),
  leftAt: z.string().datetime().nullable(),
  speakingTimeSeconds: z.number().int().default(0),
});
export type Participant = z.infer<typeof ParticipantSchema>;

// ─── Entities (extracted from speech) ─────────────────────────
export const ExtractedEntitiesSchema = z.object({
  systems: z.array(z.string()).default([]),
  people: z.array(z.string()).default([]),
  timestamps: z.array(z.string()).default([]),
  metrics: z.array(z.string()).default([]),
  errorCodes: z.array(z.string()).default([]),
  urls: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
});
export type ExtractedEntities = z.infer<typeof ExtractedEntitiesSchema>;

// ─── Transcript Entry ─────────────────────────────────────────
export const TranscriptEntrySchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  participantId: z.string().uuid().nullable(),
  speakerName: z.string().optional(),
  speakerRole: z.string().optional(),
  content: z.string(),
  startTs: z.string().datetime(),
  endTs: z.string().datetime(),
  confidence: z.number().min(0).max(1).default(1.0),
  audioRef: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
});
export type TranscriptEntry = z.infer<typeof TranscriptEntrySchema>;

// ─── Classification Record ────────────────────────────────────
export const ClassificationRecordSchema = z.object({
  id: z.string().uuid(),
  transcriptEntryId: z.string().uuid(),
  incidentId: z.string().uuid(),
  type: z.enum(['FACT', 'HYPOTHESIS', 'DECISION', 'ACTION_ITEM', 'QUESTION', 'STATUS_UPDATE', 'SOCIAL']),
  confidence: z.number().min(0).max(1),
  summary: z.string().nullable(),
  entities: ExtractedEntitiesSchema,
  actionItemOwner: z.string().nullable().optional(),
  requiresFollowup: z.boolean().default(false),
  createdAt: z.string().datetime(),
});
export type ClassificationRecord = z.infer<typeof ClassificationRecordSchema>;

// ─── Fact ─────────────────────────────────────────────────────
export const FactSchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  content: z.string(),
  sourceClassificationId: z.string().uuid().nullable(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'CONFIRMED', 'REJECTED', 'RESOLVED']),
  confirmedBy: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Fact = z.infer<typeof FactSchema>;

// ─── Hypothesis ───────────────────────────────────────────────
export const HypothesisSchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  content: z.string(),
  sourceClassificationId: z.string().uuid().nullable(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'CONFIRMED', 'REJECTED', 'RESOLVED']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Hypothesis = z.infer<typeof HypothesisSchema>;

// ─── Decision ─────────────────────────────────────────────────
export const DecisionSchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  content: z.string(),
  decidedBy: z.string().uuid().nullable(),
  sourceClassificationId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});
export type Decision = z.infer<typeof DecisionSchema>;

// ─── Action Item ──────────────────────────────────────────────
export const ActionItemSchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  content: z.string(),
  ownerId: z.string().uuid().nullable(),
  ownerName: z.string().nullable().optional(),
  sourceClassificationId: z.string().uuid().nullable(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'CONFIRMED', 'REJECTED', 'RESOLVED']),
  dueHint: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ActionItem = z.infer<typeof ActionItemSchema>;

// ─── Question ─────────────────────────────────────────────────
export const QuestionSchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  content: z.string(),
  askedBy: z.string().uuid().nullable(),
  sourceClassificationId: z.string().uuid().nullable(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'CONFIRMED', 'REJECTED', 'RESOLVED']),
  answeredAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type Question = z.infer<typeof QuestionSchema>;

// ─── Conflict ─────────────────────────────────────────────────
export const ConflictSchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  factAId: z.string().uuid().nullable(),
  factBId: z.string().uuid().nullable(),
  description: z.string(),
  status: z.enum(['OPEN', 'RESOLVED', 'DISMISSED']),
  resolvedBy: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Conflict = z.infer<typeof ConflictSchema>;

// ─── Tool Action ──────────────────────────────────────────────
export const ToolActionSchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  tool: z.enum(['slack', 'jira', 'pagerduty', 'datadog']),
  actionType: z.string(),
  payload: z.record(z.unknown()),
  proposedBy: z.string().default('VAIC_SYSTEM'),
  confirmedBy: z.string().uuid().nullable(),
  status: z.enum(['PENDING', 'CONFIRMED', 'REJECTED', 'EXECUTING', 'EXECUTED', 'FAILED']),
  executedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ToolAction = z.infer<typeof ToolActionSchema>;

// ─── Timeline Entry ───────────────────────────────────────────
export const TimelineEntrySchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  ts: z.string().datetime(),
  type: z.enum(['FACT', 'HYPOTHESIS', 'DECISION', 'ACTION_ITEM', 'QUESTION', 'STATUS_UPDATE', 'CONFLICT', 'TOOL_ACTION', 'PARTICIPANT_JOIN', 'PARTICIPANT_LEAVE', 'INCIDENT_CREATED', 'INCIDENT_RESOLVED']),
  title: z.string(),
  description: z.string().optional(),
  actorName: z.string().optional(),
  sourceId: z.string().uuid().optional(),
});
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;

// ─── Full Incident State (ISM-02) ─────────────────────────────
export const IncidentStateSchema = z.object({
  incidentId: z.string().uuid(),
  orgId: z.string().uuid(),
  title: z.string(),
  severity: z.enum(['P1', 'P2', 'P3', 'P4']),
  status: z.enum(['ACTIVE', 'MITIGATED', 'RESOLVED', 'CANCELLED']),
  startTs: z.string().datetime(),
  resolvedTs: z.string().datetime().nullable(),
  conferenceUrl: z.string().nullable(),
  affectedSystems: z.array(z.string()).default([]),
  timeline: z.array(TimelineEntrySchema).default([]),
  facts: z.array(FactSchema).default([]),
  hypotheses: z.array(HypothesisSchema).default([]),
  decisions: z.array(DecisionSchema).default([]),
  actionItems: z.array(ActionItemSchema).default([]),
  questions: z.array(QuestionSchema).default([]),
  conflicts: z.array(ConflictSchema).default([]),
  pendingToolActions: z.array(ToolActionSchema).default([]),
  participants: z.array(ParticipantSchema).default([]),
  lastUpdated: z.string().datetime(),
  version: z.number().int().default(0), // Optimistic locking
});
export type IncidentState = z.infer<typeof IncidentStateSchema>;
