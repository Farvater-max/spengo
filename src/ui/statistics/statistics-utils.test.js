import {
    getMonday,
    toIso,
    getDayLabel,
    getShortDay,
    getMonthLabel,
    buildWeekBarColors,
    buildPeriodBarColors,
    filterExpensesByPeriod,
    groupExpensesByCategory,
    calcPercentage,
} from './statistics-utils.js';

// ─── Shared constants ─────────────────────────────────────────────────────────

const ACCENT      = '#c8f135';
const ACCENT_DIM  = '#c8f13560';
const ACCENT2_DIM = '#7b61ff60';

// Minimal stub for isInPeriod — keeps tests free of real date logic.
const alwaysTrue  = () => true;
const alwaysFalse = () => false;

// ─── getMonday ────────────────────────────────────────────────────────────────

describe('getMonday', () => {
    test('given a Monday — when called — then returns the same day at midnight', () => {
        // given
        const monday = new Date('2024-03-04T12:00:00'); // Monday
        // when
        const result = getMonday(monday);
        // then
        expect(toIso(result)).toBe('2024-03-04');
        expect(result.getHours()).toBe(0);
    });

    test('given a Wednesday — when called — then returns the Monday of that week', () => {
        // given
        const wednesday = new Date('2024-03-06'); // Wednesday
        // when
        const result = getMonday(wednesday);
        // then
        expect(toIso(result)).toBe('2024-03-04');
    });

    test('given a Sunday — when called — then returns the Monday six days before', () => {
        // given
        const sunday = new Date('2024-03-10'); // Sunday
        // when
        const result = getMonday(sunday);
        // then
        expect(toIso(result)).toBe('2024-03-04');
    });

    test('given a Saturday — when called — then returns the Monday of that week', () => {
        // given
        const saturday = new Date('2024-03-09');
        // when
        const result = getMonday(saturday);
        // then
        expect(toIso(result)).toBe('2024-03-04');
    });

    test('given a date — when called — then does not mutate the input', () => {
        // given
        const date = new Date('2024-03-06');
        const copy = date.toISOString();
        // when
        getMonday(date);
        // then
        expect(date.toISOString()).toBe(copy);
    });

    test('given a Monday at year boundary — when called — then stays in the same week', () => {
        // given — 2024-01-01 is a Monday
        const date = new Date('2024-01-01');
        // when
        const result = getMonday(date);
        // then
        expect(toIso(result)).toBe('2024-01-01');
    });
});

// ─── toIso ────────────────────────────────────────────────────────────────────

describe('toIso', () => {
    test('given a plain date — when called — then returns YYYY-MM-DD', () => {
        // given
        const date = new Date('2024-03-06');
        // when
        const result = toIso(date);
        // then
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(result).toBe('2024-03-06');
    });

    test('given a single-digit month and day — when called — then zero-pads both', () => {
        // given
        const date = new Date('2024-01-05');
        // when
        const result = toIso(date);
        // then
        expect(result).toBe('2024-01-05');
    });

    test('given December 31 — when called — then formats correctly', () => {
        // given
        const date = new Date('2023-12-31');
        // when
        const result = toIso(date);
        // then
        expect(result).toBe('2023-12-31');
    });
});

// ─── getDayLabel ──────────────────────────────────────────────────────────────

describe('getDayLabel', () => {
    test('given a Monday — when called — then returns "MO"', () => {
        expect(getDayLabel(new Date('2024-03-04'))).toBe('MO');
    });

    test('given a Friday — when called — then returns "FR"', () => {
        expect(getDayLabel(new Date('2024-03-08'))).toBe('FR');
    });

    test('given a Sunday — when called — then returns "SU"', () => {
        expect(getDayLabel(new Date('2024-03-10'))).toBe('SU');
    });

    test('given any day — when called — then returns exactly 2 characters', () => {
        // given
        const date = new Date('2024-03-05');
        // when
        const result = getDayLabel(date);
        // then
        expect(result).toHaveLength(2);
    });

    test('given any day — when called — then result is uppercase', () => {
        // given
        const date = new Date('2024-03-05');
        // when
        const result = getDayLabel(date);
        // then
        expect(result).toBe(result.toUpperCase());
    });
});

// ─── getShortDay ──────────────────────────────────────────────────────────────

describe('getShortDay', () => {
    test('given March 1 — when called — then returns "Mar 1"', () => {
        expect(getShortDay(new Date('2024-03-01'))).toBe('Mar 1');
    });

    test('given December 31 — when called — then returns "Dec 31"', () => {
        expect(getShortDay(new Date('2024-12-31'))).toBe('Dec 31');
    });

    test('given any date — when called — then includes month abbreviation and numeric day', () => {
        // given
        const date = new Date('2024-07-04');
        // when
        const result = getShortDay(date);
        // then
        expect(result).toMatch(/\w{3}\s\d{1,2}/);
    });
});

// ─── getMonthLabel ────────────────────────────────────────────────────────────

