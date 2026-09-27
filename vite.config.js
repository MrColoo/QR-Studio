import { defineConfig } from 'vite';
import { parseHTML } from 'linkedom';
import { LOCALES, DEFAULT_LOCALE, format } from './src/i18n/config.js';
import { localizeDom } from './src/i18n/dom.js';
import en from './src/i18n/locales/en.js';
import es from './src/i18n/locales/es.js';
import zh from './src/i18n/locales/zh.js';
import hi from './src/i18n/locales/hi.js';
import ar from './src/i18n/locales/ar.js';
import pt from './src/i18n/locales/pt.js';
import fr from './src/i18n/locales/fr.js';
import ru from './src/i18n/locales/ru.js';
import de from './src/i18n/locales/de.js';
import ja from './src/i18n/locales/ja.js';
import ko from './src/i18n/locales/ko.js';
import it from './src/i18n/locales/it.js';

const DICTS = { en, es, zh, hi, ar, pt, fr, ru, de, ja, ko, it };

export const SITE_URL = 'https://mrcoloo.github.io/QR-Studio/';
const REPO_URL = 'https://github.com/MrColoo/QR-Studio';

const pageUrl = (code) => (code === DEFAULT_LOCALE ? SITE_URL : `${SITE_URL}${code}/`);

/**
 * Writes one fully translated page per language (/, /it/, /es/…) so every language
 * has its own crawlable URL, title, description and FAQ, plus a sitemap listing them all.
 */
function localizedPages() {
  return {
    name: 'qr-studio-localized-pages',
    apply: 'build',
    enforce: 'post',
    async generateBundle(_, bundle) {
      const template = bundle['index.html'].source.toString();

      for (const loc of LOCALES) {
        const isRoot = loc.code === DEFAULT_LOCALE;
        const dict = { ...en, ...DICTS[loc.code] };
        const t = (key, vars) => format(dict[key] ?? en[key] ?? key, vars);

        // pages one folder down reach shared files through ../
        const source = isRoot ? template : template.replace(/(href|src)="\.\/(?=[^"])/g, '$1="../');
        const { document } = parseHTML(source);
        const root = document.documentElement;
        root.setAttribute('lang', loc.hreflang);
        root.setAttribute('dir', loc.dir || 'ltr');
        localizeDom(document, t);

        const head = document.head;
        const add = (tag, attrs) => {
          const el = document.createElement(tag);
          for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
          head.appendChild(el);
        };
        add('link', { rel: 'canonical', href: pageUrl(loc.code) });
        for (const l of LOCALES) add('link', { rel: 'alternate', hreflang: l.hreflang, href: pageUrl(l.code) });
        add('link', { rel: 'alternate', hreflang: 'x-default', href: SITE_URL });
        add('meta', { property: 'og:url', content: pageUrl(loc.code) });
        add('meta', { property: 'og:locale', content: loc.og });
        for (const l of LOCALES) if (l.code !== loc.code) add('meta', { property: 'og:locale:alternate', content: l.og });
        add('meta', { property: 'og:image', content: `${SITE_URL}og-image.png` });
        add('meta', { property: 'og:image:width', content: '1200' });
        add('meta', { property: 'og:image:height', content: '630' });
        add('meta', { property: 'og:image:alt', content: t('meta.ogTitle') });
        add('meta', { name: 'twitter:image', content: `${SITE_URL}og-image.png` });

        const ld = document.createElement('script');
        ld.setAttribute('type', 'application/ld+json');
        ld.textContent = JSON.stringify([
          {
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'QR Studio',
            url: pageUrl(loc.code),
            description: t('meta.description'),
            inLanguage: loc.hreflang,
            applicationCategory: 'DesignApplication',
            operatingSystem: 'Any',
            browserRequirements: 'Requires JavaScript',
            isAccessibleForFree: true,
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            license: 'https://opensource.org/licenses/MIT',
            sameAs: REPO_URL,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            inLanguage: loc.hreflang,
            mainEntity: [1, 2, 3, 4, 5].map((i) => ({
              '@type': 'Question',
              name: t(`about.q${i}`),
              acceptedAnswer: { '@type': 'Answer', text: t(`about.a${i}`) },
            })),
          },
        ]);
        head.appendChild(ld);

        // plain links between language versions help crawlers find every page
        const base = isRoot ? './' : '../';
        document.getElementById('langLinks').innerHTML = LOCALES.filter((l) => l.code !== loc.code)
          .map((l) => `<li><a href="${l.code === DEFAULT_LOCALE ? base : `${base}${l.code}/`}" hreflang="${l.hreflang}" lang="${l.hreflang}">${l.name}</a></li>`)
          .join('');

        const html = `<!doctype html>\n${root.outerHTML}`;
        if (isRoot) bundle['index.html'].source = html;
        else this.emitFile({ type: 'asset', fileName: `${loc.code}/index.html`, source: html });
      }

      const today = new Date().toISOString().slice(0, 10);
      const alternates = LOCALES.map((l) => `    <xhtml:link rel="alternate" hreflang="${l.hreflang}" href="${pageUrl(l.code)}"/>`)
        .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}"/>`)
        .join('\n');
      const urls = LOCALES.map((l) => `  <url>\n    <loc>${pageUrl(l.code)}</loc>\n    <lastmod>${today}</lastmod>\n${alternates}\n  </url>`).join('\n');
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`,
      });
    },
  };
}

// Relative base so the build works both at the domain root and under /<repo>/ on GitHub Pages.
export default defineConfig({
  base: './',
  plugins: [localizedPages()],
});
