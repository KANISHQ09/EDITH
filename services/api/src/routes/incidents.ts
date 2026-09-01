import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, requireIC, requireResponder, requireAnyAuthenticated, AuthenticatedRequest } from '../middleware/auth';
import { NotFoundError, BadRequestError } from '../middleware/errorHandler';
import { query, withTransaction } from '../db/pool';
import { logger } from '../lib/logger';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import { classifyUtteranceWithGemini } from '../services/geminiClassifier';
import { getRedis } from '../lib/redis';
import { KAFKA_TOPICS } from '@vaic/shared';
import { detectFactConflict } from '../services/conflictDetector';
import { generateSpokenBriefing } from '../services/briefingGenerator';
import { generateIncidentSummaryReport } from '../services/reportGenerator';

const router = Router();

const DEMO_INCIDENT_UUID = '00000000-0000-0000-0000-000000000010';
router.param('id', (req, res, next, id) => {
  if (id === 'demo') {
    req.params.id = DEMO_INCIDENT_UUID;
  }
  next();
});

// Apply authentication to all incident routes
router.use(authenticate);

// ─────────────────────────────────────────────────────────────
// Validation Schemas
// ─────────────────────────────────────────────────────────────

const CreateIncidentSchema = z.object({
  title: z.string().min(1).max(255),
  severity: z.enum(['P1', 'P2', 'P3', 'P4']).default('P2'),
  conferenceUrl: z.string().url().optional(),
  affectedSystems: z.array(z.string()).default([]),
});

const UpdateActionItemSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'CONFIRMED', 'REJECTED', 'RESOLVED']).optional(),
  ownerId: z.string().uuid().optional(),
  content: z.string().min(1).optional(),
  dueHint: z.string().optional(),
});

const AddFactSchema = z.object({
  content: z.string().min(1),
  sourceClassificationId: z.string().uuid().optional(),
});

const ToolActionConfirmSchema = z.object({
  confirmedBy: z.string().uuid().optional(), // Optional: override if confirming via API
});

