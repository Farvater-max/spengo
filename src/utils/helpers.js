import { LANG } from '../i18n/localization.js';
import { parseISO, isSameDay, isSameMonth, isSameWeek, format } from 'date-fns';
import { ru, enUS, es, pl, cs } from 'date-fns/locale';
import Big from 'big.js';

const LOCALE_MAP = { ru: 'ru-RU', en: 'en-US', es: 'es-ES', pl: 'pl-PL', cs: 'cs-CZ'};
const DATE_FNS_LOCALES = {
    'ru-RU': ru,
    'en-US': enUS,
    'es-ES': es,
    'pl-PL': pl,
    'cs-CZ': cs,
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
 * @param {string} dateIsoString - ISO date string (YYYY-MM-DD).
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
        const hasCents = amount % 1 !== 0;
        return new Intl.NumberFormat(locale, {
            minimumFractionDigits: hasCents ? 2 : 0,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch (error) {
        console.error(`[formatMoney]: Formatting failed for locale "${locale}"`, error);
        return amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
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
    if (!el) {
        console.trace(`setText: element #${id} not found`);
        return;
    }
    el.textContent = value;
}

/**
 * @param {string} id
 * @param {string} value
 */
export function setHTML(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = value;
}

/**
 * Parses a user-typed amount string, accepting both dot and comma as the
 * decimal separator ("10,5" and "10.5" both become 10.5).
 * Returns 0 if the input is empty, non-numeric, or negative.
 *
 * @param {string|number} raw
 * @returns {number} Plain JS number rounded to 2 decimal places.
 */
export function parseAmount(raw) {
    try {
        const normalised = String(raw ?? '').trim().replace(',', '.');
        if (!normalised || normalised === '.') return 0;
        const big = new Big(normalised);
        if (big.lte(0)) return 0;
        return Number(big.toFixed(2));
    } catch {
        return 0;
    }
}

/**
 * Sums an array of expense amounts using Big.js to avoid float drift.
 * 0.1 + 0.2 → 0.3 (not 0.30000000000000004)
 *
 * @param {Array<{ amount: number }>} expenses
 * @returns {number} Rounded to 2 decimal places.
 */
export function sumAmounts(expenses) {
    const total = expenses.reduce((acc, e) => acc.plus(new Big(e.amount)), new Big(0));
    return Number(total.toFixed(2));
}

/**
 * Returns a sorted copy of an expenses array without mutating the original.
 *
 * @param {Array<{ date: string, amount: number }>} expenses
 * @param {'date' | 'amount'} field  - The field to sort by.
 * @param {'asc' | 'desc'}    dir    - Sort direction.
 * @returns {Array}
 */
export function sortExpenses(expenses, field, dir) {
    const multiplier = dir === 'asc' ? 1 : -1;

    // Capture original insertion order once — used as tiebreaker so that
    // within the same date the most recently added expense always ranks first.
    const indexMap = new Map(expenses.map((e, i) => [e.id, i]));

    return expenses.slice().sort((a, b) => {
        if (field === 'date') {
            const diff = a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
            if (diff !== 0) return diff * multiplier;
            // Same date — newer insertion (higher index) ranks first regardless of dir
            return indexMap.get(b.id) - indexMap.get(a.id);
        }
        // field === 'amount'
        return (a.amount - b.amount) * multiplier;
    });
}

/**
 * Validates that an email address is a plausible Google account.
 * @param {string} email - Raw input (will be trimmed + lowercased internally)
 * @returns {boolean}
 */
export function isGoogleEmail(email) {
    if (!email || typeof email !== 'string') return false;

    const normalised = email.trim().toLowerCase();

    // ── 1. Basic structure ────────────────────────────────────────────────
    const atIdx = normalised.lastIndexOf('@');
    if (atIdx < 1) return false;                         // no @ or empty local

    const local  = normalised.slice(0, atIdx);
    const domain = normalised.slice(atIdx + 1);

    if (!local || !domain) return false;

    // ── 2. Local part rules ───────────────────────────────────────────────
    if (local.length > 64)            return false;
    if (local.startsWith('.'))        return false;
    if (local.endsWith('.'))          return false;
    if (local.includes('..'))         return false;
    // Allow: letters, digits, dots, hyphens, plus, underscores
    if (!/^[a-z0-9.+_-]+$/.test(local)) return false;

    // ── 3. Domain rules ───────────────────────────────────────────────────
    const labels = domain.split('.');
    if (labels.length < 2)            return false;      // must have TLD

    const tld = labels[labels.length - 1];
    if (tld.length < 2)               return false;      // TLD too short
    if (!/^[a-z]+$/.test(tld))        return false;      // TLD letters only

    for (const label of labels) {
        if (!label)                   return false;      // empty label (double dot)
        if (label.startsWith('-'))    return false;
        if (label.endsWith('-'))      return false;
        if (!/^[a-z0-9-]+$/.test(label)) return false;
    }

    // ── 4. Blocklist — known non-Google consumer providers ────────────────
    // These domains cannot be Google accounts. The list intentionally stays
    // small — we only block common mistyped alternatives, not every provider.
    const NON_GOOGLE_DOMAINS = new Set([
        'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'hotmail.fr',
        'live.com', 'live.co.uk', 'live.fr', 'msn.com',
        'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.de', 'ymail.com',
        'icloud.com', 'me.com', 'mac.com',
        'aol.com', 'aim.com',
        'protonmail.com', 'protonmail.ch', 'pm.me',
        'mail.ru', 'yandex.ru', 'yandex.com',
    ]);

    if (NON_GOOGLE_DOMAINS.has(domain)) return false;

    return true;
}

// ─── Error classification ─────────────────────────────────────────────────

/**
 * Returns true if the error represents an HTTP permission / not-found failure.
 * Used to decide whether to show "no access" vs a generic network error.
 *
 * @param {Error} err
 * @returns {boolean}
 */
export function isPermissionError(err) {
    const msg = err?.message ?? '';
    return msg.includes('403') || msg.includes('404') || msg.includes('not found');
}

/**
 * Returns true if the error represents an HTTP authentication failure
 * (token expired / invalid credentials).
 *
 * @param {Error} err
 * @returns {boolean}
 */
export function isAuthError(err) {
    const msg = err?.message ?? '';
    return msg.includes('401') || msg.includes('403');
}

// ─── Ownership / sharing helpers ─────────────────────────────────────────

/**
 * Determines whether the currently signed-in user is the owner of the sheet.
 *
 * The user is considered an owner when ALL of the following hold:
 *   - They are not in guest mode.
 *   - Either the stored owner email is unknown, the user's email is unknown,
 *     or the two emails match (case-insensitive).
 *
 * @param {{ isGuestMode: boolean }} state          - App state slice.
 * @param {string|null}              ownerEmail     - Email stored as the sheet owner.
 * @param {string|null}              myEmail        - Currently signed-in user's email.
 * @returns {boolean}
 */
export function isSheetOwner(state, ownerEmail, myEmail) {
    if (state.isGuestMode) return false;
    if (!ownerEmail || !myEmail) return true;
    return ownerEmail.toLowerCase() === myEmail.toLowerCase();
}

/**
 * Builds the shareable guest-access URL for a spreadsheet.
 * Returns null when there are no shared users yet (nothing to share).
 *
 * @param {string}   spreadsheetId
 * @param {Array}    sharedUsers   - Current list of users the sheet is shared with.
 * @param {{ origin: string, pathname: string }} [location] - Defaults to window.location.
 * @returns {string|null}
 */
export function buildAccessUrl(spreadsheetId, sharedUsers, location = window.location) {
    if (!sharedUsers.length) return null;
    return `${location.origin}${location.pathname}?id=${spreadsheetId}`;
}

/**
 * Validates whether a share target email is eligible to be added.
 *
 * Checks in order:
 *   1. Must pass `isGoogleEmail` validation.
 *   2. Must not be the sheet owner's email.
 *   3. Must not already be in the shared-users list.
 *
 * Returns a string key for the i18n error message, or null when valid.
 *
 * @param {string}              email        - Candidate email (will be trimmed + lowercased).
 * @param {string|null}         ownerEmail   - Current sheet owner email.
 * @param {Array<{ email: string }>} sharedUsers - Currently shared users.
 * @returns {'share.invalid_email' | 'share.already_owner' | 'share.already_shared' | null}
 */
export function validateShareTarget(email, ownerEmail, sharedUsers) {
    const trimmed = email.trim().toLowerCase();

    if (!isGoogleEmail(trimmed)) return 'share.invalid_email';

    if (ownerEmail && trimmed === ownerEmail.toLowerCase()) return 'share.already_owner';

    const alreadyShared = sharedUsers.some(u => u.email.toLowerCase() === trimmed);
    if (alreadyShared) return 'share.already_shared';

    return null;
}