import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource-variable/inter';
import '@fontsource-variable/sora';
import '@fontsource-variable/outfit';
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/unbounded';
import '@fontsource-variable/syne';
import '@fontsource-variable/playfair-display';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/jetbrains-mono';
import './styles.css';

import { initI18n, t, locale, LOCALES, localeHref } from './i18n/index.js';
import { FONTS, FORMATS, PRESETS, DEFAULT_STATE } from './data.js';
import { renderCard } from './render.js';
import { store, library, deepMerge, shareUrl, isFresh } from './state.js';
import { renderContent, renderStyle, refresh, bindControls } from './controls.js';
import { icon } from './icons.js';
import { scanContrast, randomStyle } from './color.js';
import { exportBlob, download, fileName, copyImage, verifyScan } from './export.js';

// The head script may already be moving this visitor to their language: don't start (or save) anything here.
if (window.__qrRedirect) await new Promise(() => {});
await initI18n();

const $ = (sel) => document.querySelector(sel);
const prefs = {
  get(k, d) { try { return localStorage.getItem(`qr-studio:${k}`) ?? d; } catch { return d; } },
  set(k, v) { try { v == null ? localStorage.removeItem(`qr-studio:${k}`) : localStorage.setItem(`qr-studio:${k}`, v); } catch {} },
};

function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    if (el.dataset.hydrated) return;
    el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon));
    el.dataset.hydrated = '1';
  });
}

// First visit: the starter card speaks the visitor's language.
if (isFresh) {
  const s = structuredClone(store.get());
  for (const k of ['eyebrow', 'title', 'description', 'cta']) s.text[k] = t(`default.${k}`);
  store.reset(s);
}

/* ---------- toasts ---------- */

function toast(message, { kind = 'info', action, onAction } = {}) {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  el.innerHTML = `<span>${message}</span>${action ? `<button type="button">${action}</button>` : ''}`;
  const close = () => { el.classList.remove('in'); setTimeout(() => el.remove(), 250); };
  el.querySelector('button')?.addEventListener('click', () => { onAction?.(); close(); });
  $('#toasts').appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(close, action ? 5000 : 2600);
}
const withUndo = (message) => toast(message, { action: t('toast.undo'), onAction: undo });

/* ---------- link ---------- */

function normalizeUrl(v) {
  v = v.trim();
  if (!v) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return v;
  if (/^[^\s/]+\.[^\s]{2,}/.test(v)) return `https://${v}`;
  return v;
}

function urlValidity(v) {
  if (!v) return 'empty';
  try {
    const u = new URL(v);
    if (/^https?:$/.test(u.protocol)) return /\.[a-z]{2,}$/i.test(u.hostname) || u.hostname === 'localhost' ? 'ok' : 'warn';
    return 'ok';
  } catch {
    return 'warn';
  }
}

const urlInput = $('#url');
function syncUrlField(force = false) {
  const s = store.get();
  if (force || document.activeElement !== urlInput) urlInput.value = s.url;
  const state = urlValidity(s.url);
  $('#urlField').dataset.state = state;
  $('#urlMeta').innerHTML =
    state === 'empty' ? t('link.empty')
    : state === 'warn' ? t('link.warn')
    : t('link.meta', { n: lastRender?.modules, chars: s.url.length });
}

urlInput.addEventListener('input', () => store.set('url', normalizeUrl(urlInput.value)));
urlInput.addEventListener('blur', () => syncUrlField(true));
urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') urlInput.blur(); });
$('#pasteBtn').addEventListener('click', async () => {
  try {
    const text = (await navigator.clipboard.readText()).trim();
    if (!text) return toast(t('toast.clipboardEmpty'));
    store.set('url', normalizeUrl(text));
    syncUrlField(true);
    toast(t('toast.pasted'));
  } catch {
    urlInput.focus();
    toast(t('toast.pasteDenied'), { kind: 'error' });
  }
});

/* ---------- preview ---------- */

const preview = $('#preview');
const stageScroll = $('#stageScroll');
let lastRender = null;
let zoom = null; // null = fit
let renderQueued = false;

function fitScale() {
  if (!lastRender) return 1;
  const r = stageScroll.getBoundingClientRect();
  const pad = r.width < 600 ? 48 : 112; // stage padding + room for crop marks
  return Math.max(0.05, Math.min((r.width - pad) / lastRender.width, (r.height - pad) / lastRender.height));
}

