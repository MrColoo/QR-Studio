import { DOT_STYLES, EYE_OUTER, EYE_INNER, dotsPath, eyePath } from './qr.js';
import { FONTS, ICONS } from './data.js';
import { icon } from './icons.js';
import { getPath } from './state.js';
import { isHex, normalizeHex } from './color.js';
import { fontStack, esc } from './render.js';

/* ---------- value display ---------- */

// Ranges show an editable number: `scale` maps the stored value to what people read.
const PCT = { scale: 100, unit: '%' };
const PX = { scale: 1, unit: 'px' };
const DEG = { scale: 1, unit: '°' };
const NUM = { scale: 1, unit: '' };


/* ---------- schema ---------- */

const hasBg = (s) => s.bg.type !== 'none';
const hasDotScale = (s) => !['square', 'rounded', 'liquid'].includes(s.qr.dotStyle);
const hasLogo = (s) => s.logo.type !== 'none';

const FILL = [['solid', 'Pieno'], ['linear', 'Lineare'], ['radial', 'Radiale']];
const BG_TYPES = [['none', 'Nessuno'], ['solid', 'Pieno'], ['linear', 'Lineare'], ['radial', 'Radiale'], ['mesh', 'Mesh']];
const PATTERNS = [['none', 'Nessuna'], ['grain', 'Grana'], ['dots', 'Punti'], ['grid', 'Griglia'], ['lines', 'Righe'], ['rings', 'Anelli']];
const LOGO_TYPES = [['none', 'Nessuno'], ['icon', 'Icona'], ['text', 'Sigla'], ['image', 'Immagine']];
export const LAYOUTS = [
  ['qr-top', 'QR sopra', '<rect x="11" y="4" width="18" height="18" rx="2"/><rect x="9" y="26" width="22" height="3" rx="1"/><rect x="13" y="32" width="14" height="2.5" rx="1" opacity=".45"/>'],
  ['qr-bottom', 'QR sotto', '<rect x="9" y="5" width="22" height="3" rx="1"/><rect x="13" y="11" width="14" height="2.5" rx="1" opacity=".45"/><rect x="11" y="18" width="18" height="18" rx="2"/>'],
  ['qr-left', 'QR a sinistra', '<rect x="3" y="11" width="18" height="18" rx="2"/><rect x="24" y="15" width="13" height="3" rx="1"/><rect x="24" y="21" width="10" height="2.5" rx="1" opacity=".45"/>'],
  ['qr-right', 'QR a destra', '<rect x="3" y="15" width="13" height="3" rx="1"/><rect x="3" y="21" width="10" height="2.5" rx="1" opacity=".45"/><rect x="19" y="11" width="18" height="18" rx="2"/>'],
  ['qr-only', 'Solo QR', '<rect x="9" y="9" width="22" height="22" rx="2"/>'],
];

/** Left pane: what the code says. Numbered because it reads top to bottom. */
export const CONTENT = [
  {
    id: 'text', num: '02', title: 'Testo',
    fields: [
      { type: 'text', path: 'text.eyebrow', label: 'Etichetta', placeholder: 'Scan me', max: 32 },
      { type: 'textarea', path: 'text.title', label: 'Titolo', placeholder: 'Il nostro menu', max: 90 },
      { type: 'textarea', path: 'text.description', label: 'Descrizione', placeholder: 'Cosa trova chi scansiona', max: 220, rows: 3 },
      { type: 'text', path: 'text.cta', label: 'Pulsante', placeholder: 'Apri il menu', max: 40 },
      { type: 'toggle', path: 'text.showLink', label: 'Mostra il link in chiaro' },
    ],
  },
  {
    id: 'logo', num: '03', title: 'Logo al centro',
    fields: [
      { type: 'segmented', path: 'logo.type', options: LOGO_TYPES },
      { type: 'icons', path: 'logo.icon', showIf: (s) => s.logo.type === 'icon' },
      { type: 'text', path: 'logo.text', label: 'Sigla', placeholder: 'AB', max: 4, showIf: (s) => s.logo.type === 'text' },
      { type: 'upload', path: 'logo.image', showIf: (s) => s.logo.type === 'image' },
      { type: 'segmented', path: 'logo.shape', label: 'Fondo del logo', options: [['none', 'Nessuno'], ['circle', 'Cerchio'], ['rounded', 'Smussato'], ['square', 'Quadrato']], showIf: hasLogo },
      {
        type: 'row', showIf: hasLogo, fields: [
          { type: 'color', path: 'logo.bgColor', label: 'Fondo', showIf: (s) => s.logo.shape !== 'none' },
          { type: 'color', path: 'logo.color', label: 'Icona', showIf: (s) => s.logo.type !== 'image' },
        ],
      },
      { type: 'range', path: 'logo.size', label: 'Dimensione', min: 0.12, max: 0.34, step: 0.005, ...PCT, showIf: hasLogo },
      { type: 'toggle', path: 'logo.clear', label: 'Libera i moduli dietro al logo', showIf: hasLogo },
    ],
  },
];

