import { buildMatrix, isFinder, dotsPath, eyesPaths, rrect, circle } from './qr.js';
import { FONTS, FORMATS, ICONS } from './data.js';

const f = (n) => +(+n).toFixed(2);

export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const fontStack = (id) => {
  const font = FONTS[id] || FONTS.inter;
  return `'${font.family}', ${font.fallback}`;
};

/* ---------- text measuring ---------- */

let ctx;
function measure(text, font, size, weight, tracking = 0) {
  ctx ||= document.createElement('canvas').getContext('2d');
  ctx.font = `${weight} ${size}px ${fontStack(font)}`;
  return ctx.measureText(text).width + tracking * size * Math.max(0, text.length - 1);
}

function wrap(text, font, size, weight, maxW, maxLines, tracking = 0) {
  const lines = [];
  for (const para of String(text).split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (!line || measure(test, font, size, weight, tracking) <= maxW) line = test;
      else { lines.push(line); line = w; }
      // scripts without spaces (Chinese, Japanese…) or very long words: break between characters
      while (measure(line, font, size, weight, tracking) > maxW) {
        const chars = [...line];
        if (chars.length < 2) break;
        let cut = chars.length - 1;
        while (cut > 1 && measure(chars.slice(0, cut).join(''), font, size, weight, tracking) > maxW) cut--;
        lines.push(chars.slice(0, cut).join(''));
        line = chars.slice(cut).join('');
      }
    }
    lines.push(line);
  }
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last.length > 1 && measure(`${last}…`, font, size, weight, tracking) > maxW) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last.trimEnd()}…`;
    return kept;
  }
  return lines;
}

function ellipsize(text, font, size, weight, maxW) {
  if (measure(text, font, size, weight) <= maxW) return text;
  let t = text;
  while (t.length > 1 && measure(`${t}…`, font, size, weight) > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

export function displayUrl(url) {
  return String(url || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
}

/* ---------- text block ---------- */

function textBlock(s, u, maxW, fit) {
  const t = s.text;
  const items = [];
  const k = u * fit;

  if (t.eyebrow?.trim()) {
    const size = 22 * k;
    const label = t.eyebrow.trim().toUpperCase();
    const tw = measure(label, t.headingFont, size, 700, 0.16);
    const pill = t.eyebrowStyle === 'pill';
    items.push({
      kind: 'eyebrow', size, label, tw, pill,
      w: pill ? tw + size * 1.8 : tw,
      h: pill ? size * 2.1 : size * 1.3,
      gap: 0,
    });
  }
  if (t.title?.trim()) {
    const size = t.titleSize * k;
    const lines = wrap(t.title.trim(), t.headingFont, size, t.titleWeight, maxW, 4, -0.02);
    items.push({ kind: 'title', size, lines, lh: size * 1.12, h: lines.length * size * 1.12, gap: 26 * k });
  }
  if (t.description?.trim()) {
    const size = t.descSize * k;
    const lines = wrap(t.description.trim(), t.bodyFont, size, 400, maxW, 6);
    items.push({ kind: 'desc', size, lines, lh: size * 1.45, h: lines.length * size * 1.45, gap: 18 * k });
  }
  if (t.cta?.trim()) {
    const size = 26 * k;
    const label = ellipsize(t.cta.trim(), t.bodyFont, size, 650, maxW - size * 2.4);
    const tw = measure(label, t.bodyFont, size, 650);
    const boxed = t.ctaStyle !== 'text';
    items.push({
      kind: 'cta', size, label, tw, boxed,
      w: boxed ? tw + size * 2.4 : tw,
      h: boxed ? size * 2.35 : size * 1.4,
      gap: 38 * k,
    });
  }
  if (t.showLink && s.url) {
    const size = 22 * k;
    const icon = size * 1.05;
    const label = ellipsize(displayUrl(s.url), t.bodyFont, size, 500, maxW - icon - size * 0.5);
    const tw = measure(label, t.bodyFont, size, 500);
    items.push({ kind: 'link', size, label, icon, w: icon + size * 0.5 + tw, h: size * 1.5, gap: (items.at(-1)?.kind === 'cta' ? 24 : 34) * k });
  }
  if (items.length) items[0].gap = 0;
  const height = items.reduce((a, it) => a + it.h + it.gap, 0);
  return { items, height };
}

function renderText(s, block, x, y, w) {
  const t = s.text;
  const align = t.align;
  const anchor = align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle';
  const ax = align === 'left' ? x : align === 'right' ? x + w : x + w / 2;
  const boxX = (bw) => (align === 'left' ? x : align === 'right' ? x + w - bw : x + (w - bw) / 2);
  const baseline = (top, lh, size) => top + lh / 2 + size * 0.34;
  let out = '';
  let cy = y;

  for (const it of block.items) {
    cy += it.gap;
    const common = `text-anchor="${anchor}"`;
    switch (it.kind) {
      case 'eyebrow': {
        if (it.pill) {
          const bx = boxX(it.w);
          out += `<rect x="${f(bx)}" y="${f(cy)}" width="${f(it.w)}" height="${f(it.h)}" rx="${f(it.h / 2)}" fill="${t.accent}" fill-opacity="0.16" stroke="${t.accent}" stroke-opacity="0.45" stroke-width="${f(it.size * 0.07)}"/>`;
          out += `<text x="${f(bx + it.w / 2)}" y="${f(baseline(cy, it.h, it.size))}" text-anchor="middle" font-family="${fontStack(t.headingFont)}" font-size="${f(it.size)}" font-weight="700" letter-spacing="${f(it.size * 0.16)}" fill="${t.accent}">${esc(it.label)}</text>`;
        } else {
          out += `<text x="${f(ax)}" y="${f(baseline(cy, it.h, it.size))}" ${common} font-family="${fontStack(t.headingFont)}" font-size="${f(it.size)}" font-weight="700" letter-spacing="${f(it.size * 0.16)}" fill="${t.accent}">${esc(it.label)}</text>`;
        }
        break;
      }
      case 'title':
      case 'desc': {
        const isTitle = it.kind === 'title';
        const attrs = isTitle
          ? `font-family="${fontStack(t.headingFont)}" font-weight="${t.titleWeight}" letter-spacing="${f(it.size * -0.02)}" fill="${t.color}"`
          : `font-family="${fontStack(t.bodyFont)}" font-weight="400" fill="${t.muted}"`;
        it.lines.forEach((line, i) => {
          out += `<text x="${f(ax)}" y="${f(baseline(cy + i * it.lh, it.lh, it.size))}" ${common} font-size="${f(it.size)}" ${attrs}>${esc(line)}</text>`;
        });
        break;
      }
      case 'cta': {
        const bx = boxX(it.w);
        const ty = baseline(cy, it.h, it.size);
        if (t.ctaStyle === 'pill') {
          out += `<rect x="${f(bx)}" y="${f(cy)}" width="${f(it.w)}" height="${f(it.h)}" rx="${f(it.h / 2)}" fill="${t.accent}"/>`;
        } else if (t.ctaStyle === 'outline') {
          const sw = it.size * 0.09;
          out += `<rect x="${f(bx + sw / 2)}" y="${f(cy + sw / 2)}" width="${f(it.w - sw)}" height="${f(it.h - sw)}" rx="${f((it.h - sw) / 2)}" fill="none" stroke="${t.accent}" stroke-width="${f(sw)}"/>`;
        }
        const fill = t.ctaStyle === 'pill' ? t.ctaText : t.accent;
        const deco = t.ctaStyle === 'text' ? ` text-decoration="underline"` : '';
        out += `<text x="${f(bx + it.w / 2)}" y="${f(ty)}" text-anchor="middle" font-family="${fontStack(t.bodyFont)}" font-size="${f(it.size)}" font-weight="650" fill="${fill}"${deco}>${esc(it.label)}</text>`;
        break;
      }
      case 'link': {
        const bx = boxX(it.w);
        const iy = cy + (it.h - it.icon) / 2;
        out += `<svg x="${f(bx)}" y="${f(iy)}" width="${f(it.icon)}" height="${f(it.icon)}" viewBox="0 0 256 256" fill="${t.muted}">${ICONS.link}</svg>`;
        out += `<text x="${f(bx + it.icon + it.size * 0.5)}" y="${f(baseline(cy, it.h, it.size))}" font-family="${fontStack(t.bodyFont)}" font-size="${f(it.size)}" font-weight="500" fill="${t.muted}">${esc(it.label)}</text>`;
        break;
      }
    }
    cy += it.h;
  }
  return out;
}

/* ---------- layout ---------- */

function computeLayout(s, W, H, u) {
  const pad = s.padding * Math.min(W, H);
  const cw = W - 2 * pad, ch = H - 2 * pad;
  const qrOnly = s.layout === 'qr-only';
  // side-by-side only makes sense when the canvas isn't taller than it is wide
  const horizontal = (s.layout === 'qr-left' || s.layout === 'qr-right') && W >= H;

  if (qrOnly) {
    const P = Math.min(cw, ch) * Math.min(1, s.qrScale / 0.64 * 0.8);
    return { plate: { x: (W - P) / 2, y: (H - P) / 2, size: P }, text: null };
  }

  if (horizontal) {
    const gap = 64 * u;
    const P = Math.min(ch, cw * s.qrScale * 0.78);
    const tw = cw - P - gap;
    let fit = 1.3, block; // side-by-side text has room to be bolder
    for (let i = 0; i < 8; i++) {
      block = textBlock(s, u, tw, fit);
      if (block.height <= ch) break;
      fit *= 0.9;
    }
    if (!block.items.length) return { plate: { x: (W - P) / 2, y: (H - P) / 2, size: P }, text: null };
    const qrLeft = s.layout === 'qr-left';
    return {
      plate: { x: qrLeft ? pad : W - pad - P, y: (H - P) / 2, size: P },
      text: { block, x: qrLeft ? pad + P + gap : pad, y: (H - block.height) / 2, w: tw },
    };
  }

  // vertical stacks
  const gap = 60 * u;
  const tw = s.text.align === 'center' ? cw * 0.92 : cw;
  const minP = Math.min(cw, ch) * 0.34;
  let fit = 1, block, P;
  for (let i = 0; i < 8; i++) {
    block = textBlock(s, u, tw, fit);
    const g = block.items.length ? gap : 0;
    P = Math.min(cw * s.qrScale, ch - block.height - g);
    if (P >= minP) break;
    fit *= 0.9;
  }
  P = Math.max(P, minP);
  if (!block.items.length) return { plate: { x: (W - P) / 2, y: (H - P) / 2, size: P }, text: null };

  const total = P + gap + block.height;
  const top = (H - total) / 2;
  const align = s.text.align;
  const px = align === 'left' ? pad : align === 'right' ? W - pad - P : (W - P) / 2;
  const tx = align === 'center' ? (W - tw) / 2 : pad;
  const qrFirst = s.layout !== 'qr-bottom';
  return {
    plate: { x: px, y: qrFirst ? top : top + block.height + gap, size: P },
    text: { block, x: tx, y: qrFirst ? top + P + gap : top, w: tw },
  };
}

/* ---------- background ---------- */

function background(s, W, H, id, u) {
  const b = s.bg;
  let defs = '';
  let body = '';
  if (b.type === 'linear') {
    defs += `<linearGradient id="${id}-bgg" gradientUnits="objectBoundingBox" gradientTransform="rotate(${b.angle - 90} .5 .5)"><stop offset="0" stop-color="${b.c1}"/><stop offset="1" stop-color="${b.c2}"/></linearGradient>`;
    body += `<rect width="${W}" height="${H}" fill="url(#${id}-bgg)"/>`;
  } else if (b.type === 'radial') {
    defs += `<radialGradient id="${id}-bgg" cx=".5" cy=".38" r=".85"><stop offset="0" stop-color="${b.c1}"/><stop offset="1" stop-color="${b.c2}"/></radialGradient>`;
    body += `<rect width="${W}" height="${H}" fill="url(#${id}-bgg)"/>`;
  } else if (b.type === 'mesh') {
    const M = Math.max(W, H);
    defs += `<filter id="${id}-mesh" filterUnits="userSpaceOnUse" x="${-W}" y="${-H}" width="${3 * W}" height="${3 * H}"><feGaussianBlur stdDeviation="${f(M * 0.11)}"/></filter>`;
    body += `<rect width="${W}" height="${H}" fill="${b.c1}"/>`;
    body += `<g filter="url(#${id}-mesh)">`;
    body += `<circle cx="${f(W * 0.12)}" cy="${f(H * 0.08)}" r="${f(M * 0.42)}" fill="${b.c2}" fill-opacity=".9"/>`;
    body += `<circle cx="${f(W * 0.95)}" cy="${f(H * 0.42)}" r="${f(M * 0.34)}" fill="${b.c3}" fill-opacity=".8"/>`;
    body += `<circle cx="${f(W * 0.22)}" cy="${f(H * 1.0)}" r="${f(M * 0.36)}" fill="${b.c3}" fill-opacity=".55"/>`;
    body += `<circle cx="${f(W * 0.9)}" cy="${f(H * 1.02)}" r="${f(M * 0.3)}" fill="${b.c2}" fill-opacity=".7"/>`;
    body += `</g>`;
  } else if (b.type === 'solid') {
    body += `<rect width="${W}" height="${H}" fill="${b.c1}"/>`;
  }

  let overlay = '';
  if (b.type === 'none') return { defs, body, overlay };
  const op = b.patternOpacity;
  if (b.pattern === 'grain') {
    defs += `<filter id="${id}-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${f(0.9 / u)}" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>`;
    overlay = `<rect width="${W}" height="${H}" filter="url(#${id}-grain)" opacity="${op}" style="mix-blend-mode:overlay"/>`;
  } else if (b.pattern === 'dots') {
    const g = 30 * u;
    defs += `<pattern id="${id}-pat" width="${f(g)}" height="${f(g)}" patternUnits="userSpaceOnUse"><circle cx="${f(g / 2)}" cy="${f(g / 2)}" r="${f(2 * u)}" fill="${b.patternColor}"/></pattern>`;
    overlay = `<rect width="${W}" height="${H}" fill="url(#${id}-pat)" opacity="${op}"/>`;
  } else if (b.pattern === 'grid') {
    const g = 54 * u;
    defs += `<pattern id="${id}-pat" width="${f(g)}" height="${f(g)}" patternUnits="userSpaceOnUse"><path d="M${f(g)} 0V${f(g)}M0 ${f(g)}H${f(g)}" stroke="${b.patternColor}" stroke-width="${f(1.4 * u)}" fill="none"/></pattern>`;
    overlay = `<rect width="${W}" height="${H}" fill="url(#${id}-pat)" opacity="${op}"/>`;
  } else if (b.pattern === 'lines') {
    const g = 22 * u;
    defs += `<pattern id="${id}-pat" width="${f(g)}" height="${f(g)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V${f(g)}" stroke="${b.patternColor}" stroke-width="${f(2.2 * u)}"/></pattern>`;
    overlay = `<rect width="${W}" height="${H}" fill="url(#${id}-pat)" opacity="${op}"/>`;
  } else if (b.pattern === 'rings') {
    const M = Math.max(W, H);
    let rings = '';
    for (let r = 60 * u; r < M * 1.2; r += 60 * u) rings += `<circle cx="${W / 2}" cy="${H / 2}" r="${f(r)}"/>`;
    overlay = `<g fill="none" stroke="${b.patternColor}" stroke-width="${f(1.5 * u)}" opacity="${op}">${rings}</g>`;
  }
  return { defs, body, overlay };
}

/* ---------- QR + logo ---------- */

function logoMarkup(s, cx, cy, ls) {
  const L = s.logo;
  let out = '';
  if (L.shape === 'circle') out += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(ls / 2)}" fill="${L.bgColor}"/>`;
  else if (L.shape === 'rounded') out += `<path d="${rrect(cx - ls / 2, cy - ls / 2, ls, ls, ls * 0.26)}" fill="${L.bgColor}"/>`;
  else if (L.shape === 'square') out += `<rect x="${f(cx - ls / 2)}" y="${f(cy - ls / 2)}" width="${f(ls)}" height="${f(ls)}" fill="${L.bgColor}"/>`;

  const inner = L.shape === 'none' ? ls : ls * (L.type === 'image' ? 0.72 : 0.56);
  const x = cx - inner / 2, y = cy - inner / 2;
  if (L.type === 'icon') {
    out += `<svg x="${f(x)}" y="${f(y)}" width="${f(inner)}" height="${f(inner)}" viewBox="0 0 256 256" fill="${L.color}">${ICONS[L.icon] || ICONS.link}</svg>`;
  } else if (L.type === 'text' && L.text) {
    const label = L.text.slice(0, 4);
    const size = Math.min(inner * 0.8, (inner * 105) / Math.max(1, measure(label, s.text.headingFont, 100, 800)));
    out += `<text x="${f(cx)}" y="${f(cy + size * 0.35)}" text-anchor="middle" font-family="${fontStack(s.text.headingFont)}" font-weight="800" font-size="${f(size)}" fill="${L.color}">${esc(label)}</text>`;
  } else if (L.type === 'image' && L.image) {
    out += `<image href="${L.image}" x="${f(x)}" y="${f(y)}" width="${f(inner)}" height="${f(inner)}" preserveAspectRatio="xMidYMid meet"/>`;
  }
  return out;
}

