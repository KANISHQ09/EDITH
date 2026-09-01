"""
Voice Synthesis Engine — TTS + Voice Command Detection
Implements VSE-01 through VSE-08 from the SRS.

Responsibilities:
- Generate spoken summaries at configurable intervals
- Detect voice commands from transcript stream
- Announce conflicts in real time
- Read out proposed tool actions for IC confirmation
- Speak end-of-incident summary
"""

import asyncio
import json
import os

import structlog
from aiokafka import AIOKafkaConsumer

logger = structlog.get_logger(__name__)

# Voice command keywords (VSE-04)
VOICE_COMMANDS = {
    "vaic, status": "STATUS",
    "vaic status": "STATUS",
    "vaic, open actions": "OPEN_ACTIONS",
    "vaic open actions": "OPEN_ACTIONS",
    "vaic, what do we know": "WHAT_WE_KNOW",
    "vaic what do we know": "WHAT_WE_KNOW",
    "vaic, conflicts": "CONFLICTS",
    "vaic conflicts": "CONFLICTS",
    "vaic, confirm": "CONFIRM",
    "vaic confirm": "CONFIRM",
    "vaic, reject": "REJECT",
    "vaic reject": "REJECT",
}

# All VAIC spoken output must be prefixed (VSE-02)
VAIC_SUMMARY_PREFIX = "VAIC summary: "
VAIC_NOTICE_PREFIX = "VAIC notice: "


class TTSProvider:
    """Strategy pattern for TTS provider selection (ElevenLabs primary, Polly fallback)."""

    def __init__(self):
        self.elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY")
        self.elevenlabs_voice_id = os.getenv("ELEVENLABS_VOICE_ID")
        self.use_elevenlabs = bool(self.elevenlabs_api_key) and os.getenv("ENABLE_TTS", "false") == "true"

    async def synthesize(self, text: str) -> bytes | None:
        """
        Synthesize text to audio bytes.
        Returns None if TTS is disabled or fails.
        """
        if not self.use_elevenlabs:
            # Log what would be spoken (useful for dev without TTS credentials)
            logger.info("TTS (mock): would speak", text=text)
            return None

        try:
            from elevenlabs.client import AsyncElevenLabs

            client = AsyncElevenLabs(api_key=self.elevenlabs_api_key)
            audio = await client.text_to_speech.convert(
                voice_id=self.elevenlabs_voice_id,
                text=text,
                model_id="eleven_multilingual_v2",
            )
            return audio
        except Exception as e:
            logger.warning("ElevenLabs TTS failed, falling back", error=str(e))
            return await self._polly_fallback(text)

    async def _polly_fallback(self, text: str) -> bytes | None:
        """AWS Polly fallback TTS."""
        try:
            import boto3

            polly = boto3.client("polly", region_name=os.getenv("AWS_REGION", "us-east-1"))
            response = polly.synthesize_speech(
                Text=text,
                OutputFormat="mp3",
                VoiceId=os.getenv("POLLY_VOICE_ID", "Joanna"),
            )
            return response["AudioStream"].read()
        except Exception as e:
            logger.error("Polly TTS also failed", error=str(e))
            return None