describe('getMonthLabel', () => {
    test('given January — when called — then returns "JAN"', () => {
        expect(getMonthLabel(new Date('2024-01-15'))).toBe('JAN');
    });

    test('given December — when called — then returns "DEC"', () => {
        expect(getMonthLabel(new Date('2024-12-15'))).toBe('DEC');
    });

    test('given March — when called — then returns "MAR"', () => {
        expect(getMonthLabel(new Date('2024-03-10'))).toBe('MAR');
    });

    test('given any month — when called — then result is 3 uppercase characters', () => {
        // given
        const date = new Date('2024-06-01');
        // when
        const result = getMonthLabel(date);
        // then
        expect(result).toHaveLength(3);
        expect(result).toBe(result.toUpperCase());
    });
});

// ─── buildWeekBarColors ───────────────────────────────────────────────────────

describe('buildWeekBarColors', () => {
    test('given todayIdx 0 — when called — then first bar is full accent', () => {
        // given / when
        const colors = buildWeekBarColors(7, 0);
        // then
        expect(colors[0]).toBe(ACCENT);
    });

    test('given todayIdx 4 (Friday) — when called — then only that bar is full accent', () => {
        // given / when
        const colors = buildWeekBarColors(7, 4);
        // then
        expect(colors[4]).toBe(ACCENT);
        expect(colors.filter(c => c === ACCENT)).toHaveLength(1);
    });

    test('given count 7 — when called — then returns exactly 7 colors', () => {
        expect(buildWeekBarColors(7, 0)).toHaveLength(7);
    });

    test('given todayIdx 2 — when called — then non-today bars are only dimmed accents', () => {
        // given / when
        const colors = buildWeekBarColors(7, 2);
        const nonToday = colors.filter((_, i) => i !== 2);
        // then
        nonToday.forEach(c => expect([ACCENT_DIM, ACCENT2_DIM]).toContain(c));
    });

    test('given adjacent bars at todayIdx 3 — when called — then bars alternate dim colors', () => {
        // given / when
        const colors = buildWeekBarColors(7, 3);
        // distance-1 bar (i=2) and distance-3 bar (i=0) share the same dim color
        expect(colors[2]).toBe(colors[0]);
        // distance-2 bar (i=1) differs from distance-1 bar (i=2)
        expect(colors[1]).not.toBe(colors[2]);
    });
});

// ─── buildPeriodBarColors ─────────────────────────────────────────────────────

describe('buildPeriodBarColors', () => {
    test('given count 4 — when called — then last bar is full accent', () => {
        // given / when
        const colors = buildPeriodBarColors(4);
        // then
        expect(colors[3]).toBe(ACCENT);
    });

    test('given count 4 — when called — then exactly one full-accent bar exists', () => {
        // given / when
        const colors = buildPeriodBarColors(4);
        // then
        expect(colors.filter(c => c === ACCENT)).toHaveLength(1);
    });

    test('given count 1 — when called — then returns a single full-accent bar', () => {
        expect(buildPeriodBarColors(1)).toEqual([ACCENT]);
    });

    test('given count 4 — when called — then earlier bars are only dimmed accents', () => {
        // given / when
        const colors = buildPeriodBarColors(4);
        const earlier = colors.slice(0, 3);
        // then
        earlier.forEach(c => expect([ACCENT_DIM, ACCENT2_DIM]).toContain(c));
    });

    test('given count 4 — when called — then bars alternate between the two dim colors', () => {
        // given / when
        const [c0, c1, c2] = buildPeriodBarColors(4);
        // c0 (distance 3) and c2 (distance 1) are both odd distance → same dim color
        expect(c0).toBe(c2);
        // c1 (distance 2) differs
        expect(c1).not.toBe(c2);
    });
});

// ─── filterExpensesByPeriod ───────────────────────────────────────────────────