function applyZoom() {
  if (!lastRender) return;
  const scale = zoom ?? fitScale();
  const p = Math.round(scale * 100);
  preview.style.width = `${lastRender.width * scale}px`;
  preview.style.height = `${lastRender.height * scale}px`;
  const zv = $('#zoomValue');
  zv.textContent = `${p}%`;
  zv.setAttribute('aria-label', t(zoom == null ? 'zoom.ariaFit' : 'zoom.aria', { p }));
  zv.title = zv.getAttribute('aria-label');
}

function renderPreview() {
  renderQueued = false;
  const s = store.get();
  lastRender = renderCard(s, { id: 'pv' });
  preview.innerHTML = lastRender.svg;
  preview.classList.toggle('transparent', s.bg.type === 'none');
  preview.classList.toggle('rounded', s.card.radius > 0);
  const fmt = FORMATS[s.format];
  $('#sheetCaption').textContent = `${t(`format.${s.format}`)} ${fmt.ratio} · ${fmt.w} × ${fmt.h} px`;
  preview.setAttribute('aria-label', t('preview.aria', { url: s.url || t('preview.noLink') }));
  applyZoom();
  syncUrlField();
}

function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(renderPreview);
}

new ResizeObserver(() => applyZoom()).observe(stageScroll);

const ZOOMS = [0.1, 0.15, 0.2, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.5, 2];
function stepZoom(dir) {
  const cur = zoom ?? fitScale();
  const next = dir > 0 ? ZOOMS.find((z) => z > cur + 0.001) : [...ZOOMS].reverse().find((z) => z < cur - 0.001);
  if (next) { zoom = next; applyZoom(); }
}
$('#zoomIn').addEventListener('click', () => stepZoom(1));
$('#zoomOut').addEventListener('click', () => stepZoom(-1));
$('#zoomValue').addEventListener('click', () => { zoom = zoom == null ? 1 : null; applyZoom(); });
stageScroll.addEventListener('wheel', (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  e.preventDefault();
  zoom = Math.min(2, Math.max(0.1, (zoom ?? fitScale()) * (e.deltaY < 0 ? 1.08 : 0.92)));
  applyZoom();
}, { passive: false });

/* format switcher above the canvas */
const formatSeg = $('#formatSeg');
formatSeg.innerHTML = Object.entries(FORMATS).map(([k, f]) =>
  `<button type="button" role="radio" data-value="${k}" aria-checked="false" title="${f.w} × ${f.h} px">${t(`format.${k}`)}<small>${f.ratio}</small></button>`).join('');
formatSeg.addEventListener('click', (e) => {
  const b = e.target.closest('[data-value]');
  if (b) store.set('format', b.dataset.value);
});
function syncFormat() {
  formatSeg.querySelectorAll('[data-value]').forEach((b) => b.setAttribute('aria-checked', b.dataset.value === store.get().format));
}

/* ---------- scan verification ---------- */

let scanTimer, scanToken = 0, lastScan = null;
const badge = $('#scanBadge');

function setStatus(state, tag, detail = '') {
  badge.dataset.state = state;
  $('#scanTag').textContent = tag;
  $('#scanDetail').textContent = detail;
}

function scheduleScan() {
  clearTimeout(scanTimer);
  setStatus('checking', t('scan.checking'), $('#scanDetail').textContent);
  scanTimer = setTimeout(runScan, 500);
}

async function runScan() {
  const token = ++scanToken;
  const s = store.get();
  let result = { ok: false };
  try { result = await verifyScan(s); } catch (e) { console.warn(e); }
  if (token !== scanToken) return;
  const c = scanContrast(s);
  lastScan = { ...result, contrast: c, hasLogo: s.logo.type !== 'none', ecc: s.qr.ecc, modules: lastRender?.modules, empty: !s.url };

  const detail = t('scan.detail', { r: c.ratio.toFixed(1), n: lastScan.modules, ecc: s.qr.ecc });
  if (!s.url) setStatus('warn', t('scan.noLink'));
  else if (!result.ok) setStatus('fail', t('scan.fail'), detail);
  else if (c.ratio < 2) setStatus('fail', t('scan.lowContrast'), detail);
  else if (c.ratio < 3 || c.inverted) setStatus('warn', t('scan.warn'), detail);
  else setStatus('ok', t('scan.ok'), detail);
  if (!$('#scanPop').hidden) renderScanDetails();
}

