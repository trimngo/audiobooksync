import * as pdfjsLib from './vendor/pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = './vendor/pdf.worker.min.mjs';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const state = { page: 12, totalPages: 96, zoom: 100, track: 0, playing: false, speedIndex: 0, fit: 'page', pdf: null, pageWords: [], timelines: [], renderTask: null, renderId: 0 };
const demoTracks = [{ name: 'Im Café', duration: 522 }, { name: 'Unterwegs', duration: 738 }, { name: 'Auf dem Markt', duration: 545 }, { name: 'Neue Nachbarn', duration: 694 }];
const speeds = [1, 1.25, 1.5, .75];
let tracks = demoTracks;
let transcriptFiles = [];

const normalise = (word) => word.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9äöüß]/gi, '');
const words = (text) => text.trim().split(/\s+/).filter(Boolean);
const formatTime = (seconds) => `${Math.floor(Math.max(0, seconds) / 60).toString().padStart(2, '0')}:${Math.floor(Math.max(0, seconds) % 60).toString().padStart(2, '0')}`;

async function setPage(page, wordIndex = -1) {
  state.page = Math.max(1, Math.min(state.totalPages, Number(page) || 1));
  $('#pageNumber').value = state.page;
  if (!state.pdf) return;
  const renderId = ++state.renderId;
  $('#pageLoading').hidden = false;
  const pdfPage = await state.pdf.getPage(state.page);
  if (renderId !== state.renderId) return;
  const base = pdfPage.getViewport({ scale: 1 });
  const stage = $('#documentStage');
  const availableWidth = Math.max(280, stage.clientWidth - (innerWidth < 800 ? 24 : 72));
  const availableHeight = Math.max(300, stage.clientHeight - 40);
  const scale = state.fit === 'width' ? availableWidth / base.width : Math.min(availableWidth / base.width, availableHeight / base.height);
  const viewport = pdfPage.getViewport({ scale: scale * devicePixelRatio });
  const cssWidth = viewport.width / devicePixelRatio;
  const cssHeight = viewport.height / devicePixelRatio;
  const canvas = $('#pdfCanvas');
  const context = canvas.getContext('2d', { alpha: false });
  canvas.width = viewport.width; canvas.height = viewport.height;
  canvas.style.width = `${cssWidth}px`; canvas.style.height = `${cssHeight}px`;
  const viewer = $('#pdfViewer');
  viewer.style.width = `${cssWidth}px`; viewer.style.height = `${cssHeight}px`;
  const textLayer = $('#textLayer');
  textLayer.replaceChildren(); textLayer.style.width = `${cssWidth}px`; textLayer.style.height = `${cssHeight}px`;
  if (state.renderTask) state.renderTask.cancel();
  state.renderTask = pdfPage.render({ canvasContext: context, viewport });
  try { await state.renderTask.promise; } catch (error) { if (error.name !== 'RenderingCancelledException') throw error; }
  if (renderId !== state.renderId) return;
  const text = await pdfPage.getTextContent();
  let pageWord = 0;
  text.items.forEach((item) => {
    if (!item.str.trim()) return;
    const transform = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const line = document.createElement('span');
    const fontSize = Math.hypot(transform[2], transform[3]) / devicePixelRatio;
    line.className = 'pdf-text-line';
    line.style.left = `${transform[4] / devicePixelRatio}px`;
    line.style.top = `${transform[5] / devicePixelRatio - fontSize}px`;
    line.style.fontSize = `${fontSize}px`;
    line.style.fontFamily = item.fontName || 'sans-serif';
    words(item.str).forEach((word, index, list) => {
      const span = document.createElement('span');
      span.textContent = `${word}${index < list.length - 1 ? ' ' : ''}`;
      span.dataset.word = pageWord++;
      line.appendChild(span);
    });
    textLayer.appendChild(line);
  });
  $('#pageLoading').hidden = true;
  highlightWord(wordIndex);
}

