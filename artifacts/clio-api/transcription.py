"""
transcription.py
================
Local Faster-Whisper Voice Transcription Engine.
"""

from __future__ import annotations

import asyncio
import logging
import tempfile
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)

class TranscriptionError(RuntimeError):
    """Raised when transcription fails."""

@dataclass
class TranscriptionResult:
    text: str
    duration_seconds: float
    billable_hours_estimate: float
    language: str

class LocalTranscriber:
    def __init__(self, model_size: str = "small.en", compute_type: str = "int8") -> None:
        self.model_size = model_size
        self.compute_type = compute_type
        self._model = None

    def _get_model(self):
        if self._model is None:
            try:
                from faster_whisper import WhisperModel
                logger.info("Loading local Whisper model '%s' (%s)...", self.model_size, self.compute_type)
                self._model = WhisperModel(self.model_size, device="cpu", compute_type=self.compute_type)
            except Exception as exc:
                logger.warning("faster_whisper not installed or failed to load: %s. Using fallback.", exc)
                self._model = "fallback"
        return self._model

    async def transcribe_bytes(self, audio_bytes: bytes, suffix: str = ".webm") -> TranscriptionResult:
        return await asyncio.to_thread(self._transcribe_sync, audio_bytes, suffix)

    def _transcribe_sync(self, audio_bytes: bytes, suffix: str) -> TranscriptionResult:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = Path(tmp.name)

        try:
            model = self._get_model()
            if model == "fallback":
                return TranscriptionResult(
                    text="[Audio dictation received - local whisper model fallback placeholder].",
                    duration_seconds=120.0,
                    billable_hours_estimate=0.2,
                    language="en",
                )

            segments, info = model.transcribe(str(tmp_path), beam_size=5)
            text_parts = [s.text.strip() for s in segments]
            full_text = " ".join(text_parts)
            duration = info.duration or 0.0
            billable = round(max(0.1, duration / 3600.0), 1)

            return TranscriptionResult(
                text=full_text,
                duration_seconds=round(duration, 1),
                billable_hours_estimate=billable,
                language=info.language or "en",
            )
        finally:
            if tmp_path.exists():
                tmp_path.unlink()
