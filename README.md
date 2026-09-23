# Zwischenzeilen

An installable, local-first web reader that pairs a PDF edition with a folder of audiobook files. Create passage links from any timestamp to any PDF page, including non-contiguous sections.

## Run locally

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`. On iOS, use Safari's **Add to Home Screen** action to install the PWA.

PDFs and audio files stay in the browser and are never uploaded. Passage metadata is saved in local storage. When a lesson ends, playback automatically continues with the next audio file in the folder.
