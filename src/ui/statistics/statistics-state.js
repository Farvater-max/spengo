/**
 * statistics-state.js
 *
 * Single source of truth for the active statistics period.
 * Both statistics-chart.js and statistics-donut.js subscribe to period
 * changes here — neither module needs to know about the other.
 *
 * Usage:
 *   import { getPeriod, setPeriod, onPeriodChange } from './statistics-state.js';
 *
 *   onPeriodChange(period => renderDonutChart(period));
 *   setPeriod('week'); // notifies all subscribers
 */

// ─── State ────────────────────────────────────────────

/** @type {'week' | 'month' | 'year'} */
let _period = 'month';

/** @type {Array<(period: string) => void>} */
const _listeners = [];

// ─── Public API ───────────────────────────────────────

/**
 * Returns the currently active period.
 * @returns {'week' | 'month' | 'year'}
 */
export function getPeriod() {
    return _period;
}

/**
 * Sets a new period and notifies all subscribers.
 * No-ops if the period hasn't changed.
 * @param {'week' | 'month' | 'year'} period
 */
export function setPeriod(period) {
    if (_period === period) return;
    _period = period;
    _notify();
}

/**
 * Registers a callback that fires whenever the period changes.
 * Returns an unsubscribe function for cleanup.
 * @param {(period: string) => void} fn
 * @returns {() => void} unsubscribe
 */
export function onPeriodChange(fn) {
    _listeners.push(fn);
    return () => {
        const idx = _listeners.indexOf(fn);
        if (idx !== -1) _listeners.splice(idx, 1);
    };
}

// ─── Internal ─────────────────────────────────────────

function _notify() {
    _listeners.forEach(fn => fn(_period));
}