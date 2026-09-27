import { DOT_STYLES, EYE_OUTER, EYE_INNER, dotsPath, eyePath } from './qr.js';
import { FONTS, ICONS } from './data.js';
import { icon } from './icons.js';
import { getPath } from './state.js';
import { isHex, normalizeHex } from './color.js';
import { fontStack, esc } from './render.js';
import { t } from './i18n/index.js';

/*
  Panels are described as data. Labels are dictionary keys, translated when rendered.
  `adv: true` marks what the simple version leaves out.
*/

// Ranges show an editable number: `scale` maps the stored value to what people read.
const PCT = { scale: 100, unit: '%' };
const PX = { scale: 1, unit: 'px' };
const DEG = { scale: 1, unit: '°' };
const NUM = { scale: 1, unit: '' };

const hasBg = (s) => s.bg.type !== 'none';
const hasDotScale = (s) => !['square', 'rounded', 'liquid'].includes(s.qr.dotStyle);
const hasLogo = (s) => s.logo.type !== 'none';
const opts = (prefix, values) => values.map((v) => [v, `${prefix}.${v}`]);

export const LAYOUTS = [
  ['qr-top', '<rect x="11" y="4" width="18" height="18" rx="2"/><rect x="9" y="26" width="22" height="3" rx="1"/><rect x="13" y="32" width="14" height="2.5" rx="1" opacity=".45"/>'],
  ['qr-bottom', '<rect x="9" y="5" width="22" height="3" rx="1"/><rect x="13" y="11" width="14" height="2.5" rx="1" opacity=".45"/><rect x="11" y="18" width="18" height="18" rx="2"/>'],
  ['qr-left', '<rect x="3" y="11" width="18" height="18" rx="2"/><rect x="24" y="15" width="13" height="3" rx="1"/><rect x="24" y="21" width="10" height="2.5" rx="1" opacity=".45"/>'],
  ['qr-right', '<rect x="3" y="15" width="13" height="3" rx="1"/><rect x="3" y="21" width="10" height="2.5" rx="1" opacity=".45"/><rect x="19" y="11" width="18" height="18" rx="2"/>'],
  ['qr-only', '<rect x="9" y="9" width="22" height="22" rx="2"/>'],
];

/** Left pane: what the code says. Numbered because it reads top to bottom. */
export const CONTENT = [
  {
    id: 'text', num: '02', title: 'text.title',
    fields: [
      { type: 'text', path: 'text.eyebrow', label: 'f.eyebrow', placeholder: 'ph.eyebrow', max: 32 },
      { type: 'textarea', path: 'text.title', label: 'f.title', placeholder: 'ph.title', max: 90 },
      { type: 'textarea', path: 'text.description', label: 'f.description', placeholder: 'ph.description', max: 220, rows: 3 },
      { type: 'text', path: 'text.cta', label: 'f.cta', placeholder: 'ph.cta', max: 40 },
      { type: 'toggle', path: 'text.showLink', label: 'f.showLink' },
    ],
  },
  {
    id: 'logo', num: '03', title: 'logo.title',
    fields: [
      { type: 'segmented', path: 'logo.type', options: opts('logo', ['none', 'icon', 'text', 'image']) },
      { type: 'icons', path: 'logo.icon', showIf: (s) => s.logo.type === 'icon' },
      { type: 'text', path: 'logo.text', label: 'f.logoText', placeholder: 'AB', raw: true, max: 4, showIf: (s) => s.logo.type === 'text' },
      { type: 'upload', path: 'logo.image', showIf: (s) => s.logo.type === 'image' },
      { type: 'segmented', path: 'logo.shape', label: 'f.logoShape', options: opts('shape', ['none', 'circle', 'rounded', 'square']), showIf: hasLogo, adv: true },
      {
        type: 'row', showIf: hasLogo, adv: true, fields: [
          { type: 'color', path: 'logo.bgColor', label: 'f.logoBg', showIf: (s) => s.logo.shape !== 'none' },
          { type: 'color', path: 'logo.color', label: 'f.logoColor', showIf: (s) => s.logo.type !== 'image' },
        ],
      },
      { type: 'range', path: 'logo.size', label: 'f.size', min: 0.12, max: 0.34, step: 0.005, ...PCT, showIf: hasLogo, adv: true },
      { type: 'toggle', path: 'logo.clear', label: 'f.logoClear', showIf: hasLogo, adv: true },
    ],
  },
];

