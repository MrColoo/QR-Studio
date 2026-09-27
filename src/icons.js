import { UI_GLYPHS } from './glyphs.js';

export const icon = (name, size = 16) =>
  `<svg class="i" width="${size}" height="${size}" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">${UI_GLYPHS[name] || ''}</svg>`;
