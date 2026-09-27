/**
 * Translates static markup. Works on the live document and, at build time, on a parsed one.
 *   data-i18n="key"             → textContent
 *   data-i18n-html="key"        → innerHTML (trusted dictionary strings only)
 *   data-i18n-attr="attr:key;…" → attributes
 */
export function localizeDom(root, t) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.getAttribute('data-i18n')); });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    for (const pair of el.getAttribute('data-i18n-attr').split(';')) {
      const [attr, key] = pair.split(':').map((x) => x.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    }
  });
}