/** Right pane: how it looks. Collapsible, each with a one-word summary of its current state. */
export const STYLE = [
  {
    id: 'layout', title: 'Impaginazione',
    summary: (s) => LAYOUTS.find((l) => l[0] === s.layout)?.[1],
    fields: [
      { type: 'layouts', path: 'layout' },
      { type: 'range', path: 'qrScale', label: 'Dimensione del QR', min: 0.35, max: 1, step: 0.01, ...PCT },
      { type: 'range', path: 'padding', label: 'Margine', min: 0.03, max: 0.16, step: 0.005, ...PCT },
      { type: 'range', path: 'card.radius', label: 'Raggio angoli', min: 0, max: 140, step: 1, ...PX },
      { type: 'range', path: 'card.border', label: 'Bordo', min: 0, max: 24, step: 1, ...PX },
      { type: 'color', path: 'card.borderColor', label: 'Colore bordo', showIf: (s) => s.card.border > 0 },
    ],
  },
  {
    id: 'modules', title: 'Moduli',
    summary: (s) => DOT_STYLES.find((d) => d.id === s.qr.dotStyle)?.label,
    fields: [
      { type: 'shapes', path: 'qr.dotStyle', options: DOT_STYLES, preview: 'dots' },
      { type: 'range', path: 'qr.dotScale', label: 'Grandezza', min: 0.6, max: 1.15, step: 0.01, ...PCT, showIf: hasDotScale },
    ],
  },
  {
    id: 'eyes', title: 'Occhi',
    summary: (s) => `${EYE_OUTER.find((e) => e.id === s.qr.eyeOuter)?.label} · ${EYE_INNER.find((e) => e.id === s.qr.eyeInner)?.label}`,
    fields: [
      { type: 'shapes', path: 'qr.eyeOuter', label: 'Cornice', options: EYE_OUTER, preview: 'eyeOuter', cols: 6 },
      { type: 'shapes', path: 'qr.eyeInner', label: 'Pupilla', options: EYE_INNER, preview: 'eyeInner', cols: 7 },
    ],
  },
  {
    id: 'qrcolor', title: 'Colore del codice',
    summary: (s) => ({ type: 'swatches', colors: s.qr.fill === 'solid' ? [s.qr.c1] : [s.qr.c1, s.qr.c2] }),
    fields: [
      { type: 'segmented', path: 'qr.fill', options: FILL },
      {
        type: 'row', fields: [
          { type: 'color', path: 'qr.c1', label: 'Colore' },
          { type: 'color', path: 'qr.c2', label: 'Sfumatura', showIf: (s) => s.qr.fill !== 'solid' },
        ],
      },
      { type: 'swap', paths: ['qr.c1', 'qr.c2'], label: 'Scambia', showIf: (s) => s.qr.fill !== 'solid' },
      { type: 'range', path: 'qr.angle', label: 'Angolo', min: 0, max: 360, step: 5, ...DEG, showIf: (s) => s.qr.fill === 'linear' },
      { type: 'segmented', path: 'qr.eyeMode', label: 'Occhi', options: [['same', 'Come i moduli'], ['custom', 'Colori propri']] },
      {
        type: 'row', showIf: (s) => s.qr.eyeMode === 'custom', fields: [
          { type: 'color', path: 'qr.eyeOuterColor', label: 'Cornice' },
          { type: 'color', path: 'qr.eyeInnerColor', label: 'Pupilla' },
        ],
      },
    ],
  },
  {
    id: 'background', title: 'Sfondo',
    summary: (s) => (s.bg.type === 'none' ? 'Trasparente' : { type: 'swatches', colors: s.bg.type === 'solid' ? [s.bg.c1] : s.bg.type === 'mesh' ? [s.bg.c1, s.bg.c2, s.bg.c3] : [s.bg.c1, s.bg.c2] }),
    fields: [
      { type: 'segmented', path: 'bg.type', options: BG_TYPES },
      { type: 'note', text: 'Trasparente in PNG, WEBP e SVG. Il JPG lo riempie di bianco.', showIf: (s) => !hasBg(s) },
      {
        type: 'row', showIf: hasBg, fields: [
          { type: 'color', path: 'bg.c1', label: 'Base' },
          { type: 'color', path: 'bg.c2', label: 'Secondo', showIf: (s) => s.bg.type !== 'solid' },
        ],
      },
      { type: 'color', path: 'bg.c3', label: 'Terzo', showIf: (s) => s.bg.type === 'mesh' },
      { type: 'range', path: 'bg.angle', label: 'Angolo', min: 0, max: 360, step: 5, ...DEG, showIf: (s) => s.bg.type === 'linear' },
      { type: 'segmented', path: 'bg.pattern', label: 'Texture', wrap: true, options: PATTERNS, showIf: hasBg },
      { type: 'range', path: 'bg.patternOpacity', label: 'Intensità texture', min: 0.04, max: 0.8, step: 0.01, ...PCT, showIf: (s) => hasBg(s) && s.bg.pattern !== 'none' },
      { type: 'color', path: 'bg.patternColor', label: 'Colore texture', showIf: (s) => hasBg(s) && !['none', 'grain'].includes(s.bg.pattern) },
    ],
  },
  {
    id: 'plate', title: 'Piastra',
    summary: (s) => (!s.plate.enabled ? 'Nessuna' : s.plate.style === 'glass' ? 'Vetro' : 'Solida'),
    fields: [
      { type: 'toggle', path: 'plate.enabled', label: 'Piastra dietro al codice' },
      { type: 'segmented', path: 'plate.style', options: [['solid', 'Solida'], ['glass', 'Vetro smerigliato']], showIf: (s) => s.plate.enabled },
      {
        type: 'row', showIf: (s) => s.plate.enabled, fields: [
          { type: 'color', path: 'plate.color', label: 'Colore' },
          { type: 'range', path: 'plate.opacity', label: 'Opacità', min: 0.1, max: 1, step: 0.01, ...PCT },
        ],
      },
      { type: 'range', path: 'plate.radius', label: 'Raggio', min: 0, max: 0.4, step: 0.005, ...PCT, showIf: (s) => s.plate.enabled },
      { type: 'range', path: 'plate.padding', label: 'Margine interno', min: 0.03, max: 0.16, step: 0.005, ...PCT },
      { type: 'segmented', path: 'plate.shadow', label: 'Ombra', options: [['none', 'Nessuna'], ['soft', 'Morbida'], ['hard', 'Netta'], ['glow', 'Alone']], showIf: (s) => s.plate.enabled },
      { type: 'color', path: 'plate.shadowColor', label: 'Colore ombra', showIf: (s) => s.plate.enabled && s.plate.shadow !== 'none' },
      { type: 'range', path: 'plate.border', label: 'Bordo', min: 0, max: 16, step: 1, ...PX, showIf: (s) => s.plate.enabled },
      { type: 'color', path: 'plate.borderColor', label: 'Colore bordo', showIf: (s) => s.plate.enabled && s.plate.border > 0 },
    ],
  },
  {
    id: 'type', title: 'Tipografia',
    summary: (s) => FONTS[s.text.headingFont]?.label,
    fields: [
      { type: 'fonts', path: 'text.headingFont', label: 'Titoli' },
      { type: 'fonts', path: 'text.bodyFont', label: 'Testo' },
      { type: 'range', path: 'text.titleSize', label: 'Corpo del titolo', min: 32, max: 120, step: 1, ...PX },
      { type: 'range', path: 'text.titleWeight', label: 'Peso del titolo', min: 300, max: 900, step: 50, ...NUM },
      { type: 'range', path: 'text.descSize', label: 'Corpo della descrizione', min: 16, max: 48, step: 1, ...PX },
      { type: 'segmented', path: 'text.align', label: 'Allineamento', options: [['left', icon('alignLeft'), 'Sinistra'], ['center', icon('alignCenter'), 'Centro'], ['right', icon('alignRight'), 'Destra']] },
      { type: 'segmented', path: 'text.eyebrowStyle', label: 'Etichetta', options: [['pill', 'Badge'], ['text', 'Testo']] },
      { type: 'segmented', path: 'text.ctaStyle', label: 'Pulsante', options: [['pill', 'Pieno'], ['outline', 'Contorno'], ['text', 'Link']] },
    ],
  },
  {
    id: 'textcolor', title: 'Colore del testo',
    summary: (s) => ({ type: 'swatches', colors: [s.text.color, s.text.muted, s.text.accent] }),
    fields: [
      { type: 'row', fields: [{ type: 'color', path: 'text.color', label: 'Titolo' }, { type: 'color', path: 'text.muted', label: 'Secondario' }] },
      { type: 'row', fields: [{ type: 'color', path: 'text.accent', label: 'Accento' }, { type: 'color', path: 'text.ctaText', label: 'Sul pulsante' }] },
    ],
  },
  {
    id: 'ecc', title: 'Correzione errori',
    summary: (s) => `Livello ${s.qr.ecc}`,
    fields: [
      { type: 'segmented', path: 'qr.ecc', options: [['L', 'L 7%'], ['M', 'M 15%'], ['Q', 'Q 25%'], ['H', 'H 30%']] },
      { type: 'note', text: 'Quanta parte del codice può essere coperta o rovinata restando leggibile. Più alta rende il codice più denso; con un logo usa H.' },
    ],
  },
];

