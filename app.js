const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const state = { page: 12, totalPages: 96, zoom: 100, track: 0, playing: false, speedIndex: 0 };
const demoTracks = [
  { name: 'Im Café', duration: 522 },
  { name: 'Unterwegs', duration: 738 },
  { name: 'Auf dem Markt', duration: 545 },
  { name: 'Neue Nachbarn', duration: 694 },
];
const speeds = [1, 1.25, 1.5, .75];
let tracks = demoTracks;
let pdfUrl;

function formatTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  return `${Math.floor(safe / 60).toString().padStart(2, '0')}:${Math.floor(safe % 60).toString().padStart(2, '0')}`;
}

function setPage(page) {
  state.page = Math.max(1, Math.min(state.totalPages, Number(page) || 1));
  $('#pageNumber').value = state.page;
  if (pdfUrl) $('#pdfFrame').src = `${pdfUrl}#page=${state.page}&view=FitH`;
}

function setTrack(index) {
  state.track = (index + tracks.length) % tracks.length;
  const track = tracks[state.track];
  $$('.lesson').forEach((item, i) => item.classList.toggle('active', i === state.track));
  $('#trackTitle').textContent = track.name;
  $('#duration').textContent = formatTime(track.duration);
  $('#progress').max = track.duration;
  $('#progress').value = 0;
  $('#currentTime').textContent = '00:00';
  if (track.url) {
    $('#audioPlayer').src = track.url;
    if (state.playing) $('#audioPlayer').play();
  }
}

function togglePlay() {
  state.playing = !state.playing;
  $('#playButton').textContent = state.playing ? 'Ⅱ' : '▶';
  const audio = $('#audioPlayer');
  if (audio.src) state.playing ? audio.play() : audio.pause();
}

function openLinkModal() {
  $('#linkPage').value = state.page;
  $('#linkEndPage').value = state.page;
  $('#linkTime').value = $('#currentTime').textContent;
  $('#modalBackdrop').hidden = false;
  setTimeout(() => $('#linkName').focus(), 50);
}

$('#prevPage').addEventListener('click', () => setPage(state.page - 1));
$('#nextPage').addEventListener('click', () => setPage(state.page + 1));
$('#pageNumber').addEventListener('change', (event) => setPage(event.target.value));
$('#playButton').addEventListener('click', togglePlay);
$('#previousTrack').addEventListener('click', () => setTrack(state.track - 1));
$('#nextTrack').addEventListener('click', () => setTrack(state.track + 1));
$('#back15').addEventListener('click', () => { $('#audioPlayer').currentTime = Math.max(0, ($('#audioPlayer').currentTime || +$('#progress').value) - 15); });
$('#forward15').addEventListener('click', () => { $('#audioPlayer').currentTime = Math.min(+$('#progress').max, ($('#audioPlayer').currentTime || +$('#progress').value) + 15); });
$('#progress').addEventListener('input', (event) => { $('#currentTime').textContent = formatTime(event.target.value); if ($('#audioPlayer').src) $('#audioPlayer').currentTime = event.target.value; });
$('#audioPlayer').addEventListener('timeupdate', (event) => { $('#progress').value = event.target.currentTime; $('#currentTime').textContent = formatTime(event.target.currentTime); });
$('#audioPlayer').addEventListener('ended', () => setTrack(state.track + 1));

$$('.lesson').forEach((lesson) => lesson.addEventListener('click', () => setTrack(+lesson.dataset.track)));
$$('.passage').forEach((passage) => passage.addEventListener('click', () => {
  $$('.passage').forEach((item) => item.classList.remove('active'));
  passage.classList.add('active');
  setPage(passage.dataset.page);
  $('#progress').value = passage.dataset.time;
  $('#currentTime').textContent = formatTime(passage.dataset.time);
  if ($('#audioPlayer').src) $('#audioPlayer').currentTime = passage.dataset.time;
}));

$$('.language-switch button').forEach((button) => button.addEventListener('click', () => {
  $$('.language-switch button').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  $$('[data-de]').forEach((node) => { node.innerHTML = node.dataset[button.dataset.language]; });
  document.documentElement.lang = button.dataset.language;
}));

$('#zoomIn').addEventListener('click', () => { state.zoom = Math.min(150, state.zoom + 10); $('.zoom-value').textContent = `${state.zoom}%`; $('#samplePage').style.transform = `scale(${state.zoom / 100})`; });
$('#zoomOut').addEventListener('click', () => { state.zoom = Math.max(70, state.zoom - 10); $('.zoom-value').textContent = `${state.zoom}%`; $('#samplePage').style.transform = `scale(${state.zoom / 100})`; });
$('#fitButton').addEventListener('click', () => { state.zoom = 100; $('.zoom-value').textContent = '100%'; $('#samplePage').style.transform = ''; });
$('#speedButton').addEventListener('click', () => { state.speedIndex = (state.speedIndex + 1) % speeds.length; const speed = speeds[state.speedIndex]; $('#speedButton').textContent = `${speed}×`; $('#audioPlayer').playbackRate = speed; });

['#newLinkButton', '#floatingLink'].forEach((selector) => $(selector).addEventListener('click', openLinkModal));
['#closeModal', '#cancelModal'].forEach((selector) => $(selector).addEventListener('click', () => { $('#modalBackdrop').hidden = true; }));
$('#modalBackdrop').addEventListener('click', (event) => { if (event.target === $('#modalBackdrop')) $('#modalBackdrop').hidden = true; });
$('#linkForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const start = $('#linkPage').value;
  const end = $('#linkEndPage').value;
  const button = document.createElement('button');
  button.className = 'passage'; button.dataset.page = start; button.dataset.time = $('#linkTime').value.split(':').reduce((m, s) => m * 60 + +s, 0);
  button.innerHTML = `<span><b>${$('#linkName').value}</b><small>Page${start === end ? '' : 's'} ${start}${start === end ? '' : `–${end}`}</small></span><time>${$('#linkTime').value}</time>`;
  button.addEventListener('click', () => setPage(start));
  $('#passageList').appendChild(button);
  $('#modalBackdrop').hidden = true;
  event.target.reset();
});

function choosePdf() { $('#pdfFile').click(); }
$('#addBookButton').addEventListener('click', choosePdf);
$('#changePdf').addEventListener('click', choosePdf);
$('#pdfFile').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  pdfUrl = URL.createObjectURL(file);
  $('#bookTitle').textContent = file.name.replace(/\.pdf$/i, '');
  $('#samplePage').style.display = 'none';
  $('#pdfFrame').style.display = 'block';
  setPage(1);
});

$('#importAudioButton').addEventListener('click', () => $('#audioFiles').click());
$('#audioFiles').addEventListener('change', (event) => {
  tracks = [...event.target.files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map((file) => ({ name: file.name.replace(/\.[^.]+$/, ''), duration: 0, url: URL.createObjectURL(file) }));
  if (!tracks.length) return;
  $('#lessonList').innerHTML = '';
  tracks.forEach((track, index) => {
    const button = document.createElement('button'); button.className = `lesson${index === 0 ? ' active' : ''}`; button.dataset.track = index;
    button.innerHTML = `<span class="${index ? 'lesson-number' : 'lesson-play'}">${index ? String(index + 1).padStart(2, '0') : '▶'}</span><span><b>${track.name}</b><small>MP3 lesson</small></span><i>⋮</i>`;
    button.addEventListener('click', () => setTrack(index)); $('#lessonList').appendChild(button);
  });
  setTrack(0);
});

$('#mobileLibrary').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
