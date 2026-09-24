# Page & Voice

A private, local-first progressive web app for reading a PDF while listening to separately recorded audiobook lessons. The first release intentionally keeps navigation manual: repeated lesson passages and non-linear recordings are easier to follow when the listener controls the page.

## Run locally

```bash
npm install
npm run dev
```

Open the shown URL, choose a PDF, and select one or more MP3/audio files. Files remain in the browser session and are never uploaded. The last PDF page number is remembered, but source files must be selected again after closing the app.

## Build and verify

```bash
npm run build
npm test
```

The production build includes a web app manifest and offline application-shell service worker. On iOS Safari, use **Share → Add to Home Screen** to install it.

## Privacy and limitations

- PDF and audio data remain on the device and are represented by temporary browser URLs.
- The app does not transcribe, synchronize, or upload source files.
- Browser media controls provide playback speed where supported by the platform.
- For long-term offline access to source files, reselect the PDF and audio after a browser restart.
