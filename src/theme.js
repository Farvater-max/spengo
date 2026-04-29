/**
 * theme.js
 *
 * Single source of truth for the active UI theme.
 *
 * USAGE
 * ─────
 * Import and call initTheme() as early as possible in app.js
 * (before any React renders) to avoid flash of wrong theme:
 *
 *   import { initTheme } from './theme.js';
 *   initTheme();
 *
 * To read / change the theme:
 *
 *   import { getTheme, setTheme } from './theme.js';
 *   getTheme();          // → 'dark' | 'light'
 *   setTheme('light');   // applies instantly, persists to localStorage
 *   setTheme('dark');
 */

// ─── Constants ────────────────────────────────────────

const STORAGE_KEY  = 'spengo-theme';
const VALID_THEMES = ['dark', 'light'];
const DEFAULT      = 'dark';

// ─── Subscribers ─────────────────────────────────────

/** @type {Array<(theme: string) => void>} */
const _listeners = [];

// ─── Public API ───────────────────────────────────────

/**
 * Returns the currently active theme.
 * @returns {'dark' | 'light'}
 */
export function getTheme() {
    return document.documentElement.dataset.theme || DEFAULT;
}

/**
 * Applies a theme, persists it, and notifies all subscribers.
 * No-ops if the theme is already active.
 * @param {'dark' | 'light'} theme
 */
export function setTheme(theme) {
    if (!VALID_THEMES.includes(theme)) return;
    if (getTheme() === theme) return;

    document.documentElement.dataset.theme = theme;

    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch {
        // localStorage unavailable (private mode, storage full) — silent fail
    }

    _listeners.forEach(fn => fn(theme));
}

/**
 * Toggles between 'dark' and 'light'.
 */
export function toggleTheme() {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

/**
 * Reads persisted preference and applies it immediately.
 * Call once at app startup, before first React render.
 */
export function initTheme() {
    let saved = DEFAULT;

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (VALID_THEMES.includes(stored)) saved = stored;
    } catch {
        // localStorage unavailable — fall back to default
    }

    // Apply without notifying subscribers (no listeners yet at startup)
    document.documentElement.dataset.theme = saved;
}

/**
 * Registers a callback that fires whenever the theme changes.
 * Returns an unsubscribe function.
 * @param {(theme: string) => void} fn
 * @returns {() => void} unsubscribe
 */
export function onThemeChange(fn) {
    _listeners.push(fn);
    return () => {
        const idx = _listeners.indexOf(fn);
        if (idx !== -1) _listeners.splice(idx, 1);
    };
}