/** Right pane: how it looks. Collapsible, each with a short summary of its current state. */
export const STYLE = [
  {
    id: 'layout', title: 'sec.layout',
    summary: (s) => t(`layout.${s.layout}`),
    fields: [
      { type: 'layouts', path: 'layout' },
      { type: 'range', path: 'qrScale', label: 'f.qrScale', min: 0.35, max: 1, step: 0.01, ...PCT, adv: true },
      { type: 'range', path: 'padding', label: 'f.padding', min: 0.03, max: 0.16, step: 0.005, ...PCT, adv: true },
      { type: 'range', path: 'card.radius', label: 'f.cardRadius', min: 0, max: 140, step: 1, ...PX, adv: true },
      { type: 'range', path: 'card.border', label: 'f.border', min: 0, max: 24, step: 1, ...PX, adv: true },
      { type: 'color', path: 'card.borderColor', label: 'f.borderColor', showIf: (s) => s.card.border > 0, adv: true },
    ],
  },
  {
    id: 'modules', title: 'sec.modules',
    summary: (s) => t(`dot.${s.qr.dotStyle}`),
    fields: [
      { type: 'shapes', path: 'qr.dotStyle', options: DOT_STYLES, prefix: 'dot', preview: 'dots' },
      { type: 'range', path: 'qr.dotScale', label: 'f.dotScale', min: 0.6, max: 1.15, step: 0.01, ...PCT, showIf: hasDotScale, adv: true },
    ],
  },
  {
    id: 'eyes', title: 'sec.eyes', adv: true,
    summary: (s) => `${t(`eye.${s.qr.eyeOuter}`)} · ${t(`eye.${s.qr.eyeInner}`)}`,
    fields: [
      { type: 'shapes', path: 'qr.eyeOuter', label: 'f.eyeOuter', options: EYE_OUTER, prefix: 'eye', preview: 'eyeOuter', cols: 6 },
      { type: 'shapes', path: 'qr.eyeInner', label: 'f.eyeInner', options: EYE_INNER, prefix: 'eye', preview: 'eyeInner', cols: 7 },
    ],
  },
  {
    id: 'qrcolor', title: 'sec.qrcolor',
    summary: (s) => ({ type: 'swatches', colors: s.qr.fill === 'solid' ? [s.qr.c1] : [s.qr.c1, s.qr.c2] }),
    fields: [
      { type: 'segmented', path: 'qr.fill', options: opts('fill', ['solid', 'linear', 'radial']), adv: true },
      {
        type: 'row', fields: [
          { type: 'color', path: 'qr.c1', label: 'f.color' },
          { type: 'color', path: 'qr.c2', label: 'f.gradient', showIf: (s) => s.qr.fill !== 'solid' },
        ],
      },
      { type: 'swap', paths: ['qr.c1', 'qr.c2'], label: 'f.swap', showIf: (s) => s.qr.fill !== 'solid', adv: true },
      { type: 'range', path: 'qr.angle', label: 'f.angle', min: 0, max: 360, step: 5, ...DEG, showIf: (s) => s.qr.fill === 'linear', adv: true },
      { type: 'segmented', path: 'qr.eyeMode', label: 'f.eyes', options: opts('eyeMode', ['same', 'custom']), adv: true },
      {
        type: 'row', showIf: (s) => s.qr.eyeMode === 'custom', adv: true, fields: [
          { type: 'color', path: 'qr.eyeOuterColor', label: 'f.eyeOuter' },
          { type: 'color', path: 'qr.eyeInnerColor', label: 'f.eyeInner' },
        ],
      },
    ],
  },
  {
    id: 'background', title: 'sec.background',
    summary: (s) => (s.bg.type === 'none' ? t('sum.transparent') : { type: 'swatches', colors: s.bg.type === 'solid' ? [s.bg.c1] : s.bg.type === 'mesh' ? [s.bg.c1, s.bg.c2, s.bg.c3] : [s.bg.c1, s.bg.c2] }),
    fields: [
      { type: 'segmented', path: 'bg.type', options: opts('bg', ['none', 'solid', 'linear', 'radial', 'mesh']) },
      { type: 'note', text: 'bg.transparentNote', showIf: (s) => !hasBg(s) },
      {
        type: 'row', showIf: hasBg, fields: [
          { type: 'color', path: 'bg.c1', label: 'f.base' },
          { type: 'color', path: 'bg.c2', label: 'f.second', showIf: (s) => s.bg.type !== 'solid' },
        ],
      },
      { type: 'color', path: 'bg.c3', label: 'f.third', showIf: (s) => s.bg.type === 'mesh' },
      { type: 'range', path: 'bg.angle', label: 'f.angle', min: 0, max: 360, step: 5, ...DEG, showIf: (s) => s.bg.type === 'linear', adv: true },
      { type: 'segmented', path: 'bg.pattern', label: 'f.texture', wrap: true, options: opts('pattern', ['none', 'grain', 'dots', 'grid', 'lines', 'rings']), showIf: hasBg, adv: true },
      { type: 'range', path: 'bg.patternOpacity', label: 'f.textureStrength', min: 0.04, max: 0.8, step: 0.01, ...PCT, showIf: (s) => hasBg(s) && s.bg.pattern !== 'none', adv: true },
      { type: 'color', path: 'bg.patternColor', label: 'f.textureColor', showIf: (s) => hasBg(s) && !['none', 'grain'].includes(s.bg.pattern), adv: true },
    ],
  },
  {
    id: 'plate', title: 'sec.plate', adv: true,
    summary: (s) => t(!s.plate.enabled ? 'sum.none' : s.plate.style === 'glass' ? 'sum.glass' : 'sum.solid'),
    fields: [
      { type: 'toggle', path: 'plate.enabled', label: 'f.plate' },
      { type: 'segmented', path: 'plate.style', options: opts('plate', ['solid', 'glass']), showIf: (s) => s.plate.enabled },
      {
        type: 'row', showIf: (s) => s.plate.enabled, fields: [
          { type: 'color', path: 'plate.color', label: 'f.color' },
          { type: 'range', path: 'plate.opacity', label: 'f.opacity', min: 0.1, max: 1, step: 0.01, ...PCT },
        ],
      },
      { type: 'range', path: 'plate.radius', label: 'f.radius', min: 0, max: 0.4, step: 0.005, ...PCT, showIf: (s) => s.plate.enabled },
      { type: 'range', path: 'plate.padding', label: 'f.innerMargin', min: 0.03, max: 0.16, step: 0.005, ...PCT },
      { type: 'segmented', path: 'plate.shadow', label: 'f.shadow', options: opts('shadow', ['none', 'soft', 'hard', 'glow']), showIf: (s) => s.plate.enabled },
      { type: 'color', path: 'plate.shadowColor', label: 'f.shadowColor', showIf: (s) => s.plate.enabled && s.plate.shadow !== 'none' },
      { type: 'range', path: 'plate.border', label: 'f.border', min: 0, max: 16, step: 1, ...PX, showIf: (s) => s.plate.enabled },
      { type: 'color', path: 'plate.borderColor', label: 'f.borderColor', showIf: (s) => s.plate.enabled && s.plate.border > 0 },
    ],
  },
  {
    id: 'type', title: 'sec.type',
    summary: (s) => FONTS[s.text.headingFont]?.label,
    fields: [
      { type: 'fonts', path: 'text.headingFont', label: 'f.headingFont' },
      { type: 'fonts', path: 'text.bodyFont', label: 'f.bodyFont', adv: true },
      { type: 'range', path: 'text.titleSize', label: 'f.titleSize', min: 32, max: 120, step: 1, ...PX, adv: true },
      { type: 'range', path: 'text.titleWeight', label: 'f.titleWeight', min: 300, max: 900, step: 50, ...NUM, adv: true },
      { type: 'range', path: 'text.descSize', label: 'f.descSize', min: 16, max: 48, step: 1, ...PX, adv: true },
      { type: 'segmented', path: 'text.align', label: 'f.align', options: [['left', 'align.left', 'alignLeft'], ['center', 'align.center', 'alignCenter'], ['right', 'align.right', 'alignRight']] },
      { type: 'segmented', path: 'text.eyebrowStyle', label: 'f.eyebrowStyle', options: opts('eyebrow', ['pill', 'text']), adv: true },
      { type: 'segmented', path: 'text.ctaStyle', label: 'f.ctaStyle', options: opts('cta', ['pill', 'outline', 'text']), adv: true },
    ],
  },
  {
    id: 'textcolor', title: 'sec.textcolor', adv: true,
    summary: (s) => ({ type: 'swatches', colors: [s.text.color, s.text.muted, s.text.accent] }),
    fields: [
      { type: 'row', fields: [{ type: 'color', path: 'text.color', label: 'f.textTitle' }, { type: 'color', path: 'text.muted', label: 'f.textMuted' }] },
      { type: 'row', fields: [{ type: 'color', path: 'text.accent', label: 'f.textAccent' }, { type: 'color', path: 'text.ctaText', label: 'f.textOnButton' }] },
    ],
  },
  {
    id: 'ecc', title: 'sec.ecc', adv: true,
    summary: (s) => t('sum.level', { v: s.qr.ecc }),
    fields: [
      { type: 'segmented', path: 'qr.ecc', options: [['L', 'L 7%'], ['M', 'M 15%'], ['Q', 'Q 25%'], ['H', 'H 30%']], raw: true },
      { type: 'note', text: 'ecc.note' },
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
let mode = 'full';
const visible = (entry) => mode === 'full' || !entry.adv;

const head = (label, extra = '') =>
  label ? `<div class="field-head"><span class="field-label">${label}</span>${extra}</div>` : '';

const shown = (v, f) => +(v * f.scale).toFixed(f.scale === 100 ? 1 : 0);

function build(field, s) {
  const id = nextId();
  const v = field.path ? getPath(s, field.path) : undefined;
  const label = field.label ? t(field.label) : '';
  const attrs = `data-path="${field.path || ''}" data-type="${field.type}"`;
  const ph = field.placeholder ? (field.raw ? field.placeholder : t(field.placeholder)) : '';
  switch (field.type) {
    case 'row':
      return `<div class="row">${field.fields.map((f) => wrapField(f, s)).join('')}</div>`;
    case 'text':
      return `${head(`<label for="${id}">${label}</label>`, `<span class="count">${(v || '').length}/${field.max}</span>`)}
        <input id="${id}" class="input" type="text" dir="auto" ${attrs} value="${esc(v ?? '')}" placeholder="${esc(ph)}" maxlength="${field.max}" autocomplete="off">`;
    case 'textarea':
      return `${head(`<label for="${id}">${label}</label>`, `<span class="count">${(v || '').length}/${field.max}</span>`)}
        <textarea id="${id}" class="input" dir="auto" ${attrs} rows="${field.rows || 2}" maxlength="${field.max}" placeholder="${esc(ph)}">${esc(v ?? '')}</textarea>`;
    case 'color':
      return `${head(label)}
        <div class="color">
          <label class="swatch" style="--c:${v}"><input type="color" ${attrs} value="${v}" aria-label="${label}"></label>
          <input class="hex" type="text" dir="ltr" data-hex-for="${field.path}" value="${String(v).toUpperCase()}" maxlength="7" spellcheck="false" aria-label="${t('aria.hex', { label })}">
        </div>`;
    case 'range': {
      const p = ((v - field.min) / (field.max - field.min)) * 100;
      return `${head(`<label for="${id}">${label}</label>`, `<span class="num" dir="ltr"><input type="text" inputmode="decimal" data-num-for="${field.path}" value="${shown(v, field)}" aria-label="${t('aria.value', { label })}">${field.unit ? `<i>${field.unit}</i>` : ''}</span>`)}
        <input id="${id}" class="range" type="range" ${attrs} min="${field.min}" max="${field.max}" step="${field.step}" value="${v}" style="--p:${p}%">`;
    }
    case 'toggle':
      return `<label class="check"><input type="checkbox" ${attrs} ${v ? 'checked' : ''}><span class="box">${icon('check', 12)}</span><span>${label}</span></label>`;
    case 'segmented':
      return `${head(label)}
        <div class="seg ${field.wrap ? 'wrap' : ''}" role="radiogroup" ${label ? `aria-label="${label}"` : ''} ${attrs}>
          ${field.options.map(([val, key, ic]) => {
            const text = field.raw ? key : t(key);
            return `<button type="button" role="radio" data-value="${val}" aria-checked="${v === val}" ${ic ? `title="${text}" aria-label="${text}"` : ''}>${ic ? icon(ic) : text}</button>`;
          }).join('')}
        </div>`;
    case 'shapes':
      return `${head(label)}
        <div class="grid shapes" style="--cols:${field.cols || 4}" role="radiogroup" ${label ? `aria-label="${label}"` : ''} ${attrs}>
          ${field.options.map((o) => {
            const name = t(`${field.prefix}.${o.id}`);
            return `<button type="button" class="cell" role="radio" data-value="${o.id}" aria-checked="${v === o.id}" title="${name}" aria-label="${name}">${shapePreview(field.preview, o.id)}${field.preview === 'dots' ? `<span>${name}</span>` : ''}</button>`;
          }).join('')}
        </div>`;
    case 'layouts':
      return `<div class="grid layouts" style="--cols:5" role="radiogroup" aria-label="${t('layout.aria')}" ${attrs}>
          ${LAYOUTS.map(([k, g]) => `<button type="button" class="cell" role="radio" data-value="${k}" aria-checked="${v === k}" title="${t(`layout.${k}`)}" aria-label="${t(`layout.${k}`)}"><svg viewBox="0 0 40 40" fill="currentColor" aria-hidden="true">${g}</svg></button>`).join('')}
        </div>`;
    case 'fonts':
      return `${head(label)}
        <div class="grid fonts" style="--cols:2" role="radiogroup" aria-label="${label}" ${attrs}>
          ${Object.entries(FONTS).map(([k, fo]) => `<button type="button" class="cell" role="radio" data-value="${k}" aria-checked="${v === k}"><b style="font-family:${fontStack(k)}">Ag</b><span>${fo.label}</span></button>`).join('')}
        </div>`;
    case 'icons':
      return `<div class="grid icons" style="--cols:8" role="radiogroup" aria-label="${t('icons.aria')}" ${attrs}>
          ${Object.entries(ICONS).map(([k, g]) => `<button type="button" class="cell" role="radio" data-value="${k}" aria-checked="${v === k}" title="${k}" aria-label="${k}"><svg viewBox="0 0 256 256" width="18" height="18" fill="currentColor" aria-hidden="true">${g}</svg></button>`).join('')}
        </div>`;
    case 'upload':
      return `<div class="drop ${v ? 'filled' : ''}" ${attrs} tabindex="0" role="button" aria-label="${t(v ? 'upload.ariaReplace' : 'upload.aria')}">
          <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden>
          ${v
            ? `<img src="${v}" alt="${t('upload.alt')}"><span><b>${t('upload.done')}</b>${t('upload.replace')}</span><button type="button" class="icon-btn" data-remove title="${t('upload.remove')}" aria-label="${t('upload.remove')}">${icon('trash')}</button>`
            : `${icon('upload', 18)}<span><b>${t('upload.empty')}</b>${t('upload.types')}</span>`}
        </div>`;
    case 'swap':
      return `<button type="button" class="text-btn" data-swap="${field.paths.join(',')}">${icon('swap', 14)}${label}</button>`;
    case 'note':
      return `<p class="note">${t(field.text)}</p>`;
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
  if (!visible(field)) return '';
  const hidden = field.showIf && !field.showIf(s);
  return `<div class="field ft-${field.type}" data-field="${fieldIndex(field)}" ${hidden ? 'hidden' : ''}>${build(field, s)}</div>`;
}

function summaryMarkup(sec, s) {
  const sum = sec.summary?.(s);
  if (!sum) return '';
  if (sum.type === 'swatches') return `<span class="sum">${sum.colors.map((c) => `<i style="--c:${c}"></i>`).join('')}</span>`;
  return `<span class="sum">${esc(sum)}</span>`;
}

export function renderContent(s, m) {
  mode = m;
  return CONTENT.map((sec) => `
    <section class="block" data-field="${fieldIndex(sec)}" aria-labelledby="h-${sec.id}">
      <h2 id="h-${sec.id}"><span class="n">${sec.num}</span>${t(sec.title)}</h2>
      ${sec.fields.map((f) => wrapField(f, s)).join('')}
    </section>`).join('');
}

export function renderStyle(s, open, m) {
  mode = m;
  const sections = STYLE.filter(visible).map((sec) => {
    const isOpen = open.has(sec.id);
    return `
    <section class="sec" data-sec="${sec.id}" data-field="${fieldIndex(sec)}">
      <h2><button type="button" class="sec-head" aria-expanded="${isOpen}" aria-controls="sec-${sec.id}">
        <span>${t(sec.title)}</span>${summaryMarkup(sec, s)}<span class="caret">${icon('caret', 12)}</span>
      </button></h2>
      <div class="sec-body" id="sec-${sec.id}" ${isOpen ? '' : 'hidden'}>${sec.fields.map((f) => wrapField(f, s)).join('')}</div>
    </section>`;
  }).join('');
  const more = mode === 'simple'
    ? `<div class="more"><p>${t('mode.moreHint')}</p><button type="button" class="btn" data-mode="full">${t('mode.switchFull')}</button></div>`
    : '';
  return sections + more;
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
      let dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
      if (document.dir === 'rtl' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) dir = -dir;
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
