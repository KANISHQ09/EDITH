import CircuitBreaker from 'opossum';
import { WebClient } from '@slack/web-api';
import axios from 'axios';
import { logger } from '../lib/logger';
import { config } from '../config';

type ToolResult = { success: boolean; data?: unknown; error?: string };

// ─── Slack Integration ────────────────────────────────────────

const slackClient = config.slackEnabled ? new WebClient(config.slackBotToken) : null;

async function _slackPostMessage(channel: string, text: string, blocks?: unknown[]): Promise<ToolResult> {
  if (!slackClient) return { success: false, error: 'Slack not configured' };

  const result = await slackClient.chat.postMessage({
    channel,
    text,
    blocks: blocks as any,
    unfurl_links: false,
  });

  return { success: result.ok, data: { ts: result.ts, channel: result.channel } };
}

async function _slackSetTopic(channel: string, topic: string): Promise<ToolResult> {
  if (!slackClient) return { success: false, error: 'Slack not configured' };
  const result = await slackClient.conversations.setTopic({ channel, topic });
  return { success: result.ok };
}

async function _slackCreateChannel(name: string): Promise<ToolResult> {
  if (!slackClient) return { success: false, error: 'Slack not configured' };
  const result = await slackClient.conversations.create({ name: name.toLowerCase().replace(/\s+/g, '-') });
  return { success: result.ok, data: { channelId: result.channel?.id } };
}

// ─── PagerDuty Integration ────────────────────────────────────

const pdHeaders = {
  Authorization: `Token token=${config.pagerdutyApiKey}`,
  Accept: 'application/vnd.pagerduty+json;version=2',
  'Content-Type': 'application/json',
};

async function _pdAcknowledge(incidentId: string, fromEmail: string): Promise<ToolResult> {
  if (!config.pagerdutyEnabled) return { success: false, error: 'PagerDuty not configured' };

  const res = await axios.put(
    `https://api.pagerduty.com/incidents/${incidentId}`,
    { incident: { type: 'incident', status: 'acknowledged' } },
    { headers: { ...pdHeaders, From: fromEmail } }
  );
  return { success: res.status === 200, data: res.data };
}

async function _pdAddNote(incidentId: string, content: string, fromEmail: string): Promise<ToolResult> {
  if (!config.pagerdutyEnabled) return { success: false, error: 'PagerDuty not configured' };

  const res = await axios.post(
    `https://api.pagerduty.com/incidents/${incidentId}/notes`,
    { note: { content } },
    { headers: { ...pdHeaders, From: fromEmail } }
  );
  return { success: res.status === 201, data: res.data };
}

// ─── Jira Integration ─────────────────────────────────────────

const jiraAuth = config.jiraEnabled
  ? Buffer.from(`${config.jiraEmail}:${config.jiraApiToken}`).toString('base64')
  : '';

async function _jiraCreateIssue(summary: string, description: string, priority: string): Promise<ToolResult> {
  if (!config.jiraEnabled) return { success: false, error: 'Jira not configured' };

  const res = await axios.post(
    `${config.jiraBaseUrl}/rest/api/3/issue`,
    {
      fields: {
        project: { key: config.jiraProjectKey },
        summary,
        description: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }] },
        issuetype: { name: 'Bug' },
        priority: { name: priority || 'Highest' },
      },
    },
    { headers: { Authorization: `Basic ${jiraAuth}`, 'Content-Type': 'application/json' } }
  );
  return { success: res.status === 201, data: { issueKey: res.data.key, url: `${config.jiraBaseUrl}/browse/${res.data.key}` } };
}

async function _jiraAddComment(issueKey: string, body: string): Promise<ToolResult> {
  if (!config.jiraEnabled) return { success: false, error: 'Jira not configured' };

  const res = await axios.post(
    `${config.jiraBaseUrl}/rest/api/3/issue/${issueKey}/comment`,
    { body: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: body }] }] } },
    { headers: { Authorization: `Basic ${jiraAuth}`, 'Content-Type': 'application/json' } }
  );
  return { success: res.status === 201 };
}

// ─── Circuit Breaker Factory ──────────────────────────────────

function withBreaker<T extends (...args: unknown[]) => Promise<ToolResult>>(
  fn: T,
  name: string
): CircuitBreaker<Parameters<T>, ToolResult> {
  const breaker = new CircuitBreaker(fn, {
    name,
    timeout: config.circuitBreakerTimeout,
    errorThresholdPercentage: config.circuitBreakerErrorThreshold,
    resetTimeout: config.circuitBreakerResetTimeout,
  });

  breaker.on('open', () => logger.warn({ message: `Circuit breaker OPEN: ${name}`, service: 'tig' }));
  breaker.on('halfOpen', () => logger.info({ message: `Circuit breaker HALF-OPEN: ${name}`, service: 'tig' }));
  breaker.on('close', () => logger.info({ message: `Circuit breaker CLOSED: ${name}`, service: 'tig' }));

  return breaker;
}

// ─── Public Integration API ───────────────────────────────────

export const integrations = {
  slack: {
    postMessage: withBreaker(_slackPostMessage, 'slack-post-message'),
    setTopic:    withBreaker(_slackSetTopic, 'slack-set-topic'),
    createChannel: withBreaker(_slackCreateChannel, 'slack-create-channel'),
  },
  pagerduty: {
    acknowledge: withBreaker(_pdAcknowledge, 'pd-acknowledge'),
    addNote:     withBreaker(_pdAddNote, 'pd-add-note'),
  },
  jira: {
    createIssue: withBreaker(_jiraCreateIssue, 'jira-create-issue'),
    addComment:  withBreaker(_jiraAddComment, 'jira-add-comment'),
  },
};

/**
 * Route a tool action to the correct integration.
 * Called by the Kafka consumer after IC confirms via dashboard.
 */
export async function executeToolAction(
  tool: string,
  actionType: string,
  payload: Record<string, unknown>
): Promise<ToolResult> {
  logger.info({ message: 'Executing tool action', tool, actionType, service: 'tig' });

  switch (`${tool}.${actionType}`) {
    case 'slack.post_message':
      return integrations.slack.postMessage.fire(
        payload.channel as string,
        payload.text as string,
        payload.blocks as unknown[]
      );

    case 'slack.set_topic':
      return integrations.slack.setTopic.fire(
        payload.channel as string,
        payload.topic as string
      );

    case 'slack.create_channel':
      return integrations.slack.createChannel.fire(payload.name as string);

    case 'pagerduty.acknowledge':
      return integrations.pagerduty.acknowledge.fire(
        payload.incidentId as string,
        payload.fromEmail as string
      );

    case 'pagerduty.add_note':
      return integrations.pagerduty.addNote.fire(
        payload.incidentId as string,
        payload.content as string,
        payload.fromEmail as string
      );

    case 'jira.create_issue':
      return integrations.jira.createIssue.fire(
        payload.summary as string,
        payload.description as string,
        payload.priority as string
      );

    case 'jira.add_comment':
      return integrations.jira.addComment.fire(
        payload.issueKey as string,
        payload.body as string
      );

    default:
      logger.warn({ message: 'Unknown tool action', tool, actionType, service: 'tig' });
      return { success: false, error: `Unknown tool action: ${tool}.${actionType}` };
  }
}
