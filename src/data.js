import interUrl from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url';
import soraUrl from '@fontsource-variable/sora/files/sora-latin-wght-normal.woff2?url';
import outfitUrl from '@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2?url';
import groteskUrl from '@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2?url';
import bricolageUrl from '@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2?url';
import unboundedUrl from '@fontsource-variable/unbounded/files/unbounded-latin-wght-normal.woff2?url';
import syneUrl from '@fontsource-variable/syne/files/syne-latin-wght-normal.woff2?url';
import playfairUrl from '@fontsource-variable/playfair-display/files/playfair-display-latin-wght-normal.woff2?url';
import frauncesUrl from '@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2?url';
import monoUrl from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?url';
import geistUrl from '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url';

export const FONTS = {
  geist: { label: 'Geist', family: 'Geist Variable', url: geistUrl, fallback: 'sans-serif' },
  inter: { label: 'Inter', family: 'Inter Variable', url: interUrl, fallback: 'sans-serif' },
  sora: { label: 'Sora', family: 'Sora Variable', url: soraUrl, fallback: 'sans-serif' },
  outfit: { label: 'Outfit', family: 'Outfit Variable', url: outfitUrl, fallback: 'sans-serif' },
  grotesk: { label: 'Space Grotesk', family: 'Space Grotesk Variable', url: groteskUrl, fallback: 'sans-serif' },
  bricolage: { label: 'Bricolage', family: 'Bricolage Grotesque Variable', url: bricolageUrl, fallback: 'sans-serif' },
  unbounded: { label: 'Unbounded', family: 'Unbounded Variable', url: unboundedUrl, fallback: 'sans-serif' },
  syne: { label: 'Syne', family: 'Syne Variable', url: syneUrl, fallback: 'sans-serif' },
  playfair: { label: 'Playfair', family: 'Playfair Display Variable', url: playfairUrl, fallback: 'serif' },
  fraunces: { label: 'Fraunces', family: 'Fraunces Variable', url: frauncesUrl, fallback: 'serif' },
  mono: { label: 'JetBrains Mono', family: 'JetBrains Mono Variable', url: monoUrl, fallback: 'monospace' },
};

export const FORMATS = {
  square: { ratio: '1:1', w: 1080, h: 1080 },
  portrait: { ratio: '4:5', w: 1080, h: 1350 },
  story: { ratio: '9:16', w: 1080, h: 1920 },
  poster: { ratio: 'A4', w: 1240, h: 1754 },
  landscape: { ratio: '16:9', w: 1600, h: 900 },
  card: { ratio: '7:4', w: 1050, h: 600 },
};

// Centre-logo icons (Phosphor, 256×256 viewBox, filled).
export { LOGO_GLYPHS as ICONS } from './glyphs.js';

const PAPER = {
  card: { radius: 20, border: 0, borderColor: '#1b1b19' },
  bg: {
    type: 'solid', c1: '#f3efe6', c2: '#e8e1d2', c3: '#ffffff', angle: 180,
    pattern: 'grain', patternOpacity: 0.28, patternColor: '#000000',
  },
  plate: {
    enabled: true, style: 'solid', color: '#fffdf8', opacity: 1, radius: 0.04, padding: 0.08,
    shadow: 'soft', shadowColor: '#6b5d45', border: 0, borderColor: '#1b1b19',
  },
  qr: {
    dotStyle: 'rounded', dotScale: 1, eyeOuter: 'soft', eyeInner: 'soft',
    fill: 'solid', c1: '#1b1b19', c2: '#1b1b19', angle: 90,
    eyeMode: 'custom', eyeOuterColor: '#1b1b19', eyeInnerColor: '#b4441f',
  },
  text: {
    headingFont: 'fraunces', bodyFont: 'geist', titleWeight: 500,
    color: '#1b1b19', muted: '#6b665c', accent: '#b4441f', ctaText: '#fffdf8',
    eyebrowStyle: 'text', ctaStyle: 'pill',
  },
  logo: { bgColor: '#1b1b19', color: '#fffdf8' },
};