function qrMarkup(s, x0, y0, size, id) {
  const q = s.qr;
  const hasLogo = s.logo.type !== 'none' && !(s.logo.type === 'image' && !s.logo.image) && !(s.logo.type === 'text' && !s.logo.text);
  const matrix = buildMatrix(s.url, q.ecc);
  const n = matrix.length;
  const m = size / n;
  const cx = x0 + size / 2, cy = y0 + size / 2;
  const ls = size * s.logo.size;
  const clearR = ls / 2 + m * 0.35;

  const cleared = (r, c) => {
    if (!hasLogo || !s.logo.clear) return false;
    const mx = x0 + (c + 0.5) * m, my = y0 + (r + 0.5) * m;
    if (s.logo.shape === 'circle') return Math.hypot(mx - cx, my - cy) < clearR + m * 0.2;
    return Math.abs(mx - cx) < clearR && Math.abs(my - cy) < clearR;
  };
  const on = (r, c) => r >= 0 && c >= 0 && r < n && c < n && matrix[r][c] && !isFinder(r, c, n) && !cleared(r, c);

  let defs = '';
  let paint = q.c1;
  if (q.fill === 'linear') {
    const a = ((q.angle - 90) * Math.PI) / 180;
    const dx = (Math.cos(a) * size) / 2, dy = (Math.sin(a) * size) / 2;
    defs += `<linearGradient id="${id}-qrg" gradientUnits="userSpaceOnUse" x1="${f(cx - dx)}" y1="${f(cy - dy)}" x2="${f(cx + dx)}" y2="${f(cy + dy)}"><stop offset="0" stop-color="${q.c1}"/><stop offset="1" stop-color="${q.c2}"/></linearGradient>`;
    paint = `url(#${id}-qrg)`;
  } else if (q.fill === 'radial') {
    defs += `<radialGradient id="${id}-qrg" gradientUnits="userSpaceOnUse" cx="${f(cx)}" cy="${f(cy)}" r="${f(size * 0.72)}"><stop offset="0" stop-color="${q.c1}"/><stop offset="1" stop-color="${q.c2}"/></radialGradient>`;
    paint = `url(#${id}-qrg)`;
  }
  const eyes = eyesPaths(n, x0, y0, m, q.eyeOuter, q.eyeInner);
  const same = q.eyeMode === 'same';
  let body = `<path d="${dotsPath(on, n, x0, y0, m, q.dotStyle, q.dotScale)}" fill="${paint}"/>`;
  body += `<path d="${eyes.outer}" fill="${same ? paint : q.eyeOuterColor}" fill-rule="evenodd"/>`;
  body += `<path d="${eyes.inner}" fill="${same ? paint : q.eyeInnerColor}"/>`;
  if (hasLogo) body += logoMarkup(s, cx, cy, ls);
  return { defs, body, modules: n };
}