function renderScanDetails() {
  const d = lastScan;
  if (!d) return;
  const row = (ok, title, text) =>
    `<li class="${ok === true ? 'ok' : ok === false ? 'bad' : 'warn'}">${icon(ok === true ? 'check' : 'warning')}<div><b>${title}</b><span>${text}</span></div></li>`;
  const tips = [];
  if (!d.empty && !d.ok) tips.push(t('tip.fail'));
  if (d.contrast.inverted) tips.push(t('tip.inverted'));
  if (d.hasLogo && d.ecc !== 'H') tips.push(t('tip.logo'));
  const r = d.contrast.ratio;
  const rs = r.toFixed(1);
  $('#scanDetails').innerHTML = `
    <ul class="checks">
      ${row(d.empty ? null : d.ok, t('scan.decode'), t(d.empty ? 'scan.decodeEmpty' : d.ok ? 'scan.decodeOk' : 'scan.decodeFail'))}
      ${row(r >= 4.5 ? true : r >= 3 ? null : false, t('scan.contrast', { r: rs }), t(r >= 4.5 ? 'scan.contrastGood' : r >= 3 ? 'scan.contrastOk' : 'scan.contrastBad'))}
      ${row(!d.contrast.inverted, t(d.contrast.inverted ? 'scan.inverted' : 'scan.polarity'), t(d.contrast.inverted ? 'scan.invertedText' : 'scan.polarityText'))}
      ${d.hasLogo ? row(d.ecc === 'H' ? true : null, t('scan.logo', { ecc: d.ecc }), t(d.ecc === 'H' ? 'scan.logoH' : 'scan.logoAdvice')) : ''}
      ${row(true, t('scan.grid', { n: d.modules }), t('scan.gridText'))}
    </ul>
    ${tips.length ? `<div class="tips">${tips.map((x) => `<p>${x}</p>`).join('')}</div>` : ''}`;
}

/* ---------- panes & simple / complete ---------- */

const app = $('#app');
const contentBody = $('#contentBody');
const styleBody = $('#styleBody');
let mode = prefs.get('mode', 'simple') === 'full' ? 'full' : 'simple';
const openSections = new Set((() => {
  try { return JSON.parse(prefs.get('open', 'null')) || ['layout', 'modules', 'qrcolor', 'background']; } catch { return ['modules']; }
})());

function renderPanes() {
  const s = store.get();
  const scrolls = [$('#contentPane').scrollTop, $('#stylePane').scrollTop];
  contentBody.innerHTML = renderContent(s, mode);
  styleBody.innerHTML = renderStyle(s, openSections, mode);
  $('#contentPane').scrollTop = scrolls[0];
  $('#stylePane').scrollTop = scrolls[1];
  syncFormat();
}

function setMode(next) {
  mode = next;
  prefs.set('mode', mode);
  app.dataset.mode = mode;
  $('#modeSeg').querySelectorAll('[data-value]').forEach((b) => b.setAttribute('aria-checked', b.dataset.value === mode));
  renderPanes();
}
$('#modeSeg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-value]');
  if (b && b.dataset.value !== mode) setMode(b.dataset.value);
});
styleBody.addEventListener('click', (e) => {
  if (e.target.closest('[data-mode="full"]')) setMode('full');
});

const paneOptions = {
  onUpload: handleUpload,
  onToggleSection(id, open) {
    open ? openSections.add(id) : openSections.delete(id);
    prefs.set('open', JSON.stringify([...openSections]));
  },
};
bindControls($('#contentPane'), store, paneOptions);
bindControls(styleBody, store, paneOptions);

app.querySelector('.mobile-tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-view]');
  if (!b) return;
  app.dataset.view = b.dataset.view;
  app.querySelectorAll('.mobile-tabs [data-view]').forEach((x) => x.setAttribute('aria-pressed', x === b));
});

/* ---------- presets & saved designs ---------- */

let appliedPreset = null;
const CONTENT_PATHS = /^(url|format|text\.(eyebrow|title|description|cta|showLink)|logo\.(type|icon|text|image))$/;