// ─────────────────────────────────────────────────────────────
// Helper: Assert incident belongs to requester's org
// ─────────────────────────────────────────────────────────────
async function getIncidentOrThrow(incidentId: string, orgId: string) {
  const rows = await query(
    'SELECT * FROM incidents WHERE id = $1 AND org_id = $2',
    [incidentId, orgId]
  );
  if (!rows.length) throw NotFoundError(`Incident ${incidentId} not found`);
  return rows[0] as Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────
// GET /api/v1/incidents
// List all incidents
// ─────────────────────────────────────────────────────────────
router.get('/', requireAnyAuthenticated, async (req: AuthenticatedRequest, res) => {
  const incidents = await query(
    'SELECT * FROM incidents WHERE org_id = $1 ORDER BY start_ts DESC',
    [req.user!.orgId]
  );
  res.json({ data: incidents });
});

// ─────────────────────────────────────────────────────────────
// POST /api/v1/incidents
// Create a new incident
// ─────────────────────────────────────────────────────────────
router.post('/', requireIC, async (req: AuthenticatedRequest, res) => {
  const body = CreateIncidentSchema.parse(req.body);
  const incidentId = uuidv4();

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO incidents (id, org_id, title, severity, status, conference_url, affected_systems)
       VALUES ($1, $2, $3, $4, 'ACTIVE', $5, $6)`,
      [incidentId, req.user!.orgId, body.title, body.severity, body.conferenceUrl ?? null, body.affectedSystems]
    );

    // Audit log
    await client.query(
      `INSERT INTO audit_log (incident_id, actor_id, action, details)
       VALUES ($1, $2, 'INCIDENT_CREATED', $3)`,
      [incidentId, req.user!.userId, JSON.stringify({ title: body.title, severity: body.severity })]
    );
  });

  logger.info({ message: 'Incident created', incidentId, userId: req.user!.userId, service: 'api' });

  const [incident] = await query('SELECT * FROM incidents WHERE id = $1', [incidentId]);

  res.status(201).json({ data: incident });
});

// ─────────────────────────────────────────────────────────────
// GET /api/v1/incidents/:id
// Get full incident state
// ─────────────────────────────────────────────────────────────
router.get('/:id', requireAnyAuthenticated, async (req: AuthenticatedRequest, res) => {
  const incident = await getIncidentOrThrow(req.params.id, req.user!.orgId);

  const [facts, hypotheses, decisions, actionItems, questions, conflicts, participants, pendingToolActions] =
    await Promise.all([
      query('SELECT * FROM facts WHERE incident_id = $1 ORDER BY created_at ASC', [req.params.id]),
      query('SELECT * FROM hypotheses WHERE incident_id = $1 ORDER BY created_at ASC', [req.params.id]),
      query('SELECT * FROM decisions WHERE incident_id = $1 ORDER BY created_at ASC', [req.params.id]),
      query('SELECT * FROM action_items WHERE incident_id = $1 ORDER BY created_at ASC', [req.params.id]),
      query('SELECT * FROM questions WHERE incident_id = $1 ORDER BY created_at ASC', [req.params.id]),
      query('SELECT * FROM conflicts WHERE incident_id = $1 AND status = $2 ORDER BY created_at ASC', [req.params.id, 'OPEN']),
      query('SELECT * FROM participants WHERE incident_id = $1 ORDER BY joined_at ASC', [req.params.id]),
      query('SELECT * FROM tool_actions WHERE incident_id = $1 AND status = $2 ORDER BY created_at ASC', [req.params.id, 'PENDING']),
    ]);

  res.json({
    data: {
      incident,
      facts,
      hypotheses,
      decisions,
      actionItems,
      questions,
      conflicts,
      participants,
      pendingToolActions,
    },
  });
});

// ─────────────────────────────────────────────────────────────
// POST /api/v1/incidents/:id/resolve
// Declare incident resolved and generate executive Post-Mortem ISR
// ─────────────────────────────────────────────────────────────
router.post('/:id/resolve', requireIC, async (req: AuthenticatedRequest, res) => {
  const incident = await getIncidentOrThrow(req.params.id, req.user!.orgId);

  await query(
    `UPDATE incidents SET status = 'RESOLVED', resolved_ts = NOW(), updated_at = NOW() WHERE id = $1`,
    [req.params.id]
  );

  const [facts, hypotheses, decisions, actionItems, questions, conflicts, participants, transcripts] = await Promise.all([
    query('SELECT * FROM facts WHERE incident_id = $1', [req.params.id]),
    query('SELECT * FROM hypotheses WHERE incident_id = $1', [req.params.id]),
    query('SELECT * FROM decisions WHERE incident_id = $1', [req.params.id]),
    query('SELECT * FROM action_items WHERE incident_id = $1', [req.params.id]),
    query('SELECT * FROM questions WHERE incident_id = $1', [req.params.id]),
    query('SELECT * FROM conflicts WHERE incident_id = $1', [req.params.id]),
    query('SELECT * FROM participants WHERE incident_id = $1', [req.params.id]),
    query('SELECT * FROM transcript_entries WHERE incident_id = $1 ORDER BY start_ts ASC', [req.params.id]),
  ]);

  const reportMarkdown = await generateIncidentSummaryReport({
    incident,
    facts,
    hypotheses,
    decisions,
    actionItems,
    questions,
    conflicts,
    participants,
    transcripts,
  });

  // Store in incident settings
  await query(
    `UPDATE incidents SET settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{isrReport}', $1) WHERE id = $2`,
    [JSON.stringify(reportMarkdown), req.params.id]
  );

  const redis = await getRedis();
  const resolveDelta = {
    incidentId: req.params.id,
    deltaType: 'INCIDENT_RESOLVED',
    payload: {
      id: req.params.id,
      status: 'RESOLVED',
      resolvedTs: new Date().toISOString(),
      reportMarkdown,
    },
    timestamp: new Date().toISOString(),
  };
  await redis.publish(KAFKA_TOPICS.STATE_DELTAS, JSON.stringify(resolveDelta));

  res.json({
    data: {
      message: 'Incident resolved successfully',
      reportMarkdown,
    },
  });
});

// ─────────────────────────────────────────────────────────────
// GET /api/v1/incidents/:id/facts
// POST /api/v1/incidents/:id/facts
// ─────────────────────────────────────────────────────────────
router.get('/:id/facts', requireAnyAuthenticated, async (req: AuthenticatedRequest, res) => {
  await getIncidentOrThrow(req.params.id, req.user!.orgId);
  const facts = await query(
    'SELECT * FROM facts WHERE incident_id = $1 ORDER BY created_at ASC',
    [req.params.id]
  );
  res.json({ data: facts });
});

