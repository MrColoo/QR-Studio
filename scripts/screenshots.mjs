// Captures the README screenshots from the running app.
//
//   npm run dev            # in another terminal
//   npm run screenshots    # CHROME_PATH=… to use a specific Chromium-based browser
//
// Output goes to docs/screenshots/.
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { existsSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.APP_URL || 'http://localhost:5173/';
const OUT = fileURLToPath(new URL('../docs/screenshots/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const candidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const executablePath = candidates.find((p) => existsSync(p));
if (!executablePath) throw new Error('No Chromium-based browser found. Set CHROME_PATH.');

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  userDataDir: mkdtempSync(join(tmpdir(), 'qr-shots-')),
  args: ['--lang=en-US', '--hide-scrollbars', '--force-color-profile=srgb'],
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const save = async (buf, name, width = 2400) => {
  await sharp(buf).resize({ width, withoutEnlargement: true }).webp({ quality: 84 }).toFile(join(OUT, `${name}.webp`));
  console.log(`✓ ${name}.webp`);
};

/** Opens the app with a design (`{ id: presetId, ...overrides }`) and preferences. */
async function open({ path = '', width = 1440, height = 900, scale = 2, theme = 'light', mode = 'simple', lang = 'en', open = ['layout', 'modules', 'qrcolor', 'background'], design }) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: scale, isMobile: width < 600, hasTouch: width < 600 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }, { name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.evaluate(async (prefs, design) => {
    localStorage.clear();
    for (const [k, v] of Object.entries(prefs)) localStorage.setItem(`qr-studio:${k}`, v);
    const [{ DEFAULT_STATE, PRESETS }, { deepMerge }] = await Promise.all([import('/src/data.js'), import('/src/state.js')]);
    if (!design) return; // no saved state: the app starts fresh, in the page's language
    const { id, ...overrides } = design;
    const state = deepMerge(deepMerge(DEFAULT_STATE, PRESETS.find((p) => p.id === id).style), overrides);
    localStorage.setItem('qr-studio:state:v1', JSON.stringify(state));
  }, { theme, mode, lang, open: JSON.stringify(open) }, design ?? null);
  await page.goto(new URL(path, BASE).href, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#scanBadge:not([data-state="checking"])', { timeout: 15000 });
  await sleep(700);
  return page;
}

const preset = (id, overrides = {}) => ({ id, ...overrides });

// 1. The editor, simple version, light
{
  const page = await open({
    design: preset('paper', {
      url: 'https://trattoria-da-lucia.example/menu',
      logo: { type: 'icon', icon: 'menu' }, qr: { ecc: 'H' },
    }),
  });
  await save(await page.screenshot(), 'editor');
  await page.close();
}

// 2. Complete version, dark, colourful design
{
  const page = await open({
    theme: 'dark', mode: 'full', open: ['modules', 'eyes', 'qrcolor'],
    design: preset('galaxy', {
      url: 'https://open-air-festival.example/tickets',
      text: { eyebrow: 'Saturday · 9 pm', title: 'Summer night concert', description: 'Scan for the line-up and tickets.', cta: 'Get tickets' },
    }),
  });
  await save(await page.screenshot(), 'editor-complete-dark');
  await page.close();
}

// 3. Readability check and export
{
  const page = await open({
    design: preset('sunset', {
      url: 'https://instagram.com/example',
      text: { eyebrow: 'Instagram', title: 'Follow us behind the scenes', description: '', cta: 'Follow' },
      logo: { type: 'icon', icon: 'instagram' }, qr: { ecc: 'H' },
    }),
  });
  await page.click('#scanBadge');
  await sleep(400);
  await save(await page.screenshot(), 'readability');
  await page.keyboard.press('Escape');
  await page.click('#exportBtn');
  await sleep(400);
  await save(await page.screenshot(), 'export');
  await page.close();
}

// 4. Landscape format with side-by-side layout
{
  const page = await open({
    mode: 'full', open: ['layout'],
    design: preset('luxe', {
      url: 'https://studio-aurelia.example',
      format: 'card', layout: 'qr-right',
      text: { align: 'left', eyebrow: 'Architecture studio', title: 'Studio Aurelia', description: 'Projects, contacts and portfolio', cta: '' },
      logo: { type: 'text', text: 'SA' }, qr: { ecc: 'H' },
    }),
  });
  await save(await page.screenshot(), 'business-card');
  await page.close();
}

// 5. Floating examples in the about section, one card under the cursor
{
  const page = await open({ design: preset('paper', {}) });
  await page.evaluate(() => document.querySelector('#about').scrollIntoView({ behavior: 'instant' }));
  await page.waitForFunction(() => document.querySelectorAll('.fcard.ready').length === 4, { timeout: 20000 });
  const card = await page.$('.fcard:nth-child(3)');
  const box = await card.boundingBox();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.3, { steps: 8 });
  await sleep(900);
  // clip is in document coordinates, so add the scroll offset
  const box2 = await page.evaluate(() => {
    const r = document.querySelector('.about-head').getBoundingClientRect();
    return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height };
  });
  const m = 56;
  await save(await page.screenshot({ clip: { x: box2.x - m, y: box2.y - m, width: box2.width + m * 2, height: box2.height + m * 2 } }), 'examples');
  await page.close();
}

// 6. Phone: content and style panels side by side
{
  const shots = [];
  for (const view of ['content', 'style']) {
    const page = await open({ width: 390, height: 844, scale: 3, design: preset('pastel', { logo: { type: 'icon', icon: 'heart' }, qr: { ecc: 'H' } }) });
    if (view === 'style') await page.click('.mobile-tabs [data-view="style"]');
    await sleep(500);
    shots.push(await page.screenshot());
    await page.close();
  }
  const w = 390 * 3, h = 844 * 3, gap = 120, pad = 140, r = 90;
  const mask = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}"/></svg>`);
  const rounded = await Promise.all(shots.map((s) => sharp(s).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()));
  const canvas = await sharp({ create: { width: w * 2 + gap + pad * 2, height: h + pad * 2, channels: 4, background: '#eceae5' } })
    .composite(rounded.map((input, i) => ({ input, left: pad + i * (w + gap), top: pad })))
    .png().toBuffer();
  await save(canvas, 'mobile', 1600);
}

