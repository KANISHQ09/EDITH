import { logger } from '../lib/logger';

export interface ExtractedEntities {
  systems: string[];
  people: string[];
  timestamps: string[];
  metrics: string[];
  error_codes: string[];
  urls: string[];
  tools: string[];
}

export interface GeminiClassificationResult {
  type: 'FACT' | 'HYPOTHESIS' | 'DECISION' | 'ACTION_ITEM' | 'QUESTION' | 'STATUS_UPDATE' | 'SOCIAL';
  confidence: number;
  summary: string;
  entities: ExtractedEntities;
  action_item_owner?: string | null;
  requires_followup: boolean;
}

const CLASSIFICATION_SYSTEM_PROMPT = `You are an incident intelligence extraction engine embedded in a live technical incident response call.
Your role is to classify each utterance from the ongoing incident response conversation and extract structured intelligence.

Classification Types:
- FACT: Information confirmed by evidence, tool output, logs, metrics, or explicit team consensus. Something verified.
- HYPOTHESIS: A proposed explanation or theory. Unconfirmed. Requires investigation.
- DECISION: An explicit decision made by the team about what action to take or what approach to follow.
- ACTION_ITEM: A specific task that someone has been asked to do or has committed to doing. Has a clear owner or implied owner.
- QUESTION: An open question asked by any participant that requires an answer.
- STATUS_UPDATE: A progress update on an ongoing activity.
- SOCIAL: Greetings, acknowledgments, chit-chat, filler words with no incident-relevant content.

Rules:
1. Be precise. A single utterance may only have ONE primary type.
2. Confidence: 1.0 = certain, 0.7 = likely, 0.5 = uncertain.
3. For ACTION_ITEM: extract the owner from the utterance if mentioned, otherwise null.
4. For entities: extract only what is explicitly mentioned (systems, metrics, error codes, tools).
5. summary: Restate the utterance as a concise, third-person incident log entry (max 120 chars).
6. requires_followup: true if this indicates something needs tracking.

You MUST respond with ONLY valid JSON matching this schema:
{
  "type": "FACT | HYPOTHESIS | DECISION | ACTION_ITEM | QUESTION | STATUS_UPDATE | SOCIAL",
  "confidence": 0.0-1.0,
  "summary": "concise third-person restatement",
  "entities": {
    "systems": [],
    "people": [],
    "timestamps": [],
    "metrics": [],
    "error_codes": [],
    "urls": [],
    "tools": []
  },
  "action_item_owner": "name or null",
  "requires_followup": false
}`;

export async function classifyUtteranceWithGemini(
  text: string,
  speakerName: string = 'Responder',
  speakerRole: string = 'RESPONDER'
): Promise<GeminiClassificationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey) {
    logger.warn({ message: 'No GEMINI_API_KEY set, defaulting to STATUS_UPDATE', service: 'api' });
    return {
      type: 'STATUS_UPDATE',
      confidence: 0.8,
      summary: `${speakerName}: ${text}`,
      entities: { systems: [], people: [], timestamps: [], metrics: [], error_codes: [], urls: [], tools: [] },
      requires_followup: false,
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `${CLASSIFICATION_SYSTEM_PROMPT}

Current utterance to classify:
Speaker: ${speakerName} (${speakerRole})
Text: "${text}"

Respond with ONLY the JSON object.`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1,
          maxOutputTokens: 1024,
        },
      }),
    });

    const data: any = await res.json();
    if (data.error) {
      throw new Error(data.error.message || JSON.stringify(data.error));
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('No candidate content returned by Gemini');
    }

    const parsed: GeminiClassificationResult = JSON.parse(rawText);
    return parsed;
  } catch (err: any) {
    logger.error({ message: 'Gemini classification failed, fallback to STATUS_UPDATE', error: err.message, service: 'api' });
    return {
      type: 'STATUS_UPDATE',
      confidence: 0.7,
      summary: `${speakerName}: ${text}`,
      entities: { systems: [], people: [], timestamps: [], metrics: [], error_codes: [], urls: [], tools: [] },
      requires_followup: false,
    };
  }
}
