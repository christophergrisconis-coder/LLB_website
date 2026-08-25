"""
twilio_integration.py
=====================
Twilio Voice Integration & Google Drive Archiving Engine.
Automatically archives audio, text transcripts, and JSON notes into the local Google Drive folder 'anas work calls'.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import sqlite3
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import httpx

from config import Settings
from security import Crypto

logger = logging.getLogger(__name__)

_TWILIO_CALL_DDL = """
CREATE TABLE IF NOT EXISTS twilio_calls (
    id              TEXT PRIMARY KEY,
    call_sid        TEXT NOT NULL UNIQUE,
    from_number     TEXT NOT NULL,
    to_number       TEXT NOT NULL,
    direction       TEXT NOT NULL,
    duration        INTEGER DEFAULT 0,
    recording_url   TEXT,
    recording_sid   TEXT,
    status          TEXT NOT NULL,  -- ringing | in-progress | completed | transcribed
    draft_id        TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_call_sid ON twilio_calls(call_sid);
"""


@dataclass
class CallRecord:
    id: str
    call_sid: str
    from_number: str
    to_number: str
    direction: str
    duration: int
    recording_url: str | None
    recording_sid: str | None
    status: str
    draft_id: str | None
    created_at: str
    updated_at: str


class CallLogStore:
    def __init__(self, db_path: Path, crypto: Crypto) -> None:
        self._db_path = db_path
        self._crypto = crypto
        db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as conn:
            conn.executescript(_TWILIO_CALL_DDL)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path, timeout=15.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        return conn

    def record_call_start(self, call_sid: str, from_num: str, to_num: str, direction: str = "inbound") -> str:
        record_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """INSERT INTO twilio_calls
                   (id, call_sid, from_number, to_number, direction, status, created_at, updated_at)
                   VALUES (?,?,?,?,?,?,?,?)
                   ON CONFLICT(call_sid) DO UPDATE SET updated_at = excluded.updated_at""",
                (record_id, call_sid, from_num, to_num, direction, "in-progress", now, now),
            )
        return record_id

    def update_recording(self, call_sid: str, recording_url: str, recording_sid: str, duration: int = 0) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """UPDATE twilio_calls
                   SET recording_url = ?, recording_sid = ?, duration = ?, status = 'completed', updated_at = ?
                   WHERE call_sid = ?""",
                (recording_url, recording_sid, duration, now, call_sid),
            )

    def attach_draft(self, call_sid: str, draft_id: str) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                "UPDATE twilio_calls SET draft_id = ?, status = 'transcribed', updated_at = ? WHERE call_sid = ?",
                (draft_id, now, call_sid),
            )

    def list_recent(self, limit: int = 25) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM twilio_calls ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
        return [dict(r) for r in rows]


def resolve_google_drive_folder(settings: Settings) -> tuple[Path, str]:
    """Resolves local Google Drive folder path for 'anas work calls'."""
    folder_name = settings.google_drive_folder_name or "anas work calls"

    if settings.custom_gdrive_path:
        custom_p = Path(settings.custom_gdrive_path) / folder_name
        custom_p.mkdir(parents=True, exist_ok=True)
        return custom_p, "custom"

    home = Path.home()
    candidates = [
        home / "Library/CloudStorage",
        home / "Google Drive/My Drive",
        home / "GoogleDrive",
    ]

    for cand in candidates:
        if cand.exists():
            if "CloudStorage" in str(cand):
                for match in cand.glob("GoogleDrive-*"):
                    my_drive = match / "My Drive" / folder_name
                    my_drive.mkdir(parents=True, exist_ok=True)
                    return my_drive, "google_drive_desktop"
            else:
                target = cand / folder_name
                target.mkdir(parents=True, exist_ok=True)
                return target, "google_drive_desktop"

    # Fallback to local data folder if Google Drive Desktop is offline
    fallback = Path("./data") / folder_name.replace(" ", "_")
    fallback.mkdir(parents=True, exist_ok=True)
    return fallback, "local_fallback"


def archive_call_to_google_drive(
    settings: Settings,
    call_sid: str,
    audio_bytes: bytes | None,
    transcript_text: str,
    note_dict: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Saves call audio, transcript text, and JSON note into Google Drive folder 'anas work calls'."""
    folder_path, status_type = resolve_google_drive_folder(settings)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    stem = f"{timestamp}_{call_sid[:12]}"

    saved_files = []

    # 1. Save transcript
    txt_path = folder_path / f"{stem}_transcript.txt"
    txt_path.write_text(transcript_text, encoding="utf-8")
    saved_files.append(str(txt_path))

    # 2. Save audio if available
    if audio_bytes:
        audio_path = folder_path / f"{stem}_audio.wav"
        audio_path.write_bytes(audio_bytes)
        saved_files.append(str(audio_path))

    # 3. Save JSON note if available
    if note_dict:
        json_path = folder_path / f"{stem}_note.json"
        json_path.write_text(json.dumps(note_dict, indent=2), encoding="utf-8")
        saved_files.append(str(json_path))

    logger.info("Archived call %s into Google Drive folder: %s", call_sid, folder_path)
    return {
        "folder_path": str(folder_path),
        "status": status_type,
        "saved_files": saved_files,
    }


def validate_twilio_signature(
    auth_token: str,
    signature: str,
    url: str,
    params: dict[str, str],
) -> bool:
    data = url + "".join(f"{k}{params[k]}" for k in sorted(params.keys()))
    mac = hmac.new(auth_token.encode("utf-8"), data.encode("utf-8"), hashlib.sha1)
    computed = base64.b64encode(mac.digest()).decode("utf-8")
    return hmac.compare_digest(computed, signature)


def build_incoming_call_twiml(settings: Settings) -> str:
    callback_url = f"{settings.public_base_url}/api/twilio/voice/recording-callback"
    announcement = settings.announcement_text
    forward_to = settings.forward_phone_number or settings.twilio_phone_number

    twiml_parts = ['<?xml version="1.0" encoding="UTF-8"?>', '<Response>']

    if settings.announce_to_caller and announcement:
        twiml_parts.append(f'  <Say voice="Polly.Joanna">{announcement}</Say>')

    record_attr = "record-from-answer-dual" if settings.recording_channels == "dual" else "record-from-answer"
    twiml_parts.append(
        f'  <Dial record="{record_attr}" recordingStatusCallback="{callback_url}" recordingStatusCallbackMethod="POST">'
    )
    twiml_parts.append(f"    <Number>{forward_to}</Number>")
    twiml_parts.append("  </Dial>")
    twiml_parts.append("</Response>")

    return "\n".join(twiml_parts)


async def download_twilio_recording(
    recording_url: str,
    account_sid: str,
    auth_token: str,
) -> bytes:
    full_url = f"{recording_url}.wav" if not recording_url.endswith((".wav", ".mp3")) else recording_url
    async with httpx.AsyncClient(timeout=60.0) as client:
        auth = (account_sid, auth_token) if account_sid and auth_token != "your_auth_token_here" else None
        resp = await client.get(full_url, auth=auth, follow_redirects=True)
        resp.raise_for_status()
        return resp.content
