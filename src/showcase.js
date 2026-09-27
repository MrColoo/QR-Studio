/*
  Floating example cards beside the "about" headline.

  Cost is kept near zero on purpose:
  - this module is only loaded when the section approaches the viewport;
  - each card is rendered once, off the main path (idle time), into a bitmap <img>;
  - motion is transform-only on composited layers, and stops entirely while the
    section is off screen, the tab is hidden or the visitor prefers reduced motion.
*/
import { rasterize } from './export.js';
import { deepMerge } from './state.js';
import { DEFAULT_STATE, PRESETS, FORMATS } from './data.js';
import { t } from './i18n/index.js';

const SITE = 'https://mrcoloo.github.io/QR-Studio/';

// Each example: a preset plus the content it would realistically carry.
export const EXAMPLES = [
  {
    preset: 'paper', format: 'portrait', layout: 'qr-top',
    text: () => ({ eyebrow: t('default.eyebrow'), title: t('default.title'), description: '', cta: t('default.cta') }),
    logo: { type: 'icon', icon: 'menu' },
  },
  {
    preset: 'candy', format: 'square', layout: 'qr-top',
    text: () => ({ eyebrow: 'Instagram', title: t('ex.social.title'), description: '', cta: t('ex.social.cta') }),
    logo: { type: 'icon', icon: 'instagram' },
  },
  {
    preset: 'galaxy', format: 'portrait', layout: 'qr-top',
    text: () => ({ eyebrow: t('ex.event.eyebrow'), title: t('ex.event.title'), description: '', cta: t('ex.event.cta') }),
    logo: { type: 'none' },
  },
  {
    preset: 'luxe', format: 'card', layout: 'qr-right', align: 'left',
    text: () => ({ eyebrow: t('ex.card.eyebrow'), title: 'Studio Aurelia', description: t('ex.card.desc'), cta: '' }),
    logo: { type: 'text', text: 'SA' },
  },
];

function exampleState(ex) {
  const preset = PRESETS.find((p) => p.id === ex.preset);
  const s = deepMerge(DEFAULT_STATE, preset.style);
  s.url = SITE;
  s.format = ex.format;
  s.layout = ex.layout;
  s.text = { ...s.text, ...ex.text(), showLink: false, align: ex.align || 'center' };
  s.logo = { ...s.logo, ...ex.logo };
  if (s.logo.type !== 'none') s.qr.ecc = 'H';
  return s;
}

const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 60));

/**
 * @param stage  container with one .fcard per example (see index.html)
 * @param onPick called with the example state when a card is chosen
 */
export function mountShowcase(stage, onPick) {
  const cards = [...stage.querySelectorAll('.fcard')];
  const states = EXAMPLES.map(exampleState);

  // Render one card per idle slot, at roughly the pixel size it is shown at.
  cards.forEach((card, i) => {
    const s = states[i];
    card.setAttribute('aria-label', t('ex.aria', { title: s.text.title }));
    idle(async () => {
      try {
        const { w } = FORMATS[s.format];
        const target = Math.min(900, card.getBoundingClientRect().width * Math.min(2, devicePixelRatio || 1) || 480);
        const { canvas } = await rasterize(s, target / w);
        const blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', 0.9));
        const img = card.querySelector('img');
        img.src = URL.createObjectURL(blob);
        await img.decode().catch(() => {});
        card.classList.add('ready');
      } catch (e) {
        console.warn(e);
      }
    });
  });

  stage.addEventListener('click', (e) => {
    const card = e.target.closest('.fcard');
    if (card) onPick(states[cards.indexOf(card)], EXAMPLES[cards.indexOf(card)]);
  });

  // Motion: only while visible, only with a fine pointer, never with reduced motion.
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let live = false;
  new IntersectionObserver(([entry]) => {
    live = entry.isIntersecting;
    stage.classList.toggle('live', live && !calm.matches);
  }).observe(stage);

  let frame = 0;
  let pending = null;
  const flush = () => {
    frame = 0;
    const { mx, my, card, rx, ry } = pending;
    stage.style.setProperty('--mx', mx.toFixed(3));
    stage.style.setProperty('--my', my.toFixed(3));
    cards.forEach((c) => {
      const hovered = c === card;
      c.style.setProperty('--rx', hovered ? `${rx.toFixed(2)}deg` : '0deg');
      c.style.setProperty('--ry', hovered ? `${ry.toFixed(2)}deg` : '0deg');
      c.classList.toggle('hover', hovered);
    });
  };
  const schedule = (next) => {
    pending = next;
    if (!frame) frame = requestAnimationFrame(flush);
  };

  stage.addEventListener('pointermove', (e) => {
    if (!live || calm.matches || !finePointer.matches) return;
    const r = stage.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const my = ((e.clientY - r.top) / r.height) * 2 - 1;
    const card = e.target.closest('.fcard');
    let rx = 0, ry = 0;
    if (card) {
      const c = card.getBoundingClientRect();
      ry = (((e.clientX - c.left) / c.width) * 2 - 1) * 8;
      rx = -(((e.clientY - c.top) / c.height) * 2 - 1) * 8;
    }
    schedule({ mx, my, card, rx, ry });
  });
  stage.addEventListener('pointerleave', () => schedule({ mx: 0, my: 0, card: null, rx: 0, ry: 0 }));
}
