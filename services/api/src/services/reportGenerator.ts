import { logger } from '../lib/logger';

export interface IncidentReportContext {
  incident: any;
  facts: any[];
  hypotheses: any[];
  decisions: any[];
  actionItems: any[];
  questions: any[];
  conflicts: any[];
  participants: any[];
  transcripts: any[];
}

export async function generateIncidentSummaryReport(context: IncidentReportContext): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const { incident, facts, hypotheses, decisions, actionItems, questions, conflicts, participants } = context;

  const prompt = `You are EDITH, an elite Voice AI Incident Commander.
Generate a comprehensive, executive-ready Post-Mortem Incident Summary Report (ISR) in GitHub Flavored Markdown for the following resolved technical incident.

Incident Data:
- Title: ${incident.title}
- Severity: ${incident.severity}
- Affected Systems: ${(incident.affected_systems || incident.affectedSystems || []).join(', ')}
- Started: ${incident.start_ts || incident.startTs}
- Resolved: ${incident.resolved_ts || new Date().toISOString()}

Confirmed Facts:
${facts.map((f, i) => `${i + 1}. ${f.content}`).join('\n') || 'None recorded'}

Hypotheses Tested:
${hypotheses.map((h, i) => `${i + 1}. ${h.content} (Status: ${h.status})`).join('\n') || 'None recorded'}

Key Decisions:
${decisions.map((d, i) => `${i + 1}. ${d.content}`).join('\n') || 'None recorded'}

Action Items:
${actionItems.map((a, i) => `${i + 1}. ${a.content} (Owner: ${a.owner_name || 'Unassigned'}, Status: ${a.status})`).join('\n') || 'None recorded'}

Conflicts Detected & Resolved:
${conflicts.map((c, i) => `${i + 1}. ${c.description} (Status: ${c.status})`).join('\n') || 'None'}

Participants:
${participants.map((p) => `- ${p.speaker_label || p.speakerLabel || p.id} (${p.role})`).join('\n') || 'Team'}

Report Requirements:
Format your response in beautiful, structured Markdown including:
# Incident Summary Report: [Title]
## 1. Executive Summary & Business Impact
## 2. Incident Timeline
## 3. Root Cause Analysis (5 Whys)
## 4. Key Engineering Decisions & Disproved Hypotheses
## 5. Corrective & Preventive Action Items (Table with Task, Owner, Priority)
## 6. Lessons Learned & Resiliency Improvements

Be thorough, professional, and authoritative. Return ONLY the Markdown document.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      }),
    });

    const data: any = await res.json();
    const report = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return report || `# Incident Summary Report: ${incident.title}\n\nIncident resolved successfully.`;
  } catch (err: any) {
    logger.error({ message: 'ISR generation failed', error: err.message, service: 'api' });
    return `# Incident Summary Report: ${incident.title}\n\n*Auto-generated report*\n\n## Status\nResolved on ${new Date().toISOString()}`;
  }
}
