import { DEFAULT_STATE } from './data.js';

const STORAGE_KEY = 'qr-studio:state:v1';
const LIBRARY_KEY = 'qr-studio:library:v1';

export const clone = (o) => structuredClone(o);

export function deepMerge(base, patch) {
  const out = clone(base);
  for (const [k, v] of Object.entries(patch || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object') out[k] = deepMerge(out[k], v);
    else out[k] = v;
  }
  return out;
}

export const getPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);

export function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  keys.reduce((o, k) => (o[k] ??= {}), obj)[last] = value;
}

const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };

function encodeShare(state) {
  const { logo, ...rest } = state;
  const lite = { ...rest, logo: { ...logo, image: null, type: logo.type === 'image' ? 'none' : logo.type } };
  const bytes = new TextEncoder().encode(JSON.stringify(lite));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeShare(str) {
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
}

export function shareUrl(state) {
  return `${location.origin}${location.pathname}#d=${encodeShare(state)}`;
}

/** True when nothing was restored, so the starter text can be shown in the visitor's language. */
export let isFresh = false;

function initialState() {
  const hash = location.hash.match(/#d=([\w-]+)/);
  if (hash) {
    const shared = safe(() => decodeShare(hash[1]), null);
    history.replaceState(null, '', location.pathname);
    if (shared) return deepMerge(DEFAULT_STATE, shared);
  }
  const saved = safe(() => JSON.parse(localStorage.getItem(STORAGE_KEY)), null);
  if (saved) return deepMerge(DEFAULT_STATE, saved);
  isFresh = true;
  return clone(DEFAULT_STATE);
}

/* ---------- store with undo/redo ---------- */

const listeners = new Set();
let state = initialState();
let past = [];
let future = [];
let committed = clone(state);
let commitTimer;
let saveTimer;

export const store = {
  get: () => state,
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  /** Mutate one field. `origin` tells listeners whether controls must resync. */
  set(path, value, origin = 'control') {
    setPath(state, path, value);
    this.emit(origin, path);
    this.scheduleCommit();
  },

  /** Swap the whole state without an undo step (used at start-up). */
  reset(next) {
    state = clone(next);
    committed = clone(next);
    past = [];
    future = [];
    this.emit('external');
  },

  replace(next, origin = 'external') {
    this.flushCommit();
    state = clone(next);
    this.commit();
    this.emit(origin);
  },

  emit(origin, path) {
    listeners.forEach((fn) => fn(state, origin, path));
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => safe(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(state))), 250);
  },

  scheduleCommit() {
    clearTimeout(commitTimer);
    commitTimer = setTimeout(() => this.commit(), 450);
  },

  flushCommit() {
    if (commitTimer) { clearTimeout(commitTimer); commitTimer = null; this.commit(); }
  },

  commit() {
    commitTimer = null;
    if (JSON.stringify(committed) === JSON.stringify(state)) return;
    past.push(committed);
    if (past.length > 80) past.shift();
    future = [];
    committed = clone(state);
    this.emitHistory();
  },

  undo() {
    this.flushCommit();
    if (!past.length) return false;
    future.push(committed);
    committed = past.pop();
    state = clone(committed);
    this.emit('external');
    this.emitHistory();
    return true;
  },

  redo() {
    if (!future.length) return false;
    past.push(committed);
    committed = future.pop();
    state = clone(committed);
    this.emit('external');
    this.emitHistory();
    return true;
  },

  canUndo: () => past.length > 0 || !!commitTimer,
  canRedo: () => future.length > 0,
  historyListeners: new Set(),
  emitHistory() { this.historyListeners.forEach((fn) => fn()); },
};

/* ---------- saved designs ---------- */

export const library = {
  list: () => safe(() => JSON.parse(localStorage.getItem(LIBRARY_KEY)) || [], []),
  save(entry) {
    const items = [entry, ...this.list()].slice(0, 24);
    try {
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(items));
      return true;
    } catch {
      return false; // quota — usually a large uploaded logo
    }
  },
  remove(id) {
    safe(() => localStorage.setItem(LIBRARY_KEY, JSON.stringify(this.list().filter((e) => e.id !== id))));
  },
};