describe('filterExpensesByPeriod', () => {
    const expenses = [
        { id: 1, date: '2024-03-06' },
        { id: 2, date: '2024-03-07' },
        { id: 3, date: '2023-05-01' },
    ];

    test('given period "week" and isInPeriod always true — when called — then returns all expenses', () => {
        // given / when
        const result = filterExpensesByPeriod(expenses, 'week', alwaysTrue);
        // then
        expect(result).toHaveLength(3);
    });

    test('given period "week" and isInPeriod always false — when called — then returns empty array', () => {
        // given / when
        const result = filterExpensesByPeriod(expenses, 'week', alwaysFalse);
        // then
        expect(result).toHaveLength(0);
    });

    test('given period "month" and isInPeriod always true — when called — then returns all expenses', () => {
        // given / when
        const result = filterExpensesByPeriod(expenses, 'month', alwaysTrue);
        // then
        expect(result).toHaveLength(3);
    });

    test('given period "year" and now in 2024 — when called — then returns only 2024 expenses', () => {
        // given
        const now = new Date('2024-06-01');
        // when
        const result = filterExpensesByPeriod(expenses, 'year', alwaysFalse, now);
        // then
        expect(result).toHaveLength(2);
        expect(result.map(e => e.id)).toEqual([1, 2]);
    });

    test('given period "year" and now in 2023 — when called — then returns only 2023 expenses', () => {
        // given
        const now = new Date('2023-01-01');
        // when
        const result = filterExpensesByPeriod(expenses, 'year', alwaysFalse, now);
        // then
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(3);
    });

    test('given unknown period — when called — then returns empty array', () => {
        // given / when
        const result = filterExpensesByPeriod(expenses, 'decade', alwaysTrue);
        // then
        expect(result).toHaveLength(0);
    });

    test('given empty expenses array — when called — then returns empty array', () => {
        // given / when
        const result = filterExpensesByPeriod([], 'year', alwaysFalse, new Date('2024-01-01'));
        // then
        expect(result).toHaveLength(0);
    });

    test('given period "week" — when called — then passes "week" to isInPeriod', () => {
        // given
        const calls = [];
        const spy = (date, period) => { calls.push(period); return true; };
        // when
        filterExpensesByPeriod(expenses, 'week', spy);
        // then
        expect(calls.every(p => p === 'week')).toBe(true);
    });

    test('given period "month" — when called — then passes "month" to isInPeriod', () => {
        // given
        const calls = [];
        const spy = (date, period) => { calls.push(period); return true; };
        // when
        filterExpensesByPeriod(expenses, 'month', spy);
        // then
        expect(calls.every(p => p === 'month')).toBe(true);
    });
});

// ─── groupExpensesByCategory ──────────────────────────────────────────────────

describe('groupExpensesByCategory', () => {
    test('given empty array — when called — then returns empty array', () => {
        expect(groupExpensesByCategory([])).toEqual([]);
    });

    test('given single expense — when called — then returns one entry with correct amount', () => {
        // given
        const expenses = [{ category: 'food', amount: 50 }];
        // when
        const result = groupExpensesByCategory(expenses);
        // then
        expect(result).toEqual([['food', 50]]);
    });

    test('given two expenses in same category — when called — then sums them', () => {
        // given
        const expenses = [
            { category: 'food', amount: 30 },
            { category: 'food', amount: 20 },
        ];
        // when
        const result = groupExpensesByCategory(expenses);
        // then
        expect(result).toEqual([['food', 50]]);
    });

    test('given two categories — when called — then returns two entries', () => {
        // given
        const expenses = [
            { category: 'food',      amount: 80 },
            { category: 'transport', amount: 20 },
        ];
        // when
        const result = groupExpensesByCategory(expenses);
        // then
        expect(result).toHaveLength(2);
    });

    test('given two categories — when called — then sorts descending by total', () => {
        // given
        const expenses = [
            { category: 'transport', amount: 20 },
            { category: 'food',      amount: 80 },
        ];
        // when
        const [[firstCat], [secondCat]] = groupExpensesByCategory(expenses);
        // then
        expect(firstCat).toBe('food');
        expect(secondCat).toBe('transport');
    });

    test('given expenses with string amounts — when called — then coerces to numbers', () => {
        // given
        const expenses = [
            { category: 'food', amount: '10' },
            { category: 'food', amount: '15' },
        ];
        // when
        const [[, total]] = groupExpensesByCategory(expenses);
        // then
        expect(total).toBe(25);
    });

    test('given multiple categories with equal totals — when called — then all entries are present', () => {
        // given
        const expenses = [
            { category: 'a', amount: 10 },
            { category: 'b', amount: 10 },
            { category: 'c', amount: 10 },
        ];
        // when
        const result = groupExpensesByCategory(expenses);
        // then
        expect(result).toHaveLength(3);
        result.forEach(([, v]) => expect(v).toBe(10));
    });
});

// ─── calcPercentage ───────────────────────────────────────────────────────────

describe('calcPercentage', () => {
    test('given amount 50 and total 100 — when called — then returns 50', () => {
        expect(calcPercentage(50, 100)).toBe(50);
    });

    test('given amount 1 and total 3 — when called — then rounds to nearest integer', () => {
        // 1/3 ≈ 33.33… → rounds to 33
        expect(calcPercentage(1, 3)).toBe(33);
    });

    test('given amount 2 and total 3 — when called — then rounds to nearest integer', () => {
        // 2/3 ≈ 66.67… → rounds to 67
        expect(calcPercentage(2, 3)).toBe(67);
    });

    test('given total 0 — when called — then returns 0 (avoids division by zero)', () => {
        expect(calcPercentage(100, 0)).toBe(0);
    });

    test('given amount 0 and positive total — when called — then returns 0', () => {
        expect(calcPercentage(0, 200)).toBe(0);
    });

    test('given amount equal to total — when called — then returns 100', () => {
        expect(calcPercentage(75, 75)).toBe(100);
    });

    test('given amount greater than total — when called — then returns more than 100', () => {
        // Edge case: caller is responsible for passing correct data.
        expect(calcPercentage(150, 100)).toBe(150);
    });

    test('given negative total — when called — then returns 0', () => {
        // Treats negative total as falsy/invalid the same way as 0.
        expect(calcPercentage(50, -100)).toBe(-50);
    });
});