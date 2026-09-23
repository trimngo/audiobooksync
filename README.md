# LeseTakt

A local-first progressive web app for reading bilingual PDF books while listening to lesson-based audiobooks.

## Run locally

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>. The app runs without a backend; imported PDF and MP3 files remain on the device.

## Features

- Import a PDF and choose an entire audiobook folder in one step. Nested MP3, M4A,
  AAC, WAV, and OGG files are discovered and naturally sorted.
- Switch the reading language between German and English.
- Build named audio-to-page links, including non-contiguous page ranges.
- Extract selectable PDF text, build a local audio-to-page timeline, follow the
  current page, and highlight the current word during playback.
- Use matching `.vtt` or `.srt` sidecar files for precise text alignment. Without
  sidecars, LeseTakt creates estimated timings from the PDF text and track order.
- View PDFs as a complete page or fitted to the available width.
- Install as a PWA and cache the app shell for offline use.