$('#presetGrid').innerHTML = PRESETS.map((p) => {
  const name = t(`preset.${p.id}`);
  return `<button type="button" class="preset" role="listitem" data-preset="${p.id}" aria-label="${t('preset.aria', { name })}"><span class="thumb"></span><span class="preset-name">${name}</span></button>`;
}).join('');

function markPreset() {
  document.querySelectorAll('[data-preset]').forEach((b) => b.setAttribute('aria-current', b.dataset.preset === appliedPreset));
}

function renderSaved() {
  const saved = library.list();
  $('#savedGrid').innerHTML = saved.length
    ? `<div class="presets">${saved.map((e) => `<div class="saved-item"><button type="button" class="preset" data-saved="${e.id}" aria-label="${t('saved.open', { name: e.name })}"><span class="thumb"></span><span class="preset-name">${e.name}</span></button><button type="button" class="icon-btn" data-delete="${e.id}" title="${t('saved.delete', { name: e.name })}" aria-label="${t('saved.delete', { name: e.name })}">${icon('trash', 14)}</button></div>`).join('')}</div>`
    : `<p class="empty">${t('saved.empty')}</p>`;
  renderThumbs();
}

let thumbTimer;
function renderThumbs() {
  const s = store.get();
  document.querySelectorAll('[data-preset] .thumb').forEach((el, i) => {
    const p = PRESETS.find((x) => x.id === el.parentElement.dataset.preset);
    el.innerHTML = renderCard(deepMerge(s, p.style), { id: `t${i}` }).svg;
  });
  const saved = library.list();
  document.querySelectorAll('[data-saved] .thumb').forEach((el, i) => {
    const e = saved.find((x) => x.id === el.parentElement.dataset.saved);
    if (e) el.innerHTML = renderCard(deepMerge(s, e.state), { id: `s${i}` }).svg;
  });
}

function applyStyle(patch, message, presetId = null) {
  store.replace(deepMerge(store.get(), patch));
  appliedPreset = presetId;
  markPreset();
  withUndo(message);
}

$('#stylePane').addEventListener('click', (e) => {
  const preset = e.target.closest('[data-preset]');
  if (preset) {
    const p = PRESETS.find((x) => x.id === preset.dataset.preset);
    return applyStyle(p.style, t('toast.preset', { name: t(`preset.${p.id}`) }), p.id);
  }
  const del = e.target.closest('[data-delete]');
  if (del) {
    library.remove(del.dataset.delete);
    renderSaved();
    return toast(t('toast.deleted'));
  }
  const saved = e.target.closest('[data-saved]');
  if (saved) {
    const entry = library.list().find((x) => x.id === saved.dataset.saved);
    if (entry) {
      store.replace(deepMerge(store.get(), entry.state));
      appliedPreset = null;
      markPreset();
      withUndo(t('toast.opened', { name: entry.name }));
    }
  }
});

function shuffle() {
  applyStyle(randomStyle(), t('toast.random'));
}

