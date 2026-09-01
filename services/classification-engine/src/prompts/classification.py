"""
VAIC Classification Engine — Claude Prompt Design
Implements the classification prompt from System Design §7.1
"""

from ..models import ContextWindowEntry

CLASSIFICATION_SYSTEM_PROMPT = """You are an incident intelligence extraction engine embedded in a live technical incident response call.
Your role is to classify each utterance from the ongoing incident response conversation and extract structured intelligence.

Classification Types:
- FACT: Information confirmed by evidence, tool output, logs, metrics, or explicit team consensus. Something verified.
- HYPOTHESIS: A proposed explanation or theory. Unconfirmed. Requires investigation. Often contains "might", "could", "maybe", "I think", "possibly".
- DECISION: An explicit decision made by the team about what action to take or what approach to follow.
- ACTION_ITEM: A specific task that someone has been asked to do or has committed to doing. Has a clear owner or implied owner.
- QUESTION: An open question asked by any participant that requires an answer.
- STATUS_UPDATE: A progress update on an ongoing activity — "I'm working on X", "we've deployed Y", "checking Z now".
- SOCIAL: Greetings, acknowledgments, chit-chat, filler words with no incident-relevant content.

Rules:
1. Be precise. A single utterance may only have ONE primary type.
2. Confidence: 1.0 = certain, 0.7 = likely, 0.5 = uncertain. Never below 0.3 for non-SOCIAL.
3. For ACTION_ITEM: always try to extract the owner from the utterance. If unclear, set action_item_owner to null.
4. For entities: extract only what is explicitly mentioned — do not infer.
5. summary: Restate the utterance as a concise, third-person incident log entry (max 120 chars).
6. requires_followup: true if this utterance indicates something needs tracking (unresolved question, unassigned action, uncertain hypothesis).

You MUST respond with ONLY valid JSON matching this exact schema. No prose, no markdown, no code fences:
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
  "requires_followup": true | false
}"""


def build_classification_prompt(
    utterance_text: str,
    speaker_name: str,
    speaker_role: str,
    context_window: list[ContextWindowEntry],
) -> str:
    """
    Build the user message for the classification prompt.
    Includes the rolling context window of recent utterances.
    """
    # Format context window
    context_lines = []
    for entry in context_window[-10:]:  # Last 10 entries for concise context
        role_label = f" ({entry.role})" if entry.role else ""
        classification_label = f" [{entry.classification_type}]" if entry.classification_type else ""
        context_lines.append(
            f"[{entry.ts[:19]}] {entry.speaker_name or 'Unknown'}{role_label}{classification_label}: {entry.text}"
        )

    context_str = "\n".join(context_lines) if context_lines else "(No prior context — this is the first utterance)"

    return f"""Recent conversation context:
{context_str}

Current utterance to classify:
Speaker: {speaker_name or "Unknown"} ({speaker_role or "Responder"})
Text: "{utterance_text}"

Classify this utterance:"""


# Mock response for development (when MOCK_LLM_MODE=true)
MOCK_CLASSIFICATION_RESPONSE = {
    "type": "STATUS_UPDATE",
    "confidence": 0.85,
    "summary": "Speaker provided a status update about system investigation.",
    "entities": {
        "systems": [],
        "people": [],
        "timestamps": [],
        "metrics": [],
        "error_codes": [],
        "urls": [],
        "tools": [],
    },
    "action_item_owner": None,
    "requires_followup": False,
}
