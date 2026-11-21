/** LinkedLOL — zero dependencies, zero backend, just memes. */
import { matchesTitle } from './search.mjs';
const $ = (selector) => document.querySelector(selector);
const PAGE_SIZE = 20;
const state = { all: [], filtered: [], rendered: 0, currentId: null, sort: 'recent', zoomed: false, scrollY: 0, ready: false };
const ui = {
  galleryPage: $('#gallery-page'), readerPage: $('#reader-page'), grid: $('#gallery-grid'),
  stateBox: $('#state-box'), sentinel: $('#load-sentinel'), more: $('#load-more'),
  search: $('#search-input'), clear: $('#clear-search'), sort: $('#sort-select'),
  gridBtn: $('#grid-btn'), slideBtn: $('#slide-btn'), total: $('#hero-total'),
  count: $('#visible-count'), back: $('#reader-back'), prev: $('#prev-btn'), next: $('#next-btn'),
  currentNum: $('#reader-index'), readerTotal: $('#reader-total'), readerTitle: $('#reader-title'),
  image: $('#reader-image'), stage: $('#reader-stage'), imageScroll: $('#reader-image-scroll'),
  filmstrip: $('#filmstrip'), original: $('#original-link'), zoom: $('#zoom-btn'),
  zoomLabel: $('#zoom-label'), share: $('#share-btn'), shareLabel: $('#share-label'),
  theme: $('#theme-toggle'), toast: $('#toast'),
};