function saveDesign() {
  const s = store.get();
  const name = (s.text.title || s.url.replace(/^https?:\/\//, '') || t('saved.untitled')).slice(0, 28);
  const ok = library.save({ id: Date.now().toString(36), name, state: structuredClone(s) });
  if (!ok) return toast(t('toast.quota'), { kind: 'error' });
  renderSaved();
  toast(t('toast.saved', { name }));
}

/** Back to the starting design, keeping what the code says (link, texts, logo choice) and the format. */
function resetDesign() {
  const s = store.get();
  const d = structuredClone(DEFAULT_STATE);
  const next = {
    ...d,
    url: s.url,
    format: s.format,
    text: { ...d.text, eyebrow: s.text.eyebrow, title: s.text.title, description: s.text.description, cta: s.text.cta, showLink: s.text.showLink },
    logo: { ...d.logo, type: s.logo.type, icon: s.logo.icon, text: s.logo.text, image: s.logo.image },
  };
  if (next.logo.type !== 'none') next.qr.ecc = 'H';
  const { w, h } = FORMATS[s.format];
  if (w / h > 1.2) { next.layout = 'qr-right'; next.text.align = 'left'; }
  store.replace(next);
  appliedPreset = 'paper';
  markPreset();
  withUndo(t('toast.reset'));
}

$('#shuffleBtn').addEventListener('click', shuffle);
$('#resetBtn').addEventListener('click', resetDesign);
$('#saveBtn').addEventListener('click', saveDesign);

/* ---------- logo upload ---------- */

function readFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function downscale(dataUrl, max = 640) {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k);
  c.height = Math.round(img.naturalHeight * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}

async function handleUpload(file, path = 'logo.image') {
  if (!/^image\/(png|jpe?g|svg\+xml|webp|gif)$/.test(file.type)) return toast(t('toast.badType'), { kind: 'error' });
  if (file.size > 10 * 1024 * 1024) return toast(t('toast.tooBig'), { kind: 'error' });
  try {
    let url = await readFile(file);
    if (file.type !== 'image/svg+xml') url = await downscale(url);
    store.set(path, url, 'external');
    if (store.get().logo.type !== 'image') store.set('logo.type', 'image', 'external');
    ensureHighEcc();
    toast(t('toast.logo'));
  } catch {
    toast(t('toast.readFail'), { kind: 'error' });
  }
}

function ensureHighEcc() {
  if (store.get().qr.ecc !== 'H') {
    store.set('qr.ecc', 'H', 'external');
    toast(t('toast.ecc'));
  }
}

// Dropping an image anywhere on the canvas makes it the logo.
const stage = $('#stage');
let dragDepth = 0;
const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
stage.addEventListener('dragenter', (e) => { if (hasFiles(e)) { dragDepth++; stage.classList.add('dragging'); } });
stage.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; stage.classList.remove('dragging'); } });
stage.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
stage.addEventListener('drop', (e) => {
  e.preventDefault();
  dragDepth = 0;
  stage.classList.remove('dragging');
  const file = e.dataTransfer.files[0];
  if (file) handleUpload(file);
});

/* ---------- store wiring ---------- */

store.subscribe((s, origin, path) => {
  queueRender();
  scheduleScan();
  if (origin === 'external') {
    renderPanes();
  } else {
    refresh($('#contentPane'), s);
    refresh(styleBody, s);
  }
  if (path === 'format') syncFormat();
  if (origin === 'control' && path && !CONTENT_PATHS.test(path) && appliedPreset) { appliedPreset = null; markPreset(); }
  clearTimeout(thumbTimer);
  thumbTimer = setTimeout(renderThumbs, 350);
  if (path === 'layout' && /qr-(left|right)/.test(s.layout) && s.text.align === 'center') store.set('text.align', 'left', 'external');
  if (path === 'format') adaptLayoutToFormat(s);
  if (path === 'logo.type' && s.logo.type !== 'none' && !(s.logo.type === 'image' && !s.logo.image)) ensureHighEcc();
  updateHistoryButtons();
});

// Wide canvases read best side-by-side, tall ones stacked.
function adaptLayoutToFormat(s) {
  const { w, h } = FORMATS[s.format];
  const sideBySide = /qr-(left|right)/.test(s.layout);
  if (w / h > 1.2 && !sideBySide && s.layout !== 'qr-only') {
    store.set('layout', 'qr-right', 'external');
    if (s.text.align === 'center') store.set('text.align', 'left', 'external');
    withUndo(t('toast.landscape'));
  } else if (h >= w && sideBySide) {
    store.set('layout', 'qr-top', 'external');
    store.set('text.align', 'center', 'external');
    withUndo(t('toast.portrait'));
  }
}

function updateHistoryButtons() {
  $('#undoBtn').disabled = !store.canUndo();
  $('#redoBtn').disabled = !store.canRedo();
}
store.historyListeners.add(updateHistoryButtons);

function undo() { store.undo(); }
function redo() { store.redo(); }
$('#undoBtn').addEventListener('click', undo);
$('#redoBtn').addEventListener('click', redo);

/* ---------- appearance ---------- */

function setAppearance(m) {
  if (m === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = m;
  prefs.set('theme', m === 'system' ? null : m);
  $('#themeSeg').querySelectorAll('[data-value]').forEach((b) => b.setAttribute('aria-checked', b.dataset.value === m));
}
$('#themeSeg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-value]');
  if (b) setAppearance(b.dataset.value);
});

/* ---------- language ---------- */

