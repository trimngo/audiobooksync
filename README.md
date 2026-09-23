# Audiobook Sync

An installable, mobile-first web player that keeps an audiobook and its PDF
companion in one reading view. Load local audio and PDF files, jump between
chapters, add timestamped sync points, and continue from saved progress.

## Run locally

The app has no build step or runtime dependencies. Serve the repository over
HTTP so the service worker and local file APIs work correctly:

```sh
python3 -m http.server 4173
```

Then open <http://localhost:4173>. On iOS, use **Share → Add to Home Screen**
to install it as a standalone web app.

## Features

- Responsive listening and reading workspace designed for iPhone and iPad
- Local audiobook and PDF selection—files never leave the device
- Audio playback controls, scrubbing, playback speed, and skip controls
- Timestamped PDF sync points, bookmarks, and persistent listening progress
- Offline-ready application shell with a web app manifest

## Development

Run the lightweight validation suite with:

```sh
npm test
```

No dependency installation is required.