function setTheme(dark) {
  document.body.dataset.theme = dark ? 'dark' : 'light';
  ui.theme.setAttribute('aria-label', dark ? 'Activer le mode clair' : 'Activer le mode sombre');
  ui.theme.title = dark ? 'Activer le mode clair' : 'Activer le mode sombre';
  ui.theme.innerHTML = dark
    ? '<svg width="19" height="19" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
    : '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/></svg>';
  try { localStorage.setItem('linkedlol-theme', dark ? 'dark' : 'light'); } catch { /* storage disabled */ }
}
function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem('linkedlol-theme'); } catch { /* storage disabled */ }
  setTheme(saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function formattedDate(item) {
  if (!item.addedAt) return 'ARCHIVE';
  const date = new Date(item.addedAt);
  return isNaN(date.valueOf()) ? 'ARCHIVE' : new Intl.DateTimeFormat('fr-FR',{month:'short',year:'numeric'}).format(date);
}
function sorted(list) {
  const copy = [...list];
  if (state.sort === 'az') copy.sort((a,b) => a.title.localeCompare(b.title,'fr',{numeric:true}));
  else if (state.sort === 'za') copy.sort((a,b) => b.title.localeCompare(a.title,'fr',{numeric:true}));
  else copy.sort((a,b) => (b.addedAt??'').localeCompare(a.addedAt??'') || a.title.localeCompare(b.title,'fr',{numeric:true}));
  return copy;
}
function showState(type, query = '') {
  ui.stateBox.hidden = false;
  if (type === 'empty') {
    ui.stateBox.innerHTML = `<div><div class="empty-illustration" aria-hidden="true"><div class="empty-frame">✳️</div><div class="empty-frame second">💬</div><div class="empty-frame front">😂</div></div><h3>La LOLlection attend ses premières pépites.</h3><p>Ajoute des captures d’écran dans le dossier <code>images/</code> du dépôt GitHub. Un commit suffit : la galerie sera alimentée automatiquement lors de la publication.</p><span class="count-pill" style="display:inline-flex">✨ Prête pour le premier fou rire</span></div>`;
  } else if (type === 'nomatch') {
    ui.stateBox.innerHTML = `<div><div class="empty-illustration" aria-hidden="true"><div class="empty-frame front">🔍</div></div><h3>Pas de LOL trouvé. Pour le moment.</h3><p>Aucun nom de fichier ne contient les mots <strong>${escapeHtml(query)}</strong>. Essaie une partie du titre ou moins de mots-clés.</p><button class="state-cta" id="reset-search" type="button">Effacer la recherche</button></div>`;
    $('#reset-search').addEventListener('click', () => {ui.search.value='';updateResults();ui.search.focus();});
  } else {
    ui.stateBox.innerHTML = `<div><div class="empty-illustration" aria-hidden="true"><div class="empty-frame front">⚠️</div></div><h3>La galerie n’a pas pu charger.</h3><p>Impossible de lire le catalogue des images. Relance la page ; si le problème persiste, vérifie que la publication GitHub Pages a réussi.</p><button type="button" class="state-cta" id="retry-load">Réessayer</button></div>`;
    $('#retry-load').addEventListener('click',loadCatalog);
  }
}
function makeCard(item, position) {
  const article = document.createElement('article');
  article.className = 'meme-card';
  article.style.animationDelay = `${Math.min(position%20,10)*20}ms`;
  const ratio = item.width && item.height ? item.height / item.width : 1;
  // Keep long screenshots legible as thumbnails without dominating the grid.
  const height = Math.max(155,Math.min(340,Math.round(236 * ratio)));
  article.innerHTML = `<button class="meme-card-button" type="button" aria-label="Voir ${escapeHtml(item.title)}"><div class="meme-thumb" style="--card-height:${height}px"><img src="${escapeHtml(item.thumb || item.file)}" alt="" ${position<6?'loading="eager"':'loading="lazy"'} decoding="async" width="${Number(item.width)||600}" height="${Number(item.height)||600}"><span class="zoom-chip" aria-hidden="true">↗ Ouvrir</span></div><div class="meme-info"><span class="meme-name">${escapeHtml(item.title)}</span><div class="meme-meta"><span class="meme-date">${escapeHtml(formattedDate(item))}</span><span class="format">${escapeHtml((item.format||'IMG').toUpperCase())}</span></div></div></button>`;
  article.querySelector('button').addEventListener('click',() => openReader(item.id));
  const image = article.querySelector('img');
  image.addEventListener('error',() => { if(image.src !== new URL(item.file,location.href).href) image.src = item.file; },{once:true});
  return article;
}
function appendBatch() {
  if (!ui.galleryPage || ui.galleryPage.hidden || !state.filtered.length) return;
  const page = state.filtered.slice(state.rendered,state.rendered+PAGE_SIZE);
  if (!page.length) {ui.more.hidden = true;return;}
  const fragment = document.createDocumentFragment();
  page.forEach((item,i) => fragment.append(makeCard(item,state.rendered+i)));
  ui.grid.append(fragment);
  state.rendered += page.length;
  ui.more.hidden = state.rendered >= state.filtered.length;
}
function updateResults() {
  const query = ui.search.value.trim();
  ui.clear.hidden = !query;
  state.filtered = sorted(state.all.filter(item=>matchesTitle(item.title,query)));
  state.rendered = 0;
  ui.grid.replaceChildren();
  ui.count.innerHTML = `<strong>${state.filtered.length}</strong> ${state.filtered.length===1?'pépite':'pépites'} ${query?'trouvées': 'archivées'}`;
  ui.stateBox.hidden = true;
  ui.more.hidden = true;
  if (!state.filtered.length) showState(state.all.length ? 'nomatch' : 'empty',query);
  else appendBatch();
}
function activeCollection() {
  return state.filtered.some(item=>item.id===state.currentId) ? state.filtered : sorted(state.all);
}
function showReaderItem(id, updateUrl = true) {
  const item = state.all.find(i=>i.id===id);
  if (!item) return;
  state.currentId = id;
  state.zoomed = false;
  ui.stage.classList.remove('is-zoomed');
  ui.zoom.setAttribute('aria-pressed','false');
  ui.zoomLabel.textContent='Agrandir';
  const collection = activeCollection();
  const index = collection.findIndex(i=>i.id===id);
  ui.currentNum.textContent = index+1;
  ui.readerTotal.textContent = collection.length;
  ui.readerTitle.textContent = item.title;
  ui.image.alt = item.title;
  ui.image.src = item.file;
  ui.original.href = item.file;
  ui.imageScroll.scrollTo({top:0,left:0,behavior:'instant'});
  ui.prev.disabled = collection.length<2;
  ui.next.disabled = collection.length<2;
  makeFilmstrip(collection,index);
  if (updateUrl && location.hash !== `#m/${encodeURIComponent(id)}`) location.hash = `m/${encodeURIComponent(id)}`;
}
function makeFilmstrip(collection,index) {
  ui.filmstrip.replaceChildren();
  const start = Math.max(0,Math.min(index-3,collection.length-7));
  collection.slice(start,start+7).forEach(item=>{
    const button = document.createElement('button');
    button.type='button';
    button.className=`film-btn ${item.id===state.currentId?'active':''}`;
    button.title=item.title;
    button.setAttribute('aria-label',item.title);
    button.setAttribute('aria-current',String(item.id===state.currentId));
    const img=document.createElement('img');img.src=item.thumb||item.file;img.alt='';img.loading='lazy';
    button.append(img);button.addEventListener('click',()=>showReaderItem(item.id));
    ui.filmstrip.append(button);
  });
}
function openReader(id, updateUrl = true) {
  const item = state.all.find(i=>i.id===id);
  if(!item) return;
  if(ui.readerPage.hidden) state.scrollY=window.scrollY;
  ui.galleryPage.hidden = true;
  ui.readerPage.hidden = false;
  ui.gridBtn.classList.remove('active');ui.gridBtn.setAttribute('aria-pressed','false');
  ui.slideBtn.classList.add('active');ui.slideBtn.setAttribute('aria-pressed','true');
  document.body.classList.add('reader-active');
  showReaderItem(id,updateUrl);
  window.scrollTo({top:0,behavior:'instant'});
}
function closeReader(updateUrl=true) {
  if(ui.readerPage.hidden) return;
  ui.readerPage.hidden=true;ui.galleryPage.hidden=false;
  ui.gridBtn.classList.add('active');ui.gridBtn.setAttribute('aria-pressed','true');
  ui.slideBtn.classList.remove('active');ui.slideBtn.setAttribute('aria-pressed','false');
  document.body.classList.remove('reader-active');
  state.currentId=null;
  if(updateUrl && location.hash !== '#gallery') location.hash='gallery';
  requestAnimationFrame(()=>window.scrollTo({top:state.scrollY,behavior:'instant'}));
}
function navigate(step) {
  const collection = activeCollection();
  if(collection.length<2)return;
  const index = collection.findIndex(i=>i.id===state.currentId);
  if(index<0)return;
  showReaderItem(collection[(index+step+collection.length)%collection.length].id);
}
function route() {
  if(!state.ready) return;
  if(location.hash.startsWith('#m/')) {
    let id;
    try { id = decodeURIComponent(location.hash.slice(3)); } catch { id=null; }
    if(state.all.some(i=>i.id===id)) {openReader(id,false);return;}
  }
  closeReader(false);
}
async function copyLink() {
  const url=location.href;
  try {
    await navigator.clipboard.writeText(url);
    ui.shareLabel.textContent='Lien copié !';
    toast('Lien du mème copié ✨');
    setTimeout(()=>ui.shareLabel.textContent='Copier le lien',1800);
  } catch { toast('Impossible de copier : utilise l’adresse du navigateur.'); }
}
let toastTimer;
function toast(message) {
  ui.toast.textContent=message;ui.toast.classList.add('show');clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),2600);
}
async function loadCatalog() {
  ui.count.textContent='Chargement…';
  ui.stateBox.hidden=true;
  try {
    const response = await fetch('./manifest.json',{cache:'no-store'});
    if(!response.ok) throw new Error(`manifest: ${response.status}`);
    const manifest=await response.json();
    if(!Array.isArray(manifest.items)) throw new Error('Invalid manifest');
    state.all=manifest.items.filter(item=>item && typeof item.id==='string' && typeof item.file==='string' && typeof item.title==='string');
    state.ready=true;
    ui.total.textContent=state.all.length;
    updateResults();
    route();
  } catch(error) {console.error('LinkedLOL: failed to load manifest:',error);showState('error');ui.count.textContent='Indisponible';}
}