/* ---------- previews ---------- */

const SAMPLE = ['1101011', '1011010', '0110111', '1101100', '0111011', '1010110', '1101101'].map((r) => [...r].map(Number));

function shapePreview(kind, id) {
  if (kind === 'dots') {
    const on = (r, c) => !!SAMPLE[r]?.[c];
    return `<svg viewBox="-4 -4 78 78" aria-hidden="true"><path d="${dotsPath(on, 7, 0, 0, 10, id, 1)}" fill="currentColor"/></svg>`;
  }
  const p = eyePath(0, 0, 10, kind === 'eyeOuter' ? id : 'square', kind === 'eyeInner' ? id : 'square', 2);
  const dim = 'opacity=".25"';
  return `<svg viewBox="-6 -6 82 82" aria-hidden="true"><path d="${p.outer}" fill="currentColor" fill-rule="evenodd" ${kind === 'eyeInner' ? dim : ''}/><path d="${p.inner}" fill="currentColor" ${kind === 'eyeOuter' ? dim : ''}/></svg>`;
}

/* ---------- builders ---------- */

let uid = 0;
const nextId = () => `f${++uid}`;

const head = (label, extra = '') =>
  label ? `<div class="field-head"><span class="field-label">${label}</span>${extra}</div>` : '';

const shown = (v, f) => +(v * f.scale).toFixed(f.scale === 100 ? 1 : 0);

