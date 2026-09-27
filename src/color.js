import { DOT_STYLES, EYE_OUTER, EYE_INNER } from './qr.js';

export function hexToRgb(hex) {
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const isHex = (v) => /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(v).trim());

export function normalizeHex(v) {
  let h = String(v).trim().replace('#', '').toLowerCase();
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return `#${h}`;
}

export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

export function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}

/** Worst-case contrast between the code's ink and whatever sits behind it. */
export function scanContrast(s) {
  // with a transparent card we assume it will be placed on white
  const base = s.bg.type === 'none' ? '#ffffff' : s.bg.c1;
  const behind = s.plate.enabled
    ? (s.plate.opacity < 1 ? mix(base, s.plate.color, s.plate.opacity) : s.plate.color)
    : base;
  const inks = [s.qr.c1];
  if (s.qr.fill !== 'solid') inks.push(s.qr.c2);
  if (s.qr.eyeMode === 'custom') inks.push(s.qr.eyeOuterColor, s.qr.eyeInnerColor);
  const ratio = Math.min(...inks.map((c) => contrast(c, behind)));
  const inverted = inks.every((c) => luminance(c) > luminance(behind));
  return { ratio, inverted, behind };
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rnd = (a, b) => a + Math.random() * (b - a);

/** A random but harmonious style — always dark ink on a light plate so it stays scannable. */
export function randomStyle() {
  const h = Math.floor(Math.random() * 360);
  const dark = Math.random() < 0.55;
  const shift = pick([30, 40, 150, 180, -40, 60]);
  const bgType = pick(['mesh', 'mesh', 'linear', 'radial', 'solid']);
  const bg = dark
    ? { c1: hsl(h, 45, 9), c2: hsl(h + shift, 85, 58), c3: hsl(h - 35, 90, 60) }
    : { c1: hsl(h, 70, 94), c2: hsl(h + shift, 90, 78), c3: hsl(h - 30, 90, 84) };
  if (bgType === 'linear' || bgType === 'radial') {
    if (dark) Object.assign(bg, { c1: hsl(h, 70, 42), c2: hsl(h + shift, 60, 14) });
    else Object.assign(bg, { c1: hsl(h, 90, 86), c2: hsl(h + shift, 85, 70) });
  }
  const ink1 = hsl(h, 65, 16);
  const ink2 = hsl(h + shift, 70, 34);
  const heading = pick(['sora', 'outfit', 'grotesk', 'bricolage', 'unbounded', 'syne', 'playfair', 'fraunces', 'inter']);
  const light = dark; // light text only on dark backgrounds
  return {
    bg: {
      type: bgType, ...bg, angle: pick([90, 120, 135, 160, 200]),
      pattern: pick(['grain', 'grain', 'dots', 'grid', 'lines', 'rings', 'none']),
      patternOpacity: +rnd(0.12, 0.3).toFixed(2),
      patternColor: dark ? '#ffffff' : hsl(h, 40, 60),
    },
    plate: {
      enabled: true, style: pick(['solid', 'glass']), color: '#ffffff', opacity: pick([1, 0.92, 0.88]),
      radius: pick([0.04, 0.08, 0.12, 0.16, 0.2]), padding: 0.08,
      shadow: pick(['soft', 'soft', 'hard', 'glow', 'none']), shadowColor: dark ? hsl(h, 60, 6) : hsl(h + shift, 70, 45),
      border: 0,
    },
    card: { radius: pick([0, 24, 40, 56, 72]), border: 0 },
    qr: {
      dotStyle: pick(DOT_STYLES).id, dotScale: 1,
      eyeOuter: pick(EYE_OUTER).id, eyeInner: pick(EYE_INNER).id,
      fill: pick(['solid', 'linear', 'linear', 'radial']), c1: ink1, c2: ink2, angle: pick([45, 90, 135]),
      eyeMode: pick(['same', 'custom']), eyeOuterColor: ink1, eyeInnerColor: ink2,
    },
    text: {
      headingFont: heading, bodyFont: pick(['inter', 'outfit', 'grotesk']),
      titleWeight: pick([600, 700, 800]),
      color: light ? '#ffffff' : hsl(h, 60, 12),
      muted: light ? hsl(h, 40, 86) : hsl(h, 20, 38),
      accent: light ? hsl(h + shift, 90, 80) : hsl(h + shift, 75, 42),
      ctaText: light ? hsl(h, 60, 12) : '#ffffff',
      eyebrowStyle: pick(['pill', 'text']), ctaStyle: pick(['pill', 'pill', 'outline']),
    },
    logo: { bgColor: ink1, color: '#ffffff' },
  };
}