ui.search.addEventListener('input', updateResults);
ui.clear.addEventListener('click',()=>{ui.search.value='';updateResults();ui.search.focus();});
ui.sort.addEventListener('change',()=>{state.sort=ui.sort.value;updateResults();});
ui.gridBtn.addEventListener('click',()=>closeReader());
ui.slideBtn.addEventListener('click',()=>{if(state.filtered.length) openReader(state.currentId || state.filtered[0].id);else toast('Ajoute d’abord un mème à la galerie !');});
ui.back.addEventListener('click',()=>closeReader());
ui.prev.addEventListener('click',()=>navigate(-1));
ui.next.addEventListener('click',()=>navigate(1));
ui.zoom.addEventListener('click',()=>{state.zoomed=!state.zoomed;ui.stage.classList.toggle('is-zoomed',state.zoomed);ui.zoom.setAttribute('aria-pressed',String(state.zoomed));ui.zoomLabel.textContent=state.zoomed?'Ajuster':'Agrandir';ui.imageScroll.scrollTo({top:0,left:0,behavior:'instant'});});
ui.share.addEventListener('click',copyLink);
ui.more.addEventListener('click',appendBatch);
ui.theme.addEventListener('click',()=>setTheme(document.body.dataset.theme!=='dark'));
window.addEventListener('hashchange',route);
document.addEventListener('keydown',event=>{
  const editing = ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
  if(!ui.readerPage.hidden) {
    if(event.key==='ArrowLeft'){event.preventDefault();navigate(-1);}
    else if(event.key==='ArrowRight'){event.preventDefault();navigate(1);}
    else if(event.key==='Escape'){event.preventDefault();closeReader();}
  } else if(event.key==='/'&&!editing&&!event.altKey&&!event.ctrlKey&&!event.metaKey){event.preventDefault();ui.search.focus();}
});
let touchStart=null;
ui.imageScroll.addEventListener('touchstart',event=>{if(event.touches.length===1) touchStart={x:event.touches[0].clientX,y:event.touches[0].clientY};},{passive:true});
ui.imageScroll.addEventListener('touchend',event=>{
  if(!touchStart || event.changedTouches.length!==1) return;
  const dx=event.changedTouches[0].clientX-touchStart.x,dy=event.changedTouches[0].clientY-touchStart.y;
  if(Math.abs(dx)>55 && Math.abs(dx)>Math.abs(dy)*1.4) navigate(dx<0?1:-1);
  touchStart=null;
},{passive:true});
if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)) appendBatch();},{rootMargin:'600px'});
  observer.observe(ui.sentinel);
}
initTheme();
loadCatalog();
