# LeseTakt

A local-first progressive web app for reading bilingual PDF books while listening to lesson-based audiobooks.

## Run locally

For the reader-only interface:

```bash
python3 -m http.server 4173
```

To use **Auto-sync**, run the companion server instead. It transcribes each MP3,
extracts the PDF's text layer, and aligns timestamped transcript windows to the
best matching pages. Files are processed in memory/temporary storage and are not
kept by LeseTakt.

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
export OPENAI_API_KEY="your-key"
python server.py
```

Then open <http://localhost:4173>. The app runs without a backend; imported PDF and MP3 files remain on the device.

## Features

- Import a PDF and an entire group of MP3 lesson files.
- Switch the reading language between German and English.
- Build named audio-to-page links, including non-contiguous page ranges.
- Automatically create non-contiguous page links even when no transcript file exists.
- Jump between linked passages from the audio player.
- Install as a PWA and cache the app shell for offline use.

## How automatic alignment works

The server requests segment-level timestamps from the transcription model, groups
short segments into meaningful windows, then compares their words with every PDF
page using inverse-document-frequency weighted overlap. Every window is matched
independently, so an audiobook can jump from page 30 back to page 12. German and
English are both handled by the Unicode tokenizer. Image-only/scanned PDFs need
OCR before they can be aligned.
