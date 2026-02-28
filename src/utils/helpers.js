import { LANG } from '../i18n/localization.js';
const LOCALE_MAP = { ru: 'ru-RU', en: 'en-US', es: 'es-ES' };

/**
 * Generates a random UUID v4.
 * @returns {string}
 */
export function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

/**
 * Returns today's date as an ISO string (YYYY-MM-DD) in local timezone.
 * @returns {string}
 */
export function todayStr() {
    const d = new Date();
    const year  = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day   = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * @param {string} str - ISO date string (YYYY-MM-DD)
 * @returns {string}
 */
export function formatDate(str) {
    if (!str) return '';
    return new Date(str + 'T00:00:00').toLocaleDateString(LOCALE_MAP[LANG], { day: 'numeric', month: 'short' });
}

/**
 * @param {number} n
 * @returns {string}
 */
export function formatMoney(n) {
    return n.toLocaleString(LOCALE_MAP[LANG], { maximumFractionDigits: 0 });
}

/**
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @param {'day'|'week'|'month'} period
 * @returns {boolean}
 */
export function isInPeriod(dateStr, period) {
    const d   = new Date(dateStr + 'T00:00:00');
    const now = new Date();

    if (period === 'day') return d.toDateString() === now.toDateString();

    if (period === 'week') {
        const start = new Date(now);
        const isoDay = (now.getDay() + 6) % 7;
        start.setDate(now.getDate() - isoDay);
        start.setHours(0, 0, 0, 0);
        return d >= start;
    }
    if (period === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return true;
}

/**
 * @param {{ expenses: Array, currentPeriod: string, currentCategoryFilter: string }} state
 * @returns {Array}
 */
export function getFilteredExpenses(state) {
    return state.expenses
        .filter(e => isInPeriod(e.date, state.currentPeriod))
        .filter(e => state.currentCategoryFilter === 'all' || e.category === state.currentCategoryFilter);
}

/**
 * @param {string} message
 * @param {'success'|'error'|''} [type='']
 */
export function showToast(message, type = '') {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.className   = 'toast' + (type ? ' ' + type : '');
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1500);
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

/**
 * @param {string} id
 * @param {string} value
 */
export function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

/**
 * @param {string} id
 * @param {string} value
 */
export function setHTML(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = value;
}