class VoiceSynthesisEngine:
    """
    Consumes state.deltas and transcript.entries from Kafka.
    Generates spoken output via TTS at intervals or on voice commands.
    """

    def __init__(self):
        self.tts = TTSProvider()
        self.summary_interval_min = int(os.getenv("SUMMARY_INTERVAL_MINUTES", "15"))
        self.kafka_brokers = os.getenv("KAFKA_BROKERS", "localhost:9092")
        self.incident_states: dict[str, dict] = {}  # In-memory state summaries per incident
        self.pending_confirmations: dict[str, dict] = {}  # Tool proposals awaiting voice confirm

    def detect_voice_command(self, transcript_text: str) -> str | None:
        """Check if a transcript entry contains a VAIC voice command."""
        normalized = transcript_text.lower().strip().rstrip("?!.")
        return VOICE_COMMANDS.get(normalized)

    def build_status_summary(self, state: dict, incident_id: str) -> str:
        """Build a concise spoken status summary from the current incident state."""
        parts = [f"{VAIC_SUMMARY_PREFIX}Current status for incident {incident_id}."]

        facts_count = len(state.get("facts", []))
        actions_count = len([a for a in state.get("actionItems", []) if a.get("status") == "PENDING"])
        conflicts_count = len([c for c in state.get("conflicts", []) if c.get("status") == "OPEN"])
        questions_count = len([q for q in state.get("questions", []) if q.get("status") == "PENDING"])

        parts.append(f"We have {facts_count} confirmed fact{'s' if facts_count != 1 else ''}.")

        if actions_count > 0:
            parts.append(f"{actions_count} action item{'s' if actions_count != 1 else ''} are pending.")

        if conflicts_count > 0:
            parts.append(
                f"Warning: {conflicts_count} unresolved conflict{'s' if conflicts_count != 1 else ''} detected."
            )

        if questions_count > 0:
            parts.append(f"{questions_count} open question{'s' if questions_count != 1 else ''} remain unanswered.")

        return " ".join(parts)

    def build_conflict_announcement(self, conflict_description: str) -> str:
        """Build a spoken conflict announcement."""
        return f"{VAIC_NOTICE_PREFIX}Conflict detected. {conflict_description}. Please review on the dashboard."

    def build_tool_action_announcement(self, tool: str, action_type: str, summary: str) -> str:
        """Build a spoken tool action confirmation request (VSE-06)."""
        return f"{VAIC_NOTICE_PREFIX}I'd like to perform a {tool} action: {summary}. Say 'VAIC, confirm' to approve or 'VAIC, reject' to cancel."

    async def handle_delta(self, delta: dict) -> None:
        """Process a state delta from ISM."""
        delta_type = delta.get("deltaType")
        incident_id = delta.get("incidentId")

        if delta_type == "CONFLICT_DETECTED":
            description = delta.get("payload", {}).get("description", "contradictory facts identified")
            announcement = self.build_conflict_announcement(description)
            logger.info("Announcing conflict", incident_id=incident_id, text=announcement)
            await self.tts.synthesize(announcement)

        elif delta_type == "TOOL_ACTION_PROPOSED":
            payload = delta.get("payload", {})
            proposal_id = payload.get("proposalId")
            summary = payload.get("humanReadableSummary", "perform an action")
            tool = payload.get("tool", "external tool")
            action_type = payload.get("actionType", "action")
            announcement = self.build_tool_action_announcement(tool, action_type, summary)
            self.pending_confirmations[proposal_id] = payload
            logger.info("Announcing tool proposal", incident_id=incident_id, text=announcement)
            await self.tts.synthesize(announcement)

        elif delta_type == "INCIDENT_RESOLVED":
            summary_text = f"{VAIC_SUMMARY_PREFIX}The incident has been resolved. Generating the Incident Summary Report now. Great work, team."
            logger.info("Announcing incident resolution", incident_id=incident_id)
            await self.tts.synthesize(summary_text)

    async def run(self) -> None:
        """Main run loop — starts Kafka consumer and interval-based summary scheduler."""
        consumer = AIOKafkaConsumer(
            bootstrap_servers=self.kafka_brokers,
            group_id=os.getenv("KAFKA_GROUP_ID_VSE", "vaic-vse-group"),
            auto_offset_reset="earliest",
            value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        )
        await consumer.start()
        consumer.subscribe(
            topics=["state.deltas", "transcript.entries"],
        )

        logger.info("Voice Synthesis Engine started", kafka_brokers=self.kafka_brokers)

        # Start summary interval scheduler
        asyncio.create_task(self._summary_scheduler())

        try:
            async for message in consumer:
                topic = message.topic
                payload = message.value

                if topic == "state.deltas":
                    await self.handle_delta(payload)
                elif topic == "transcript.entries":
                    # Check for voice commands
                    text = payload.get("content", "")
                    command = self.detect_voice_command(text)
                    if command:
                        incident_id = payload.get("incident_id")
                        await self._handle_voice_command(command, incident_id)
        finally:
            await consumer.stop()

    async def _handle_voice_command(self, command: str, incident_id: str | None) -> None:
        """Respond to a detected voice command."""
        logger.info("Voice command detected", command=command, incident_id=incident_id)

        if command == "STATUS":
            state = self.incident_states.get(incident_id or "", {})
            text = self.build_status_summary(state, incident_id or "unknown")
            await self.tts.synthesize(text)
        elif command == "OPEN_ACTIONS":
            state = self.incident_states.get(incident_id or "", {})
            actions = [a for a in state.get("actionItems", []) if a.get("status") == "PENDING"]
            if actions:
                items = "; ".join([a.get("content", "")[:80] for a in actions[:5]])
                text = f"{VAIC_SUMMARY_PREFIX}{len(actions)} open action items: {items}"
            else:
                text = f"{VAIC_SUMMARY_PREFIX}No open action items at this time."
            await self.tts.synthesize(text)
        elif command == "CONFLICTS":
            state = self.incident_states.get(incident_id or "", {})
            conflicts = [c for c in state.get("conflicts", []) if c.get("status") == "OPEN"]
            if conflicts:
                text = f"{VAIC_SUMMARY_PREFIX}{len(conflicts)} open conflict{'s' if len(conflicts) != 1 else ''} detected. Please review the dashboard."
            else:
                text = f"{VAIC_SUMMARY_PREFIX}No open conflicts detected."
            await self.tts.synthesize(text)

    async def _summary_scheduler(self) -> None:
        """Deliver proactive status summaries at the configured interval (VSE-03)."""
        interval_s = self.summary_interval_min * 60
        while True:
            await asyncio.sleep(interval_s)
            for incident_id, state in self.incident_states.items():
                if state.get("status") == "ACTIVE":
                    text = self.build_status_summary(state, incident_id)
                    logger.info("Delivering scheduled summary", incident_id=incident_id)
                    await self.tts.synthesize(text)


if __name__ == "__main__":
    engine = VoiceSynthesisEngine()
    asyncio.run(engine.run())