// 7. Other languages, including right-to-left
{
  const shots = [];
  for (const [path, lang, look] of [['ja/', 'ja', 'ocean'], ['ar/', 'ar', 'sunset']]) {
    const page = await open({ path, lang, width: 1280, height: 800, scale: 1.5 });
    await page.click(`[data-preset="${look}"]`);
    await page.waitForSelector('#scanBadge[data-state="ok"]', { timeout: 15000 });
    await sleep(5600); // let the "preset applied" toast go away
    shots.push(await page.screenshot());
    await page.close();
  }
  const [a, b] = await Promise.all(shots.map((s) => sharp(s).resize({ width: 1400 }).png().toBuffer()));
  const meta = await sharp(a).metadata();
  const canvas = await sharp({ create: { width: 1400, height: meta.height * 2 + 40, channels: 4, background: '#eceae5' } })
    .composite([{ input: a, left: 0, top: 0 }, { input: b, left: 0, top: meta.height + 40 }])
    .png().toBuffer();
  await save(canvas, 'languages', 1400);
}

// 8. Gallery of exported designs, straight from the export pipeline
{
  const page = await open({ design: preset('paper', {}) });
  const images = await page.evaluate(async () => {
    const [{ DEFAULT_STATE, PRESETS }, { deepMerge }, { rasterize }] = await Promise.all([
      import('/src/data.js'), import('/src/state.js'), import('/src/export.js'),
    ]);
    const items = [
      ['paper', { eyebrow: 'Digital menu', title: 'Tonight’s menu, always up to date', cta: 'Open the menu' }, { type: 'icon', icon: 'menu' }],
      ['sunset', { eyebrow: 'Instagram', title: 'Follow us behind the scenes', cta: 'Follow' }, { type: 'icon', icon: 'instagram' }],
      ['neon', { eyebrow: 'Free Wi-Fi', title: 'Join the network', cta: 'Connect' }, { type: 'icon', icon: 'wifi' }],
      ['forest', { eyebrow: 'Farm shop', title: 'Order a seasonal box', cta: 'Shop now' }, { type: 'icon', icon: 'bag' }],
      ['brutal', { eyebrow: 'Workshop', title: 'Sign up for Thursday', cta: 'Reserve a seat' }, { type: 'icon', icon: 'calendar' }],
      ['editorial', { eyebrow: 'Issue 12', title: 'Read the full story online', cta: 'Read now' }, { type: 'none' }],
    ];
    const out = [];
    for (const [id, text, logo] of items) {
      const s = deepMerge(DEFAULT_STATE, PRESETS.find((p) => p.id === id).style);
      s.url = 'https://mrcoloo.github.io/QR-Studio/';
      s.format = 'portrait';
      s.text = { ...s.text, ...text, description: '', showLink: true };
      s.logo = { ...s.logo, ...logo };
      if (logo.type !== 'none') s.qr.ecc = 'H';
      const { canvas } = await rasterize(s, 0.5);
      out.push(canvas.toDataURL('image/png'));
    }
    return out;
  });
  const cells = await Promise.all(images.map((d) => sharp(Buffer.from(d.split(',')[1], 'base64')).png().toBuffer()));
  const cw = 540, ch = 675, gap = 48, pad = 72;
  const canvas = await sharp({ create: { width: cw * 3 + gap * 2 + pad * 2, height: ch * 2 + gap + pad * 2, channels: 4, background: '#eceae5' } })
    .composite(cells.map((input, i) => ({ input, left: pad + (i % 3) * (cw + gap), top: pad + Math.floor(i / 3) * (ch + gap) })))
    .png().toBuffer();
  await save(canvas, 'gallery', 1800);
  await page.close();
}

await browser.close();
