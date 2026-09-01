"""
Post-Incident Report Generator (ISR)

Triggered by: INCIDENT_RESOLVED Kafka event

Flow:
  1. Fetch all incident data from PostgreSQL (via REST API)
  2. Call Gemini (or Claude) to generate executive summary + MTTR analysis
  3. Render Markdown ISR (with full timeline, facts, decisions, action items)
  4. Generate PDF using ReportLab
  5. Upload to S3 (or save locally in dev)
  6. Post ISR draft to Slack #incident-reports (if configured)
  7. Update incident.settings.isr_url in PostgreSQL (via REST API)
"""

import json
from datetime import datetime, timezone
from typing import Any

import httpx
import structlog
from aiokafka import AIOKafkaConsumer

from .config import settings
from .renderers.markdown_renderer import render_markdown_isr
from .renderers.pdf_renderer import render_pdf_isr

logger = structlog.get_logger(__name__)


class ISRGenerator:
    """
    Generates a complete Incident Summary Report after an incident resolves.
    """

    def __init__(self) -> None:
        self.gemini_key: str | None = settings.gemini_api_key

        self.claude: Any = None
        if settings.anthropic_api_key:
            try:
                import anthropic  # type: ignore

                self.claude = anthropic.Anthropic(api_key=settings.anthropic_api_key)
            except Exception:
                pass

        self.s3: Any = None
        if settings.aws_access_key_id and settings.aws_secret_access_key:
            try:
                import boto3  # type: ignore

                self.s3 = boto3.client(
                    "s3",
                    aws_access_key_id=settings.aws_access_key_id,
                    aws_secret_access_key=settings.aws_secret_access_key,
                    region_name=settings.aws_region,
                )
            except Exception:
                pass

        self.slack: Any = None
        if settings.enable_slack and settings.slack_bot_token:
            try:
                from slack_sdk import WebClient  # type: ignore

                self.slack = WebClient(token=settings.slack_bot_token)
            except Exception:
                pass

    async def generate(self, incident_data: dict[str, Any]) -> dict[str, Any]:
        """
        Full ISR generation pipeline.
        """
        incident = incident_data["incident"]
        incident_id = str(incident["id"])

        logger.info("Generating ISR", incident_id=incident_id, title=incident.get("title", ""))

        # Calculate MTTR
        start_ts = datetime.fromisoformat(str(incident["startTs"]).replace("Z", "+00:00"))
        resolved_raw = incident.get("resolvedTs") or datetime.now(timezone.utc).isoformat()
        resolved_ts = datetime.fromisoformat(str(resolved_raw).replace("Z", "+00:00"))
        mttr_minutes = int((resolved_ts - start_ts).total_seconds() / 60)

        # ── 1. Generate executive summary ─────────────────────
        executive_summary = await self._generate_executive_summary(incident_data, mttr_minutes)

        # ── 2. Render Markdown and PDF ────────────────────────
        isr_context = {
            **incident_data,
            "executive_summary": executive_summary,
            "mttr_minutes": mttr_minutes,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
        markdown_content = render_markdown_isr(isr_context)
        pdf_bytes = render_pdf_isr(isr_context)

        # ── 3. Upload to S3 (or save locally in dev) ──────────
        date_prefix = resolved_ts.strftime("%Y/%m/%d")
        base_key = f"isr/{date_prefix}/{incident_id}"
        md_key = f"{base_key}/isr.md"
        pdf_key = f"{base_key}/isr.pdf"

        if self.s3 is not None:
            self.s3.put_object(
                Bucket=settings.s3_reports_bucket,
                Key=md_key,
                Body=markdown_content.encode(),
                ContentType="text/markdown",
                Metadata={"incident-id": incident_id, "severity": str(incident.get("severity", ""))},
            )
            self.s3.put_object(
                Bucket=settings.s3_reports_bucket,
                Key=pdf_key,
                Body=pdf_bytes,
                ContentType="application/pdf",
            )
            md_url = f"s3://{settings.s3_reports_bucket}/{md_key}"
            pdf_url = f"s3://{settings.s3_reports_bucket}/{pdf_key}"
        else:
            import os

            report_dir = f"./reports/{incident_id}"
            os.makedirs(report_dir, exist_ok=True)
            with open(f"{report_dir}/isr.md", "w", encoding="utf-8") as f:
                f.write(markdown_content)
            with open(f"{report_dir}/isr.pdf", "wb") as f:
                f.write(pdf_bytes)
            md_url = f"{report_dir}/isr.md"
            pdf_url = f"{report_dir}/isr.pdf"

        logger.info("ISR saved", incident_id=incident_id, md_url=md_url, pdf_url=pdf_url)

        # ── 4. Post to Slack ──────────────────────────────────
        if self.slack is not None:
            await self._post_to_slack(incident, executive_summary, mttr_minutes, pdf_url)

        return {
            "isrMarkdownUrl": md_url,
            "isrPdfUrl": pdf_url,
            "mttrMinutes": mttr_minutes,
            "executiveSummary": executive_summary,
        }

    async def _generate_executive_summary(self, incident_data: dict[str, Any], mttr_minutes: int) -> str:
        """Synthesize a concise executive summary using Gemini or Claude."""
        incident = incident_data["incident"]
        facts = incident_data.get("facts", [])
        decisions = incident_data.get("decisions", [])
        action_items = incident_data.get("action_items", [])

        system_prompt = """You are a post-incident report writer for a technology company.
Write a clear, concise executive summary of a resolved technical incident.
The summary should be suitable for senior leadership who need to understand:
- What happened and why
- Business impact
- How it was resolved
- What will be done to prevent recurrence

Write in plain English. Be specific with facts. Avoid jargon.
Maximum 300 words."""

        user_content = f"""Incident: {incident.get("title", "")}
Severity: {incident.get("severity", "")}
Duration: {mttr_minutes} minutes
Affected Systems: {", ".join(incident.get("affectedSystems", []))}

Confirmed Facts:
{chr(10).join(f'- {f.get("content", "")}' for f in facts[:10])}

Key Decisions Made:
{chr(10).join(f'- {d.get("content", "")}' for d in decisions[:5])}

Action Items:
{chr(10).join(f'- {a.get("content", "")} (Owner: {a.get("ownerName", "Unassigned")})' for a in action_items[:10])}

Write the executive summary now:"""

        if self.gemini_key:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent?key={self.gemini_key}"
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    url,
                    json={
                        "system_instruction": {"parts": [{"text": system_prompt}]},
                        "contents": [{"role": "user", "parts": [{"text": user_content}]}],
                        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 600},
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return str(data["candidates"][0]["content"]["parts"][0]["text"]).strip()

        if self.claude is not None:
            response = self.claude.messages.create(
                model=settings.anthropic_model,
                max_tokens=500,
                messages=[{"role": "user", "content": user_content}],
                system=system_prompt,
            )
            first_block = response.content[0]
            return str(getattr(first_block, "text", str(first_block))).strip()

        return f"Executive Summary: Incident {incident.get('title', '')} resolved with MTTR of {mttr_minutes} minutes."

    async def _post_to_slack(self, incident: dict[str, Any], summary: str, mttr_minutes: int, pdf_url: str) -> None:
        severity_emoji = {"P1": "🔴", "P2": "🟠", "P3": "🟡", "P4": "🟢"}.get(str(incident.get("severity")), "⚪")

        try:
            self.slack.chat_postMessage(
                channel=settings.slack_isr_channel,
                text=f"{severity_emoji} Incident Summary Report: {incident.get('title', '')}",
                blocks=[
                    {
                        "type": "header",
                        "text": {"type": "plain_text", "text": f"{severity_emoji} ISR: {incident.get('title', '')}"},
                    },
                    {
                        "type": "section",
                        "fields": [
                            {"type": "mrkdwn", "text": f"*Severity:*\n{incident.get('severity', '')}"},
                            {"type": "mrkdwn", "text": f"*MTTR:*\n{mttr_minutes} minutes"},
                            {"type": "mrkdwn", "text": f"*Status:*\n{incident.get('status', '')}"},
                            {"type": "mrkdwn", "text": f"*Systems:*\n{', '.join(incident.get('affectedSystems', []))}"},
                        ],
                    },
                    {
                        "type": "section",
                        "text": {"type": "mrkdwn", "text": f"*Executive Summary*\n{summary}"},
                    },
                    {
                        "type": "section",
                        "text": {"type": "mrkdwn", "text": f"📄 <{pdf_url}|Download Full ISR PDF>"},
                    },
                ],
            )
            logger.info("ISR posted to Slack", channel=settings.slack_isr_channel)
        except Exception as e:
            logger.error("Failed to post ISR to Slack", error=str(e))


# ─── Kafka Consumer ────────────────────────────────────────────
 

async def run_report_consumer() -> None:
    """
    Listens for INCIDENT_RESOLVED events on state.deltas.
    Kicks off ISR generation when an incident resolves.
    """
    consumer = AIOKafkaConsumer(
        "state.deltas",
        bootstrap_servers=settings.kafka_brokers,
        group_id=settings.kafka_group_id,
        client_id="vaic-report-generator",
        value_deserializer=lambda b: json.loads(b.decode()),
        auto_offset_reset="latest",
    )

    generator = ISRGenerator()
    await consumer.start()
    logger.info("Report Generator consumer started, listening for INCIDENT_RESOLVED")

    async with httpx.AsyncClient(timeout=30.0) as http_session:
        try:
            async for msg in consumer:
                event = msg.value
                if event.get("deltaType") != "INCIDENT_RESOLVED":
                    continue

                incident_id = event.get("incidentId")
                logger.info("Incident resolved — generating ISR", incident_id=incident_id)

                try:
                    # Fetch all incident data from the REST API
                    resp = await http_session.get(
                        f"{settings.api_base_url}/api/v1/incidents/{incident_id}",
                        headers={"Authorization": f"Bearer {settings.internal_api_token}"},
                    )
                    incident_data = resp.json()

                    result = await generator.generate(incident_data)

                    # Update the incident with ISR URLs via REST API
                    await http_session.patch(
                        f"{settings.api_base_url}/api/v1/incidents/{incident_id}",
                        json={"settings": {"isrUrl": result["isrPdfUrl"], "mttrMinutes": result["mttrMinutes"]}},
                        headers={"Authorization": f"Bearer {settings.internal_api_token}"},
                    )

                    logger.info("ISR generation complete", incident_id=incident_id, mttr=result["mttrMinutes"])

                except Exception as exc:
                    logger.error("ISR generation failed", incident_id=incident_id, error=str(exc), exc_info=True)

        finally:
            await consumer.stop()
