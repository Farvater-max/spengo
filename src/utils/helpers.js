import { LANG } from '../i18n/localization.js';
import {parseISO, isSameDay, isSameMonth, isSameWeek, format} from 'date-fns';
import { ru, enUS, es } from 'date-fns/locale';
const LOCALE_MAP = { ru: 'ru-RU', en: 'en-US', es: 'es-ES' };
const DATE_FNS_LOCALES = {
    'ru-RU': ru,
    'en-US': enUS,
    'es-ES': es
};


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
 * Formats an ISO date string to a localized string (e.g., "1 Mar").
 * Automatically detects the current language if not provided.
 * * @param {string} dateIsoString - ISO date string (YYYY-MM-DD).
 * @param dateIsoString
 * @param {string} [langKey] - Optional language key ('ru', 'en', 'es').
 * Defaults to global LANG if omitted.
 * @returns {string} Formatted date or empty string.
 */
export function formatDate(dateIsoString, langKey) {
    if (!dateIsoString) return '';

    try {
        const date = parseISO(dateIsoString);
        const currentLang = langKey || (typeof LANG !== 'undefined' ? LANG : 'en');

        const localeString = LOCALE_MAP[currentLang] || LOCALE_MAP.en;
        const dateLocale = DATE_FNS_LOCALES[localeString] || enUS;

        return format(date, 'd MMM', { locale: dateLocale });
    } catch (error) {
        console.error(`[formatDate Error]: ${dateIsoString}`, error);
        return '';
    }
}

/**
 * @param {number} amount - The numeric value to format.
 * @param {string} [locale='en-US'] - The BCP 47 language tag (e.g., 'en-US', 'ru-RU').
 * @returns {string} The formatted money string or a fallback if input is invalid.
 */
export function formatMoney(amount, locale = 'en-US') {
    if (typeof amount !== 'number' || Number.isNaN(amount)) {
        console.warn('[formatMoney]: Invalid input provided, expected a number.');
        return '0';
    }
    try {
        return new Intl.NumberFormat(locale, {
            maximumFractionDigits: 0,
        }).format(amount);
    } catch (error) {
        console.error(`[formatMoney]: Formatting failed for locale "${locale}"`, error);
        return amount.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
}

/**
 * Checks if a given ISO date string falls within the current calendar period
 * based on the user's local time zone.
 *
 * @param {string} dateIsoString - The date to check in ISO format (e.g., "YYYY-MM-DD").
 * @param {'day' | 'week' | 'month'} period - The time period to validate against.
 * @returns {boolean} True if the target date matches the current local period, false otherwise.
 */
export function isInPeriod(dateIsoString, period) {
    if (!dateIsoString) return false;

    const targetDate = parseISO(dateIsoString);
    const now = new Date();

    switch (period) {
        case 'day':
            return isSameDay(targetDate, now);
        case 'week':
            return isSameWeek(targetDate, now, { weekStartsOn: 1 });
        case 'month':
            return isSameMonth(targetDate, now);
        default:
            return false;
    }
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