/* ---------- card ---------- */

/**
 * Renders the whole design as a standalone SVG string.
 * opts.id — unique prefix for defs (several SVGs can live in one document)
 * opts.scale — output pixel scale; opts.fontCSS — @font-face rules to embed
 */
export function renderCard(s, opts = {}) {
  const id = opts.id || 'q';
  const scale = opts.scale || 1;
  const { w: W, h: H } = FORMATS[s.format] || FORMATS.portrait;
  const u = Math.min(W, H) / 1080;
  const L = computeLayout(s, W, H, u);
  const P = L.plate.size;
  const pl = s.plate;
  const platePad = P * pl.padding;
  const qx = L.plate.x + platePad, qy = L.plate.y + platePad, qs = P - 2 * platePad;
  const pr = pl.radius * P;

  const bg = background(s, W, H, id, u);
  const qr = qrMarkup(s, qx, qy, qs, id);
  let defs = bg.defs + qr.defs;
  defs += `<clipPath id="${id}-card"><path d="${rrect(0, 0, W, H, s.card.radius * u)}"/></clipPath>`;

  let plate = '';
  if (pl.enabled) {
    const platePath = rrect(L.plate.x, L.plate.y, P, P, pr);
    if (pl.shadow === 'soft') {
      defs += `<filter id="${id}-sh" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="${f(P * 0.035)}" stdDeviation="${f(P * 0.045)}" flood-color="${pl.shadowColor}" flood-opacity=".38"/></filter>`;
      plate += `<path d="${platePath}" fill="${pl.shadowColor}" fill-opacity="${pl.style === 'glass' ? 0.25 : 1}" filter="url(#${id}-sh)"/>`;
    } else if (pl.shadow === 'glow') {
      defs += `<filter id="${id}-sh" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${f(P * 0.06)}" flood-color="${pl.shadowColor}" flood-opacity=".75"/></filter>`;
      plate += `<path d="${platePath}" fill="${pl.shadowColor}" filter="url(#${id}-sh)"/>`;
    } else if (pl.shadow === 'hard') {
      const o = P * 0.035;
      plate += `<path d="${rrect(L.plate.x + o, L.plate.y + o, P, P, pr)}" fill="${pl.shadowColor}"/>`;
    }
    if (pl.style === 'glass') {
      defs += `<clipPath id="${id}-pc"><path d="${platePath}"/></clipPath>`;
      defs += `<filter id="${id}-frost" x="0" y="0" width="100%" height="100%"><feGaussianBlur stdDeviation="${f(24 * u)}"/></filter>`;
      plate += `<g clip-path="url(#${id}-pc)"><g filter="url(#${id}-frost)">${bg.body}</g></g>`;
      plate += `<path d="${platePath}" fill="${pl.color}" fill-opacity="${pl.opacity}"/>`;
      plate += `<path d="${rrect(L.plate.x + u, L.plate.y + u, P - 2 * u, P - 2 * u, Math.max(0, pr - u))}" fill="none" stroke="#ffffff" stroke-opacity=".6" stroke-width="${f(2 * u)}"/>`;
    } else {
      plate += `<path d="${platePath}" fill="${pl.color}" fill-opacity="${pl.opacity}"/>`;
    }
    if (pl.border > 0) {
      const b = pl.border * u;
      plate += `<path d="${rrect(L.plate.x + b / 2, L.plate.y + b / 2, P - b, P - b, Math.max(0, pr - b / 2))}" fill="none" stroke="${pl.borderColor}" stroke-width="${f(b)}"/>`;
    }
  }

  const text = L.text ? renderText(s, L.text.block, L.text.x, L.text.y, L.text.w) : '';
  const border = s.card.border > 0
    ? `<path d="${rrect(0, 0, W, H, s.card.radius * u)}" fill="none" stroke="${s.card.borderColor}" stroke-width="${f(s.card.border * u * 2)}"/>`
    : '';
  const style = opts.fontCSS ? `<style>${opts.fontCSS}</style>` : '';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" direction="ltr" viewBox="0 0 ${W} ${H}" width="${f(W * scale)}" height="${f(H * scale)}">` +
    `<defs>${style}${defs}</defs>` +
    `<g clip-path="url(#${id}-card)">${bg.body}${bg.overlay}${plate}${qr.body}${text}${border}</g></svg>`;

  return {
    svg, width: W, height: H,
    plate: L.plate,
    qrRect: { x: qx, y: qy, size: qs },
    modules: qr.modules,
  };
}
