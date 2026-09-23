const audio = document.querySelector('#audio');
const playButton = document.querySelector('#playButton');
const seek = document.querySelector('#seek');
const elapsed = document.querySelector('#elapsed');
const durationLabel = document.querySelector('#duration');
const pageNumber = document.querySelector('#pageNumber');
const currentPage = document.querySelector('#currentPage');
const syncPage = document.querySelector('#syncPage');
let page = Number(localStorage.getItem('reader-page')) || 42;
let previewTime = Number(localStorage.getItem('audio-progress')) || 1104;
let tracks = [];
let currentTrack = 0;

const formatTime = (value) => {
  if (!Number.isFinite(value)) return '0:00';
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, '0');
  return hours ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
};

const updatePage = () => {
  [pageNumber, currentPage, syncPage].forEach((element) => { element.textContent = page; });
  document.querySelector('.page-number').textContent = page;
  localStorage.setItem('reader-page', page);
};

const showToast = (message) => {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2200);
};

playButton.addEventListener('click', async () => {
  if (!audio.src) {
    document.querySelector('#audioInput').click();
    return;
  }
  if (audio.paused) await audio.play(); else audio.pause();
});
audio.addEventListener('play', () => { playButton.classList.add('playing'); playButton.ariaLabel = 'Pause'; });
audio.addEventListener('pause', () => { playButton.classList.remove('playing'); playButton.ariaLabel = 'Play'; });
audio.addEventListener('loadedmetadata', () => {
  audio.currentTime = Math.min(previewTime, audio.duration || 0);
  durationLabel.textContent = formatTime(audio.duration);
});
audio.addEventListener('timeupdate', () => {
  previewTime = audio.currentTime;
  seek.value = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
  elapsed.textContent = formatTime(audio.currentTime);
  document.querySelector('#syncTime').textContent = formatTime(audio.currentTime);
  localStorage.setItem('audio-progress', Math.floor(audio.currentTime));
});
seek.addEventListener('input', () => {
  if (audio.duration) audio.currentTime = (seek.value / 100) * audio.duration;
});
document.querySelectorAll('[data-skip]').forEach((button) => button.addEventListener('click', () => {
  if (audio.src) audio.currentTime = Math.max(0, Math.min(audio.duration || Infinity, audio.currentTime + Number(button.dataset.skip)));
}));
const naturalSort = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const loadTrack = (index, autoplay = false) => {
  if (!tracks[index]) return;
  if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
  currentTrack = index;
  audio.src = URL.createObjectURL(tracks[index]);
  document.querySelector('#chapterTitle').textContent = tracks[index].name.replace(/\.[^.]+$/, '');
  document.querySelector('#trackPosition').textContent = `Track ${index + 1} of ${tracks.length}`;
  document.querySelectorAll('.track-list button').forEach((button, buttonIndex) => {
    button.classList.toggle('active', buttonIndex === index);
    button.setAttribute('aria-current', buttonIndex === index ? 'true' : 'false');
  });
  localStorage.setItem('audio-track', String(index));
  previewTime = 0;
  if (autoplay) audio.play();
};

document.querySelector('#audioInput').addEventListener('change', (event) => {
  tracks = [...event.target.files]
    .filter((file) => file.type.startsWith('audio/') || /\.(mp3|m4a|wav|aac|ogg)$/i.test(file.name))
    .sort((a, b) => naturalSort.compare(a.webkitRelativePath || a.name, b.webkitRelativePath || b.name));
  if (!tracks.length) {
    showToast('No audio files found in that folder');
    return;
  }
  const list = document.querySelector('#trackList');
  list.replaceChildren(...tracks.map((track, index) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = `<span>${index + 1}</span><strong>${track.name.replace(/\.[^.]+$/, '')}</strong>`;
    button.addEventListener('click', () => loadTrack(index, true));
    item.append(button);
    return item;
  }));
  const path = tracks[0].webkitRelativePath;
  document.querySelector('#folderName').textContent = path ? path.split('/')[0] : 'Selected audiobook';
  document.querySelector('#playlistSummary').hidden = false;
  document.querySelector('.audio-upload strong').textContent = `${tracks.length} audio ${tracks.length === 1 ? 'file' : 'files'} loaded`;
  document.querySelector('.audio-upload small').textContent = 'Tap to choose a different folder';
  loadTrack(Math.min(Number(localStorage.getItem('audio-track')) || 0, tracks.length - 1));
  showToast(`${tracks.length} tracks loaded in filename order`);
});
audio.addEventListener('ended', () => {
  if (currentTrack < tracks.length - 1) loadTrack(currentTrack + 1, true);
});
document.querySelector('#showTracks').addEventListener('click', (event) => {
  const list = document.querySelector('#trackList');
  list.hidden = !list.hidden;
  event.currentTarget.setAttribute('aria-expanded', String(!list.hidden));
});

const speeds = [1, 1.25, 1.5, 1.75, 2, .75];
document.querySelector('#speedButton').addEventListener('click', (event) => {
  const current = speeds.indexOf(audio.playbackRate);
  audio.playbackRate = speeds[(current + 1) % speeds.length];
  event.currentTarget.textContent = `${audio.playbackRate}×`;
});
document.querySelector('#volumeButton').addEventListener('click', (event) => {
  audio.muted = !audio.muted;
  event.currentTarget.style.opacity = audio.muted ? '.35' : '1';
  event.currentTarget.ariaLabel = audio.muted ? 'Unmute' : 'Mute';
});

document.querySelector('#previousPage').addEventListener('click', () => { page = Math.max(1, page - 1); updatePage(); });
document.querySelector('#nextPage').addEventListener('click', () => { page = Math.min(180, page + 1); updatePage(); });
document.querySelector('#bookmarkButton').addEventListener('click', (event) => {
  const active = event.currentTarget.getAttribute('aria-pressed') === 'true';
  event.currentTarget.setAttribute('aria-pressed', String(!active));
  event.currentTarget.style.background = !active ? '#d36b43' : '';
  event.currentTarget.style.color = !active ? 'white' : '';
  showToast(!active ? `Page ${page} bookmarked` : 'Bookmark removed');
});
document.querySelector('#syncButton').addEventListener('click', () => {
  const sync = { page, time: Math.floor(audio.currentTime || previewTime), savedAt: Date.now() };
  localStorage.setItem('last-sync', JSON.stringify(sync));
  document.querySelector('#syncStatus').innerHTML = '<span></span> Synced just now';
  showToast(`Page ${page} synced to ${formatTime(sync.time)}`);
});
document.querySelector('#pdfInput').addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (!file) return;
  document.querySelector('#paper').hidden = true;
  const viewer = document.querySelector('#pdfViewer');
  viewer.src = URL.createObjectURL(file);
  viewer.hidden = false;
  showToast('PDF opened');
});
document.querySelector('#settingsButton').addEventListener('click', () => document.querySelector('#settingsDialog').showModal());
document.querySelector('#textSize').addEventListener('input', (event) => { document.querySelector('.paper').style.fontSize = `${event.target.value}px`; });
document.querySelectorAll('.nav-button').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.nav-button').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  if (button.dataset.view === 'library') document.querySelector('.chapter-section').scrollIntoView();
}));

updatePage();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js'));

window.AudiobookSync = { formatTime };