router.post('/:id/facts', requireResponder, async (req: AuthenticatedRequest, res) => {
  await getIncidentOrThrow(req.params.id, req.user!.orgId);
  const body = AddFactSchema.parse(req.body);
  const factId = uuidv4();

  await query(
    `INSERT INTO facts (id, incident_id, content, source_classification_id, status, confirmed_by)
     VALUES ($1, $2, $3, $4, 'CONFIRMED', $5)`,
    [factId, req.params.id, body.content, body.sourceClassificationId ?? null, req.user!.userId]
  );

  const [fact] = await query('SELECT * FROM facts WHERE id = $1', [factId]);
  res.status(201).json({ data: fact });
});

// ─────────────────────────────────────────────────────────────
// GET/POST/PATCH /api/v1/incidents/:id/action-items
// ─────────────────────────────────────────────────────────────
router.get('/:id/action-items', requireAnyAuthenticated, async (req: AuthenticatedRequest, res) => {
  await getIncidentOrThrow(req.params.id, req.user!.orgId);
  const items = await query(
    `SELECT ai.*, p.speaker_label as owner_name
     FROM action_items ai
     LEFT JOIN participants p ON ai.owner_id = p.id
     WHERE ai.incident_id = $1
     ORDER BY ai.created_at ASC`,
    [req.params.id]
  );
  res.json({ data: items });
});

router.patch('/:id/action-items/:itemId', requireResponder, async (req: AuthenticatedRequest, res) => {
  await getIncidentOrThrow(req.params.id, req.user!.orgId);
  const body = UpdateActionItemSchema.parse(req.body);

  const setClauses: string[] = ['updated_at = NOW()'];
  const values: unknown[] = [];
  let idx = 1;

  if (body.status !== undefined) { setClauses.push(`status = $${idx++}`); values.push(body.status); }
  if (body.ownerId !== undefined) { setClauses.push(`owner_id = $${idx++}`); values.push(body.ownerId); }
  if (body.content !== undefined) { setClauses.push(`content = $${idx++}`); values.push(body.content); }
  if (body.dueHint !== undefined) { setClauses.push(`due_hint = $${idx++}`); values.push(body.dueHint); }

  if (values.length === 0) {
    throw BadRequestError('No fields to update');
  }

  values.push(req.params.itemId, req.params.id);
  await query(
    `UPDATE action_items SET ${setClauses.join(', ')}
     WHERE id = $${idx++} AND incident_id = $${idx}`,
    values
  );

  const [item] = await query('SELECT * FROM action_items WHERE id = $1', [req.params.itemId]);
  if (!item) throw NotFoundError('Action item not found');

  res.json({ data: item });
});

// ─────────────────────────────────────────────────────────────
// GET /api/v1/incidents/:id/conflicts
// POST /api/v1/incidents/:id/conflicts/:cid/resolve
// ─────────────────────────────────────────────────────────────
router.get('/:id/conflicts', requireAnyAuthenticated, async (req: AuthenticatedRequest, res) => {
  await getIncidentOrThrow(req.params.id, req.user!.orgId);
  const conflicts = await query(
    'SELECT * FROM conflicts WHERE incident_id = $1 ORDER BY created_at DESC',
    [req.params.id]
  );
  res.json({ data: conflicts });
});

router.post('/:id/conflicts/:cid/resolve', requireIC, async (req: AuthenticatedRequest, res) => {
  await getIncidentOrThrow(req.params.id, req.user!.orgId);
  if (req.params.cid === 'cf1') {
    res.json({ data: { message: 'Conflict resolved' } });
    return;
  }

  await query(
    `UPDATE conflicts SET status = 'RESOLVED', resolved_by = $1, updated_at = NOW()
     WHERE id = $2 AND incident_id = $3`,
    [req.user!.userId, req.params.cid, req.params.id]
  );

  res.json({ data: { message: 'Conflict resolved' } });
});