$('#langCode').textContent = locale.toUpperCase();
$('#langList').innerHTML = LOCALES.map((l) =>
  `<a class="menu-item" role="menuitemradio" aria-checked="${l.code === locale}" href="${localeHref(l.code)}" hreflang="${l.hreflang}" lang="${l.hreflang}" data-lang="${l.code}"><span>${l.name}</span>${l.code === locale ? icon('check') : ''}</a>`).join('');
$('#langList').addEventListener('click', (e) => {
  const a = e.target.closest('[data-lang]');
  if (a) prefs.set('lang', a.dataset.lang); // remembered, so the root page stops auto-detecting
});
// The build writes these links into each page; fill them in during development.
if (!$('#langLinks').children.length) {
  $('#langLinks').innerHTML = LOCALES.filter((l) => l.code !== locale).map((l) =>
    `<li><a href="${localeHref(l.code)}" hreflang="${l.hreflang}" lang="${l.hreflang}">${l.name}</a></li>`).join('');
}
$('#langLinks').addEventListener('click', (e) => {
  const a = e.target.closest('a[hreflang]');
  if (a) prefs.set('lang', LOCALES.find((l) => l.hreflang === a.getAttribute('hreflang'))?.code);
});

/* ---------- popovers ---------- */

function openPopover(pop, anchor, placement = 'below-end') {
  closePopovers(pop);
  pop.hidden = false;
  const a = anchor.getBoundingClientRect();
  const w = pop.offsetWidth, h = pop.offsetHeight;
  const end = placement.endsWith('end') !== (document.dir === 'rtl');
  let left = end ? a.right - w : a.left;
  let top = placement.startsWith('above') ? a.top - h - 8 : a.bottom + 6;
  left = Math.max(12, Math.min(left, innerWidth - w - 12));
  top = Math.max(12, Math.min(top, innerHeight - h - 12));
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
  anchor.setAttribute('aria-expanded', 'true');
  pop._anchor = anchor;
  requestAnimationFrame(() => pop.classList.add('open'));
  pop.querySelector('[aria-checked="true"], button, a')?.focus({ preventScroll: true });
}

function closePopovers(except) {
  document.querySelectorAll('.pop').forEach((p) => {
    if (p === except || p.hidden) return;
    p.classList.remove('open');
    p.hidden = true;
    p._anchor?.setAttribute('aria-expanded', 'false');
  });
}

function togglePopover(pop, anchor, placement) {
  if (!pop.hidden) { closePopovers(); anchor.focus(); return; }
  openPopover(pop, anchor, placement);
}

document.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.pop, #exportBtn, #scanBadge, #menuBtn, #langBtn')) return;
  closePopovers();
});
document.querySelectorAll('.pop [data-close], dialog [data-close]').forEach((b) =>
  b.addEventListener('click', () => {
    const pop = b.closest('.pop');
    closePopovers();
    pop?._anchor?.focus();
    b.closest('dialog')?.close();
  }));

badge.addEventListener('click', () => {
  renderScanDetails();
  togglePopover($('#scanPop'), badge, 'above-start');
});
$('#menuBtn').addEventListener('click', () => togglePopover($('#menuPop'), $('#menuBtn')));
$('#langBtn').addEventListener('click', () => togglePopover($('#langPop'), $('#langBtn')));
$('#shortcutsBtn').addEventListener('click', () => { closePopovers(); $('#shortcuts').showModal(); });
$('#aboutLink').addEventListener('click', () => closePopovers());
$('#shortcuts').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });

/* ---------- export ---------- */

const exp = {
  format: prefs.get('expFormat', 'png'),
  scale: +prefs.get('expScale', '2'),
};

function syncExportUI() {
  const fmt = FORMATS[store.get().format];
  $('#expFormat').querySelectorAll('[role=radio]').forEach((b) => b.setAttribute('aria-checked', b.dataset.value === exp.format));
  $('#expScale').querySelectorAll('[role=radio]').forEach((b) => b.setAttribute('aria-checked', +b.dataset.value === exp.scale));
  $('#expScaleField').hidden = exp.format === 'svg';
  $('#expDims').textContent = `${fmt.w * exp.scale} × ${fmt.h * exp.scale} px`;
  $('#expName').textContent = fileName(store.get(), exp.format);
  $('#expFmt').textContent = exp.format.toUpperCase();
  $('#expHelp').textContent = t(`export.help.${exp.format}`);
}

