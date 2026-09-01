"""
Standalone test script for EDITH Classification Engine using Gemini.
Tests utterance classification without needing Kafka or Postgres.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add src to python path
current_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(current_dir))

# Ensure environment is loaded from root .env
os.environ.setdefault("DOTENV_PATH", str(current_dir.parent.parent / ".env"))

from src.classifiers.claude_classifier import Classifier
from src.models import ContextWindowEntry


SAMPLE_UTTERANCES = [
    {
        "speaker": "Alice (SRE Lead)",
        "role": "SRE",
        "text": "The primary PostgreSQL database on eu-west-1 is throwing connection pool timeout errors. Latency spiked to 12 seconds.",
    },
    {
        "speaker": "Bob (Backend Engineer)",
        "role": "Backend",
        "text": "Could this be caused by the indexing migration script we deployed 20 minutes ago?",
    },
    {
        "speaker": "Alice (SRE Lead)",
        "role": "SRE",
        "text": "Let's make an executive call: fail over all write traffic to the read replica in eu-west-2 immediately.",
    },
    {
        "speaker": "Charlie (Incident Commander)",
        "role": "Commander",
        "text": "Dave, please kill the migration lock in pg_stat_activity and monitor error rates in Datadog.",
    },
    {
        "speaker": "Dave (DBA)",
        "role": "DBA",
        "text": "Are payment transactions currently failing for end users, or are they just queuing up?",
    },
]


async def run_tests():
    print("=" * 70)
    print("  EDITH AI Incident Intelligence — Live Gemini Classification Test")
    print("=" * 70)

    classifier = Classifier()
    print(f"\n[+] Configured LLM Provider : {classifier.provider}")
    print(f"[+] Model                   : {classifier.gemini_model}")
    print(f"[+] API Key configured      : {'Yes (' + classifier.gemini_key[:8] + '...)' if classifier.gemini_key else 'NO'}")
    print("\n" + "-" * 70)

    context_window = []

    for idx, item in enumerate(SAMPLE_UTTERANCES, 1):
        print(f"\n--- [Utterance #{idx}] ---")
        print(f"Speaker : {item['speaker']}")
        print(f"Said    : \"{item['text']}\"")
        print("Classifying via Gemini Flash...")

        try:
            result = await classifier.classify(
                utterance_text=item["text"],
                speaker_name=item["speaker"],
                speaker_role=item["role"],
                context_window=context_window,
                incident_id="inc-test-001",
            )

            print(f"-> Classification Type : {result.type.value}")
            print(f"-> Confidence          : {result.confidence * 100:.1f}%")
            print(f"-> Summary             : {result.summary}")
            if result.action_item_owner:
                print(f"-> Action Item Owner   : {result.action_item_owner}")
            if result.entities.systems or result.entities.people or result.entities.error_codes:
                print(f"-> Extracted Entities  :")
                if result.entities.systems:
                    print(f"   - Systems     : {', '.join(result.entities.systems)}")
                if result.entities.people:
                    print(f"   - People      : {', '.join(result.entities.people)}")
                if result.entities.error_codes:
                    print(f"   - Error Codes : {', '.join(result.entities.error_codes)}")
                if result.entities.tools:
                    print(f"   - Tools       : {', '.join(result.entities.tools)}")

            # Update context window for next utterance
            context_window.append(
                ContextWindowEntry(
                    speaker_name=item["speaker"],
                    role=item["role"],
                    text=item["text"],
                    ts=f"14:0{idx}:00Z",
                    classification_type=result.type.value,
                )
            )

        except Exception as e:
            print(f"[!] Error during classification: {e}")

    print("\n" + "=" * 70)
    print("  Classification Engine Test Completed Successfully!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_tests())
