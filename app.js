const $ = (s) => document.querySelector(s);
const state = { tracks: [], currentTrack: -1, links: JSON.parse(localStorage.getItem('zwischenzeilen-links') || '[]'), page: 1, follow: true, pdfUrl: null };
const audio = $('#audio');

function showReader() { $('#emptyState').hidden = true; $('#reader').hidden = false; $('#player').hidden = false; }
function toast(message) { const el=$('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(el.timer); el.timer=setTimeout(()=>el.classList.remove('show'),2200); }
function formatTime(value) { if (!Number.isFinite(value)) return '0:00'; return `${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}`; }
function naturalSort(a,b) { return a.name.localeCompare(b.name, undefined, {numeric:true,sensitivity:'base'}); }

$('#pdfInput').addEventListener('change', (event) => {
  const file=event.target.files[0]; if(!file)return; showReader();
  if(state.pdfUrl) URL.revokeObjectURL(state.pdfUrl); state.pdfUrl=URL.createObjectURL(file);
  $('#pdfFrame').src=`${state.pdfUrl}#page=${state.page}&view=FitH`; $('#pdfPlaceholder').hidden=true; $('#documentName').textContent=file.name;
  $('#bookTitle').textContent=file.name.replace(/\.pdf$/i,''); toast('PDF ready to read');
});

$('#audioInput').addEventListener('change', (event) => {
  state.tracks=[...event.target.files].filter(f=>f.type.startsWith('audio/')||/\.(mp3|m4a|wav|aac|ogg)$/i.test(f.name)).sort(naturalSort).map((file,i)=>({file,name:file.name.replace(/\.[^.]+$/,''),url:URL.createObjectURL(file),number:i+1}));
  if(!state.tracks.length){toast('No audio files found');return} showReader(); renderTracks(); populateTrackSelect(); selectTrack(0); toast(`${state.tracks.length} audio files added`);
});

function renderTracks(){ $('#trackList').innerHTML=state.tracks.map((t,i)=>`<button class="track ${i===state.currentTrack?'active':''}" data-index="${i}"><span class="num">${String(i+1).padStart(2,'0')}</span><strong>${escapeHtml(t.name)}</strong><small>MP3</small></button>`).join(''); document.querySelectorAll('.track').forEach(b=>b.onclick=()=>selectTrack(+b.dataset.index)); }
function selectTrack(index, autoplay=false){const track=state.tracks[index];if(!track)return;state.currentTrack=index;audio.src=track.url;$('#nowTitle').textContent=track.name;$('#nowFile').textContent=`Lesson ${String(index+1).padStart(2,'0')} · ${track.file.name}`;renderTracks();if(autoplay)audio.play();}
function populateTrackSelect(){ $('#linkTrack').innerHTML=state.tracks.map((t,i)=>`<option value="${i}">${String(i+1).padStart(2,'0')} · ${escapeHtml(t.name)}</option>`).join(''); }

$('#playBtn').onclick=()=>{if(state.currentTrack<0){toast('Add an audio folder first');return} audio.paused?audio.play():audio.pause()};
audio.addEventListener('play',()=>$('#playBtn').textContent='Ⅱ'); audio.addEventListener('pause',()=>$('#playBtn').textContent='▶');
audio.addEventListener('loadedmetadata',()=>{$('#duration').textContent=formatTime(audio.duration);$('#seek').max=Math.floor(audio.duration)});
audio.addEventListener('timeupdate',()=>{$('#currentTime').textContent=formatTime(audio.currentTime);$('#seek').value=audio.currentTime; syncPassage();});
$('#seek').oninput=e=>audio.currentTime=+e.target.value; $('#backBtn').onclick=()=>audio.currentTime=Math.max(0,audio.currentTime-15); $('#forwardBtn').onclick=()=>audio.currentTime=Math.min(audio.duration||0,audio.currentTime+15);

function goToPage(page){state.page=Math.max(1,+page||1);$('#pageNumber').value=state.page;if(state.pdfUrl)$('#pdfFrame').src=`${state.pdfUrl}#page=${state.page}&view=FitH`;}
$('#pageNumber').onchange=e=>goToPage(e.target.value);$('#prevPage').onclick=()=>goToPage(state.page-1);$('#nextPage').onclick=()=>goToPage(state.page+1);
function syncPassage(){if(!state.follow||state.currentTrack<0)return;const candidates=state.links.filter(l=>l.track===state.currentTrack&&l.seconds<=audio.currentTime).sort((a,b)=>b.seconds-a.seconds);document.querySelectorAll('.passage-link').forEach(e=>e.classList.toggle('active',candidates[0]&&e.dataset.id===candidates[0].id));if(candidates[0]&&state.page!==candidates[0].page)goToPage(candidates[0].page);}
$('#syncBtn').onclick=()=>{state.follow=!state.follow;$('#syncBtn').classList.toggle('off',!state.follow);$('#syncBtn small').textContent=state.follow?'ON':'OFF';toast(state.follow?'Page following enabled':'Page following paused')};

function renderLinks(){const list=$('#linksList');if(!state.links.length){list.innerHTML='<div class="empty-links">No links yet.<br>Connect a timestamp to any page.</div>';return}list.innerHTML=state.links.map(l=>`<article class="passage-link" data-id="${l.id}" tabindex="0"><button data-delete="${l.id}" aria-label="Delete">×</button><strong>${escapeHtml(l.label)}</strong><small>Page ${l.page} · ${formatTime(l.seconds)} · Track ${l.track+1}</small></article>`).join('');document.querySelectorAll('.passage-link').forEach(el=>el.onclick=(e)=>{if(e.target.dataset.delete){state.links=state.links.filter(l=>l.id!==e.target.dataset.delete);saveLinks();return}const l=state.links.find(x=>x.id===el.dataset.id);goToPage(l.page);if(state.tracks[l.track]){selectTrack(l.track);audio.currentTime=l.seconds;}});}
function saveLinks(){localStorage.setItem('zwischenzeilen-links',JSON.stringify(state.links));renderLinks()}
$('#addLinkBtn').onclick=()=>{if(!state.tracks.length){toast('Add audio files before creating a link');return}$('#linkPage').value=state.page;$('#linkTime').value=formatTime(audio.currentTime);$('#linkTrack').value=Math.max(0,state.currentTrack);$('#linkDialog').showModal()};
$('#saveLink').onclick=(e)=>{e.preventDefault();if(!$('#linkForm').reportValidity())return;const parts=$('#linkTime').value.split(':').map(Number);const seconds=parts.length===2?parts[0]*60+parts[1]:parts[0];if(!Number.isFinite(seconds)){toast('Use time format mm:ss');return}state.links.push({id:crypto.randomUUID(),label:$('#linkLabel').value,page:+$('#linkPage').value,seconds,track:+$('#linkTrack').value});state.links.sort((a,b)=>a.track-b.track||a.seconds-b.seconds);saveLinks();$('#linkDialog').close();$('#linkLabel').value='';toast('Passage link saved')};

$('#menuBtn').onclick=()=>$('#chaptersPanel').classList.add('open');$('#closeMenu').onclick=()=>$('#chaptersPanel').classList.remove('open');$('#themeBtn').onclick=()=>document.body.classList.toggle('dark');$('#languageBtn').onclick=()=>toast('Book content supports Deutsch & English');
$('#demoBtn').onclick=()=>{showReader();state.links=[{id:'demo-1',label:'Begrüßung · Welcome',page:1,seconds:0,track:0},{id:'demo-2',label:'Übung · Exercise',page:4,seconds:75,track:0}];saveLinks();$('#bookTitle').textContent='Sample language course';toast('Sample reading map loaded — add your files')};
function escapeHtml(value){const d=document.createElement('div');d.textContent=value;return d.innerHTML}renderLinks();

if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
