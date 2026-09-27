import en from './locales/en.js';
import { LOCALES, CODES, DEFAULT_LOCALE, format } from './config.js';
import { localizeDom } from './dom.js';

export { LOCALES };

// Other languages are separate chunks, fetched only when needed.
const loaders = import.meta.glob(['./locales/*.js', '!./locales/en.js']);

let dict = en;
export let locale = DEFAULT_LOCALE;

export const t = (key, vars) => format(dict[key] ?? en[key] ?? key, vars);

/** The page's language comes from its URL: /<base>/it/ → it, the root is English. */
export function pageLocale() {
  const parts = location.pathname.split('/').filter((p) => p && p !== 'index.html');
  const last = parts.at(-1);
  return CODES.includes(last) ? last : DEFAULT_LOCALE;
}

export async function initI18n() {
  locale = pageLocale();
  if (locale !== DEFAULT_LOCALE) {
    try {
      const mod = await loaders[`./locales/${locale}.js`]();
      dict = { ...en, ...mod.default };
    } catch {
      locale = DEFAULT_LOCALE;
    }
  }
  const meta = LOCALES.find((l) => l.code === locale);
  document.documentElement.lang = meta.hreflang;
  document.documentElement.dir = meta.dir || 'ltr';
  localizeDom(document, t);
}

/** Relative link to the same app in another language. */
export function localeHref(code) {
  const base = locale === DEFAULT_LOCALE ? './' : '../';
  return code === DEFAULT_LOCALE ? base : `${base}${code}/`;
}