function highlightWord(index) {
  $$('.spoken-word').forEach((node) => node.classList.remove('spoken-word'));
  if (index < 0) return;
  const node = $(`#textLayer [data-word="${index}"]`);
  if (node) { node.classList.add('spoken-word'); node.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
}

async function indexPdf() {
  $('#syncStatus').textContent = 'Reading selectable text from the PDF…';
  state.pageWords = [];
  for (let number = 1; number <= state.totalPages; number++) {
    const page = await state.pdf.getPage(number);
    const content = await page.getTextContent();
    state.pageWords[number] = words(content.items.map((item) => item.str).join(' '));
    if (number % 10 === 0) $('#syncStatus').textContent = `Reading PDF text… ${number}/${state.totalPages}`;
  }
  $('#syncStatus').textContent = 'PDF text ready · tap Auto-sync book';
}

function setTrack(index) {
  state.track = (index + tracks.length) % tracks.length;
  const track = tracks[state.track];
  $$('.lesson').forEach((item, i) => item.classList.toggle('active', i === state.track));
  $('#trackTitle').textContent = track.name;
  $('#duration').textContent = formatTime(track.duration);
  $('#progress').max = track.duration || 1; $('#progress').value = 0; $('#currentTime').textContent = '00:00';
  if (track.url) { $('#audioPlayer').src = track.url; if (state.playing) $('#audioPlayer').play(); }
}

function togglePlay() {
  state.playing = !state.playing; $('#playButton').textContent = state.playing ? 'Ⅱ' : '▶';
  const audio = $('#audioPlayer'); if (audio.src) state.playing ? audio.play() : audio.pause();
}

function parseTranscript(text) {
  const cues = [];
  const pattern = /(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{3})[^\n]*\n([\s\S]*?)(?=\n\s*\n|$)/g;
  let match;
  while ((match = pattern.exec(text.replace(/\r/g, '')))) {
    const start = (+match[1]?.replace(':', '') || 0) * 3600 + +match[2] * 60 + +match[3] + +match[4] / 1000;
    const end = (+match[5]?.replace(':', '') || 0) * 3600 + +match[6] * 60 + +match[7] + +match[8] / 1000;
    cues.push({ start, end, text: match[9].replace(/<[^>]+>/g, ' ').replace(/\n/g, ' ') });
  }
  return cues;
}

function matchCue(cueWords, flat, from) {
  const needle = cueWords.map(normalise).filter(Boolean);
  let best = { score: 0, index: from };
  for (let i = from; i < flat.length; i++) {
    if (flat[i].norm !== needle[0]) continue;
    let score = 0;
    for (let n = 0; n < Math.min(needle.length, 14) && i + n < flat.length; n++) if (flat[i + n].norm === needle[n]) score++;
    if (score > best.score) best = { score, index: i };
    if (score >= Math.min(8, needle.length)) break;
  }
  return best;
}

async function autoSync() {
  if (!state.pdf || !tracks.some((track) => track.url)) { $('#syncStatus').textContent = 'Import both a PDF and an audio folder first'; return; }
  $('#autoSyncButton').classList.add('working');
  if (!state.pageWords.length) await indexPdf();
  const flat = state.pageWords.flatMap((page, pageNumber) => (page || []).map((word, wordIndex) => ({ page: pageNumber, wordIndex, norm: normalise(word) }))).filter((item) => item.norm);
  state.timelines = [];
  let exactMatches = 0;
  for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
    const track = tracks[trackIndex];
    const sidecar = transcriptFiles.find((file) => file.name.replace(/\.(vtt|srt)$/i, '').toLowerCase() === track.file.name.replace(/\.[^.]+$/, '').toLowerCase()) || (transcriptFiles.length === tracks.length ? transcriptFiles[trackIndex] : null);
    const timeline = [];
    if (sidecar) {
      const cues = parseTranscript(await sidecar.text());
      let cursor = 0;
      cues.forEach((cue) => {
        const cueWords = words(cue.text); const match = matchCue(cueWords, flat, cursor);
        if (!match.score) return;
        cursor = match.index + Math.max(1, cueWords.length); exactMatches++;
        cueWords.forEach((_, i) => {
          const target = flat[Math.min(flat.length - 1, match.index + i)];
          timeline.push({ time: cue.start + (cue.end - cue.start) * i / Math.max(1, cueWords.length), ...target });
        });
      });
    }
    if (!timeline.length) {
      const startPage = Math.floor(trackIndex * state.totalPages / tracks.length) + 1;
      const endPage = Math.max(startPage, Math.floor((trackIndex + 1) * state.totalPages / tracks.length));
      const section = flat.filter((item) => item.page >= startPage && item.page <= endPage);
      section.forEach((item, i) => timeline.push({ time: (track.duration || 1) * i / Math.max(1, section.length), ...item }));
    }
    state.timelines[trackIndex] = timeline;
  }
  $('#syncStatus').textContent = exactMatches ? `Synced ${exactMatches} transcript cues to PDF text` : 'Smart timing created from selectable PDF text';
  $('#autoSyncButton').classList.remove('working');
}

