/**
 * statistics-state.js
 *
 * Single source of truth for the active statistics month.
 * Stores the selected month as { year, month } (month is 0-based, like Date).
 */

// ─── State ────────────────────────────────────────────

const _now = new Date();

/** @type {{ year: number, month: number }} month is 0-based */
let _selected = { year: _now.getFullYear(), month: _now.getMonth() };

/** @type {Array<(sel: { year: number, month: number }) => void>} */
const _listeners = [];

// ─── Public API ───────────────────────────────────────

/**
 * Returns the currently selected { year, month }.
 * @returns {{ year: number, month: number }}
 */
export function getSelectedMonth() {
    return _selected;
}

/**
 * Sets a new month and notifies all subscribers.
 * No-ops if year+month haven't changed.
 * @param {number} year
 * @param {number} month  0-based (0 = January … 11 = December)
 */
export function setSelectedMonth(year, month) {
    if (_selected.year === year && _selected.month === month) return;
    _selected = { year, month };
    _notify();
}

/**
 * Registers a callback that fires whenever the selected month changes.
 * Returns an unsubscribe function for cleanup.
 * @param {(sel: { year: number, month: number }) => void} fn
 * @returns {() => void} unsubscribe
 */
export function onMonthChange(fn) {
    _listeners.push(fn);
    return () => {
        const idx = _listeners.indexOf(fn);
        if (idx !== -1) _listeners.splice(idx, 1);
    };
}

/**
 * Builds the list of available { year, month } pairs from real expense data.
 *
 * Always includes the current month (even if empty — it's always "browsable").
 * Months are returned in reverse-chronological order (newest first).
 *
 * @param {Array<{ date: string }>} expenses  — flat list of all known expenses
 * @returns {Array<{ year: number, month: number }>}
 */
export function getAvailableMonths(expenses = []) {
    const now    = new Date();
    const curY   = now.getFullYear();
    const curM   = now.getMonth();

    // Collect unique year-month pairs that have at least one expense
    const seen = new Set();
    for (const e of expenses) {
        if (!e?.date) continue;
        const d = new Date(e.date);
        if (isNaN(d)) continue;
        seen.add(`${d.getFullYear()}-${d.getMonth()}`);
    }

    // Always include current month
    seen.add(`${curY}-${curM}`);

    // Parse and sort newest-first
    return [...seen]
        .map(key => {
            const [y, m] = key.split('-').map(Number);
            return { year: y, month: m };
        })
        .sort((a, b) => b.year - a.year || b.month - a.month);
}

// ─── Internal ─────────────────────────────────────────

function _notify() {
    _listeners.forEach(fn => fn(_selected));
}

// ─── Legacy shim ──────────────────────────────────────

/**
 * @deprecated Use onMonthChange(). Kept because SummaryCard in renderer.jsx
 * still wires onPeriodChange on the period-change callback.
 * TODO: remove once SummaryCard is migrated.
 */
export function onPeriodChange(fn) {
    return onMonthChange(() => fn('month'));
}