export const DEFAULT_STATE = {
  url: 'https://www.example.com',
  format: 'portrait',
  layout: 'qr-top',
  qrScale: 0.62,
  padding: 0.09,
  card: PAPER.card,
  bg: PAPER.bg,
  plate: PAPER.plate,
  qr: { ecc: 'Q', ...PAPER.qr },
  text: {
    // replaced with the visitor's language on first load (see main.js)
    eyebrow: 'Digital menu',
    title: 'Tonight’s menu, always up to date',
    description: 'Point your phone’s camera at the code.',
    cta: 'Open the menu',
    showLink: true,
    align: 'center',
    titleSize: 68, descSize: 28,
    ...PAPER.text,
  },
  logo: {
    type: 'none', icon: 'menu', text: 'QR', image: null, size: 0.22,
    shape: 'circle', clear: true, ...PAPER.logo,
  },
};

// Themes only carry style — content (link, texts, uploaded logo) is preserved on apply.
export const PRESETS = [
  { id: 'paper', style: PAPER },
  {
    id: 'sunset',
    style: {
      bg: { type: 'linear', c1: '#ff8a4c', c2: '#ff2e74', c3: '#ffc15e', angle: 135, pattern: 'grain', patternOpacity: 0.2, patternColor: '#ffffff' },
      plate: { enabled: true, style: 'glass', color: '#ffffff', opacity: 0.9, radius: 0.14, padding: 0.08, shadow: 'soft', shadowColor: '#7a1030', border: 0 },
      card: { radius: 56, border: 0 },
      qr: { dotStyle: 'dots', dotScale: 0.96, eyeOuter: 'circle', eyeInner: 'circle', fill: 'linear', c1: '#3d0b2e', c2: '#b0124f', angle: 90, eyeMode: 'same' },
      text: { headingFont: 'outfit', bodyFont: 'outfit', titleWeight: 700, color: '#ffffff', muted: '#ffe3ea', accent: '#ffffff', ctaText: '#e8245f', eyebrowStyle: 'pill', ctaStyle: 'pill' },
      logo: { bgColor: '#ffffff', color: '#e8245f' },
    },
  },
  {
    id: 'minimal',
    style: {
      bg: { type: 'solid', c1: '#f4f2ee', c2: '#e9e5dc', c3: '#ffffff', angle: 180, pattern: 'dots', patternOpacity: 0.55, patternColor: '#d6d0c4' },
      plate: { enabled: true, style: 'solid', color: '#ffffff', opacity: 1, radius: 0.06, padding: 0.08, shadow: 'soft', shadowColor: '#6b5f4a', border: 0 },
      card: { radius: 32, border: 0 },
      qr: { dotStyle: 'rounded', dotScale: 1, eyeOuter: 'soft', eyeInner: 'soft', fill: 'solid', c1: '#111111', c2: '#111111', eyeMode: 'same' },
      text: { headingFont: 'inter', bodyFont: 'inter', titleWeight: 650, color: '#111111', muted: '#6b6b6b', accent: '#111111', ctaText: '#ffffff', eyebrowStyle: 'text', ctaStyle: 'pill' },
      logo: { bgColor: '#111111', color: '#ffffff' },
    },
  },
  {
    id: 'neon',
    style: {
      bg: { type: 'radial', c1: '#0d1a12', c2: '#050507', c3: '#39ff88', angle: 0, pattern: 'grid', patternOpacity: 0.35, patternColor: '#1e3a28' },
      plate: { enabled: true, style: 'solid', color: '#0a110c', opacity: 1, radius: 0.08, padding: 0.09, shadow: 'glow', shadowColor: '#39ff88', border: 3, borderColor: '#39ff88' },
      card: { radius: 40, border: 0 },
      qr: { dotStyle: 'mini', dotScale: 1, eyeOuter: 'square', eyeInner: 'square', fill: 'linear', c1: '#39ff88', c2: '#00e5ff', angle: 45, eyeMode: 'same' },
      text: { headingFont: 'grotesk', bodyFont: 'mono', titleWeight: 700, color: '#eafff2', muted: '#8fb8a0', accent: '#39ff88', ctaText: '#050507', eyebrowStyle: 'pill', ctaStyle: 'outline' },
      logo: { bgColor: '#0a110c', color: '#39ff88' },
    },
  },
  {
    id: 'forest',
    style: {
      bg: { type: 'radial', c1: '#2a4d37', c2: '#0f2418', c3: '#6b8f4e', angle: 0, pattern: 'grain', patternOpacity: 0.22, patternColor: '#ffffff' },
      plate: { enabled: true, style: 'solid', color: '#f3efe3', opacity: 1, radius: 0.06, padding: 0.08, shadow: 'soft', shadowColor: '#050d08', border: 0 },
      card: { radius: 44, border: 0 },
      qr: { dotStyle: 'leaf', dotScale: 0.98, eyeOuter: 'leaf', eyeInner: 'leaf', fill: 'solid', c1: '#1f3d2b', c2: '#1f3d2b', eyeMode: 'custom', eyeOuterColor: '#1f3d2b', eyeInnerColor: '#557a3c' },
      text: { headingFont: 'fraunces', bodyFont: 'inter', titleWeight: 600, color: '#f3efe3', muted: '#b9c7b0', accent: '#d8c38a', ctaText: '#1f3d2b', eyebrowStyle: 'text', ctaStyle: 'pill' },
      logo: { bgColor: '#1f3d2b', color: '#f3efe3' },
    },
  },
  {
    id: 'pastel',
    style: {
      bg: { type: 'mesh', c1: '#fdf2f8', c2: '#c4b5fd', c3: '#fdba74', angle: 135, pattern: 'grain', patternOpacity: 0.14, patternColor: '#ffffff' },
      plate: { enabled: true, style: 'glass', color: '#ffffff', opacity: 0.82, radius: 0.16, padding: 0.08, shadow: 'soft', shadowColor: '#7c3aed', border: 0 },
      card: { radius: 56, border: 0 },
      qr: { dotStyle: 'organic', dotScale: 1, eyeOuter: 'drop', eyeInner: 'drop', fill: 'linear', c1: '#4c1d95', c2: '#be185d', angle: 135, eyeMode: 'same' },
      text: { headingFont: 'bricolage', bodyFont: 'inter', titleWeight: 750, color: '#2e1065', muted: '#6b4c8a', accent: '#7c3aed', ctaText: '#ffffff', eyebrowStyle: 'pill', ctaStyle: 'pill' },
      logo: { bgColor: '#7c3aed', color: '#ffffff' },
    },
  },
  {
    id: 'brutal',
    style: {
      bg: { type: 'solid', c1: '#ffe14d', c2: '#ffe14d', c3: '#ffffff', angle: 0, pattern: 'lines', patternOpacity: 0.18, patternColor: '#000000' },
      plate: { enabled: true, style: 'solid', color: '#ffffff', opacity: 1, radius: 0, padding: 0.08, shadow: 'hard', shadowColor: '#000000', border: 6, borderColor: '#000000' },
      card: { radius: 0, border: 12, borderColor: '#000000' },
      qr: { dotStyle: 'square', dotScale: 1, eyeOuter: 'square', eyeInner: 'square', fill: 'solid', c1: '#000000', c2: '#000000', eyeMode: 'same' },
      text: { headingFont: 'unbounded', bodyFont: 'grotesk', titleWeight: 800, color: '#000000', muted: '#262626', accent: '#000000', ctaText: '#ffe14d', eyebrowStyle: 'pill', ctaStyle: 'pill' },
      logo: { bgColor: '#000000', color: '#ffe14d' },
    },
  },
  {
    id: 'ocean',
    style: {
      bg: { type: 'linear', c1: '#38bdf8', c2: '#1e3a8a', c3: '#ffffff', angle: 160, pattern: 'dots', patternOpacity: 0.16, patternColor: '#ffffff' },
      plate: { enabled: true, style: 'glass', color: '#ffffff', opacity: 0.9, radius: 0.2, padding: 0.09, shadow: 'soft', shadowColor: '#0b1b4a', border: 0 },
      card: { radius: 56, border: 0 },
      qr: { dotStyle: 'dots', dotScale: 0.92, eyeOuter: 'circle', eyeInner: 'circle', fill: 'linear', c1: '#0c4a6e', c2: '#2563eb', angle: 135, eyeMode: 'custom', eyeOuterColor: '#0c4a6e', eyeInnerColor: '#2563eb' },
      text: { headingFont: 'sora', bodyFont: 'inter', titleWeight: 700, color: '#ffffff', muted: '#dbeafe', accent: '#bae6fd', ctaText: '#0c4a6e', eyebrowStyle: 'pill', ctaStyle: 'pill' },
      logo: { bgColor: '#2563eb', color: '#ffffff' },
    },
  },
  {
    id: 'luxe',
    style: {
      bg: { type: 'radial', c1: '#26211c', c2: '#0a0a0a', c3: '#c8a96a', angle: 0, pattern: 'grain', patternOpacity: 0.25, patternColor: '#ffffff' },
      plate: { enabled: true, style: 'solid', color: '#f5efe6', opacity: 1, radius: 0.03, padding: 0.09, shadow: 'soft', shadowColor: '#000000', border: 0 },
      card: { radius: 12, border: 3, borderColor: '#c8a96a' },
      qr: { dotStyle: 'diamond', dotScale: 0.96, eyeOuter: 'square', eyeInner: 'diamond', fill: 'linear', c1: '#2b2112', c2: '#7a5c2e', angle: 90, eyeMode: 'custom', eyeOuterColor: '#2b2112', eyeInnerColor: '#8a6d3b' },
      text: { headingFont: 'playfair', bodyFont: 'inter', titleWeight: 600, color: '#f5efe6', muted: '#a8a29e', accent: '#c8a96a', ctaText: '#1c1917', eyebrowStyle: 'text', ctaStyle: 'outline' },
      logo: { bgColor: '#2b2112', color: '#c8a96a' },
    },
  },
  {
    id: 'candy',
    style: {
      bg: { type: 'solid', c1: '#ff5fa2', c2: '#ff5fa2', c3: '#ffffff', angle: 0, pattern: 'dots', patternOpacity: 0.3, patternColor: '#ffffff' },
      plate: { enabled: true, style: 'solid', color: '#ffffff', opacity: 1, radius: 0.22, padding: 0.09, shadow: 'hard', shadowColor: '#b0125e', border: 0 },
      card: { radius: 64, border: 0 },
      qr: { dotStyle: 'liquid', dotScale: 1, eyeOuter: 'circle', eyeInner: 'circle', fill: 'linear', c1: '#c2185b', c2: '#6a0dad', angle: 45, eyeMode: 'same' },
      text: { headingFont: 'syne', bodyFont: 'outfit', titleWeight: 800, color: '#ffffff', muted: '#ffe0ef', accent: '#ffffff', ctaText: '#e0317e', eyebrowStyle: 'pill', ctaStyle: 'pill' },
      logo: { bgColor: '#ff5fa2', color: '#ffffff' },
    },
  },
  {
    id: 'galaxy',
    style: {
      bg: { type: 'mesh', c1: '#0a0118', c2: '#7b2ff7', c3: '#f107a3', angle: 135, pattern: 'grain', patternOpacity: 0.3, patternColor: '#ffffff' },
      plate: { enabled: true, style: 'glass', color: '#ffffff', opacity: 0.93, radius: 0.1, padding: 0.08, shadow: 'glow', shadowColor: '#b44dff', border: 0 },
      card: { radius: 56, border: 0 },
      qr: { dotStyle: 'rounded', dotScale: 1, eyeOuter: 'rounded', eyeInner: 'sparkle', fill: 'linear', c1: '#2a0a5e', c2: '#a1127a', angle: 45, eyeMode: 'custom', eyeOuterColor: '#2a0a5e', eyeInnerColor: '#d1149a' },
      text: { headingFont: 'unbounded', bodyFont: 'inter', titleWeight: 700, color: '#ffffff', muted: '#d9c6ff', accent: '#f5a6ff', ctaText: '#2a0a5e', eyebrowStyle: 'pill', ctaStyle: 'pill' },
      logo: { bgColor: '#ffffff', color: '#a1127a' },
    },
  },
  {
    id: 'editorial',
    style: {
      bg: { type: 'solid', c1: '#ffffff', c2: '#ffffff', c3: '#ffffff', angle: 0, pattern: 'none', patternOpacity: 0.2, patternColor: '#000000' },
      plate: { enabled: false, style: 'solid', color: '#ffffff', opacity: 1, radius: 0, padding: 0.06, shadow: 'none', shadowColor: '#000000', border: 0 },
      card: { radius: 0, border: 2, borderColor: '#111111' },
      qr: { dotStyle: 'hlines', dotScale: 1, eyeOuter: 'rounded', eyeInner: 'circle', fill: 'solid', c1: '#111111', c2: '#111111', eyeMode: 'custom', eyeOuterColor: '#111111', eyeInnerColor: '#e63946' },
      text: { headingFont: 'playfair', bodyFont: 'inter', titleWeight: 700, color: '#111111', muted: '#555555', accent: '#e63946', ctaText: '#ffffff', eyebrowStyle: 'text', ctaStyle: 'text' },
      logo: { bgColor: '#e63946', color: '#ffffff' },
    },
  },
];
