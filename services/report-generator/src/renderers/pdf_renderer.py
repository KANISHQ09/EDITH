"""
PDF ISR renderer using ReportLab.
"""

import io
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

SEVERITY_COLORS = {
    "P1": colors.HexColor("#dc2626"),
    "P2": colors.HexColor("#ea580c"),
    "P3": colors.HexColor("#ca8a04"),
    "P4": colors.HexColor("#16a34a"),
}

DARK_BG = colors.HexColor("#0f172a")
ACCENT = colors.HexColor("#6366f1")
TEXT_PRIMARY = colors.HexColor("#f1f5f9")
TEXT_SECONDARY = colors.HexColor("#94a3b8")


def render_pdf_isr(context: dict) -> bytes:
    incident = context["incident"]
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=f"ISR: {incident['title']}",
        author="VAIC — Voice AI Incident Commander",
    )

    styles = getSampleStyleSheet()
    severity_color = SEVERITY_COLORS.get(incident["severity"], colors.grey)

    # Custom styles
    title_style = ParagraphStyle("Title", parent=styles["Title"], fontSize=18, spaceAfter=6)
    h2_style = ParagraphStyle(
        "H2", parent=styles["Heading2"], fontSize=13, spaceBefore=14, spaceAfter=6, textColor=ACCENT
    )
    body_style = ParagraphStyle("Body", parent=styles["Normal"], fontSize=9, spaceAfter=4)
    meta_style = ParagraphStyle("Meta", parent=styles["Normal"], fontSize=8, textColor=colors.grey)

    elements = []

    # ── Title ──────────────────────────────────────────────────
    elements.append(Paragraph("INCIDENT SUMMARY REPORT", styles["Heading1"]))
    elements.append(Paragraph(incident["title"], title_style))
    elements.append(HRFlowable(width="100%", thickness=2, color=severity_color))
    elements.append(Spacer(1, 0.3 * cm))

    # ── Metadata Table ─────────────────────────────────────────
    mttr = context.get("mttr_minutes", 0)
    meta_data = [
        ["Severity", incident["severity"], "MTTR", f"{mttr} minutes"],
        ["Status", incident["status"], "Systems", ", ".join(incident.get("affectedSystems", []))],
        ["Start", _fmt_ts(incident["startTs"]), "Resolved", _fmt_ts(incident.get("resolvedTs", ""))],
    ]
    meta_table = Table(meta_data, colWidths=[3 * cm, 5 * cm, 3 * cm, 6 * cm])
    meta_table.setStyle(
        TableStyle(
            [
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.grey),
                ("TEXTCOLOR", (2, 0), (2, -1), colors.grey),
                ("FONTNAME", (1, 0), (1, 0), "Helvetica-Bold"),
                ("TEXTCOLOR", (1, 0), (1, 0), severity_color),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elements.append(meta_table)
    elements.append(Spacer(1, 0.4 * cm))

    # ── Executive Summary ──────────────────────────────────────
    elements.append(Paragraph("Executive Summary", h2_style))
    elements.append(Paragraph(context.get("executive_summary", ""), body_style))
    elements.append(Spacer(1, 0.3 * cm))

    # ── Facts ──────────────────────────────────────────────────
    facts = context.get("facts", [])
    if facts:
        elements.append(Paragraph("Confirmed Facts", h2_style))
        for i, f in enumerate(facts, 1):
            conf = int((f.get("confidence", 0) or 0) * 100)
            elements.append(
                Paragraph(f"{i}. {f['content']} <font color='grey' size='8'>({conf}% confidence)</font>", body_style)
            )

    # ── Decisions ──────────────────────────────────────────────
    decisions = context.get("decisions", [])
    if decisions:
        elements.append(Paragraph("Key Decisions", h2_style))
        for i, d in enumerate(decisions, 1):
            elements.append(Paragraph(f"{i}. {d['content']}", body_style))

    # ── Action Items Table ─────────────────────────────────────
    action_items = context.get("action_items", [])
    if action_items:
        elements.append(Paragraph("Action Items", h2_style))
        ai_data = [["#", "Description", "Owner", "Status"]] + [
            [
                str(i),
                a["content"][:60] + ("..." if len(a["content"]) > 60 else ""),
                a.get("ownerName") or "Unassigned",
                a["status"],
            ]
            for i, a in enumerate(action_items, 1)
        ]
        ai_table = Table(ai_data, colWidths=[0.8 * cm, 9 * cm, 4 * cm, 3 * cm])
        ai_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                    ("PADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        elements.append(ai_table)

    # ── Footer ─────────────────────────────────────────────────
    elements.append(Spacer(1, 1 * cm))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.grey))
    elements.append(
        Paragraph(
            f"Generated by VAIC — Voice AI Incident Commander · {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
            meta_style,
        )
    )

    doc.build(elements)
    return buffer.getvalue()


def _fmt_ts(ts: str) -> str:
    if not ts:
        return "—"
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d %H:%M UTC")
    except Exception:
        return ts
