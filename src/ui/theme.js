import { STORAGE } from '../constants/storage.js';
// ─── Constants ────────────────────────────────────────

export const THEMES = /** @type {const} */ (['dark', 'light']);
export const DEFAULT_THEME = 'dark';

// ─── Pure functions ───────────────────────────────────

/**
 * Picks a valid theme from a raw stored string.
 * Falls back to the default when the value is missing or unrecognised.
 * No DOM, no storage — pure and testable.
 *
 * @param {string|null} stored   - Raw value from localStorage (may be null).
 * @param {string}      fallback - Default theme when stored is invalid.
 * @returns {'dark' | 'light'}
 */
export function resolveTheme(stored, fallback = DEFAULT_THEME) {
    return THEMES.includes(stored) ? stored : fallback;
}

/**
 * @param {'dark' | 'light'} current
 * @returns {'dark' | 'light'}
 */
export function nextTheme(current) {
    return current === 'dark' ? 'light' : 'dark';
}

// ─── Subscribers ─────────────────────────────────────

/** @type {Array<(theme: string) => void>} */
const _listeners = [];

// ─── Effects (DOM + storage) ──────────────────────────

/**
 * Returns the currently active theme from the <html> element.
 * @returns {'dark' | 'light'}
 */
export function getTheme() {
    return resolveTheme(document.documentElement.dataset.theme);
}

/**
 * Applies a theme, persists it, and notifies all subscribers.
 * No-ops if the theme is already active or invalid.
 * @param {'dark' | 'light'} theme
 */
export function setTheme(theme) {
    if (!THEMES.includes(theme)) return;
    if (getTheme() === theme) return;

    document.documentElement.dataset.theme = theme;

    try {
        localStorage.setItem(STORAGE.THEME, theme);
    } catch {
        // localStorage unavailable (private mode, storage full) — silent fail
    }

    _listeners.forEach(fn => fn(theme));
}

/**
 * Toggles between 'dark' and 'light'.
 */
export function toggleTheme() {
    setTheme(nextTheme(getTheme()));
}

/**
 * Reads persisted preference and applies it to the DOM immediately.
 * Call once at app startup, before first React render.
 * Intentionally does NOT notify subscribers — none are registered yet.
 */
export function initTheme() {
    let stored = DEFAULT_THEME;

    try {
        stored = localStorage.getItem(STORAGE.THEME);
    } catch {
        // localStorage unavailable — fall back to default
    }

    document.documentElement.dataset.theme = resolveTheme(stored);
}

/**
 * Registers a callback that fires whenever the theme changes.
 * Returns an unsubscribe function for cleanup.
 *
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