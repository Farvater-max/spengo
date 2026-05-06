/**
 * Returns the Monday of the week containing `date`.
 * The week is considered to start on Monday (ISO 8601).
 * @param {Date} date
 * @returns {Date}  new Date set to 00:00:00.000 of that Monday
 */
export function getMonday(date) {
    const d   = new Date(date);
    const day = d.getDay();                      // 0 = Sun … 6 = Sat
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Formats a Date as an ISO-8601 date string "YYYY-MM-DD".
 * @param {Date} d
 * @returns {string}
 */
export function toIso(d) {
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}

/**
 * Returns a two-character weekday abbreviation (e.g. "MO", "TU").
 * Always uses the "en-US" locale so the result is deterministic.
 * @param {Date} d
 * @returns {string}
 */
export function getDayLabel(d) {
    return d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase().slice(0, 2);
}

/**
 * Returns a short "day + month" string (e.g. "Mar 1").
 * Always uses the "en-US" locale so the result is deterministic.
 * @param {Date} d
 * @returns {string}
 */
export function getShortDay(d) {
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

/**
 * Returns a short uppercased month abbreviation (e.g. "MAR").
 * Always uses the "en-US" locale so the result is deterministic.
 * @param {Date} d
 * @returns {string}
 */
export function getMonthLabel(d) {
    return d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}

// ─── Bar colour logic (statistics-chart.js) ──────────────────────────────────

const ACCENT      = '#c8f135';
const ACCENT_DIM  = '#c8f13560';
const ACCENT2_DIM = '#7b61ff60';

/**
 * Builds the bar-colour array for the week view.
 * The bar at `todayIdx` receives the full accent colour; the remaining bars
 * alternate between two dimmed accent colours based on distance from today.
 *
 * @param {number}   count     – total number of bars (7 for a week view)
 * @param {number}   todayIdx  – 0-based index of today's bar (0 = Monday … 6 = Sunday)
 * @returns {string[]}
 */
export function buildWeekBarColors(count, todayIdx) {
    return Array.from({ length: count }, (_, i) =>
        i === todayIdx
            ? ACCENT
            : (todayIdx - i) % 2 === 0 ? ACCENT_DIM : ACCENT2_DIM
    );
}

/**
 * Builds the bar-colour array for the month / year view.
 * The last bar (most recent period) receives the full accent colour; earlier
 * bars alternate between the two dimmed accents based on distance from the end.
 *
 * @param {number} count  – total number of bars
 * @returns {string[]}
 */
export function buildPeriodBarColors(count) {
    return Array.from({ length: count }, (_, i) =>
        i === count - 1
            ? ACCENT
            : (count - 1 - i) % 2 === 0 ? ACCENT_DIM : ACCENT2_DIM
    );
}

// ─── Period filtering (statistics-chart.js / statistics-donut.js) ────────────

/**
 * Filters an array of expense objects to those belonging to the given period.
 * "year" is relative to `now`; "week" and "month" are delegated to `isInPeriod`.
 *
 * @param {Array<{date: string}>} expenses
 * @param {'week'|'month'|'year'}  period
 * @param {(date: string, period: 'week'|'month') => boolean} isInPeriod
 * @param {Date} [now]  – injectable for testing; defaults to `new Date()`
 * @returns {Array}
 */
export function filterExpensesByPeriod(expenses, period, isInPeriod, now = new Date()) {
    return expenses.filter(e => {
        if (period === 'week')  return isInPeriod(e.date, 'week');
        if (period === 'month') return isInPeriod(e.date, 'month');
        if (period === 'year')  return new Date(e.date).getFullYear() === now.getFullYear();
        return false;
    });
}

// ─── Category grouping (statistics-donut.js) ─────────────────────────────────

/**
 * Groups a flat list of expenses by category and returns them sorted
 * descending by total amount.
 *
 * Each expense must have at minimum:
 *   { category: string, amount: number | string }
 *
 * Uses a simple numeric sum so it has no dependency on `sumAmounts` —
 * the caller may pass pre-parsed amounts.
 *
 * @param {Array<{category: string, amount: number}>} expenses
 * @returns {Array<[string, number]>}  sorted [categoryId, total] pairs
 */
export function groupExpensesByCategory(expenses) {
    const grouped = expenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
        return acc;
    }, {});
    return Object.entries(grouped).sort(([, a], [, b]) => b - a);
}

/**
 * Calculates the integer percentage share of `amount` relative to `total`.
 * Returns 0 when `total` is 0 to avoid division by zero.
 *
 * @param {number} amount
 * @param {number} total
 * @returns {number}  0–100
 */
export function calcPercentage(amount, total) {
    if (!total) return 0;
    return Math.round((amount / total) * 100);
}