$('#expFormat').addEventListener('click', (e) => {
  const b = e.target.closest('[data-value]');
  if (!b) return;
  exp.format = b.dataset.value;
  prefs.set('expFormat', exp.format);
  syncExportUI();
});
$('#expScale').addEventListener('click', (e) => {
  const b = e.target.closest('[data-value]');
  if (!b) return;
  exp.scale = +b.dataset.value;
  prefs.set('expScale', exp.scale);
  syncExportUI();
});

$('#exportBtn').addEventListener('click', () => {
  syncExportUI();
  togglePopover($('#exportPop'), $('#exportBtn'));
});

async function withBusy(btn, fn) {
  if (btn.classList.contains('busy')) return;
  btn.classList.add('busy');
  try { await fn(); } finally { btn.classList.remove('busy'); }
}

async function doDownload(btn = $('#downloadBtn')) {
  await withBusy(btn, async () => {
    try {
      const s = store.get();
      const blob = await exportBlob(s, exp.format, exp.scale);
      const name = fileName(s, exp.format);
      download(blob, name);
      toast(t('toast.downloaded', { name }));
    } catch (e) {
      console.error(e);
      toast(t('toast.exportFail'), { kind: 'error' });
    }
  });
}

$('#downloadBtn').addEventListener('click', () => doDownload());
$('#copyImgBtn').addEventListener('click', (e) => withBusy(e.currentTarget, async () => {
  try {
    await copyImage(store.get());
    toast(t('toast.copied'));
  } catch {
    toast(t('toast.copyFail'), { kind: 'error' });
  }
}));
$('#shareBtn').addEventListener('click', async () => {
  const s = store.get();
  try {
    await navigator.clipboard.writeText(shareUrl(s));
    toast(t(s.logo.type === 'image' ? 'toast.shareLogo' : 'toast.share'));
  } catch {
    toast(t('toast.clipboardFail'), { kind: 'error' });
  }
});

/* ---------- keyboard ---------- */

document.addEventListener('keydown', (e) => {
  const mod = e.metaKey || e.ctrlKey;
  const key = e.key.toLowerCase();
  const typing = e.target.matches('input[type=text], input[type=url], textarea');

  if (e.key === 'Escape' && document.querySelector('.pop:not([hidden])')) {
    const anchor = document.querySelector('.pop:not([hidden])')._anchor;
    closePopovers();
    anchor?.focus();
    return;
  }
  if (mod && key === 'z' && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && key === 'y' && !typing) { e.preventDefault(); redo(); return; }
  if (mod && key === 's') { e.preventDefault(); doDownload(); return; }
  if (mod && key === 'e') { e.preventDefault(); $('#exportBtn').click(); return; }
  if (mod || e.altKey || typing) return;

  if (key === 'r') shuffle();
  else if (key === '?') $('#shortcuts').showModal();
  else if (key === '+' || key === '=') stepZoom(1);
  else if (key === '-') stepZoom(-1);
  else if (key === '0') { zoom = null; applyZoom(); }
});

/* ---------- examples in the "about" section (loaded only when it comes near) ---------- */

new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  io.disconnect();
  import('./showcase.js').then(({ mountShowcase }) => mountShowcase($('#showStage'), (_, ex) => {
    const p = PRESETS.find((x) => x.id === ex.preset);
    store.replace(deepMerge(store.get(), { ...p.style, format: ex.format, layout: ex.layout, text: { ...p.style.text, align: ex.align || 'center' } }));
    appliedPreset = p.id;
    markPreset();
    withUndo(t('toast.preset', { name: t(`preset.${p.id}`) }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));
}, { rootMargin: '400px' }).observe($('#about'));

/* ---------- boot ---------- */

hydrateIcons();
setAppearance(prefs.get('theme', 'system'));
app.dataset.mode = mode;
$('#modeSeg').querySelectorAll('[data-value]').forEach((b) => b.setAttribute('aria-checked', b.dataset.value === mode));
renderPanes();
renderPreview();
syncUrlField(true);
renderSaved();
markPreset();
scheduleScan();
updateHistoryButtons();

// Re-measure text once every web font is actually available.
Promise.all(Object.values(FONTS).map((f) => document.fonts.load(`400 32px "${f.family}"`)))
  .catch(() => {})
  .then(() => {
    renderPreview();
    renderThumbs();
    scheduleScan();
  });
