# LeseTakt

A local-first progressive web app for reading bilingual PDF books while listening to lesson-based audiobooks.

## Run locally

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>. The app runs without a backend; imported PDF and MP3 files remain on the device.

## Features

- Import a PDF and an entire group of MP3 lesson files.
- Switch the reading language between German and English.
- Build named audio-to-page links, including non-contiguous page ranges.
- Jump between linked passages from the audio player.
- Install as a PWA and cache the app shell for offline use.
