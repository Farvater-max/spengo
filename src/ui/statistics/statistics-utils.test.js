import {
    toIso,
    getShortDay,
    buildPeriodBarColors,
    groupExpensesByCategory,
    calcPercentage,
    getMonthBands,
    getActiveBandIndex,
    buildCarouselMonths,
} from './statistics-utils.js';

// ─── toIso ────────────────────────────────────────────

describe('toIso', () => {
    test('formats a date as YYYY-MM-DD', () => {
        expect(toIso(new Date(2025, 4, 9))).toBe('2025-05-09');
    });

    test('zero-pads single-digit month and day', () => {
        expect(toIso(new Date(2024, 0, 3))).toBe('2024-01-03');
    });

    test('handles December correctly', () => {
        expect(toIso(new Date(2024, 11, 31))).toBe('2024-12-31');
    });
});

// ─── getShortDay ──────────────────────────────────────

describe('getShortDay', () => {
    test('returns short month + day string', () => {
        expect(getShortDay(new Date(2025, 4, 1))).toBe('May 1');
    });

    test('uses en-US locale regardless of environment', () => {
        expect(getShortDay(new Date(2025, 0, 15))).toBe('Jan 15');
    });
});

// ─── buildPeriodBarColors ─────────────────────────────

describe('buildPeriodBarColors', () => {
    const ACCENT      = '#c8f135';
    const ACCENT_DIM  = '#c8f13560';
    const ACCENT2_DIM = '#7b61ff60';

    test('returns array of correct length', () => {
        expect(buildPeriodBarColors(4)).toHaveLength(4);
    });

    test('last bar is accent by default', () => {
        const colors = buildPeriodBarColors(4);
        expect(colors[3]).toBe(ACCENT);
    });

    test('explicit activeIdx highlights correct bar', () => {
        const colors = buildPeriodBarColors(4, 1);
        expect(colors[1]).toBe(ACCENT);
        expect(colors[0]).not.toBe(ACCENT);
        expect(colors[2]).not.toBe(ACCENT);
        expect(colors[3]).not.toBe(ACCENT);
    });

    test('non-active bars alternate between two dim colors', () => {
        const colors = buildPeriodBarColors(4, 3);
        // distance from active(3): bar2=1, bar1=2, bar0=3
        expect(colors[2]).toBe(ACCENT2_DIM); // odd distance
        expect(colors[1]).toBe(ACCENT_DIM);  // even distance
        expect(colors[0]).toBe(ACCENT2_DIM); // odd distance
    });

    test('single bar returns accent', () => {
        expect(buildPeriodBarColors(1)).toEqual([ACCENT]);
    });
});

// ─── groupExpensesByCategory ──────────────────────────

describe('groupExpensesByCategory', () => {
    test('groups and sums by category', () => {
        const expenses = [
            { category: 'food',   amount: 10 },
            { category: 'food',   amount: 20 },
            { category: 'travel', amount: 50 },
        ];
        const result = groupExpensesByCategory(expenses);
        expect(result).toEqual([['travel', 50], ['food', 30]]);
    });

    test('returns sorted descending by total', () => {
        const expenses = [
            { category: 'a', amount: 5 },
            { category: 'b', amount: 100 },
            { category: 'c', amount: 30 },
        ];
        const totals = groupExpensesByCategory(expenses).map(([, v]) => v);
        expect(totals).toEqual([100, 30, 5]);
    });

    test('coerces string amounts to numbers', () => {
        const expenses = [{ category: 'food', amount: '15.5' }, { category: 'food', amount: '4.5' }];
        expect(groupExpensesByCategory(expenses)).toEqual([['food', 20]]);
    });

    test('returns empty array for empty input', () => {
        expect(groupExpensesByCategory([])).toEqual([]);
    });
});

// ─── calcPercentage ───────────────────────────────────

describe('calcPercentage', () => {
    test('returns correct integer percentage', () => {
        expect(calcPercentage(25, 100)).toBe(25);
    });

    test('rounds to nearest integer', () => {
        expect(calcPercentage(1, 3)).toBe(33);
    });

    test('returns 0 when total is 0', () => {
        expect(calcPercentage(10, 0)).toBe(0);
    });

    test('returns 100 when amount equals total', () => {
        expect(calcPercentage(50, 50)).toBe(100);
    });

    test('returns 0 when amount is 0', () => {
        expect(calcPercentage(0, 100)).toBe(0);
    });
});

// ─── getMonthBands ────────────────────────────────────