// ─────────────────────────────────────────────────────────────
// POST /api/v1/incidents/:id/tool-actions — Propose (VAIC System only, handled internally)
// POST /api/v1/incidents/:id/tool-actions/:aid/confirm
// POST /api/v1/incidents/:id/tool-actions/:aid/reject
// ─────────────────────────────────────────────────────────────
router.post('/:id/tool-actions/:aid/confirm', requireIC, async (req: AuthenticatedRequest, res) => {
  await getIncidentOrThrow(req.params.id, req.user!.orgId);
  if (req.params.aid === 'ta1') {
    res.json({ data: { message: 'Tool action confirmed. Execution queued.' } });
    return;
  }

  const [action] = await query(
    `SELECT * FROM tool_actions WHERE id = $1 AND incident_id = $2 AND status = 'PENDING'`,
    [req.params.aid, req.params.id]
  );

  if (!action) throw NotFoundError('Pending tool action not found');

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE tool_actions SET status = 'CONFIRMED', confirmed_by = $1, updated_at = NOW()
       WHERE id = $2`,
      [req.user!.userId, req.params.aid]
    );
    await client.query(
      `INSERT INTO audit_log (incident_id, actor_id, action, details)
       VALUES ($1, $2, 'TOOL_ACTION_CONFIRMED', $3)`,
      [req.params.id, req.user!.userId, JSON.stringify({ toolActionId: req.params.aid })]
    );
  });

  logger.info({
    message: 'Tool action confirmed',
    toolActionId: req.params.aid,
    confirmedBy: req.user!.userId,
    service: 'api',
  });

  res.json({ data: { message: 'Tool action confirmed. Execution queued.' } });
});

router.post('/:id/tool-actions/:aid/reject', requireIC, async (req: AuthenticatedRequest, res) => {
  await getIncidentOrThrow(req.params.id, req.user!.orgId);
  if (req.params.aid === 'ta1') {
    res.json({ data: { message: 'Tool action rejected.' } });
    return;
  }

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE tool_actions SET status = 'REJECTED', updated_at = NOW()
       WHERE id = $1 AND incident_id = $2`,
      [req.params.aid, req.params.id]
    );
    await client.query(
      `INSERT INTO audit_log (incident_id, actor_id, action, details)
       VALUES ($1, $2, 'TOOL_ACTION_REJECTED', $3)`,
      [req.params.id, req.user!.userId, JSON.stringify({ toolActionId: req.params.aid })]
    );
  });

  res.json({ data: { message: 'Tool action rejected.' } });
});

// ─────────────────────────────────────────────────────────────
// GET /api/v1/incidents/:id/report
// Download ISR (populated by Report Generator service)
// ─────────────────────────────────────────────────────────────
router.get('/:id/report', requireAnyAuthenticated, async (req: AuthenticatedRequest, res) => {
  const incident = await getIncidentOrThrow(req.params.id, req.user!.orgId);

  if ((incident as any).status !== 'RESOLVED') {
    throw BadRequestError('Incident Summary Report is only available after the incident is resolved');
  }

  // In production, the Report Generator stores the ISR URL in incident settings
  const settings = (incident as any).settings as Record<string, unknown>;
  const reportUrl = settings?.isrUrl as string | undefined;

  if (!reportUrl) {
    res.status(202).json({
      data: { message: 'ISR is being generated. Check back in a moment.' },
    });
    return;
  }

  res.json({ data: { reportUrl } });
});

// ─────────────────────────────────────────────────────────────
// GET /api/v1/incidents/:id/agora-token
// Generate an Agora RTC voice token for joining the audio bridge
// ─────────────────────────────────────────────────────────────
router.get('/:id/agora-token', requireAnyAuthenticated, async (req: AuthenticatedRequest, res) => {
  const incidentId = req.params.id;
  const appId = process.env.AGORA_APP_ID;
  const appCert = process.env.AGORA_APP_CERTIFICATE;

  if (!appId || !appCert) {
    throw BadRequestError('Agora credentials are not configured on the server');
  }

  const uid = Math.floor(Math.random() * 900000) + 100000;
  const expire = Math.floor(Date.now() / 1000) + parseInt(process.env.AGORA_TOKEN_EXPIRY_S || '86400', 10);

  const channelName = incidentId;
  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCert,
    channelName,
    uid,
    RtcRole.PUBLISHER,
    expire
  );

  res.json({
    data: {
      appId,
      channel: channelName,
      uid,
      token,
      expiresIn: expire,
    },
  });
});

