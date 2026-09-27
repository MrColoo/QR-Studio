// Supported languages. Shared by the app and by the build step that writes one page per language.
export const LOCALES = [
  { code: 'en', name: 'English', hreflang: 'en', og: 'en_US' },
  { code: 'es', name: 'Español', hreflang: 'es', og: 'es_ES' },
  { code: 'zh', name: '简体中文', hreflang: 'zh-Hans', og: 'zh_CN' },
  { code: 'hi', name: 'हिन्दी', hreflang: 'hi', og: 'hi_IN' },
  { code: 'ar', name: 'العربية', hreflang: 'ar', og: 'ar_AR', dir: 'rtl' },
  { code: 'pt', name: 'Português', hreflang: 'pt', og: 'pt_BR' },
  { code: 'fr', name: 'Français', hreflang: 'fr', og: 'fr_FR' },
  { code: 'ru', name: 'Русский', hreflang: 'ru', og: 'ru_RU' },
  { code: 'de', name: 'Deutsch', hreflang: 'de', og: 'de_DE' },
  { code: 'ja', name: '日本語', hreflang: 'ja', og: 'ja_JP' },
  { code: 'ko', name: '한국어', hreflang: 'ko', og: 'ko_KR' },
  { code: 'it', name: 'Italiano', hreflang: 'it', og: 'it_IT' },
];

export const CODES = LOCALES.map((l) => l.code);
export const DEFAULT_LOCALE = 'en';

/** Fill `{name}` placeholders. */
export const format = (s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '') : s);
