import jsQR from 'jsqr';
import { FONTS } from './data.js';
import { renderCard } from './render.js';

const fontCache = new Map();

async function fontFace(id) {
  const font = FONTS[id];
  if (!font) return '';
  if (!fontCache.has(id)) {
    fontCache.set(id, (async () => {
      const buf = await (await fetch(font.url)).arrayBuffer();
      let bin = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return `@font-face{font-family:'${font.family}';src:url(data:font/woff2;base64,${btoa(bin)}) format('woff2');font-weight:100 900;font-style:normal;}`;
    })());
  }
  return fontCache.get(id);
}

/** @font-face rules for every font the design uses, so the SVG renders identically anywhere. */
export async function embeddedFonts(state) {
  const ids = new Set([state.text.headingFont, state.text.bodyFont]);
  return (await Promise.all([...ids].map(fontFace))).join('');
}

function loadImage(svg) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

export async function rasterize(state, scale, { matte = null, fonts = true } = {}) {
  const fontCSS = fonts ? await embeddedFonts(state) : '';
  const out = renderCard(state, { id: 'x', scale, fontCSS });
  const img = await loadImage(out.svg);
  // Safari occasionally paints embedded fonts one frame late.
  await new Promise((r) => setTimeout(r, 30));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(out.width * scale);
  canvas.height = Math.round(out.height * scale);
  const c = canvas.getContext('2d');
  if (matte) { c.fillStyle = matte; c.fillRect(0, 0, canvas.width, canvas.height); }
  c.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { canvas, layout: out };
}

const MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };

export async function exportBlob(state, format, scale) {
  if (format === 'svg') {
    const fontCSS = await embeddedFonts(state);
    const { svg } = renderCard(state, { id: 'qr', fontCSS });
    return new Blob([svg], { type: 'image/svg+xml' });
  }
  const { canvas } = await rasterize(state, scale, { matte: format === 'jpg' ? '#ffffff' : null });
  return new Promise((resolve) => canvas.toBlob(resolve, MIME[format], 0.95));
}

export function download(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function fileName(state, ext) {
  const base = (state.text.title || state.url || 'qrcode')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'qrcode';
  return `${base}-qr.${ext}`;
}

export async function copyImage(state) {
  const blob = await exportBlob(state, 'png', 2);
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

let zxing;
function loadZXing() {
  zxing ||= (async () => {
    const [mod, { default: wasmUrl }] = await Promise.all([
      import('zxing-wasm/reader'),
      import('zxing-wasm/reader/zxing_reader.wasm?url'),
    ]);
    mod.prepareZXingModule({ overrides: { locateFile: (p) => (p.endsWith('.wasm') ? wasmUrl : p) }, fireImmediately: true });
    return mod;
  })();
  return zxing;
}

async function decode(imageData) {
  try {
    const { readBarcodes } = await loadZXing();
    const [hit] = await readBarcodes(imageData, { formats: ['QRCode'], tryHarder: true, tryInvert: true, maxNumberOfSymbols: 1 });
    if (hit?.isValid) return hit.text;
  } catch (e) {
    console.warn('ZXing non disponibile, uso jsQR', e);
  }
  return jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' })?.data ?? null;
}

/**
 * Actually decodes the rendered design, the way a phone camera would, to confirm it scans.
 * Returns { ok, data }.
 */
export async function verifyScan(state) {
  const probe = renderCard(state, { id: 'probe' });
  const target = 640;
  const scale = target / probe.plate.size;
  const { canvas } = await rasterize(state, scale, { fonts: false, matte: '#ffffff' });
  const margin = probe.plate.size * 0.06;
  const sx = Math.max(0, (probe.plate.x - margin) * scale);
  const sy = Math.max(0, (probe.plate.y - margin) * scale);
  const sw = Math.min(canvas.width - sx, (probe.plate.size + margin * 2) * scale);
  const sh = Math.min(canvas.height - sy, (probe.plate.size + margin * 2) * scale);
  // Full detail first, then a smaller copy — roughly a phone held at arm's length.
  let data = null;
  for (const size of [target, 320]) {
    const k = size / target;
    const c = document.createElement('canvas');
    c.width = Math.round(sw * k);
    c.height = Math.round(sh * k);
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingQuality = 'high';
    g.drawImage(canvas, sx, sy, sw, sh, 0, 0, c.width, c.height);
    data = await decode(g.getImageData(0, 0, c.width, c.height));
    if (data === state.url) break;
  }
  return { ok: data === state.url, data };
}
