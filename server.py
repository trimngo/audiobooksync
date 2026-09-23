"""LeseTakt development server and private auto-sync API."""
from __future__ import annotations

import os
import tempfile
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from openai import OpenAI
from pypdf import PdfReader

from sync_engine import align_segments

ROOT = Path(__file__).parent
app = Flask(__name__, static_folder=None)


@app.get("/")
def index():
    return send_from_directory(ROOT, "index.html")


@app.get("/<path:filename>")
def assets(filename: str):
    return send_from_directory(ROOT, filename)


@app.post("/api/auto-sync")
def auto_sync():
    if not os.environ.get("OPENAI_API_KEY"):
        return jsonify(error="Set OPENAI_API_KEY before starting the server."), 503
    pdf = request.files.get("pdf")
    audio_files = request.files.getlist("audio")
    if not pdf or not audio_files:
        return jsonify(error="A PDF and at least one audio file are required."), 400

    language = request.form.get("language", "auto")
    try:
        pages = [(page.extract_text() or "") for page in PdfReader(pdf.stream).pages]
    except Exception as exc:
        return jsonify(error=f"The PDF text could not be read: {exc}"), 400
    if not any(page.strip() for page in pages):
        return jsonify(error="This PDF has no selectable text. Run OCR on scanned pages first."), 422

    client, passages = OpenAI(), []
    for track, upload in enumerate(audio_files):
        suffix = Path(upload.filename or "audio.mp3").suffix or ".mp3"
        with tempfile.NamedTemporaryFile(suffix=suffix) as temporary:
            upload.save(temporary.name)
            with open(temporary.name, "rb") as audio:
                options = {"model": "whisper-1", "file": audio, "response_format": "verbose_json", "timestamp_granularities": ["segment"]}
                if language in {"de", "en"}:
                    options["language"] = language
                transcript = client.audio.transcriptions.create(**options)
        segments = [{"start": item.start, "end": item.end, "text": item.text} for item in transcript.segments]
        for match in align_segments(pages, segments):
            match["track"] = track
            passages.append(match)
    return jsonify(passages=passages, page_count=len(pages))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "4173")), debug=False)
