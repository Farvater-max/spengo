/**
 * @jest-environment jsdom
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import {
    resolveTheme,
    nextTheme,
    getTheme,
    setTheme,
    toggleTheme,
    initTheme,
    onThemeChange,
    THEMES,
    DEFAULT_THEME,
} from './theme.js';
import { STORAGE } from '../constants/storage.js';

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Resets <html data-theme> and localStorage between tests. */
function resetDOM(theme = 'dark') {
    document.documentElement.dataset.theme = theme;
    localStorage.clear();
}

// ─── resolveTheme ─────────────────────────────────────────────────────────────

describe('resolveTheme', () => {
    test('given a valid theme — when called — then returns it as-is', () => {
        expect(resolveTheme('light')).toBe('light');
        expect(resolveTheme('dark')).toBe('dark');
    });

    test('given null — when called — then returns default', () => {
        expect(resolveTheme(null)).toBe(DEFAULT_THEME);
    });

    test('given undefined — when called — then returns default', () => {
        expect(resolveTheme(undefined)).toBe(DEFAULT_THEME);
    });

    test('given empty string — when called — then returns default', () => {
        expect(resolveTheme('')).toBe(DEFAULT_THEME);
    });

    test('given an unrecognised string — when called — then returns default', () => {
        expect(resolveTheme('alien')).toBe(DEFAULT_THEME);
        expect(resolveTheme('DARK')).toBe(DEFAULT_THEME);
        expect(resolveTheme('Light')).toBe(DEFAULT_THEME);
    });

    test('given a custom fallback — when stored is invalid — then returns that fallback', () => {
        expect(resolveTheme(null,    'light')).toBe('light');
        expect(resolveTheme('alien', 'light')).toBe('light');
    });

    test('given a custom fallback — when stored is valid — then stored wins', () => {
        expect(resolveTheme('dark', 'light')).toBe('dark');
    });

    test('THEMES array contains exactly dark and light', () => {
        expect(THEMES).toEqual(['dark', 'light']);
    });
});

// ─── nextTheme ────────────────────────────────────────────────────────────────

describe('nextTheme', () => {
    test('given dark — when called — then returns light', () => {
        expect(nextTheme('dark')).toBe('light');
    });

    test('given light — when called — then returns dark', () => {
        expect(nextTheme('light')).toBe('dark');
    });

    test('given dark→light→dark — when toggled twice — then returns original', () => {
        expect(nextTheme(nextTheme('dark'))).toBe('dark');
    });

    test('given light→dark→light — when toggled twice — then returns original', () => {
        expect(nextTheme(nextTheme('light'))).toBe('light');
    });
});

// ─── getTheme ─────────────────────────────────────────────────────────────────

describe('getTheme', () => {
    beforeEach(() => resetDOM('dark'));

    test('given <html data-theme="dark"> — when called — then returns "dark"', () => {
        expect(getTheme()).toBe('dark');
    });

    test('given <html data-theme="light"> — when called — then returns "light"', () => {
        // given
        document.documentElement.dataset.theme = 'light';
        // when / then
        expect(getTheme()).toBe('light');
    });

    test('given missing data-theme attribute — when called — then returns default', () => {
        // given
        delete document.documentElement.dataset.theme;
        // when / then
        expect(getTheme()).toBe(DEFAULT_THEME);
    });
});

// ─── setTheme ─────────────────────────────────────────────────────────────────

describe('setTheme', () => {
    beforeEach(() => resetDOM('dark'));

    test('given valid theme — when called — then updates <html data-theme>', () => {
        // given / when
        setTheme('light');
        // then
        expect(document.documentElement.dataset.theme).toBe('light');
    });

    test('given valid theme — when called — then persists to localStorage', () => {
        // given / when
        setTheme('light');
        // then
        expect(localStorage.getItem(STORAGE.THEME)).toBe('light');
    });

    test('given the already-active theme — when called — then does not notify subscribers', () => {
        // given
        document.documentElement.dataset.theme = 'dark';
        const listener = jest.fn();
        const unsub = onThemeChange(listener);
        // when
        setTheme('dark');
        // then
        expect(listener).not.toHaveBeenCalled();
        unsub();
    });

    test('given an invalid theme — when called — then does not change data-theme', () => {
        // given
        document.documentElement.dataset.theme = 'dark';
        // when
        setTheme('alien');
        // then
        expect(document.documentElement.dataset.theme).toBe('dark');
    });

    test('given a valid new theme — when called — then notifies all subscribers', () => {
        // given
        document.documentElement.dataset.theme = 'dark';
        const listener = jest.fn();
        const unsub = onThemeChange(listener);
        // when
        setTheme('light');
        // then
        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith('light');
        unsub();
    });

    test('given multiple subscribers — when theme changes — then all are notified', () => {
        // given
        document.documentElement.dataset.theme = 'dark';
        const first  = jest.fn();
        const second = jest.fn();
        const unsub1 = onThemeChange(first);
        const unsub2 = onThemeChange(second);
        // when
        setTheme('light');
        // then
        expect(first).toHaveBeenCalledWith('light');
        expect(second).toHaveBeenCalledWith('light');
        unsub1();
        unsub2();
    });

    test('given localStorage throws — when called — then still updates DOM without throwing', () => {
        // given
        document.documentElement.dataset.theme = 'dark';
        jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });
        // when / then — must not throw
        expect(() => setTheme('light')).not.toThrow();
        expect(document.documentElement.dataset.theme).toBe('light');
        jest.restoreAllMocks();
    });
});