function build(field, s) {
  const id = nextId();
  const v = field.path ? getPath(s, field.path) : undefined;
  const attrs = `data-path="${field.path || ''}" data-type="${field.type}"`;
  switch (field.type) {
    case 'row':
      return `<div class="row">${field.fields.map((f) => wrapField(f, s)).join('')}</div>`;
    case 'text':
      return `${head(`<label for="${id}">${field.label}</label>`, `<span class="count">${(v || '').length}/${field.max}</span>`)}
        <input id="${id}" class="input" type="text" ${attrs} value="${esc(v ?? '')}" placeholder="${field.placeholder || ''}" maxlength="${field.max}" autocomplete="off">`;
    case 'textarea':
      return `${head(`<label for="${id}">${field.label}</label>`, `<span class="count">${(v || '').length}/${field.max}</span>`)}
        <textarea id="${id}" class="input" ${attrs} rows="${field.rows || 2}" maxlength="${field.max}" placeholder="${field.placeholder || ''}">${esc(v ?? '')}</textarea>`;
    case 'color':
      return `${head(field.label)}
        <div class="color">
          <label class="swatch" style="--c:${v}"><input type="color" ${attrs} value="${v}" aria-label="${field.label}"></label>
          <input class="hex" type="text" data-hex-for="${field.path}" value="${String(v).toUpperCase()}" maxlength="7" spellcheck="false" aria-label="${field.label}, codice esadecimale">
        </div>`;
    case 'range': {
      const p = ((v - field.min) / (field.max - field.min)) * 100;
      return `${head(`<label for="${id}">${field.label}</label>`, `<span class="num"><input type="text" inputmode="decimal" data-num-for="${field.path}" value="${shown(v, field)}" aria-label="${field.label}, valore">${field.unit ? `<i>${field.unit}</i>` : ''}</span>`)}
        <input id="${id}" class="range" type="range" ${attrs} min="${field.min}" max="${field.max}" step="${field.step}" value="${v}" style="--p:${p}%">`;
    }
    case 'toggle':
      return `<label class="check"><input type="checkbox" ${attrs} ${v ? 'checked' : ''}><span class="box">${icon('check', 12)}</span><span>${field.label}</span></label>`;
    case 'segmented':
      return `${head(field.label)}
        <div class="seg ${field.wrap ? 'wrap' : ''}" role="radiogroup" ${field.label ? `aria-label="${field.label}"` : ''} ${attrs}>
          ${field.options.map(([val, label, title]) => `<button type="button" role="radio" data-value="${val}" aria-checked="${v === val}" ${title ? `title="${title}" aria-label="${title}"` : ''}>${label}</button>`).join('')}
        </div>`;
    case 'shapes':
      return `${head(field.label)}
        <div class="grid shapes" style="--cols:${field.cols || 4}" role="radiogroup" ${attrs}>
          ${field.options.map((o) => `<button type="button" class="cell" role="radio" data-value="${o.id}" aria-checked="${v === o.id}" title="${o.label}" aria-label="${o.label}">${shapePreview(field.preview, o.id)}${field.preview === 'dots' ? `<span>${o.label}</span>` : ''}</button>`).join('')}
        </div>`;
    case 'layouts':
      return `<div class="grid layouts" style="--cols:5" role="radiogroup" aria-label="Disposizione" ${attrs}>
          ${LAYOUTS.map(([k, label, g]) => `<button type="button" class="cell" role="radio" data-value="${k}" aria-checked="${v === k}" title="${label}" aria-label="${label}"><svg viewBox="0 0 40 40" fill="currentColor" aria-hidden="true">${g}</svg></button>`).join('')}
        </div>`;
    case 'fonts':
      return `${head(field.label)}
        <div class="grid fonts" style="--cols:2" role="radiogroup" aria-label="${field.label}" ${attrs}>
          ${Object.entries(FONTS).map(([k, fo]) => `<button type="button" class="cell" role="radio" data-value="${k}" aria-checked="${v === k}"><b style="font-family:${fontStack(k)}">Ag</b><span>${fo.label}</span></button>`).join('')}
        </div>`;
    case 'icons':
      return `<div class="grid icons" style="--cols:8" role="radiogroup" aria-label="Icona" ${attrs}>
          ${Object.entries(ICONS).map(([k, g]) => `<button type="button" class="cell" role="radio" data-value="${k}" aria-checked="${v === k}" title="${k}" aria-label="${k}"><svg viewBox="0 0 256 256" width="18" height="18" fill="currentColor" aria-hidden="true">${g}</svg></button>`).join('')}
        </div>`;
    case 'upload':
      return `<div class="drop ${v ? 'filled' : ''}" ${attrs} tabindex="0" role="button" aria-label="${v ? 'Sostituisci il logo' : 'Carica un logo'}">
          <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden>
          ${v
            ? `<img src="${v}" alt="Logo caricato"><span><b>Logo caricato</b>Clicca o trascina un file per sostituirlo</span><button type="button" class="icon-btn" data-remove title="Rimuovi il logo" aria-label="Rimuovi il logo">${icon('trash')}</button>`
            : `${icon('upload', 18)}<span><b>Trascina un file o clicca</b>PNG, SVG, JPG o WEBP. Anche sulla tela.</span>`}
        </div>`;
    case 'swap':
      return `<button type="button" class="text-btn" data-swap="${field.paths.join(',')}">${icon('swap', 14)}${field.label}</button>`;
    case 'note':
      return `<p class="note">${field.text}</p>`;
    default:
      return '';
  }
}

