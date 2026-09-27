import qrcode from 'qrcode-generator';

// Encode everything as UTF-8 so accented characters in links survive.
qrcode.stringToBytes = (s) => Array.from(new TextEncoder().encode(s));

const f = (n) => +n.toFixed(2);

/** Builds the boolean module matrix for `data`. */
export function buildMatrix(data, ecc = 'Q') {
  const qr = qrcode(0, ecc);
  qr.addData(data || ' ');
  qr.make();
  const n = qr.getModuleCount();
  const m = [];
  for (let r = 0; r < n; r++) {
    const row = [];
    for (let c = 0; c < n; c++) row.push(qr.isDark(r, c));
    m.push(row);
  }
  return m;
}

export function isFinder(r, c, n) {
  return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
}

/* ---------- primitive path helpers ---------- */

export function rrect(x, y, w, h, radii) {
  let [tl, tr, br, bl] = Array.isArray(radii) ? radii : [radii, radii, radii, radii];
  const max = Math.min(w, h) / 2;
  tl = Math.min(tl, max); tr = Math.min(tr, max); br = Math.min(br, max); bl = Math.min(bl, max);
  return (
    `M${f(x + tl)} ${f(y)}H${f(x + w - tr)}` +
    (tr ? `A${f(tr)} ${f(tr)} 0 0 1 ${f(x + w)} ${f(y + tr)}` : '') +
    `V${f(y + h - br)}` +
    (br ? `A${f(br)} ${f(br)} 0 0 1 ${f(x + w - br)} ${f(y + h)}` : '') +
    `H${f(x + bl)}` +
    (bl ? `A${f(bl)} ${f(bl)} 0 0 1 ${f(x)} ${f(y + h - bl)}` : '') +
    `V${f(y + tl)}` +
    (tl ? `A${f(tl)} ${f(tl)} 0 0 1 ${f(x + tl)} ${f(y)}` : '') +
    'Z'
  );
}

export function circle(cx, cy, r) {
  return `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
}

function diamond(cx, cy, h) {
  return `M${f(cx)} ${f(cy - h)}L${f(cx + h)} ${f(cy)}L${f(cx)} ${f(cy + h)}L${f(cx - h)} ${f(cy)}Z`;
}

function sparkle(cx, cy, h) {
  const k = h * 0.2;
  return (
    `M${f(cx)} ${f(cy - h)}Q${f(cx + k)} ${f(cy - k)} ${f(cx + h)} ${f(cy)}` +
    `Q${f(cx + k)} ${f(cy + k)} ${f(cx)} ${f(cy + h)}` +
    `Q${f(cx - k)} ${f(cy + k)} ${f(cx - h)} ${f(cy)}` +
    `Q${f(cx - k)} ${f(cy - k)} ${f(cx)} ${f(cy - h)}Z`
  );
}

function plus(cx, cy, h) {
  const t = h * 0.42;
  return (
    `M${f(cx - t)} ${f(cy - h)}H${f(cx + t)}V${f(cy - t)}H${f(cx + h)}V${f(cy + t)}H${f(cx + t)}` +
    `V${f(cy + h)}H${f(cx - t)}V${f(cy + t)}H${f(cx - h)}V${f(cy - t)}H${f(cx - t)}Z`
  );
}

function hash(r, c) {
  const s = Math.sin(r * 127.1 + c * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/* ---------- data modules ---------- */

export const DOT_STYLES = [
  { id: 'square' },
  { id: 'rounded' },
  { id: 'liquid' },
  { id: 'dots' },
  { id: 'mini' },
  { id: 'leaf' },
  { id: 'diamond' },
  { id: 'sparkle' },
  { id: 'plus' },
  { id: 'organic' },
  { id: 'vlines' },
  { id: 'hlines' },
];

/**
 * @param on (r, c) => boolean — whether a data module is dark (finder zones excluded)
 */
export function dotsPath(on, n, x0, y0, m, style, scale = 1) {
  let d = '';
  const eps = m * 0.04;
  const X = (c) => x0 + c * m;
  const Y = (r) => y0 + r * m;

  if (style === 'square') {
    for (let r = 0; r < n; r++) {
      let c = 0;
      while (c < n) {
        if (!on(r, c)) { c++; continue; }
        const start = c;
        while (c < n && on(r, c)) c++;
        d += `M${f(X(start))} ${f(Y(r))}h${f((c - start) * m + eps)}v${f(m + eps)}h${f(-(c - start) * m - eps)}Z`;
      }
    }
    return d;
  }

  if (style === 'vlines' || style === 'hlines') {
    const vertical = style === 'vlines';
    const w = m * 0.78 * scale;
    for (let a = 0; a < n; a++) {
      let b = 0;
      while (b < n) {
        const hit = (i) => (vertical ? on(i, a) : on(a, i));
        if (!hit(b)) { b++; continue; }
        const start = b;
        while (b < n && hit(b)) b++;
        const len = (b - start) * m - (m - w);
        if (vertical) d += rrect(X(a) + (m - w) / 2, Y(start) + (m - w) / 2, w, len, w / 2);
        else d += rrect(X(start) + (m - w) / 2, Y(a) + (m - w) / 2, len, w, w / 2);
      }
    }
    return d;
  }

  if (style === 'rounded' || style === 'liquid') {
    const rad = style === 'liquid' ? m / 2 : m * 0.32;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (!on(r, c)) continue;
        const t = on(r - 1, c), b = on(r + 1, c), l = on(r, c - 1), rt = on(r, c + 1);
        const x = X(c) - (l ? eps : 0);
        const y = Y(r) - (t ? eps : 0);
        const w = m + (l ? eps : 0) + (rt ? eps : 0);
        const h = m + (t ? eps : 0) + (b ? eps : 0);
        d += rrect(x, y, w, h, [!t && !l ? rad : 0, !t && !rt ? rad : 0, !b && !rt ? rad : 0, !b && !l ? rad : 0]);
      }
    }
    if (style === 'liquid') {
      // concave fillets where three of four cells around a grid point are filled
      const fr = rad * 0.9;
      for (let r = 0; r < n - 1; r++) {
        for (let c = 0; c < n - 1; c++) {
          const q = [on(r, c), on(r, c + 1), on(r + 1, c + 1), on(r + 1, c)];
          if (q.filter(Boolean).length !== 3) continue;
          const px = X(c + 1), py = Y(r + 1);
          if (!q[0]) d += `M${f(px)} ${f(py)}L${f(px - fr)} ${f(py)}A${f(fr)} ${f(fr)} 0 0 0 ${f(px)} ${f(py - fr)}Z`;
          if (!q[1]) d += `M${f(px)} ${f(py)}L${f(px)} ${f(py - fr)}A${f(fr)} ${f(fr)} 0 0 0 ${f(px + fr)} ${f(py)}Z`;
          if (!q[2]) d += `M${f(px)} ${f(py)}L${f(px + fr)} ${f(py)}A${f(fr)} ${f(fr)} 0 0 0 ${f(px)} ${f(py + fr)}Z`;
          if (!q[3]) d += `M${f(px)} ${f(py)}L${f(px)} ${f(py + fr)}A${f(fr)} ${f(fr)} 0 0 0 ${f(px - fr)} ${f(py)}Z`;
        }
      }
    }
    return d;
  }

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!on(r, c)) continue;
      const cx = X(c) + m / 2, cy = Y(r) + m / 2;
      switch (style) {
        case 'dots': d += circle(cx, cy, (m / 2) * 0.95 * scale); break;
        case 'organic': d += circle(cx, cy, (m / 2) * (0.62 + hash(r, c) * 0.42) * scale); break;
        case 'mini': { const s = m * 0.76 * scale; d += rrect(cx - s / 2, cy - s / 2, s, s, s * 0.22); break; }
        case 'leaf': { const s = m * scale; d += rrect(cx - s / 2, cy - s / 2, s, s, [s * 0.5, 0, s * 0.5, 0]); break; }
        case 'diamond': d += diamond(cx, cy, (m / 2) * 1.08 * scale); break;
        case 'sparkle': d += sparkle(cx, cy, (m / 2) * 1.22 * scale); break;
        case 'plus': d += plus(cx, cy, (m / 2) * 1.02 * scale); break;
        default: d += rrect(X(c), Y(r), m + eps, m + eps, 0);
      }
    }
  }
  return d;
}

/* ---------- finder patterns ("eyes") ---------- */

export const EYE_OUTER = [
  { id: 'square' },
  { id: 'soft' },
  { id: 'rounded' },
  { id: 'circle' },
  { id: 'leaf' },
  { id: 'drop' },
];

export const EYE_INNER = [
  { id: 'square' },
  { id: 'soft' },
  { id: 'circle' },
  { id: 'leaf' },
  { id: 'drop' },
  { id: 'diamond' },
  { id: 'sparkle' },
];

// corner indices: 0 tl, 1 tr, 2 br, 3 bl. `inward` is the corner facing the QR centre.
function eyeRadii(style, size, inward) {
  const big = size / 2;
  const outward = (inward + 2) % 4;
  const all = (v) => [v, v, v, v];
  switch (style) {
    case 'soft': return all(size * 0.18);
    case 'rounded': return all(size * 0.34);
    case 'circle': return all(big);
    case 'leaf': {
      const r = all(0);
      r[outward] = big * 0.9;
      r[inward] = big * 0.9;
      return r;
    }
    case 'drop': {
      const r = all(big);
      r[inward] = size * 0.08;
      return r;
    }
    default: return all(0);
  }
}

export function eyePath(x, y, m, outerStyle, innerStyle, inward) {
  const s = 7 * m;
  const ro = eyeRadii(outerStyle, s, inward);
  let outer = rrect(x, y, s, s, ro);
  const hole = eyeRadii(outerStyle, 5 * m, inward).map((v, i) => (ro[i] ? Math.max(ro[i] - m, v * 0.6) : 0));
  outer += rrect(x + m, y + m, 5 * m, 5 * m, hole);

  const cx = x + 3.5 * m, cy = y + 3.5 * m;
  let inner;
  if (innerStyle === 'diamond') inner = diamond(cx, cy, 2.1 * m);
  else if (innerStyle === 'sparkle') inner = sparkle(cx, cy, 2.2 * m);
  else inner = rrect(x + 2 * m, y + 2 * m, 3 * m, 3 * m, eyeRadii(innerStyle, 3 * m, inward));
  return { outer, inner };
}

export function eyesPaths(n, x0, y0, m, outerStyle, innerStyle) {
  const eyes = [
    { r: 0, c: 0, inward: 2 },
    { r: 0, c: n - 7, inward: 3 },
    { r: n - 7, c: 0, inward: 1 },
  ];
  let outer = '';
  let inner = '';
  for (const e of eyes) {
    const p = eyePath(x0 + e.c * m, y0 + e.r * m, m, outerStyle, innerStyle, e.inward);
    outer += p.outer;
    inner += p.inner;
  }
  return { outer, inner };
}
