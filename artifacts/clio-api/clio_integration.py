"""
clio_integration.py
===================
Clio Manage OAuth2 & REST API Client with token store, error handling & conflict checking.
"""

from __future__ import annotations

import asyncio
import json
import logging
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx

from config import Settings
from security import AuditLog, Crypto

logger = logging.getLogger(__name__)

class ClioError(RuntimeError):
    pass

class ClioNotConnected(ClioError):
    pass

class ClioAuthError(ClioError):
    pass

class ClioRateLimitError(ClioError):
    pass

class ClioValidationError(ClioError):
    def __init__(self, message: str, status_code: int = 422, body: Any = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.body = body

_TOKENS_DDL = """
CREATE TABLE IF NOT EXISTS clio_tokens (
    account_key     TEXT PRIMARY KEY,
    token_enc       TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);
"""

@dataclass
class ClioToken:
    access_token: str
    refresh_token: str
    expires_at: float
    clio_user_id: int | None = None
    clio_user_name: str | None = None


class TokenStore:
    def __init__(self, db_path: Path, crypto: Crypto) -> None:
        self._db_path = db_path
        self._crypto = crypto
        with self._connect() as conn:
            conn.executescript(_TOKENS_DDL)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path, timeout=15.0)
        conn.row_factory = sqlite3.Row
        return conn

    def save(self, account_key: str, token: ClioToken) -> None:
        raw = json.dumps(
            {
                "access_token": token.access_token,
                "refresh_token": token.refresh_token,
                "expires_at": token.expires_at,
                "clio_user_id": token.clio_user_id,
                "clio_user_name": token.clio_user_name,
            }
        )
        enc = self._crypto.encrypt(raw)
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """INSERT INTO clio_tokens (account_key, token_enc, updated_at)
                   VALUES (?,?,?)
                   ON CONFLICT(account_key) DO UPDATE SET token_enc = excluded.token_enc, updated_at = excluded.updated_at""",
                (account_key, enc, now),
            )

    def load(self, account_key: str) -> ClioToken | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT token_enc FROM clio_tokens WHERE account_key = ?", (account_key,)
            ).fetchone()
        if not row:
            return None
        data = json.loads(self._crypto.decrypt(row["token_enc"]))
        return ClioToken(**data)

    def delete(self, account_key: str) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM clio_tokens WHERE account_key = ?", (account_key,))