function followAudio(time) {
  const timeline = state.timelines[state.track]; if (!timeline?.length) return;
  let low = 0, high = timeline.length - 1;
  while (low < high) { const mid = Math.ceil((low + high) / 2); if (timeline[mid].time <= time) low = mid; else high = mid - 1; }
  const point = timeline[low];
  if (!point) return;
  if (point.page !== state.page) setPage(point.page, point.wordIndex); else highlightWord(point.wordIndex);
}

function openLinkModal() { $('#linkPage').value = state.page; $('#linkEndPage').value = state.page; $('#linkTime').value = $('#currentTime').textContent; $('#modalBackdrop').hidden = false; setTimeout(() => $('#linkName').focus(), 50); }

$('#prevPage').addEventListener('click', () => setPage(state.page - 1));
$('#nextPage').addEventListener('click', () => setPage(state.page + 1));
$('#pageNumber').addEventListener('change', (event) => setPage(event.target.value));
$('#playButton').addEventListener('click', togglePlay);
$('#previousTrack').addEventListener('click', () => setTrack(state.track - 1));
$('#nextTrack').addEventListener('click', () => setTrack(state.track + 1));
$('#back15').addEventListener('click', () => { $('#audioPlayer').currentTime = Math.max(0, ($('#audioPlayer').currentTime || +$('#progress').value) - 15); });
$('#forward15').addEventListener('click', () => { $('#audioPlayer').currentTime = Math.min(+$('#progress').max, ($('#audioPlayer').currentTime || +$('#progress').value) + 15); });
$('#progress').addEventListener('input', (event) => { $('#currentTime').textContent = formatTime(event.target.value); if ($('#audioPlayer').src) $('#audioPlayer').currentTime = event.target.value; followAudio(+event.target.value); });
$('#audioPlayer').addEventListener('loadedmetadata', (event) => { tracks[state.track].duration = event.target.duration; $('#progress').max = event.target.duration; $('#duration').textContent = formatTime(event.target.duration); });
$('#audioPlayer').addEventListener('timeupdate', (event) => { $('#progress').value = event.target.currentTime; $('#currentTime').textContent = formatTime(event.target.currentTime); followAudio(event.target.currentTime); });
$('#audioPlayer').addEventListener('ended', () => setTrack(state.track + 1));
$$('.lesson').forEach((lesson) => lesson.addEventListener('click', () => setTrack(+lesson.dataset.track)));
$$('.passage').forEach((passage) => passage.addEventListener('click', () => { $$('.passage').forEach((item) => item.classList.remove('active')); passage.classList.add('active'); setPage(passage.dataset.page); $('#progress').value = passage.dataset.time; $('#currentTime').textContent = formatTime(passage.dataset.time); if ($('#audioPlayer').src) $('#audioPlayer').currentTime = passage.dataset.time; }));
$$('.language-switch button').forEach((button) => button.addEventListener('click', () => { $$('.language-switch button').forEach((item) => item.classList.remove('active')); button.classList.add('active'); $$('[data-de]').forEach((node) => { node.innerHTML = node.dataset[button.dataset.language]; }); document.documentElement.lang = button.dataset.language; }));
$('#zoomIn').addEventListener('click', () => { state.zoom = Math.min(150, state.zoom + 10); $('.zoom-value').textContent = `${state.zoom}%`; $('#samplePage').style.transform = `scale(${state.zoom / 100})`; });
$('#zoomOut').addEventListener('click', () => { state.zoom = Math.max(70, state.zoom - 10); $('.zoom-value').textContent = `${state.zoom}%`; $('#samplePage').style.transform = `scale(${state.zoom / 100})`; });
$$('.fit-switch button').forEach((button) => button.addEventListener('click', () => { $$('.fit-switch button').forEach((item) => item.classList.remove('active')); button.classList.add('active'); state.fit = button.dataset.fit; if (state.pdf) setPage(state.page); }));
$('#speedButton').addEventListener('click', () => { state.speedIndex = (state.speedIndex + 1) % speeds.length; const speed = speeds[state.speedIndex]; $('#speedButton').textContent = `${speed}×`; $('#audioPlayer').playbackRate = speed; });
['#newLinkButton', '#floatingLink'].forEach((selector) => $(selector).addEventListener('click', openLinkModal));
['#closeModal', '#cancelModal'].forEach((selector) => $(selector).addEventListener('click', () => { $('#modalBackdrop').hidden = true; }));
$('#modalBackdrop').addEventListener('click', (event) => { if (event.target === $('#modalBackdrop')) $('#modalBackdrop').hidden = true; });
$('#linkForm').addEventListener('submit', (event) => { event.preventDefault(); const start = $('#linkPage').value; const end = $('#linkEndPage').value; const button = document.createElement('button'); button.className = 'passage'; button.dataset.page = start; button.dataset.time = $('#linkTime').value.split(':').reduce((m, s) => m * 60 + +s, 0); button.innerHTML = `<span><b>${$('#linkName').value}</b><small>Page${start === end ? '' : 's'} ${start}${start === end ? '' : `–${end}`}</small></span><time>${$('#linkTime').value}</time>`; button.addEventListener('click', () => setPage(start)); $('#passageList').appendChild(button); $('#modalBackdrop').hidden = true; event.target.reset(); });

