import 'dotenv/config';

export const config = {
  port: parseInt(process.env.TIG_PORT || '3004', 10),

  // Kafka
  kafkaBrokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  kafkaClientId: 'vaic-tool-gateway',
  kafkaGroupId: process.env.KAFKA_GROUP_ID_TIG || 'vaic-tig-group',

  // Slack
  slackEnabled: process.env.ENABLE_SLACK === 'true',
  slackBotToken: process.env.SLACK_BOT_TOKEN || '',
  slackIncidentChannel: process.env.SLACK_INCIDENT_CHANNEL || '#incidents',
  slackIsrChannel: process.env.SLACK_ISR_CHANNEL || '#incident-reports',

  // Jira
  jiraEnabled: process.env.ENABLE_JIRA === 'true',
  jiraBaseUrl: process.env.JIRA_BASE_URL || '',
  jiraEmail: process.env.JIRA_EMAIL || '',
  jiraApiToken: process.env.JIRA_API_TOKEN || '',
  jiraProjectKey: process.env.JIRA_PROJECT_KEY || 'INC',

  // PagerDuty
  pagerdutyEnabled: process.env.ENABLE_PAGERDUTY === 'true',
  pagerdutyApiKey: process.env.PAGERDUTY_API_KEY || '',
  pagerdutyServiceId: process.env.PAGERDUTY_SERVICE_ID || '',

  // Circuit Breaker settings
  circuitBreakerTimeout: 10_000,      // 10s per call before timeout
  circuitBreakerErrorThreshold: 50,   // Open after 50% error rate
  circuitBreakerResetTimeout: 30_000, // Try again after 30s
};
