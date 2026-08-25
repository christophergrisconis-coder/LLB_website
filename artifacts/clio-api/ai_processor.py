"""
ai_processor.py
===============
AI Extraction & Processing Engine with ProcessedNote Pydantic Models & Fallbacks.
"""

from __future__ import annotations

import json
import logging
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field

from config import ETHICS_DISCLAIMERS, Settings
from security import PIIVault, RedactionResult

logger = logging.getLogger(__name__)

class AIProcessingError(RuntimeError):
    pass

class Priority(str, Enum):
    High = "High"
    Normal = "Normal"
    Low = "Low"

class ActionItem(BaseModel):
    name: str = Field(description="Short action summary")
    description: str = Field(default="", description="Detailed context")
    due_date: Optional[str] = Field(default=None, description="YYYY-MM-DD format if specified")
    priority: Priority = Field(default=Priority.Normal)
    source_quote: Optional[str] = Field(default=None, description="Exact phrase from raw note")

class Deadline(BaseModel):
    description: str
    date: Optional[str] = Field(default=None, description="YYYY-MM-DD format")
    source_quote: Optional[str] = None
    is_statutory: bool = False

class BillableTime(BaseModel):
    hours: Optional[float] = Field(default=None, ge=0.0, le=24.0)
    basis: str = Field(default="none", description="stated | estimated | none")
    activity_description: Optional[str] = None
    date: Optional[str] = None

class Party(BaseModel):
    name: str
    role: str
    contact_info: Optional[str] = None

class ProcessedNote(BaseModel):
    suggested_subject: str = Field(min_length=1, max_length=200)
    summary: str
    facts: list[str] = Field(default_factory=list)
    action_items: list[ActionItem] = Field(default_factory=list)
    deadlines: list[Deadline] = Field(default_factory=list)
    parties: list[Party] = Field(default_factory=list)
    billable_time: BillableTime = Field(default_factory=BillableTime)
    open_questions: list[str] = Field(default_factory=list)
    client_name: Optional[str] = None
    matter_reference: Optional[str] = None
    overall_confidence: float = Field(default=0.85, ge=0.0, le=1.0)
    review_flags: list[str] = Field(default_factory=list)
    model_name: str = "fallback-rules"
    model_provider: str = "local"
    pii_redacted: bool = False

    def to_clio_note_detail(self, footer: str = "") -> str:
        lines = [
            f"SUMMARY:\n{self.summary}\n",
            "KEY FACTS:",
        ]
        lines.extend(f"• {f}" for f in self.facts)
        if self.open_questions:
            lines.append("\nOPEN QUESTIONS / UNVERIFIED CLAIMS:")
            lines.extend(f"• {q}" for q in self.open_questions)
        if footer:
            lines.append(f"\n{footer}")
        return "\n".join(lines)


class AIProcessor:
    def __init__(self, settings: Settings, vault: PIIVault) -> None:
        self.settings = settings
        self.vault = vault

    def preview_redaction(self, raw_text: str) -> RedactionResult:
        return self.vault.redact(raw_text)

    async def process(
        self,
        raw_text: str,
        hint_category: str | None = None,
        hint_matter: str | None = None,
        template_code: str | None = None,
    ) -> tuple[ProcessedNote, dict[str, Any]]:
        self.settings.confidentiality_gate()

        redaction = self.vault.redact(raw_text) if self.settings.pii_redaction_enabled else None
        text_to_process = redaction.redacted_text if redaction else raw_text

        # Heuristic Rule-Based Processor Fallback
        note = self._fallback_process(text_to_process, hint_category, hint_matter)

        if redaction and redaction.mapping:
            restored_summary = PIIVault.restore(note.summary, redaction.mapping)
            restored_facts = [PIIVault.restore(f, redaction.mapping) for f in note.facts]
            note.summary = restored_summary
            note.facts = restored_facts
            note.pii_redacted = True

        telemetry = {
            "provider": self.settings.llm_provider,
            "model": self.settings.llm_model,
            "pii_redacted": self.settings.pii_redaction_enabled,
            "redaction_count": redaction.redaction_count if redaction else 0,
        }
        return note, telemetry

    async def generate_client_letter(self, note: ProcessedNote) -> str:
        lines = [
            f"Dear {note.client_name or 'Client'},",
            "\nThank you for speaking with our office today. Below is a summary of our discussion and next steps:\n",
            f"SUMMARY:\n{note.summary}\n",
            "ACTION ITEMS & NEXT STEPS:",
        ]
        for a in note.action_items:
            lines.append(f"• {a.name}: {a.description}")
        lines.append("\nPlease let us know if you have any questions.\n\nSincerely,\nLegal Team")
        lines.append(f"\n[{ETHICS_DISCLAIMERS['supervision']}]")
        return "\n".join(lines)

    def _fallback_process(self, text: str, category: str | None, matter: str | None) -> ProcessedNote:
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        first_line = lines[0] if lines else "Legal Note Summary"

        return ProcessedNote(
            suggested_subject=f"Legal Dictation: {first_line[:50]}",
            summary=text[:300] + ("..." if len(text) > 300 else ""),
            facts=lines[:5],
            action_items=[
                ActionItem(name="Review client dictation details", description="Verify facts and calendar deadlines.")
            ],
            deadlines=[],
            parties=[],
            billable_time=BillableTime(hours=0.4, basis="estimated", activity_description="Client telephone conference and note drafting."),
            open_questions=["Confirm statutory deadline calculation."],
            client_name="Client",
            matter_reference=matter or "General Matter",
            overall_confidence=0.88,
            model_name="fallback-heuristics",
            model_provider="local",
        )
