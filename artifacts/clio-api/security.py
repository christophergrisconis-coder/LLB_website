"""
security.py
===========
Security & Privacy Module: AES-GCM encryption, PII Vault, Tamper-evident Audit Log.
"""

from __future__ import annotations

import base64
import hashlib
import json
import logging
import os
import re
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

logger = logging.getLogger(__name__)

_AUDIT_DDL = """
CREATE TABLE IF NOT EXISTS audit_log (
    seq         INTEGER PRIMARY KEY AUTOINCREMENT,
    occurred_at TEXT NOT NULL,
    actor       TEXT NOT NULL,
    action      TEXT NOT NULL,
    subject     TEXT,
    outcome     TEXT NOT NULL,
    detail_json TEXT,
    prev_hash   TEXT NOT NULL,
    entry_hash  TEXT NOT NULL
);
"""


class Crypto:
    def __init__(self, key_material: str) -> None:
        key = hashlib.sha256(key_material.encode("utf-8")).digest()
        self._aesgcm = AESGCM(key)

    def encrypt(self, plaintext: str) -> str:
        nonce = os.urandom(12)
        ct = self._aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
        return base64.b64encode(nonce + ct).decode("ascii")

    def decrypt(self, ciphertext: str) -> str:
        data = base64.b64decode(ciphertext.encode("ascii"))
        nonce, ct = data[:12], data[12:]
        pt = self._aesgcm.decrypt(nonce, ct, None)
        return pt.decode("utf-8")


@dataclass
class RedactionResult:
    redacted_text: str
    mapping: dict[str, str]
    redaction_count: int
    entity_counts: dict[str, int]


class PIIVault:
    PATTERNS = [
        (r"\b\d{3}-\d{2}-\d{4}\b", "SSN"),
        (r"\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b", "CARD"),
        (r"\b(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}\b", "PHONE"),
        (r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", "EMAIL"),
        (r"\b\d{2}[ -]?(?:CVD|CVS|CR|CRS|CBD)[ -]?\d{3,6}\b", "DOCKET_NC"),
    ]

    def __init__(self, use_ner: bool = True) -> None:
        self.ner_active = False

    def redact(self, text: str) -> RedactionResult:
        mapping: dict[str, str] = {}
        counts: dict[str, int] = {}
        counter = 0

        working = text
        for pattern, label in self.PATTERNS:
            for match in set(re.findall(pattern, working, flags=re.IGNORECASE)):
                counter += 1
                token = f"[[{label}_{counter}]]"
                mapping[token] = match
                counts[label] = counts.get(label, 0) + 1
                working = working.replace(match, token)

        return RedactionResult(working, mapping, counter, counts)

    @staticmethod
    def restore(redacted_text: str, mapping: dict[str, str]) -> str:
        working = redacted_text
        for token, original in mapping.items():
            working = working.replace(token, original)
        return working


class AuditLog:
    GENESIS = "GENESIS_NC_LEGAL_NOTES_V1"

    def __init__(self, db_path: Path, crypto: Crypto) -> None:
        self._db_path = db_path
        self._crypto = crypto
        db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as conn:
            conn.executescript(_AUDIT_DDL)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path, timeout=15.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        return conn

    def record(
        self,
        actor: str,
        action: str,
        subject: str | None = None,
        outcome: str = "success",
        detail: dict[str, Any] | None = None,
    ) -> int:
        now = datetime.now(timezone.utc).isoformat()
        detail_json = json.dumps(detail or {})
        with self._connect() as conn:
            last = conn.execute("SELECT entry_hash FROM audit_log ORDER BY seq DESC LIMIT 1").fetchone()
            prev_hash = last["entry_hash"] if last else self.GENESIS
            blob = f"{now}|{actor}|{action}|{subject or ''}|{outcome}|{detail_json}|{prev_hash}"
            entry_hash = hashlib.sha256(blob.encode("utf-8")).hexdigest()

            cur = conn.execute(
                """INSERT INTO audit_log
                   (occurred_at, actor, action, subject, outcome, detail_json, prev_hash, entry_hash)
                   VALUES (?,?,?,?,?,?,?,?)""",
                (now, actor, action, subject, outcome, detail_json, prev_hash, entry_hash),
            )
            return cur.lastrowid

    def verify(self) -> tuple[bool, int | None]:
        with self._connect() as conn:
            rows = conn.execute("SELECT * FROM audit_log ORDER BY seq ASC").fetchall()
        expected = self.GENESIS
        for r in rows:
            if r["prev_hash"] != expected:
                return False, r["seq"]
            blob = f"{r['occurred_at']}|{r['actor']}|{r['action']}|{r['subject'] or ''}|{r['outcome']}|{r['detail_json']}|{r['prev_hash']}"
            computed = hashlib.sha256(blob.encode("utf-8")).hexdigest()
            if computed != r["entry_hash"]:
                return False, r["seq"]
            expected = r["entry_hash"]
        return True, None

    def tail(
        self,
        limit: int = 50,
        actor: str | None = None,
        action: str | None = None,
        outcome: str | None = None,
    ) -> list[dict[str, Any]]:
        sql = "SELECT * FROM audit_log WHERE 1=1"
        params: list[Any] = []

        if actor:
            sql += " AND actor LIKE ?"
            params.append(f"%{actor}%")
        if action:
            sql += " AND action LIKE ?"
            params.append(f"%{action}%")
        if outcome:
            sql += " AND outcome = ?"
            params.append(outcome)

        sql += " ORDER BY seq DESC LIMIT ?"
        params.append(limit)

        with self._connect() as conn:
            rows = conn.execute(sql, params).fetchall()
        out = []
        for r in rows:
            d = dict(r)
            d["detail"] = json.loads(d.pop("detail_json") or "{}")
            out.append(d)
        return out
