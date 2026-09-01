import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { logger } from '../lib/logger';

const router = Router();

/**
 * POST /webhooks/zoom
 * Handles Zoom webhook events (bot join/leave, meeting events).
 * Zoom sends a URL validation challenge on first registration.
 */
router.post('/zoom', (req: Request, res: Response) => {
  const event = req.body;

  // Zoom URL validation challenge (step 1 of webhook setup)
  if (event?.event === 'endpoint.url_validation') {
    const hashForValidation = crypto
      .createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET_TOKEN!)
      .update(event.payload.plainToken)
      .digest('hex');

    logger.info({ message: 'Zoom webhook URL validation', service: 'api' });
    res.json({
      plainToken: event.payload.plainToken,
      encryptedToken: hashForValidation,
    });
    return;
  }

  // Verify Zoom webhook signature
  const signature = req.headers['x-zm-signature'] as string;
  const timestamp = req.headers['x-zm-request-timestamp'] as string;

  if (!verifyZoomSignature(signature, timestamp, JSON.stringify(req.body))) {
    logger.warn({ message: 'Zoom webhook signature verification failed', service: 'api' });
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  logger.info({
    message: 'Zoom webhook received',
    eventType: event?.event,
    service: 'api',
  });

  // Route to appropriate handler based on event type
  switch (event?.event) {
    case 'meeting.participant_joined':
      handleParticipantJoined(event);
      break;
    case 'meeting.participant_left':
      handleParticipantLeft(event);
      break;
    case 'meeting.ended':
      handleMeetingEnded(event);
      break;
    default:
      logger.debug({ message: 'Unhandled Zoom webhook event', eventType: event?.event, service: 'api' });
  }

  res.status(200).json({ received: true });
});

/**
 * POST /webhooks/pagerduty
 * Handles PagerDuty event webhooks (v1.5 feature).
 */
router.post('/pagerduty', (req: Request, res: Response) => {
  logger.info({
    message: 'PagerDuty webhook received',
    eventType: req.body?.messages?.[0]?.event,
    service: 'api',
  });
  // TODO: Route PagerDuty events to Tool Integration Gateway in v1.5
  res.status(200).json({ received: true });
});

// ─── Helpers ─────────────────────────────────────────────────

function verifyZoomSignature(signature: string, timestamp: string, body: string): boolean {
  if (!process.env.ZOOM_WEBHOOK_SECRET_TOKEN) return true; // Skip in dev if not configured

  const message = `v0:${timestamp}:${body}`;
  const expected = 'v0=' + crypto
    .createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET_TOKEN)
    .update(message)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

function handleParticipantJoined(event: Record<string, unknown>): void {
  logger.info({ message: 'Participant joined meeting', event, service: 'api' });
  // Publish to Kafka state.deltas for the Audio Ingestion Service to pick up
}

function handleParticipantLeft(event: Record<string, unknown>): void {
  logger.info({ message: 'Participant left meeting', event, service: 'api' });
}

function handleMeetingEnded(event: Record<string, unknown>): void {
  logger.info({ message: 'Meeting ended', event, service: 'api' });
}

export default router;
