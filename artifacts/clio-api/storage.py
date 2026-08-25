"""
storage.py
==========
SQLite Draft Persistence Store with AES-GCM Encrypted Payloads.
"""

from __future__ import annotations

import json
import logging
import sqlite3
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from security import Crypto

logger = logging.getLogger(__name__)

_DRAFTS_DDL = """
CREATE TABLE IF NOT EXISTS note_drafts (
    id              TEXT PRIMARY KEY,
    status          TEXT NOT NULL, -- capturing | processed | reviewed | pushed
    raw_enc         TEXT NOT NULL,
    processed_enc   TEXT,
    telemetry_json  TEXT,
    matter_id       INTEGER,
    matter_label    TEXT,
    clio_result_json TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    expires_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON note_drafts(status);
CREATE INDEX IF NOT EXISTS idx_drafts_expires ON note_drafts(expires_at);
"""


@dataclass
class DraftRecord:
    id: str
    status: str
    raw_text: str
    processed: dict[str, Any] | None
    telemetry: dict[str, Any] | None
    matter_id: int | None
    matter_label: str | None
    clio_result: dict[str, Any] | None
    created_at: str
    updated_at: str
    expires_at: str


class DraftStore:
    def __init__(self, db_path: Path, crypto: Crypto, retention_days: int = 30) -> None:
        self._db_path = db_path
        self._crypto = crypto
        self._retention_days = retention_days
        db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as conn:
            conn.executescript(_DRAFTS_DDL)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path, timeout=15.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        return conn

    def create(self, raw_text: str) -> str:
        draft_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        expires = now + timedelta(days=self._retention_days)
        raw_enc = self._crypto.encrypt(raw_text)

        with self._connect() as conn:
            conn.execute(
                """INSERT INTO note_drafts
                   (id, status, raw_enc, created_at, updated_at, expires_at)
                   VALUES (?,?,?,?,?,?)""",
                (
                    draft_id,
                    "capturing",
                    raw_enc,
                    now.isoformat(),
                    now.isoformat(),
                    expires.isoformat(),
                ),
            )
        return draft_id

    def attach_processing(
        self, draft_id: str, note_dict: dict[str, Any], telemetry: dict[str, Any]
    ) -> None:
        now = datetime.now(timezone.utc).isoformat()
        proc_enc = self._crypto.encrypt(json.dumps(note_dict))
        telem_json = json.dumps(telemetry)

        with self._connect() as conn:
            conn.execute(
                """UPDATE note_drafts
                   SET status = 'processed', processed_enc = ?, telemetry_json = ?, updated_at = ?
                   WHERE id = ?""",
                (proc_enc, telem_json, now, draft_id),
            )

    def update_processed(self, draft_id: str, note_dict: dict[str, Any]) -> None:
        now = datetime.now(timezone.utc).isoformat()
        proc_enc = self._crypto.encrypt(json.dumps(note_dict))
        with self._connect() as conn:
            conn.execute(
                """UPDATE note_drafts
                   SET status = 'reviewed', processed_enc = ?, updated_at = ?
                   WHERE id = ?""",
                (proc_enc, now, draft_id),
            )

    def mark_pushed(
        self, draft_id: str, matter_id: int, matter_label: str, clio_result: dict[str, Any]
    ) -> None:
        now = datetime.now(timezone.utc).isoformat()
        result_json = json.dumps(clio_result)
        with self._connect() as conn:
            conn.execute(
                """UPDATE note_drafts
                   SET status = 'pushed', matter_id = ?, matter_label = ?, clio_result_json = ?, updated_at = ?
                   WHERE id = ?""",
                (matter_id, matter_label, result_json, now, draft_id),
            )

    def get(self, draft_id: str) -> DraftRecord | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM note_drafts WHERE id = ?", (draft_id,)).fetchone()
        if not row:
            return None
        return self._to_record(row)

    def list_recent(self, limit: int = 25) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM note_drafts ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
        return [self._to_summary(r) for r in rows]

    def purge_expired(self) -> int:
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            cur = conn.execute("DELETE FROM note_drafts WHERE expires_at < ?", (now,))
            return cur.rowcount

    def delete(self, draft_id: str) -> bool:
        with self._connect() as conn:
            cur = conn.execute("DELETE FROM note_drafts WHERE id = ?", (draft_id,))
            return cur.rowcount > 0

    def _to_record(self, row: sqlite3.Row) -> DraftRecord:
        raw_text = self._crypto.decrypt(row["raw_enc"])
        proc_dict = None
        if row["processed_enc"]:
            proc_dict = json.loads(self._crypto.decrypt(row["processed_enc"]))
        telem_dict = json.loads(row["telemetry_json"]) if row["telemetry_json"] else None
        clio_dict = json.loads(row["clio_result_json"]) if row["clio_result_json"] else None

        return DraftRecord(
            id=row["id"],
            status=row["status"],
            raw_text=raw_text,
            processed=proc_dict,
            telemetry=telem_dict,
            matter_id=row["matter_id"],
            matter_label=row["matter_label"],
            clio_result=clio_dict,
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            expires_at=row["expires_at"],
        )

    def _to_summary(self, row: sqlite3.Row) -> dict[str, Any]:
        return {
            "id": row["id"],
            "status": row["status"],
            "matter_id": row["matter_id"],
            "matter_label": row["matter_label"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }
