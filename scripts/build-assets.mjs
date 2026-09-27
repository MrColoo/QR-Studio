// Generates the icons and the social preview image in public/.
// Run with: npm run assets
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildMatrix, isFinder, dotsPath, eyesPaths } from '../src/qr.js';

const out = (name) => fileURLToPath(new URL(`../public/${name}`, import.meta.url));
const INK = '#1b1b19', PAPER = '#f3efe6', ACCENT = '#b4441f';

const mark = (fg, bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="${bg}"/>
  <path d="M8 8h10v10H8z" fill="none" stroke="${fg}" stroke-width="3"/>
  <rect x="11.5" y="11.5" width="3" height="3" fill="${fg}"/>
  <rect x="20" y="20" width="4" height="4" fill="${fg}"/>
</svg>`;

writeFileSync(out('favicon.svg'), mark('#fbfbfa', INK));
const square = (size, pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${INK}"/>
  <svg x="${pad}" y="${pad}" width="${size - 2 * pad}" height="${size - 2 * pad}" viewBox="4 4 24 24">
    <path d="M8 8h10v10H8z" fill="none" stroke="#fbfbfa" stroke-width="3"/>
    <rect x="11.5" y="11.5" width="3" height="3" fill="#fbfbfa"/>
    <rect x="20" y="20" width="4" height="4" fill="#fbfbfa"/>
  </svg>
</svg>`;
await sharp(Buffer.from(square(180, 36))).png().toFile(out('apple-touch-icon.png'));
await sharp(Buffer.from(square(192, 40))).png().toFile(out('icon-192.png'));
await sharp(Buffer.from(square(512, 110))).png().toFile(out('icon-512.png'));

// Social preview: headline on the left, a real (scannable) code on the right.
const url = 'https://mrcoloo.github.io/QR-Studio/';
const m = buildMatrix(url, 'Q');
const n = m.length;
const size = 330, x0 = 780, y0 = 150, mod = size / n;
const on = (r, c) => r >= 0 && c >= 0 && r < n && c < n && m[r][c] && !isFinder(r, c, n);
const eyes = eyesPaths(n, x0, y0, mod, 'soft', 'soft');
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#6b5d45" flood-opacity=".28"/></filter></defs>
  <rect width="1200" height="630" fill="${PAPER}"/>
  <g transform="translate(80 92)">
    <svg width="34" height="34" viewBox="0 0 32 32">${mark('#fbfbfa', INK).replace(/<\/?svg[^>]*>/g, '')}</svg>
    <text x="48" y="25" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="24" font-weight="600" fill="${INK}">QR Studio</text>
  </g>
  <text font-family="Georgia, 'Times New Roman', serif" font-size="66" fill="${INK}" letter-spacing="-1.5">
    <tspan x="80" y="262">QR codes with</tspan>
    <tspan x="80" y="340">your logo and text</tspan>
  </text>
  <text x="80" y="410" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="26" fill="#6b665c">Free · Open source · Runs in your browser</text>
  <text x="80" y="500" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="20" font-weight="500" fill="${ACCENT}">12 languages · PNG · SVG · JPG · WEBP</text>
  <rect x="${x0 - 36}" y="${y0 - 36}" width="${size + 72}" height="${size + 72}" rx="14" fill="#fffdf8" filter="url(#s)"/>
  <path d="${dotsPath(on, n, x0, y0, mod, 'rounded', 1)}" fill="${INK}"/>
  <path d="${eyes.outer}" fill="${INK}" fill-rule="evenodd"/>
  <path d="${eyes.inner}" fill="${ACCENT}"/>
</svg>`;
await sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toFile(out('og-image.png'));

writeFileSync(out('manifest.webmanifest'), JSON.stringify({
  name: 'QR Studio',
  short_name: 'QR Studio',
  description: 'Custom QR codes with logo and text, made in your browser.',
  start_url: './',
  scope: './',
  display: 'standalone',
  background_color: '#f8f7f4',
  theme_color: '#1b1b19',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
  ],
}, null, 2) + '\n');

writeFileSync(out('robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${url}sitemap.xml\n`);
console.log('public/ assets written');
