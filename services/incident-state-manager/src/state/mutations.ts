import { ClassificationRecord, StateDeltaMessage, CLASSIFICATION_TYPE } from '@vaic/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * Build a StateDeltaMessage from a classification record.
 * This is published to state.deltas.{incident_id} for downstream consumers
 * (WebSocket Gateway, Voice Synthesis Engine, etc.)
 */
export function buildStateDelta(
  incidentId: string,
  deltaType: StateDeltaMessage['deltaType'],
  classification: ClassificationRecord,
  version: number = 0
): StateDeltaMessage {
  return {
    incidentId,
    deltaType,
    payload: {
      classificationId: classification.id,
      type: classification.type,
      summary: classification.summary,
      confidence: classification.confidence,
      entities: classification.entities,
      speakerName: (classification as any).speakerName,
      speakerRole: (classification as any).speakerRole,
      requiresFollowup: classification.requiresFollowup,
      actionItemOwner: classification.actionItemOwner,
      originalText: (classification as any).originalText,
    },
    version,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Map a ClassificationType to a delta type string.
 */
export function classificationTypeToDeltaType(
  type: string
): StateDeltaMessage['deltaType'] {
  const mapping: Record<string, StateDeltaMessage['deltaType']> = {
    FACT: 'FACT_ADDED',
    HYPOTHESIS: 'HYPOTHESIS_ADDED',
    DECISION: 'DECISION_ADDED',
    ACTION_ITEM: 'ACTION_ITEM_ADDED',
    QUESTION: 'QUESTION_ADDED',
    STATUS_UPDATE: 'TIMELINE_ENTRY_ADDED',
    SOCIAL: 'TIMELINE_ENTRY_ADDED',
  };
  return mapping[type] ?? 'TIMELINE_ENTRY_ADDED';
}