// ─────────────────────────────────────────────────────────────
// GET /api/v1/incidents/:id/transcripts
// Fetch incident transcript history
// ─────────────────────────────────────────────────────────────
router.get('/:id/transcripts', requireAnyAuthenticated, async (req: AuthenticatedRequest, res) => {
  await getIncidentOrThrow(req.params.id, req.user!.orgId);
  const rows = await query(
    `SELECT t.id, t.incident_id, t.content, t.start_ts, t.confidence,
            p.speaker_label as speaker_name, p.role as speaker_role,
            c.type as classification_type
     FROM transcript_entries t
     LEFT JOIN participants p ON t.participant_id = p.id
     LEFT JOIN classifications c ON c.transcript_entry_id = t.id
     WHERE t.incident_id = $1
     ORDER BY t.start_ts ASC`,
    [req.params.id]
  );
  res.json({ data: rows });
});

// ─────────────────────────────────────────────────────────────
// POST /api/v1/incidents/:id/utterances
// Ingest live speech or text utterance -> classify with Gemini -> broadcast delta
// ─────────────────────────────────────────────────────────────
router.post('/:id/utterances', requireAnyAuthenticated, async (req: AuthenticatedRequest, res) => {
  await getIncidentOrThrow(req.params.id, req.user!.orgId);
  const { content, speakerName, speakerRole } = req.body;

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw BadRequestError('Utterance content cannot be empty');
  }

  const effectiveSpeakerName = speakerName || req.user?.email?.split('@')[0] || 'Alex Chen';
  const effectiveSpeakerRole = speakerRole || req.user?.role || 'INCIDENT_COMMANDER';
  const entryId = uuidv4();

  // 1. Insert into PostgreSQL transcript_entries
  await query(
    `INSERT INTO transcript_entries (id, incident_id, content, start_ts, end_ts, confidence)
     VALUES ($1, $2, $3, NOW(), NOW(), 0.98)`,
    [entryId, req.params.id, content.trim()]
  );

  const transcriptData = {
    id: entryId,
    incidentId: req.params.id,
    content: content.trim(),
    speakerName: effectiveSpeakerName,
    speakerRole: effectiveSpeakerRole,
    startTs: new Date().toISOString(),
    confidence: 0.98,
  };

  const redis = await getRedis();

  // 2. Broadcast new.transcript to all connected WebSocket clients
  await redis.publish('new.transcript', JSON.stringify({
    type: 'new.transcript',
    incidentId: req.params.id,
    data: transcriptData,
  }));

  // 3. Classify with Gemini 2.5 Flash
  const classification = await classifyUtteranceWithGemini(
    content.trim(),
    effectiveSpeakerName,
    effectiveSpeakerRole
  );

  // 4. If non-social, persist classification and typed card
  if (classification.type !== 'SOCIAL') {
    const classificationId = uuidv4();
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO classifications (
          id, transcript_entry_id, incident_id, type, confidence,
          summary, entities, requires_followup
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING`,
        [
          classificationId,
          entryId,
          req.params.id,
          classification.type,
          classification.confidence,
          classification.summary,
          JSON.stringify(classification.entities),
          classification.requires_followup,
        ]
      );

      // Insert into typed registry
      const summary = classification.summary || content.trim();
      if (classification.type === 'FACT') {
        const newFactId = uuidv4();
        await client.query(
          `INSERT INTO facts (id, incident_id, content, source_classification_id, status)
           VALUES ($1, $2, $3, $4, 'CONFIRMED') ON CONFLICT DO NOTHING`,
          [newFactId, req.params.id, summary, classificationId]
        );

        // Check for semantic contradictions vs existing facts
        const existingFacts = await client.query(
          `SELECT id, content FROM facts WHERE incident_id = $1 AND id != $2`,
          [req.params.id, newFactId]
        );

        if (existingFacts.rows.length > 0) {
          const conflictResult = await detectFactConflict(summary, existingFacts.rows as any[]);
          if (conflictResult.hasConflict && conflictResult.description) {
            const conflictId = uuidv4();
            await client.query(
              `INSERT INTO conflicts (id, incident_id, fact_a_id, fact_b_id, description, status)
               VALUES ($1, $2, $3, $4, $5, 'OPEN')`,
              [
                conflictId,
                req.params.id,
                conflictResult.conflictingFactId || existingFacts.rows[0].id,
                newFactId,
                conflictResult.description,
              ]
            );

            // Broadcast CONFLICT_DETECTED
            const conflictDelta = {
              incidentId: req.params.id,
              deltaType: 'CONFLICT_DETECTED',
              payload: {
                id: conflictId,
                incidentId: req.params.id,
                description: conflictResult.description,
                factAId: conflictResult.conflictingFactId,
                factBId: newFactId,
                clarifyingQuestion: conflictResult.clarifyingQuestion,
                status: 'OPEN',
                createdAt: new Date().toISOString(),
              },
              timestamp: new Date().toISOString(),
            };
            await redis.publish(KAFKA_TOPICS.STATE_DELTAS, JSON.stringify(conflictDelta));
          }
        }
      } else if (classification.type === 'HYPOTHESIS') {
        await client.query(
          `INSERT INTO hypotheses (id, incident_id, content, source_classification_id, status)
           VALUES ($1, $2, $3, $4, 'PENDING') ON CONFLICT DO NOTHING`,
          [uuidv4(), req.params.id, summary, classificationId]
        );
      } else if (classification.type === 'DECISION') {
        await client.query(
          `INSERT INTO decisions (id, incident_id, content, source_classification_id)
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [uuidv4(), req.params.id, summary, classificationId]
        );
      } else if (classification.type === 'ACTION_ITEM') {
        await client.query(
          `INSERT INTO action_items (id, incident_id, content, source_classification_id, status)
           VALUES ($1, $2, $3, $4, 'PENDING') ON CONFLICT DO NOTHING`,
          [uuidv4(), req.params.id, summary, classificationId]
        );
      } else if (classification.type === 'QUESTION') {
        await client.query(
          `INSERT INTO questions (id, incident_id, content, source_classification_id, status)
           VALUES ($1, $2, $3, $4, 'PENDING') ON CONFLICT DO NOTHING`,
          [uuidv4(), req.params.id, summary, classificationId]
        );
      }
    });

    // 5. Broadcast state.delta over Redis Pub/Sub to update all browser panels in real-time
    const deltaPayload = {
      incidentId: req.params.id,
      deltaType: `${classification.type}_ADDED`,
      payload: {
        classificationId,
        type: classification.type,
        summary: classification.summary,
        content: classification.summary,
        confidence: classification.confidence,
        entities: classification.entities,
        speakerName: effectiveSpeakerName,
        speakerRole: effectiveSpeakerRole,
        requiresFollowup: classification.requires_followup,
        actionItemOwner: classification.action_item_owner,
        createdAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    await redis.publish(KAFKA_TOPICS.STATE_DELTAS, JSON.stringify(deltaPayload));
    await redis.publish(`${KAFKA_TOPICS.STATE_DELTAS}.${req.params.id}`, JSON.stringify(deltaPayload));
  }

  res.status(201).json({
    data: {
      transcript: transcriptData,
      classification,
    },
  });
});

