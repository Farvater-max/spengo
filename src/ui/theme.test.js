import { resolveTheme, nextTheme, THEMES, DEFAULT_THEME } from './theme.js';

// ─── resolveTheme ─────────────────────────────────────

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

// ─── nextTheme ────────────────────────────────────────

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