// ─── toggleTheme ──────────────────────────────────────────────────────────────

describe('toggleTheme', () => {
    beforeEach(() => resetDOM('dark'));

    test('given current theme is dark — when called — then switches to light', () => {
        // given
        document.documentElement.dataset.theme = 'dark';
        // when
        toggleTheme();
        // then
        expect(document.documentElement.dataset.theme).toBe('light');
    });

    test('given current theme is light — when called — then switches to dark', () => {
        // given
        document.documentElement.dataset.theme = 'light';
        // when
        toggleTheme();
        // then
        expect(document.documentElement.dataset.theme).toBe('dark');
    });

    test('given two toggles — when called twice — then returns to original theme', () => {
        // given
        document.documentElement.dataset.theme = 'dark';
        // when
        toggleTheme();
        toggleTheme();
        // then
        expect(document.documentElement.dataset.theme).toBe('dark');
    });
});

// ─── initTheme ────────────────────────────────────────────────────────────────

describe('initTheme', () => {
    beforeEach(() => resetDOM('dark'));

    test('given "light" in localStorage — when called — then applies light to DOM', () => {
        // given
        localStorage.setItem(STORAGE.THEME, 'light');
        // when
        initTheme();
        // then
        expect(document.documentElement.dataset.theme).toBe('light');
    });

    test('given "dark" in localStorage — when called — then applies dark to DOM', () => {
        // given
        localStorage.setItem(STORAGE.THEME, 'dark');
        // when
        initTheme();
        // then
        expect(document.documentElement.dataset.theme).toBe('dark');
    });

    test('given nothing in localStorage — when called — then applies default theme', () => {
        // given — localStorage is empty
        // when
        initTheme();
        // then
        expect(document.documentElement.dataset.theme).toBe(DEFAULT_THEME);
    });

    test('given invalid value in localStorage — when called — then applies default theme', () => {
        // given
        localStorage.setItem(STORAGE.THEME, 'alien');
        // when
        initTheme();
        // then
        expect(document.documentElement.dataset.theme).toBe(DEFAULT_THEME);
    });

    test('given localStorage throws — when called — then applies default theme without throwing', () => {
        // given
        jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('SecurityError');
        });
        // when / then
        expect(() => initTheme()).not.toThrow();
        expect(document.documentElement.dataset.theme).toBe(DEFAULT_THEME);
        jest.restoreAllMocks();
    });

    test('given subscribers registered — when initTheme is called — then does not notify them', () => {
        // given — initTheme intentionally skips notification (none registered at startup)
        localStorage.setItem(STORAGE.THEME, 'light');
        document.documentElement.dataset.theme = 'dark'; // ensure it would "change"
        const listener = jest.fn();
        const unsub = onThemeChange(listener);
        // when
        initTheme();
        // then
        expect(listener).not.toHaveBeenCalled();
        unsub();
    });
});

// ─── onThemeChange ────────────────────────────────────────────────────────────

describe('onThemeChange', () => {
    beforeEach(() => resetDOM('dark'));

    test('given a subscriber — when theme changes — then callback is called with new theme', () => {
        // given
        document.documentElement.dataset.theme = 'dark';
        const listener = jest.fn();
        const unsub = onThemeChange(listener);
        // when
        setTheme('light');
        // then
        expect(listener).toHaveBeenCalledWith('light');
        unsub();
    });

    test('given a subscriber — when unsubscribed — then callback is not called on next change', () => {
        // given
        document.documentElement.dataset.theme = 'dark';
        const listener = jest.fn();
        const unsub = onThemeChange(listener);
        unsub();
        // when
        setTheme('light');
        // then
        expect(listener).not.toHaveBeenCalled();
    });

    test('given unsubscribe called twice — when called — then does not throw', () => {
        // given
        const unsub = onThemeChange(() => {});
        unsub();
        // when / then
        expect(() => unsub()).not.toThrow();
    });

    test('given subscriber that unsubscribes itself inside callback — when fired — then does not throw', () => {
        // given
        document.documentElement.dataset.theme = 'dark';
        let unsub;
        const selfUnsub = jest.fn(() => unsub());
        unsub = onThemeChange(selfUnsub);
        // when / then
        expect(() => setTheme('light')).not.toThrow();
        expect(selfUnsub).toHaveBeenCalledTimes(1);
    });
});