// Map rendered nodes back to their schema entries (for showIf re-evaluation).
const registry = [];
function fieldIndex(entry) {
  let i = registry.indexOf(entry);
  if (i < 0) { registry.push(entry); i = registry.length - 1; }
  return i;
}

function wrapField(field, s) {
  const hidden = field.showIf && !field.showIf(s);
  return `<div class="field ft-${field.type}" data-field="${fieldIndex(field)}" ${hidden ? 'hidden' : ''}>${build(field, s)}</div>`;
}

function summaryMarkup(sec, s) {
  const sum = sec.summary?.(s);
  if (!sum) return '';
  if (sum.type === 'swatches') return `<span class="sum">${sum.colors.map((c) => `<i style="--c:${c}"></i>`).join('')}</span>`;
  return `<span class="sum">${esc(sum)}</span>`;
}

export function renderContent(s) {
  return CONTENT.map((sec) => `
    <section class="block" data-field="${fieldIndex(sec)}" aria-labelledby="h-${sec.id}">
      <h2 id="h-${sec.id}"><span class="n">${sec.num}</span>${sec.title}</h2>
      ${sec.fields.map((f) => wrapField(f, s)).join('')}
    </section>`).join('');
}

export function renderStyle(s, open) {
  return STYLE.map((sec) => {
    const isOpen = open.has(sec.id);
    return `
    <section class="sec" data-sec="${sec.id}" data-field="${fieldIndex(sec)}">
      <h2><button type="button" class="sec-head" aria-expanded="${isOpen}" aria-controls="sec-${sec.id}">
        <span>${sec.title}</span>${summaryMarkup(sec, s)}<span class="caret">${icon('caret', 12)}</span>
      </button></h2>
      <div class="sec-body" id="sec-${sec.id}" ${isOpen ? '' : 'hidden'}>${sec.fields.map((f) => wrapField(f, s)).join('')}</div>
    </section>`;
  }).join('');
}

