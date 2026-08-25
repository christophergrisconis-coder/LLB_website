"""
app.py
======
FastAPI server: routing, OAuth callback, review-then-push workflow, Twilio Voice Call Bridge,
Google Drive Call Archiving, and Federal Case Law Research Database (2000-2026).
"""

from __future__ import annotations

import asyncio
import io
import logging
import sys
import zipfile
from contextlib import asynccontextmanager
from datetime import date, datetime
from pathlib import Path
from typing import Any, Literal

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response
from pydantic import BaseModel, Field
from starlette.middleware.sessions import SessionMiddleware

from ai_processor import AIProcessingError, AIProcessor, ProcessedNote
from case_law_db import CaseLawStore
from clio_integration import (
    ClioAuthError,
    ClioClient,
    ClioError,
    ClioNotConnected,
    ClioRateLimitError,
    ClioValidationError,
    TokenStore,
)
from config import ETHICS_DISCLAIMERS, ConfidentialityError, Settings, get_settings
from document_builder import build_document
from nc_deadlines import NC_RULES, calculate_deadline
from security import AuditLog, Crypto, PIIVault
from storage import DraftStore
from templates import list_templates, get_template
from transcription import LocalTranscriber, TranscriptionError
from twilio_integration import (
    CallLogStore,
    archive_call_to_google_drive,
    build_incoming_call_twiml,
    download_twilio_recording,
    resolve_google_drive_folder,
    validate_twilio_signature,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s :: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("nc_legal_notes")

BASE_DIR = Path(__file__).parent
ACCOUNT_KEY = "default"


class Services:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.crypto = Crypto(settings.encryption_key)
        self.audit = AuditLog(settings.db_path, self.crypto)
        self.tokens = TokenStore(settings.db_path, self.crypto)
        self.drafts = DraftStore(settings.db_path, self.crypto, settings.retention_days)
        self.call_logs = CallLogStore(settings.db_path, self.crypto)
        self.case_law = CaseLawStore(settings.db_path)
        self.clio = ClioClient(settings, self.tokens, self.audit)
        self.vault = PIIVault(use_ner=True)
        self.transcriber = (
            LocalTranscriber(settings.whisper_model, settings.whisper_compute_type)
            if settings.transcription_mode == "local"
            else None
        )
        try:
            self.ai = AIProcessor(settings, vault=self.vault)
        except Exception as exc:
            logger.error("AI processor unavailable: %s", exc)
            self.ai = None  # type: ignore[assignment]


services: Services | None = None


def get_services() -> Services:
    if services is None:
        raise HTTPException(503, "Application starting.")
    return services


@asynccontextmanager
async def lifespan(app: FastAPI):
    global services
    settings = get_settings()
    services = Services(settings)

    ok, bad_seq = services.audit.verify()
    if not ok:
        logger.critical("AUDIT CHAIN BROKEN at seq=%s.", bad_seq)
    services.audit.record(
        actor="system",
        action="app.start",
        detail={"posture": settings.compliance_banner(), "env": settings.app_env},
    )

    retention = asyncio.create_task(_retention_loop(services))
    try:
        yield
    finally:
        retention.cancel()
        await services.clio.aclose()
        services.audit.record(actor="system", action="app.stop")


async def _retention_loop(svc: Services) -> None:
    while True:
        try:
            await asyncio.sleep(6 * 3600)
            deleted = await asyncio.to_thread(svc.drafts.purge_expired)
            if deleted:
                svc.audit.record(
                    actor="system", action="retention.purge", detail={"deleted": deleted}
                )
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.error("Retention job failed: %s", exc)


app = FastAPI(
    title="NC Legal Notes -> Clio",
    description="AI-assisted legal note capture with attorney-review gating, Twilio Voice Bridge, & Case Law Database (2000-2026).",
    version="1.4.0",
    lifespan=lifespan,
    docs_url="/api/docs",
)
app.add_middleware(
    SessionMiddleware,
    secret_key=get_settings().session_secret,
    https_only=get_settings().app_env == "production",
    same_site="lax",
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "microphone=(self), camera=(), geolocation=()"
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
    response.headers["Pragma"] = "no-cache"
    if get_settings().app_env == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.exception_handler(ConfidentialityError)
async def _confidentiality_handler(request: Request, exc: ConfidentialityError):
    return JSONResponse(status_code=451, content={"error": "confidentiality_policy", "message": str(exc)})


@app.exception_handler(ClioNotConnected)
async def _not_connected_handler(request: Request, exc: ClioNotConnected):
    return JSONResponse(status_code=401, content={"error": "not_connected", "message": str(exc)})


@app.exception_handler(ClioValidationError)
async def _clio_422_handler(request: Request, exc: ClioValidationError):
    return JSONResponse(status_code=422, content={"error": "clio_validation", "message": str(exc), "detail": exc.body})


@app.exception_handler(ClioError)
async def _clio_handler(request: Request, exc: ClioError):
    return JSONResponse(status_code=502, content={"error": "clio_error", "message": str(exc)})


@app.exception_handler(AIProcessingError)
async def _ai_handler(request: Request, exc: AIProcessingError):
    return JSONResponse(status_code=422, content={"error": "ai_processing", "message": str(exc)})


class ProcessRequest(BaseModel):
    raw_text: str = Field(min_length=1, max_length=200_000)
    hint_category: str | None = None
    hint_matter: str | None = None
    template_code: str | None = None
    draft_id: str | None = None


class BatchProcessRequest(BaseModel):
    notes: list[ProcessRequest]


class RedactionPreviewRequest(BaseModel):
    raw_text: str = Field(min_length=1, max_length=200_000)


class ConflictCheckRequest(BaseModel):
    party_names: list[str] = Field(default_factory=list)


class DeadlineCalculateRequest(BaseModel):
    rule_code: str
    trigger_date: str


class CallSimulationRequest(BaseModel):
    from_number: str = "+19195550199"
    to_number: str = "+15551234567"
    simulated_transcript: str = "Client call with Jane Doe regarding custody modification order. She reports father missed three weekend exchanges since June. Needs motion filed by Friday."


class PushRequest(BaseModel):
    draft_id: str | None = None
    matter_id: int
    matter_label: str = ""
    note: dict[str, Any]

    create_tasks: bool = True
    create_time_entry: bool = False
    create_deadlines: bool = False
    attach_document: bool = False
    document_format: Literal["docx", "pdf"] = "docx"

    reviewed_by: str = Field(min_length=1, max_length=120)
    review_attestation: bool = Field(...)


@app.get("/", response_class=HTMLResponse)
async def index() -> HTMLResponse:
    html = (BASE_DIR / "frontend.html").read_text(encoding="utf-8")
    return HTMLResponse(html)


@app.get("/oauth/clio/start")
async def oauth_start(svc: Services = Depends(get_services)) -> RedirectResponse:
    url, _state = svc.clio.build_authorize_url(ACCOUNT_KEY)
    return RedirectResponse(url, status_code=302)


@app.get("/oauth/clio/callback", response_class=HTMLResponse)
async def oauth_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    svc: Services = Depends(get_services),
) -> HTMLResponse:
    if error or not code or not state:
        return HTMLResponse("<h1>OAuth Failed</h1><p><a href='/'>Return</a></p>", status_code=400)
    token = await svc.clio.exchange_code(code, state)
    return HTMLResponse(f"<h1>Connected as {token.clio_user_name}</h1><script>setTimeout(()=>window.close(), 1000);</script>")


@app.post("/api/disconnect")
async def disconnect(svc: Services = Depends(get_services)) -> dict[str, Any]:
    await svc.clio.disconnect(ACCOUNT_KEY)
    return {"disconnected": True}


@app.get("/api/gdrive/status")
async def gdrive_status(svc: Services = Depends(get_services)) -> dict[str, Any]:
    """Report local Google Drive folder path and file counts."""
    folder_path, status_type = resolve_google_drive_folder(svc.settings)
    file_count = len(list(folder_path.glob("*"))) if folder_path.exists() else 0
    return {
        "folder_name": svc.settings.google_drive_folder_name,
        "folder_path": str(folder_path),
        "status_type": status_type,
        "file_count": file_count,
    }


# ===========================================================================
# US FEDERAL CASE LAW DATABASE ENDPOINTS (2000-2026)
# ===========================================================================

@app.get("/api/caselaw/search")
async def search_case_law(
    q: str | None = None,
    court: str | None = None,
    practice_area: str | None = None,
    min_year: int = 2000,
    max_year: int = 2026,
    limit: int = 50,
    svc: Services = Depends(get_services),
) -> dict[str, Any]:
    cases = await asyncio.to_thread(
        svc.case_law.search,
        query=q,
        court=court,
        practice_area=practice_area,
        min_year=min_year,
        max_year=max_year,
        limit=limit,
    )
    return {"count": len(cases), "cases": cases}


@app.get("/api/caselaw/analytics")
async def case_law_analytics(
    svc: Services = Depends(get_services),
) -> dict[str, Any]:
    analytics = await asyncio.to_thread(svc.case_law.get_analytics)
    return {"analytics": analytics}


@app.get("/api/caselaw/{case_id}")
async def get_case_law_detail(
    case_id: int, svc: Services = Depends(get_services)
) -> dict[str, Any]:
    case = await asyncio.to_thread(svc.case_law.get_by_id, case_id)
    if not case:
        raise HTTPException(404, "Case law precedent not found.")
    return {"case": case}


@app.get("/api/status")
async def status(svc: Services = Depends(get_services)) -> dict[str, Any]:
    chain_ok, bad_seq = await asyncio.to_thread(svc.audit.verify)
    gdrive_path, _mode = resolve_google_drive_folder(svc.settings)
    return {
        "firm": svc.settings.firm_name,
        "state": svc.settings.firm_state,
        "clio": svc.clio.connection_info(ACCOUNT_KEY),
        "compliance": svc.settings.compliance_banner(),
        "disclaimers": ETHICS_DISCLAIMERS,
        "transcription": svc.settings.transcription_mode,
        "ai_available": svc.ai is not None,
        "ner_active": svc.vault.ner_active,
        "audit_chain_valid": chain_ok,
        "audit_chain_break_at": bad_seq,
        "billing_increment_minutes": svc.settings.default_billing_increment_minutes,
        "twilio_configured": bool(svc.settings.twilio_phone_number),
        "google_drive_folder": str(gdrive_path),
    }


# ===========================================================================
# TWILIO VOICE TELEPHONY WEBHOOKS & GOOGLE DRIVE ARCHIVING
# ===========================================================================

@app.post("/api/twilio/voice/incoming", response_class=Response)
async def twilio_incoming_voice(
    request: Request,
    CallSid: str = Form(""),
    From: str = Form(""),
    To: str = Form(""),
    Direction: str = Form("inbound"),
    x_twilio_signature: str | None = Header(None, alias="X-Twilio-Signature"),
    svc: Services = Depends(get_services),
):
    if not svc.settings.skip_signature_validation and x_twilio_signature:
        form_data = dict(await request.form())
        url = str(request.url)
        if not validate_twilio_signature(svc.settings.twilio_auth_token, x_twilio_signature, url, form_data):
            raise HTTPException(403, "Invalid Twilio signature.")

    if CallSid:
        await asyncio.to_thread(svc.call_logs.record_call_start, CallSid, From, To, Direction)
        svc.audit.record(actor="twilio", action="call.incoming", subject=From, detail={"call_sid": CallSid})

    twiml = build_incoming_call_twiml(svc.settings)
    return Response(content=twiml, media_type="application/xml")


@app.post("/api/twilio/voice/recording-callback")
async def twilio_recording_callback(
    CallSid: str = Form(""),
    RecordingUrl: str = Form(""),
    RecordingSid: str = Form(""),
    RecordingDuration: int = Form(0),
    From: str = Form(""),
    svc: Services = Depends(get_services),
):
    if not CallSid or not RecordingUrl:
        return {"status": "ignored"}

    await asyncio.to_thread(svc.call_logs.update_recording, CallSid, RecordingUrl, RecordingSid, RecordingDuration)
    svc.audit.record(
        actor="twilio", action="call.recording_completed", subject=CallSid, detail={"duration": RecordingDuration}
    )

    asyncio.create_task(
        _process_twilio_recording_task(svc, CallSid, RecordingUrl, From, RecordingDuration)
    )
    return {"status": "queued"}


async def _process_twilio_recording_task(
    svc: Services, call_sid: str, recording_url: str, from_num: str, duration_sec: int
) -> None:
    try:
        audio_bytes = await download_twilio_recording(
            recording_url, svc.settings.twilio_account_sid, svc.settings.twilio_auth_token
        )
        if svc.transcriber:
            res = await svc.transcriber.transcribe_bytes(audio_bytes, suffix=".wav")
            transcription_text = res.text
        else:
            transcription_text = f"Recorded phone call from {from_num} (duration {duration_sec}s)."

        raw_text = f"PHONE CALL DICTATION/TRANSCRIPT (From: {from_num}):\n{transcription_text}"
        draft_id = await asyncio.to_thread(svc.drafts.create, raw_text)

        note_dict = None
        if svc.ai:
            note, telemetry = await svc.ai.process(
                raw_text, hint_category="client_communication", template_code="family_law"
            )
            note_dict = note.model_dump(mode="json")
            await asyncio.to_thread(svc.drafts.attach_processing, draft_id, note_dict, telemetry)

        await asyncio.to_thread(svc.call_logs.attach_draft, call_sid, draft_id)

        # Archive call files to Google Drive folder 'anas work calls'
        await asyncio.to_thread(
            archive_call_to_google_drive,
            svc.settings,
            call_sid,
            audio_bytes,
            transcription_text,
            note_dict,
        )

        logger.info("Successfully processed and archived call %s into draft %s", call_sid, draft_id)
    except Exception as exc:
        logger.error("Failed to process Twilio recording for %s: %s", call_sid, exc)


@app.get("/api/twilio/calls")
async def list_twilio_calls(limit: int = 25, svc: Services = Depends(get_services)) -> dict[str, Any]:
    calls = await asyncio.to_thread(svc.call_logs.list_recent, limit)
    return {"calls": calls}


@app.post("/api/twilio/test-call-simulation")
async def simulate_twilio_call(
    payload: CallSimulationRequest, svc: Services = Depends(get_services)
) -> dict[str, Any]:
    call_sid = f"CA_SIM_{str(uuid.uuid4())[:8]}"
    await asyncio.to_thread(svc.call_logs.record_call_start, call_sid, payload.from_number, payload.to_number)

    raw_text = f"SIMULATED TELEPHONE CALL TRANSCRIPT (From: {payload.from_number}):\n{payload.simulated_transcript}"
    draft_id = await asyncio.to_thread(svc.drafts.create, raw_text)

    note_dict = None
    telemetry = None
    if svc.ai:
        note, telemetry = await svc.ai.process(
            raw_text, hint_category="client_communication", template_code="family_law"
        )
        note_dict = note.model_dump(mode="json")
        await asyncio.to_thread(svc.drafts.attach_processing, draft_id, note_dict, telemetry)

    await asyncio.to_thread(svc.call_logs.update_recording, call_sid, "https://api.twilio.com/mock_recording", f"RE_SIM_{draft_id[:8]}", 45)
    await asyncio.to_thread(svc.call_logs.attach_draft, call_sid, draft_id)

    # Archive to Google Drive folder 'anas work calls'
    gdrive_result = await asyncio.to_thread(
        archive_call_to_google_drive,
        svc.settings,
        call_sid,
        b"RIFF_MOCK_WAV_BYTES_FOR_CALL",
        payload.simulated_transcript,
        note_dict,
    )

    return {
        "simulated_call_sid": call_sid,
        "draft_id": draft_id,
        "note": note_dict,
        "telemetry": telemetry,
        "gdrive_archived": gdrive_result,
    }


# ===========================================================================
# STANDARD APPLICATION ENDPOINTS
# ===========================================================================

@app.get("/api/audit")
async def audit_tail(
    limit: int = 50,
    actor: str | None = None,
    action: str | None = None,
    outcome: str | None = None,
    svc: Services = Depends(get_services),
) -> dict[str, Any]:
    ok, bad = await asyncio.to_thread(svc.audit.verify)
    events = await asyncio.to_thread(
        svc.audit.tail, limit, actor=actor, action=action, outcome=outcome
    )
    return {"chain_valid": ok, "break_at": bad, "events": events}


@app.get("/api/clio/activity-descriptions")
async def get_clio_activity_descriptions(
    svc: Services = Depends(get_services),
) -> dict[str, Any]:
    if not svc.clio.is_connected(ACCOUNT_KEY):
        return {"connected": False, "activities": []}
    activities = await svc.clio.list_activity_descriptions(account_key=ACCOUNT_KEY)
    return {"connected": True, "activities": activities}


@app.get("/api/templates")
async def get_practice_templates() -> dict[str, Any]:
    return {"templates": list_templates()}


@app.get("/api/matters")
async def list_matters(
    q: str | None = None,
    status_filter: str = "open",
    page_token: str | None = None,
    svc: Services = Depends(get_services),
) -> dict[str, Any]:
    matters, next_token = await svc.clio.list_matters(
        account_key=ACCOUNT_KEY, query=q, status=status_filter or None, page_token=page_token
    )
    return {
        "matters": [
            {
                "id": m.get("id"),
                "display_number": m.get("display_number"),
                "description": m.get("description"),
                "status": m.get("status"),
                "client_name": (m.get("client") or {}).get("name"),
                "practice_area": (m.get("practice_area") or {}).get("name"),
            }
            for m in matters
        ],
        "next_page_token": next_token,
    }


@app.get("/api/matters/{matter_id}/notes")
async def get_matter_notes(
    matter_id: int, limit: int = 25, svc: Services = Depends(get_services)
) -> dict[str, Any]:
    notes = await svc.clio.list_matter_notes(matter_id, account_key=ACCOUNT_KEY, limit=limit)
    return {"notes": notes}


@app.post("/api/conflicts/check")
async def check_conflicts(
    payload: ConflictCheckRequest, svc: Services = Depends(get_services)
) -> dict[str, Any]:
    if not svc.clio.is_connected(ACCOUNT_KEY):
        return {"connected": False, "conflicts": []}
    matches = await svc.clio.check_conflicts(payload.party_names, account_key=ACCOUNT_KEY)
    return {"connected": True, "conflicts": matches}


@app.get("/api/deadlines/rules")
async def list_deadline_rules() -> dict[str, Any]:
    return {"rules": [{"code": r.code, "title": r.title, "authority": r.rule_citation, "days": r.days, "description": r.description} for r in NC_RULES.values()]}


@app.post("/api/deadlines/calculate")
async def calculate_nc_deadline(
    payload: DeadlineCalculateRequest, svc: Services = Depends(get_services)
) -> dict[str, Any]:
    try:
        return calculate_deadline(payload.rule_code, payload.trigger_date)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.post("/api/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    svc: Services = Depends(get_services),
) -> dict[str, Any]:
    if svc.transcriber is None:
        raise HTTPException(503, "Transcription is disabled.")
    data = await audio.read()
    suffix = Path(audio.filename or "recording.webm").suffix or ".webm"
    result = await svc.transcriber.transcribe_bytes(data, suffix=suffix)
    return {
        "text": result.text,
        "duration_seconds": result.duration_seconds,
        "billable_hours_estimate": result.billable_hours_estimate,
        "language": result.language,
    }


@app.post("/api/redaction/preview")
async def redaction_preview(
    payload: RedactionPreviewRequest, svc: Services = Depends(get_services)
) -> dict[str, Any]:
    if svc.ai is None:
        raise HTTPException(503, "AI processing not configured.")
    result = svc.ai.preview_redaction(payload.raw_text)
    return {
        "redacted_text": result.redacted_text,
        "redaction_count": result.redaction_count,
        "entity_counts": result.entity_counts,
        "will_transmit_to": svc.settings.llm_provider if svc.settings.llm_is_hosted else "local model",
    }


@app.post("/api/process")
async def process_note(
    payload: ProcessRequest, svc: Services = Depends(get_services)
) -> dict[str, Any]:
    if svc.ai is None:
        raise HTTPException(503, "AI provider not configured.")
    draft_id = payload.draft_id or await asyncio.to_thread(svc.drafts.create, payload.raw_text)

    note, telemetry = await svc.ai.process(
        payload.raw_text,
        hint_category=payload.hint_category,
        hint_matter=payload.hint_matter,
        template_code=payload.template_code,
    )
    note_dict = note.model_dump(mode="json")
    await asyncio.to_thread(svc.drafts.attach_processing, draft_id, note_dict, telemetry)
    return {"draft_id": draft_id, "note": note_dict, "telemetry": telemetry}


@app.post("/api/process/batch")
async def process_batch(
    payload: BatchProcessRequest, svc: Services = Depends(get_services)
) -> dict[str, Any]:
    if svc.ai is None:
        raise HTTPException(503, "AI provider not configured.")
    results = []
    for item in payload.notes:
        draft_id = item.draft_id or await asyncio.to_thread(svc.drafts.create, item.raw_text)
        note, telemetry = await svc.ai.process(
            item.raw_text,
            hint_category=item.hint_category,
            hint_matter=item.hint_matter,
            template_code=item.template_code,
        )
        note_dict = note.model_dump(mode="json")
        await asyncio.to_thread(svc.drafts.attach_processing, draft_id, note_dict, telemetry)
        results.append({"draft_id": draft_id, "note": note_dict, "telemetry": telemetry})
    return {"batch_size": len(results), "results": results}


@app.post("/api/generate/client-letter")
async def generate_client_letter(
    note: dict[str, Any], svc: Services = Depends(get_services)
) -> dict[str, str]:
    if svc.ai is None:
        raise HTTPException(503, "AI provider not configured.")
    validated = ProcessedNote.model_validate(note)
    letter_text = await svc.ai.generate_client_letter(validated)
    return {"letter_text": letter_text}


@app.post("/api/drafts/{draft_id}/diff")
async def draft_diff(
    draft_id: str, svc: Services = Depends(get_services)
) -> dict[str, Any]:
    draft = await asyncio.to_thread(svc.drafts.get, draft_id)
    if draft is None:
        raise HTTPException(404, "Draft not found.")
    return {
        "draft_id": draft_id,
        "raw_text": draft.raw_text,
        "processed_note": draft.processed,
    }


@app.put("/api/drafts/{draft_id}")
async def update_draft(
    draft_id: str, note: dict[str, Any], svc: Services = Depends(get_services)
) -> dict[str, Any]:
    validated = ProcessedNote.model_validate(note).model_dump(mode="json")
    await asyncio.to_thread(svc.drafts.update_processed, draft_id, validated)
    return {"draft_id": draft_id, "note": validated}


@app.get("/api/drafts")
async def list_drafts(limit: int = 25, svc: Services = Depends(get_services)) -> dict[str, Any]:
    return {"drafts": await asyncio.to_thread(svc.drafts.list_recent, limit)}


@app.get("/api/drafts/{draft_id}")
async def get_draft(draft_id: str, svc: Services = Depends(get_services)) -> dict[str, Any]:
    draft = await asyncio.to_thread(svc.drafts.get, draft_id)
    if draft is None:
        raise HTTPException(404, "Draft not found.")
    return {
        "id": draft.id,
        "status": draft.status,
        "created_at": draft.created_at,
        "raw_text": draft.raw_text,
        "note": draft.processed,
        "telemetry": draft.telemetry,
        "clio_result": draft.clio_result,
    }


@app.delete("/api/drafts/{draft_id}")
async def delete_draft(draft_id: str, svc: Services = Depends(get_services)) -> dict[str, Any]:
    await asyncio.to_thread(svc.drafts.delete, draft_id)
    return {"deleted": True}


@app.get("/api/export/draft/{draft_id}")
async def export_draft_zip(
    draft_id: str, svc: Services = Depends(get_services)
):
    draft = await asyncio.to_thread(svc.drafts.get, draft_id)
    if draft is None or not draft.processed:
        raise HTTPException(404, "Draft or processed content not found.")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        import json
        zf.writestr("note_data.json", json.dumps(draft.processed, indent=2))
        zf.writestr("raw_note.txt", draft.raw_text)

        _name, docx_bytes, _ = build_document(draft.processed, fmt="docx", firm_name=svc.settings.firm_name)
        zf.writestr("work_product.docx", docx_bytes)

        _name, pdf_bytes, _ = build_document(draft.processed, fmt="pdf", firm_name=svc.settings.firm_name)
        zf.writestr("work_product.pdf", pdf_bytes)

    buf.seek(0)
    return Response(
        content=buf.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="legal_note_export_{draft_id[:8]}.zip"'},
    )


@app.post("/api/push")
async def push_to_clio(
    payload: PushRequest, svc: Services = Depends(get_services)
) -> dict[str, Any]:
    if not payload.review_attestation:
        raise HTTPException(400, "Review attestation required.")

    note = ProcessedNote.model_validate(payload.note)
    footer = f"---\nReviewed by: {payload.reviewed_by} on {datetime.now().strftime('%Y-%m-%d %H:%M')}\nAI-assisted ({note.model_provider}/{note.model_name}); PII redacted: {'yes' if note.pii_redacted else 'NO'}.\n{ETHICS_DISCLAIMERS['primary']}"
    detail = note.to_clio_note_detail(footer=footer)

    tasks = (
        [
            {
                "name": a.name,
                "description": f"{a.description}\n\nSource: \"{a.source_quote}\"" if a.source_quote else a.description,
                "due_date": a.due_date,
                "priority": a.priority.value,
            }
            for a in note.action_items
        ]
        if payload.create_tasks
        else []
    )

    time_entry = None
    if payload.create_time_entry and note.billable_time.hours:
        time_entry = {
            "hours": note.billable_time.hours,
            "note": (note.billable_time.activity_description or note.suggested_subject)[:4000],
            "date": note.billable_time.date or date.today().isoformat(),
        }

    deadlines = (
        [{"description": d.description, "date": d.date, "source_text": d.source_quote} for d in note.deadlines if d.date]
        if payload.create_deadlines
        else []
    )

    document = None
    if payload.attach_document:
        filename, content, content_type = await asyncio.to_thread(
            build_document,
            note.model_dump(mode="json"),
            fmt=payload.document_format,
            firm_name=svc.settings.firm_name,
            matter_label=payload.matter_label,
        )
        document = {"filename": filename, "content": content, "content_type": content_type}

    result = await svc.clio.push_processed_note(
        matter_id=payload.matter_id,
        note_subject=note.suggested_subject,
        note_detail=detail,
        tasks=tasks,
        time_entry=time_entry,
        deadlines=deadlines,
        document=document,
        account_key=ACCOUNT_KEY,
    )

    if payload.draft_id:
        await asyncio.to_thread(
            svc.drafts.mark_pushed, payload.draft_id, payload.matter_id, payload.matter_label, result
        )

    svc.audit.record(
        actor=payload.reviewed_by,
        action="clio.push",
        subject=str(payload.matter_id),
        outcome="partial" if result.get("errors") else "success",
        detail={"draft_id": payload.draft_id, "reviewed_by": payload.reviewed_by},
    )

    return {"success": True, "partial": bool(result.get("errors")), "result": result}


@app.post("/api/document/preview")
async def document_preview(
    note: dict[str, Any],
    fmt: Literal["docx", "pdf"] = "docx",
    matter_label: str = "",
    svc: Services = Depends(get_services),
):
    validated = ProcessedNote.model_validate(note).model_dump(mode="json")
    filename, content, content_type = await asyncio.to_thread(
        build_document, validated, fmt=fmt, firm_name=svc.settings.firm_name, matter_label=matter_label
    )
    return Response(
        content=content,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    s = get_settings()
    uvicorn.run("app:app", host=s.app_host, port=s.app_port, reload=s.app_env == "development")