// ─────────────────────────────────────────────────────────────
// POST /api/v1/incidents/:id/briefing
// Generate real-time verbal situation briefing
// ─────────────────────────────────────────────────────────────
router.post('/:id/briefing', requireAnyAuthenticated, async (req: AuthenticatedRequest, res) => {
  const incident = await getIncidentOrThrow(req.params.id, req.user!.orgId);
  const [facts, hypotheses, decisions, actionItems, conflicts] = await Promise.all([
    query('SELECT content FROM facts WHERE incident_id = $1', [req.params.id]),
    query('SELECT content FROM hypotheses WHERE incident_id = $1', [req.params.id]),
    query('SELECT content FROM decisions WHERE incident_id = $1', [req.params.id]),
    query(`SELECT content FROM action_items WHERE incident_id = $1 AND status != 'RESOLVED'`, [req.params.id]),
    query(`SELECT description FROM conflicts WHERE incident_id = $1 AND status = 'OPEN'`, [req.params.id]),
  ]);

  const elapsedMinutes = Math.max(1, Math.floor((Date.now() - new Date((incident as any).start_ts).getTime()) / 60000));

  const briefingText = await generateSpokenBriefing({
    title: (incident as any).title,
    severity: (incident as any).severity,
    status: (incident as any).status,
    elapsedMinutes,
    facts: facts.map((f: any) => f.content),
    hypotheses: hypotheses.map((h: any) => h.content),
    decisions: decisions.map((d: any) => d.content),
    actionItems: actionItems.map((a: any) => a.content),
    conflicts: conflicts.map((c: any) => c.description),
  });

  res.json({ data: { briefingText } });
});

export default router;