/** Show/hide conditional fields and refresh section summaries without rebuilding (keeps focus). */
export function refresh(root, s) {
  root.querySelectorAll('[data-field]').forEach((el) => {
    const entry = registry[+el.dataset.field];
    if (entry?.showIf) el.hidden = !entry.showIf(s);
    if (entry?.summary) {
      const btn = el.querySelector('.sec-head');
      btn.querySelector('.sum')?.remove();
      btn.querySelector('.caret').insertAdjacentHTML('beforebegin', summaryMarkup(entry, s));
    }
  });
}

/* ---------- binding ---------- */

function setRangeUI(range, field, value) {
  range.value = value;
  range.style.setProperty('--p', `${((value - field.min) / (field.max - field.min)) * 100}%`);
  const num = range.closest('.field').querySelector('[data-num-for]');
  if (num && document.activeElement !== num) num.value = shown(value, field);
}

/** Wire a pane's inputs to the store. */
export function bindControls(root, store, { onUpload, onToggleSection }) {
  const set = (path, value) => store.set(path, value);
  const fieldOf = (el) => registry[+el.closest('[data-field]').dataset.field];

  root.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.hexFor) {
      if (isHex(el.value)) {
        const hex = normalizeHex(el.value);
        const picker = root.querySelector(`input[type=color][data-path="${el.dataset.hexFor}"]`);
        if (picker) { picker.value = hex; picker.parentElement.style.setProperty('--c', hex); }
        set(el.dataset.hexFor, hex);
      }
      return;
    }
    if (el.dataset.numFor) {
      const field = fieldOf(el);
      const n = parseFloat(el.value.replace(',', '.'));
      if (Number.isNaN(n)) return;
      const value = Math.min(field.max, Math.max(field.min, n / field.scale));
      setRangeUI(root.querySelector(`input[type=range][data-path="${el.dataset.numFor}"]`), field, value);
      set(el.dataset.numFor, value);
      return;
    }
    const path = el.dataset.path;
    if (!path) return;
    const type = el.dataset.type;
    if (type === 'range') {
      setRangeUI(el, fieldOf(el), +el.value);
      set(path, +el.value);
    } else if (type === 'color') {
      el.parentElement.style.setProperty('--c', el.value);
      const hex = root.querySelector(`[data-hex-for="${path}"]`);
      if (hex) hex.value = el.value.toUpperCase();
      set(path, el.value);
    } else if (type === 'toggle') {
      set(path, el.checked);
    } else if (type === 'text' || type === 'textarea') {
      const count = el.closest('.field').querySelector('.count');
      if (count) count.textContent = `${el.value.length}/${el.maxLength}`;
      set(path, el.value);
    }
  });

  root.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.hexFor && !isHex(el.value)) el.value = getPath(store.get(), el.dataset.hexFor).toUpperCase();
    if (el.dataset.numFor) el.value = shown(getPath(store.get(), el.dataset.numFor), fieldOf(el));
    if (el.type === 'file' && el.files[0]) onUpload(el.files[0], el.closest('[data-path]').dataset.path);
  });

  root.addEventListener('click', (e) => {
    const head = e.target.closest('.sec-head');
    if (head) {
      const open = head.getAttribute('aria-expanded') !== 'true';
      head.setAttribute('aria-expanded', open);
      head.closest('.sec').querySelector('.sec-body').hidden = !open;
      onToggleSection?.(head.closest('.sec').dataset.sec, open);
      return;
    }
    const swap = e.target.closest('[data-swap]');
    if (swap) {
      const [a, b] = swap.dataset.swap.split(',');
      const s = store.get();
      const va = getPath(s, a), vb = getPath(s, b);
      store.set(a, vb, 'external');
      store.set(b, va, 'external');
      return;
    }
    const option = e.target.closest('[role=radio][data-value]');
    if (option) {
      const group = option.closest('[data-path]');
      group.querySelectorAll('[role=radio]').forEach((b) => b.setAttribute('aria-checked', b === option));
      store.set(group.dataset.path, option.dataset.value);
      return;
    }
    const dz = e.target.closest('.drop');
    if (dz) {
      if (e.target.closest('[data-remove]')) { store.set(dz.dataset.path, null, 'external'); return; }
      dz.querySelector('input[type=file]').click();
    }
  });

  root.addEventListener('keydown', (e) => {
    const dz = e.target.closest?.('.drop');
    if (dz && e.target === dz && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); dz.querySelector('input[type=file]').click(); }
    if (e.target.dataset?.numFor && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      // nudge numeric fields with the arrow keys, ×10 with Shift
      const field = fieldOf(e.target);
      const cur = getPath(store.get(), e.target.dataset.numFor);
      const step = field.step * (e.shiftKey ? 10 : 1) * (e.key === 'ArrowUp' ? 1 : -1);
      const value = Math.min(field.max, Math.max(field.min, +(cur + step).toFixed(4)));
      e.target.value = shown(value, field);
      setRangeUI(root.querySelector(`input[type=range][data-path="${e.target.dataset.numFor}"]`), field, value);
      store.set(e.target.dataset.numFor, value);
      e.preventDefault();
      return;
    }
    const radio = e.target.closest?.('[role=radio]');
    if (radio && ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
      const all = [...radio.parentElement.querySelectorAll('[role=radio]')];
      const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
      const next = all[(all.indexOf(radio) + dir + all.length) % all.length];
      next.focus();
      next.click();
      e.preventDefault();
    }
  });

  root.addEventListener('dragover', (e) => {
    const dz = e.target.closest('.drop');
    if (dz) { e.preventDefault(); dz.classList.add('drag'); }
  });
  root.addEventListener('dragleave', (e) => e.target.closest('.drop')?.classList.remove('drag'));
  root.addEventListener('drop', (e) => {
    const dz = e.target.closest('.drop');
    if (!dz) return;
    e.preventDefault();
    e.stopPropagation();
    dz.classList.remove('drag');
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file, dz.dataset.path);
  });
}
