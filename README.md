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

Run the browser-independent visual smoke check with:

```sh
npm run visual-check
```

The visual check starts the app on a loopback-only server, requests the real
application assets, and verifies the iPhone/iPad responsive breakpoints and
standalone manifest. It intentionally uses Node's built-in `fetch` rather than
downloading Playwright, so it also works in restricted development and CI
environments where browser packages or binaries cannot be fetched.

No dependency installation is required for either check. For a manual visual
review, start the app and use Safari's Responsive Design Mode or open the local
URL from an iPhone on the same network.