function choosePdf() { $('#pdfFile').click(); }
$('#addBookButton').addEventListener('click', choosePdf); $('#changePdf').addEventListener('click', choosePdf);
$('#pdfFile').addEventListener('change', async (event) => {
  const file = event.target.files[0]; if (!file) return;
  $('#bookTitle').textContent = file.name.replace(/\.pdf$/i, ''); $('#samplePage').style.display = 'none'; $('#pdfViewer').hidden = false;
  $('#syncStatus').textContent = 'Opening PDF…';
  state.pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise; state.totalPages = state.pdf.numPages; $('#totalPages').textContent = state.totalPages;
  await setPage(1); indexPdf();
});

async function collectDirectory(handle, files = []) {
  for await (const entry of handle.values()) entry.kind === 'file' ? files.push(await entry.getFile()) : await collectDirectory(entry, files);
  return files;
}
async function chooseAudioFolder() {
  if ('showDirectoryPicker' in window) { try { await importAudioFiles(await collectDirectory(await window.showDirectoryPicker())); return; } catch (error) { if (error.name === 'AbortError') return; } }
  $('#audioFiles').click();
}
async function importAudioFiles(files) {
  const audioFiles = files.filter((file) => /\.(mp3|m4a|aac|wav|ogg)$/i.test(file.name)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  transcriptFiles = files.filter((file) => /\.(vtt|srt)$/i.test(file.name)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  tracks = audioFiles.map((file) => ({ name: file.name.replace(/\.[^.]+$/, ''), duration: 0, url: URL.createObjectURL(file), file }));
  if (!tracks.length) { $('#syncStatus').textContent = 'That folder contains no supported audio files'; return; }
  $('#lessonList').replaceChildren();
  tracks.forEach((track, index) => { const button = document.createElement('button'); button.className = `lesson${index === 0 ? ' active' : ''}`; button.dataset.track = index; button.innerHTML = `<span class="${index ? 'lesson-number' : 'lesson-play'}">${index ? String(index + 1).padStart(2, '0') : '▶'}</span><span><b>${track.name}</b><small>Audio lesson</small></span><i>⋮</i>`; button.addEventListener('click', () => setTrack(index)); $('#lessonList').appendChild(button); });
  $('#syncStatus').textContent = `${tracks.length} audio files${transcriptFiles.length ? ` + ${transcriptFiles.length} transcripts` : ''} imported`;
  setTrack(0);
  await Promise.all(tracks.map((track) => new Promise((resolve) => {
    const probe = new Audio();
    probe.preload = 'metadata'; probe.src = track.url;
    probe.onloadedmetadata = () => { track.duration = Number.isFinite(probe.duration) ? probe.duration : 0; probe.src = ''; resolve(); };
    probe.onerror = resolve;
  })));
  if (transcriptFiles.length) $('#syncStatus').textContent = `${tracks.length} lessons ready · transcripts found for precise sync`;
}
$('#importAudioButton').addEventListener('click', chooseAudioFolder);
$('#audioFiles').addEventListener('change', (event) => importAudioFiles([...event.target.files]));
$('#autoSyncButton').addEventListener('click', autoSync);
$('#mobileLibrary').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
window.addEventListener('resize', () => { if (state.pdf) setPage(state.page); });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