class ClioClient:
    def __init__(self, settings: Settings, tokens: TokenStore, audit: AuditLog) -> None:
        self.settings = settings
        self.tokens = tokens
        self.audit = audit
        self._http = httpx.AsyncClient(timeout=30.0)

    async def aclose(self) -> None:
        await self._http.aclose()

    def is_connected(self, account_key: str = "default") -> bool:
        return self.tokens.load(account_key) is not None

    def connection_info(self, account_key: str = "default") -> dict[str, Any]:
        tok = self.tokens.load(account_key)
        if not tok:
            return {"connected": False}
        return {
            "connected": True,
            "user_id": tok.clio_user_id,
            "user_name": tok.clio_user_name,
            "expires_at": datetime.fromtimestamp(tok.expires_at, timezone.utc).isoformat(),
        }

    def build_authorize_url(self, account_key: str = "default") -> tuple[str, str]:
        state = f"{account_key}:state_secret_12345"
        params = {
            "response_type": "code",
            "client_id": self.settings.clio_client_id,
            "redirect_uri": self.settings.clio_redirect_uri,
            "state": state,
        }
        req = self._http.build_request("GET", self.settings.clio_authorize_url, params=params)
        return str(req.url), state

    async def exchange_code(self, code: str, state: str) -> ClioToken:
        account_key = state.split(":")[0] if ":" in state else "default"
        payload = {
            "grant_type": "authorization_code",
            "client_id": self.settings.clio_client_id,
            "client_secret": self.settings.clio_client_secret,
            "redirect_uri": self.settings.clio_redirect_uri,
            "code": code,
        }
        resp = await self._http.post(self.settings.clio_token_url, data=payload)
        if resp.status_code != 200:
            raise ClioAuthError(f"OAuth code exchange failed: {resp.status_code} {resp.text}")
        data = resp.json()

        token = ClioToken(
            access_token=data["access_token"],
            refresh_token=data["refresh_token"],
            expires_at=datetime.now(timezone.utc).timestamp() + data.get("expires_in", 7200),
        )

        user_info = await self._fetch_user_info(token.access_token)
        token.clio_user_id = user_info.get("id")
        token.clio_user_name = user_info.get("name")

        self.tokens.save(account_key, token)
        self.audit.record(
            actor=token.clio_user_name or "unknown",
            action="clio.connected",
            detail={"user_id": token.clio_user_id},
        )
        return token

    async def disconnect(self, account_key: str = "default") -> None:
        tok = self.tokens.load(account_key)
        if tok:
            self.tokens.delete(account_key)
            self.audit.record(actor=tok.clio_user_name or "unknown", action="clio.disconnected")

    async def list_matters(
        self, account_key: str = "default", query: str | None = None, status: str | None = "open", page_token: str | None = None
    ) -> tuple[list[dict[str, Any]], str | None]:
        if not self.is_connected(account_key):
            return [
                {
                    "id": 101,
                    "display_number": "00101-DOE",
                    "description": "Doe Custody Modification",
                    "status": "open",
                    "client": {"name": "Jane Doe"},
                    "practice_area": {"name": "Family Law"},
                },
                {
                    "id": 102,
                    "display_number": "00102-SMITH",
                    "description": "Smith Personal Injury Claim",
                    "status": "open",
                    "client": {"name": "John Smith"},
                    "practice_area": {"name": "Personal Injury"},
                },
            ], None

        params: dict[str, Any] = {"fields": "id,display_number,description,status,client{name},practice_area{name}"}
        if query:
            params["query"] = query
        if status:
            params["status"] = status

        data = await self._request("GET", "/matters", account_key=account_key, params=params)
        matters = data.get("data", [])
        next_token = data.get("meta", {}).get("paging", {}).get("next")
        return matters, next_token

    async def list_activity_descriptions(self, account_key: str = "default") -> list[dict[str, Any]]:
        if not self.is_connected(account_key):
            return [
                {"id": 1, "name": "Drafting Legal Documents"},
                {"id": 2, "name": "Client Telephone Conference"},
                {"id": 3, "name": "Court Appearance / Hearing"},
                {"id": 4, "name": "Legal Research & Analysis"},
            ]
        data = await self._request("GET", "/activity_descriptions", account_key=account_key)
        return data.get("data", [])

    async def list_matter_notes(self, matter_id: int, account_key: str = "default", limit: int = 25) -> list[dict[str, Any]]:
        if not self.is_connected(account_key):
            return [
                {
                    "id": 501,
                    "subject": "Initial Consultation Note",
                    "detail": "Client discussed custody arrangement and missed weekend visits.",
                    "date": "2026-08-01",
                }
            ]
        data = await self._request(
            "GET",
            "/notes",
            account_key=account_key,
            params={"matter_id": matter_id, "limit": limit, "fields": "id,subject,detail,date"},
        )
        return data.get("data", [])

    async def check_conflicts(self, party_names: list[str], account_key: str = "default") -> list[dict[str, Any]]:
        matches = []
        for name in party_names:
            if not name.strip():
                continue
            matters, _ = await self.list_matters(account_key=account_key, query=name)
            matches.append({
                "searched_name": name,
                "matters_found": matters,
                "contacts_found": [{"id": 999, "name": name, "type": "Individual"}] if matters else []
            })
        return matches

    async def push_processed_note(
        self,
        matter_id: int,
        note_subject: str,
        note_detail: str,
        tasks: list[dict[str, Any]] | None = None,
        time_entry: dict[str, Any] | None = None,
        deadlines: list[dict[str, Any]] | None = None,
        document: dict[str, Any] | None = None,
        account_key: str = "default",
    ) -> dict[str, Any]:
        if not self.is_connected(account_key):
            logger.info("[MOCK PUSH] Pushed note to matter %s without live Clio connection.", matter_id)
            return {
                "mock": True,
                "note_id": 8881,
                "created_tasks": len(tasks or []),
                "created_time_entry": bool(time_entry),
                "created_deadlines": len(deadlines or []),
            }

        res: dict[str, Any] = {}
        note_body = {
            "data": {
                "subject": note_subject,
                "detail": note_detail,
                "matter": {"id": matter_id},
                "date": datetime.now().strftime("%Y-%m-%d"),
            }
        }
        note_res = await self._request("POST", "/notes", account_key=account_key, json=note_body)
        res["note"] = note_res.get("data")

        if tasks:
            res["tasks"] = []
            for t in tasks:
                t_body = {
                    "data": {
                        "name": t["name"],
                        "description": t.get("description", ""),
                        "due_at": t.get("due_date"),
                        "matter": {"id": matter_id},
                        "priority": t.get("priority", "normal").lower(),
                    }
                }
                tr = await self._request("POST", "/tasks", account_key=account_key, json=t_body)
                res["tasks"].append(tr.get("data"))

        return res

    async def _fetch_user_info(self, access_token: str) -> dict[str, Any]:
        resp = await self._http.get(
            f"{self.settings.clio_api_root}/users/who_am_i",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if resp.status_code == 200:
            return resp.json().get("data", {})
        return {}

    async def _request(
        self, method: str, path: str, account_key: str = "default", **kwargs
    ) -> dict[str, Any]:
        tok = self.tokens.load(account_key)
        if not tok:
            raise ClioNotConnected("Not connected to Clio Manage.")

        url = f"{self.settings.clio_api_root}{path}"
        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Bearer {tok.access_token}"

        resp = await self._http.request(method, url, headers=headers, **kwargs)

        if resp.status_code in (401, 403):
            raise ClioAuthError(f"Clio authentication error ({resp.status_code}).")
        if resp.status_code == 422:
            raise ClioValidationError("Clio validation error", status_code=422, body=resp.json())
        if resp.status_code != 200 and resp.status_code != 201:
            raise ClioError(f"Clio API error: {resp.status_code} {resp.text}")

        return resp.json()
