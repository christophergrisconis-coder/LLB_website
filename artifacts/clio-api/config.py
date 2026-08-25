"""
config.py
=========
Single source of truth for runtime configuration. Includes Twilio & Google Drive settings.
"""

from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class ConfidentialityError(RuntimeError):
    """Raised when an action would violate the configured confidentiality policy."""


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # ---------------- Application ----------------
    app_env: Literal["development", "staging", "production"] = "development"
    app_host: str = "127.0.0.1"
    app_port: int = 8000
    session_secret: str = Field(min_length=16, default="supersecret_session_key_for_nc_notes_12345")

    # ---------------- Encryption at rest ----------------
    encryption_key: str = Field(min_length=32, default="supersecret_encryption_key_32bytes_long_nc_notes")
    db_path: Path = Path("./data/legal_notes.db")
    retention_days: int = 30

    # ---------------- Google Drive Local Archiving ----------------
    google_drive_folder_name: str = "anas work calls"
    custom_gdrive_path: str = ""

    # ---------------- Clio ----------------
    clio_base_url: str = "https://app.clio.com"
    clio_client_id: str = ""
    clio_client_secret: str = ""
    clio_redirect_uri: str = "http://127.0.0.1:8000/oauth/clio/callback"

    # ---------------- Twilio Telephony ----------------
    twilio_account_sid: str = "AC00000000000000000000000000000000"
    twilio_auth_token: str = "your_auth_token_here"
    twilio_phone_number: str = "+15551234567"
    public_base_url: str = "http://127.0.0.1:8000"
    recording_mode: str = "dial"
    recording_channels: str = "dual"
    announce_to_caller: bool = True
    announcement_text: str = "This call is being recorded for legal note-taking and case management."
    skip_signature_validation: bool = True
    forward_phone_number: str = "+15559876543"

    # ---------------- LLM ----------------
    llm_provider: Literal["anthropic", "openai", "ollama", "none"] = "anthropic"
    llm_model: str = "claude-sonnet-5"
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    ollama_base_url: str = "http://localhost:11434"

    # ---------------- Confidentiality controls ----------------
    pii_redaction_enabled: bool = True
    llm_zero_data_retention: bool = False
    enforce_confidentiality_gate: bool = True

    # ---------------- Transcription ----------------
    transcription_mode: Literal["local", "disabled"] = "local"
    whisper_model: str = "small.en"
    whisper_compute_type: str = "int8"

    # ---------------- Firm ----------------
    firm_name: str = "Example Law Firm, PLLC"
    firm_state: str = "NC"
    default_billing_increment_minutes: int = 6

    # ------------------------------------------------------------------
    @field_validator("clio_base_url")
    @classmethod
    def _strip_trailing_slash(cls, v: str) -> str:
        return v.rstrip("/")

    @field_validator("public_base_url")
    @classmethod
    def _strip_public_url_slash(cls, v: str) -> str:
        return v.rstrip("/")

    @property
    def clio_api_root(self) -> str:
        return f"{self.clio_base_url}/api/v4"

    @property
    def clio_authorize_url(self) -> str:
        return f"{self.clio_base_url}/oauth/authorize"

    @property
    def clio_token_url(self) -> str:
        return f"{self.clio_base_url}/oauth/token"

    @property
    def clio_deauthorize_url(self) -> str:
        return f"{self.clio_base_url}/oauth/deauthorize"

    @property
    def llm_is_hosted(self) -> bool:
        return self.llm_provider in {"anthropic", "openai"}

    def confidentiality_gate(self) -> None:
        if not self.llm_is_hosted:
            return
        if self.pii_redaction_enabled or self.llm_zero_data_retention:
            return
        if self.enforce_confidentiality_gate:
            raise ConfidentialityError(
                "Refusing to transmit unredacted client content to a hosted LLM. "
                "Enable PII_REDACTION_ENABLED, or set LLM_ZERO_DATA_RETENTION=true "
                "only if you hold a signed zero-data-retention agreement."
            )
        logger.warning("CONFIDENTIALITY GATE DISABLED: transmitting unredacted content")

    def compliance_banner(self) -> dict:
        return {
            "provider": self.llm_provider,
            "model": self.llm_model,
            "hosted": self.llm_is_hosted,
            "pii_redaction": self.pii_redaction_enabled,
            "zero_data_retention": self.llm_zero_data_retention,
            "posture": (
                "LOCAL_MODEL"
                if not self.llm_is_hosted
                else "REDACTED"
                if self.pii_redaction_enabled
                else "ZDR_CONTRACT"
                if self.llm_zero_data_retention
                else "UNPROTECTED"
            ),
        }


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    s = Settings()  # type: ignore[call-arg]
    s.db_path.parent.mkdir(parents=True, exist_ok=True)
    return s


ETHICS_DISCLAIMERS = {
    "primary": (
        "Lawyers are professionally responsible for the output of AI tools. "
        "This content is machine-generated and unverified."
    ),
    "supervision": (
        "Attorney supervision is required before acting on generated legal drafts. "
        "Do not send, file, or rely on this material until a supervising attorney "
        "has reviewed it."
    ),
    "no_legal_advice": (
        "This tool does not provide legal advice and does not exercise legal "
        "judgment. It reorganises text you supplied."
    ),
    "confidentiality": (
        "Client confidences are protected under N.C. Rule of Professional Conduct "
        "1.6. Verify the confidentiality posture shown in the header before "
        "entering privileged material."
    ),
    "citation_warning": (
        "Any citation, statute, or case reference appearing in generated text must "
        "be independently verified in a primary source before use."
    ),
    "billing": (
        "Billable time is an estimate derived from your notes. N.C. Rule 1.5 "
        "requires that fees be reasonable and accurately recorded -- confirm every "
        "entry before it is posted to a client ledger."
    ),
}

DOCUMENT_FOOTER = (
    "--- AI-ASSISTED WORK PRODUCT :: ATTORNEY REVIEW REQUIRED ---\n"
    f"{ETHICS_DISCLAIMERS['primary']} {ETHICS_DISCLAIMERS['supervision']}\n"
    "Generated by the firm's internal note-processing tool. Not legal advice."
)
