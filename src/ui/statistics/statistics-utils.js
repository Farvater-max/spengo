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
 * Returns a short "day + month" string (e.g. "Mar 1").
 * Always uses the "en-US" locale so the result is deterministic.
 * @param {Date} d
 * @returns {string}
 */
export function getShortDay(d) {
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

// ─── Bar colour logic ─────────────────────────────────────────────────────────

const ACCENT      = '#c8f135';
const ACCENT_DIM  = '#c8f13560';
const ACCENT2_DIM = '#7b61ff60';

/**
 * Builds the bar-colour array for the month view.
 * The bar at `activeIdx` receives the full accent colour (defaults to last bar).
 * Other bars alternate between two dimmed accents based on distance.
 *
 * @param {number}  count      – total number of bars
 * @param {number} [activeIdx] – index of the highlighted bar (default: count − 1)
 * @returns {string[]}
 */
export function buildPeriodBarColors(count, activeIdx = count - 1) {
    return Array.from({ length: count }, (_, i) =>
        i === activeIdx
            ? ACCENT
            : (activeIdx - i) % 2 === 0 ? ACCENT_DIM : ACCENT2_DIM
    );
}

// ─── Category grouping ────────────────────────────────────────────────────────

/**
 * Groups a flat list of expenses by category and returns them sorted
 * descending by total amount.
 *
 * @param {Array<{category: string, amount: number|string}>} expenses
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

// ─── Month week bands ─────────────────────────────────────────────────────────

/**
 * Returns the 4 fixed week-band date ranges for a given calendar month.
 * W1: 1–7  ·  W2: 8–14  ·  W3: 15–21  ·  W4: 22–end
 *
 * @param {number} year
 * @param {number} month  0-based
 * @returns {Array<{ from: Date, to: Date, label: string }>}
 */
export function getMonthBands(year, month) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return [
        [1, 7],
        [8, 14],
        [15, 21],
        [22, daysInMonth],
    ].map(([startDay, endDay]) => ({
        from:  new Date(year, month, startDay),
        to:    new Date(year, month, endDay, 23, 59, 59, 999),
        label: `${getShortDay(new Date(year, month, startDay))}–${getShortDay(new Date(year, month, endDay))}`,
    }));
}

/**
 * Returns the 0-based index of the active week band for the current date
 * within a given month. Returns the last band index for past months.
 *
 * @param {number} year
 * @param {number} month  0-based
 * @param {Date}  [now]   injectable for testing
 * @returns {number}  0–3
 */
export function getActiveBandIndex(year, month, now = new Date()) {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    if (!isCurrentMonth) return 3;
    const day = now.getDate();
    if (day <= 7)  return 0;
    if (day <= 14) return 1;
    if (day <= 21) return 2;
    return 3;
}

// ─── Carousel month list ──────────────────────────────────────────────────────

/**
 * Generates a flat list of { year, month } entries spanning
 * `pastMonths` before and `futureMonths` after the current month.
 *
 * @param {number} [pastMonths=6]
 * @param {number} [futureMonths=6]
 * @param {Date}   [now]  injectable for testing
 * @returns {Array<{ year: number, month: number }>}
 */
export function buildCarouselMonths(pastMonths = 6, futureMonths = 6, now = new Date()) {
    const result = [];
    for (let i = -pastMonths; i <= futureMonths; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        result.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    return result;
}