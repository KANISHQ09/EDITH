import { logger } from '../lib/logger';

export interface ExistingFact {
  id: string;
  content: string;
}

export interface ConflictDetectionResult {
  hasConflict: boolean;
  conflictingFactId?: string | null;
  description?: string;
  clarifyingQuestion?: string;
}

const CONFLICT_SYSTEM_PROMPT = `You are a strict semantic conflict detector embedded in an engineering incident response room.
Your job is to determine whether a newly proposed FACT contradicts or conflicts with any existing confirmed facts.

Rules:
1. Contradictions involve conflicting numbers, opposite state assertions, contradictory metrics, or incompatible timelines.
   Example:
   Existing: "DB connections are at 85% capacity"
   New: "Database connection pool is at 30% after morning change"
   -> CONFLICT: Disagreement on DB connection pool capacity utilization.
2. If there is NO contradiction, return hasConflict: false.
3. If there IS a contradiction:
   - hasConflict: true
   - conflictingFactId: The exact ID of the conflicting existing fact.
   - description: A clear 1-2 sentence technical summary of the contradiction.
   - clarifyingQuestion: A precise, actionable question the Incident Commander should ask to resolve the discrepancy.

You MUST respond with ONLY valid JSON matching this schema:
{
  "hasConflict": true or false,
  "conflictingFactId": "string-uuid or null",
  "description": "summary of contradiction or null",
  "clarifyingQuestion": "question for IC or null"
}`;

export async function detectFactConflict(
  newFactContent: string,
  existingFacts: ExistingFact[]
): Promise<ConflictDetectionResult> {
  if (!existingFacts || existingFacts.length === 0) {
    return { hasConflict: false };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey) {
    return { hasConflict: false };
  }

  const factsList = existingFacts
    .map((f, i) => `[ID: ${f.id}] Fact ${i + 1}: "${f.content}"`)
    .join('\n');

  const prompt = `${CONFLICT_SYSTEM_PROMPT}

Existing Confirmed Facts:
${factsList}

New Proposed Fact to test:
"${newFactContent}"

Respond with ONLY the JSON object.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1,
          maxOutputTokens: 512,
        },
      }),
    });

    const data: any = await res.json();
    if (data.error) {
      throw new Error(data.error.message || JSON.stringify(data.error));
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return { hasConflict: false };
    }

    const result: ConflictDetectionResult = JSON.parse(rawText);
    return result;
  } catch (err: any) {
    logger.error({ message: 'Conflict detection failed', error: err.message, service: 'api' });
    return { hasConflict: false };
  }
}
