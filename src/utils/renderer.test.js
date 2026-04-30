import { jest } from '@jest/globals';
import {
    nextSortDir,
    nextSortField,
    getSortFieldLabel,
    getSortLines,
    buildNavEvent,
} from './renderer.utils.js';

// ─── nextSortDir ──────────────────────────────────────

describe('nextSortDir', () => {
    test('given desc — when called — then returns asc', () => {
        expect(nextSortDir('desc')).toBe('asc');
    });

    test('given asc — when called — then returns desc', () => {
        expect(nextSortDir('asc')).toBe('desc');
    });

    test('given desc→asc→desc — when toggled twice — then returns original', () => {
        expect(nextSortDir(nextSortDir('desc'))).toBe('desc');
    });

    test('given asc→desc→asc — when toggled twice — then returns original', () => {
        expect(nextSortDir(nextSortDir('asc'))).toBe('asc');
    });
});

// ─── nextSortField ────────────────────────────────────

describe('nextSortField', () => {
    test('given date — when called — then returns amount', () => {
        expect(nextSortField('date')).toBe('amount');
    });

    test('given amount — when called — then returns date', () => {
        expect(nextSortField('amount')).toBe('date');
    });

    test('given date→amount→date — when cycled twice — then returns original', () => {
        expect(nextSortField(nextSortField('date'))).toBe('date');
    });
});

// ─── getSortFieldLabel ────────────────────────────────

describe('getSortFieldLabel', () => {
    const t = key => ({ 'sort.date': 'Date', 'sort.amount': 'Amount' })[key] ?? key;

    test('given date field — when called — then returns date label', () => {
        expect(getSortFieldLabel('date', t)).toBe('Date');
    });

    test('given amount field — when called — then returns amount label', () => {
        expect(getSortFieldLabel('amount', t)).toBe('Amount');
    });

    test('given custom t function — when called — then delegates to it correctly', () => {
        const customT = jest.fn(key => key.toUpperCase());
        getSortFieldLabel('date', customT);
        expect(customT).toHaveBeenCalledWith('sort.date');
    });

    test('given amount field — when called — then calls t with sort.amount', () => {
        const customT = jest.fn(key => key);
        getSortFieldLabel('amount', customT);
        expect(customT).toHaveBeenCalledWith('sort.amount');
    });
});

// ─── getSortLines ─────────────────────────────────────

describe('getSortLines', () => {
    test('given desc — when called — then returns decreasing x2 values', () => {
        expect(getSortLines('desc')).toEqual([{ x2: 13 }, { x2: 9 }, { x2: 5 }]);
    });

    test('given asc — when called — then returns increasing x2 values', () => {
        expect(getSortLines('asc')).toEqual([{ x2: 5 }, { x2: 9 }, { x2: 13 }]);
    });

    test('given any dir — when called — then always returns exactly 3 lines', () => {
        expect(getSortLines('desc')).toHaveLength(3);
        expect(getSortLines('asc')).toHaveLength(3);
    });

    test('given desc — when called — then first line is longest (x2 = 13)', () => {
        expect(getSortLines('desc')[0].x2).toBe(13);
    });

    test('given asc — when called — then last line is longest (x2 = 13)', () => {
        const lines = getSortLines('asc');
        expect(lines[lines.length - 1].x2).toBe(13);
    });

    test('given desc→asc — when flipped — then x2 values are reversed', () => {
        const desc = getSortLines('desc').map(l => l.x2);
        const asc  = getSortLines('asc').map(l => l.x2);
        expect(asc).toEqual([...desc].reverse());
    });

    test('given any dir — when called — then middle line always has x2 = 9', () => {
        expect(getSortLines('desc')[1].x2).toBe(9);
        expect(getSortLines('asc')[1].x2).toBe(9);
    });
});

// ─── buildNavEvent ────────────────────────────────────

describe('buildNavEvent', () => {
    test('given main — when called — then returns a CustomEvent', () => {
        expect(buildNavEvent('main')).toBeInstanceOf(CustomEvent);
    });

    test('given main — when called — then event type is spengo:navigate', () => {
        expect(buildNavEvent('main').type).toBe('spengo:navigate');
    });

    test('given main — when called — then detail.name is main', () => {
        expect(buildNavEvent('main').detail.name).toBe('main');
    });

    test('given stats — when called — then detail.name is stats', () => {
        expect(buildNavEvent('stats').detail.name).toBe('stats');
    });

    test('given main and stats — when compared — then produce distinct events', () => {
        const a = buildNavEvent('main');
        const b = buildNavEvent('stats');
        expect(a.detail.name).not.toBe(b.detail.name);
    });
});