describe('getMonthBands', () => {
    test('returns exactly 4 bands', () => {
        expect(getMonthBands(2025, 4)).toHaveLength(4);
    });

    test('first band starts on the 1st', () => {
        const bands = getMonthBands(2025, 4);
        expect(bands[0].from.getDate()).toBe(1);
    });

    test('last band ends on last day of month', () => {
        const bands = getMonthBands(2025, 1); // February 2025 = 28 days
        expect(bands[3].to.getDate()).toBe(28);
    });

    test('last band of 31-day month ends on 31', () => {
        const bands = getMonthBands(2025, 0); // January
        expect(bands[3].to.getDate()).toBe(31);
    });

    test('band boundaries are contiguous (no gaps)', () => {
        const bands = getMonthBands(2025, 4);
        for (let i = 0; i < bands.length - 1; i++) {
            const toDay   = bands[i].to.getDate();
            const fromDay = bands[i + 1].from.getDate();
            expect(fromDay).toBe(toDay + 1);
        }
    });

    test('each band has a label string', () => {
        const bands = getMonthBands(2025, 4);
        bands.forEach(b => {
            expect(typeof b.label).toBe('string');
            expect(b.label.length).toBeGreaterThan(0);
        });
    });
});

// ─── getActiveBandIndex ───────────────────────────────

describe('getActiveBandIndex', () => {
    test('day 1 → band 0', () => {
        expect(getActiveBandIndex(2026, 4, new Date(2026, 4, 1))).toBe(0);
    });

    test('day 7 → band 0', () => {
        expect(getActiveBandIndex(2026, 4, new Date(2026, 4, 7))).toBe(0);
    });

    test('day 8 → band 1', () => {
        expect(getActiveBandIndex(2026, 4, new Date(2026, 4, 8))).toBe(1);
    });

    test('day 14 → band 1', () => {
        expect(getActiveBandIndex(2026, 4, new Date(2026, 4, 14))).toBe(1);
    });

    test('day 15 → band 2', () => {
        expect(getActiveBandIndex(2026, 4, new Date(2026, 4, 15))).toBe(2);
    });

    test('day 21 → band 2', () => {
        expect(getActiveBandIndex(2026, 4, new Date(2026, 4, 21))).toBe(2);
    });

    test('day 22 → band 3', () => {
        expect(getActiveBandIndex(2026, 4, new Date(2026, 4, 22))).toBe(3);
    });

    test('past month always returns band 3', () => {
        expect(getActiveBandIndex(2024, 0, new Date(2026, 4, 9))).toBe(3);
    });

    test('future month returns band 3', () => {
        expect(getActiveBandIndex(2027, 0, new Date(2026, 4, 9))).toBe(3);
    });
});

// ─── buildCarouselMonths ──────────────────────────────

describe('buildCarouselMonths', () => {
    const now = new Date(2026, 4, 9); // May 2026

    test('returns correct total count', () => {
        expect(buildCarouselMonths(12, 12, now)).toHaveLength(25);
    });

    test('first entry is 12 months before now', () => {
        const months = buildCarouselMonths(12, 12, now);
        expect(months[0]).toEqual({ year: 2025, month: 4 }); // May 2025
    });

    test('last entry is 12 months after now', () => {
        const months = buildCarouselMonths(12, 12, now);
        expect(months[24]).toEqual({ year: 2027, month: 4 }); // May 2027
    });

    test('middle entry is current month', () => {
        const months = buildCarouselMonths(12, 12, now);
        expect(months[12]).toEqual({ year: 2026, month: 4 });
    });

    test('entries are in chronological order', () => {
        const months = buildCarouselMonths(3, 3, now);
        for (let i = 1; i < months.length; i++) {
            const prev = months[i - 1];
            const curr = months[i];
            const prevTs = prev.year * 12 + prev.month;
            const currTs = curr.year * 12 + curr.month;
            expect(currTs).toBeGreaterThan(prevTs);
        }
    });

    test('handles year boundary correctly (Jan)', () => {
        const jan = new Date(2026, 0, 1);
        const months = buildCarouselMonths(2, 0, jan);
        expect(months[0]).toEqual({ year: 2025, month: 10 }); // Nov 2025
        expect(months[1]).toEqual({ year: 2025, month: 11 }); // Dec 2025
        expect(months[2]).toEqual({ year: 2026, month: 0  }); // Jan 2026
    });

    test('handles year boundary correctly (Dec)', () => {
        const dec = new Date(2025, 11, 1);
        const months = buildCarouselMonths(0, 2, dec);
        expect(months[1]).toEqual({ year: 2026, month: 0 }); // Jan 2026
        expect(months[2]).toEqual({ year: 2026, month: 1 }); // Feb 2026
    });
});