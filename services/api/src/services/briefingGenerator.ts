import { logger } from '../lib/logger';

export interface BriefingContext {
  title: string;
  severity: string;
  status: string;
  elapsedMinutes: number;
  facts: string[];
  hypotheses: string[];
  decisions: string[];
  actionItems: string[];
  conflicts: string[];
}

export async function generateSpokenBriefing(context: BriefingContext): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey) {
    return `This is EDITH with a situation update. We are ${context.elapsedMinutes} minutes into ${context.severity} incident ${context.title}. There are ${context.facts.length} confirmed facts and ${context.actionItems.length} open action items.`;
  }

  const prompt = `You are EDITH, the autonomous Voice AI Incident Commander co-pilot embedded on an engineering outage call.
The Incident Commander has requested a verbal situation briefing.

Context:
- Incident: ${context.title} (${context.severity})
- Outage Duration: ${context.elapsedMinutes} minutes
- Confirmed Facts: ${context.facts.join('; ') || 'None yet'}
- Active Hypotheses: ${context.hypotheses.join('; ') || 'None yet'}
- Agreed Decisions: ${context.decisions.join('; ') || 'None yet'}
- Key Action Items: ${context.actionItems.join('; ') || 'None pending'}
- Open Conflicts: ${context.conflicts.join('; ') || 'None'}

Instructions:
1. Write a 3 to 4 sentence verbal status briefing meant to be SPOKEN aloud to the team.
2. Highlight: current outage state, key confirmed fact, critical in-flight decision or action, and any open contradiction.
3. Be calm, concise, and direct. Do not include markdown, bullet points, or asterisks. Write purely speakable text.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 256,
        },
      }),
    });

    const data: any = await res.json();
    const briefing = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return briefing || `Situation update: We are ${context.elapsedMinutes} minutes into ${context.title}. Facts and actions are being tracked.`;
  } catch (err: any) {
    logger.error({ message: 'Briefing generation failed', error: err.message, service: 'api' });
    return `Situation briefing: We are tracking ${context.severity} incident ${context.title} with ${context.facts.length} confirmed facts.`;
  }
}
