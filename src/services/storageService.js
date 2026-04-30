import { STORAGE } from '../constants/storage.js';
import { SESSION_STORAGE } from '../constants/storage.js';

/**
 * Persists a fresh access token and its expiry timestamp.
 * @param {string} accessToken
 * @param {number} expiresAt  - Unix ms timestamp
 */
export function saveSession(accessToken, expiresAt) {
    sessionStorage.setItem(SESSION_STORAGE.ACCESS_TOKEN, accessToken);
    sessionStorage.setItem(SESSION_STORAGE.EXPIRES_AT,   String(expiresAt));
}

/**
 * Removes the access token and expiry from sessionStorage.
 * Call on sign-out or when a 401 is received.
 */
export function clearSession() {
    sessionStorage.removeItem(SESSION_STORAGE.ACCESS_TOKEN);
    sessionStorage.removeItem(SESSION_STORAGE.EXPIRES_AT);
}

/**
 * Returns the cached access token, or null if not present.
 * @returns {string|null}
 */
export function getAccessToken() {
    return sessionStorage.getItem(SESSION_STORAGE.ACCESS_TOKEN);
}

/**
 * Returns true if there is no token or it has passed its expiry window.
 * @returns {boolean}
 */
export function isTokenExpired() {
    const expiresAt = sessionStorage.getItem(SESSION_STORAGE.EXPIRES_AT);
    if (!expiresAt) return true;
    return Date.now() > Number(expiresAt);
}

/**
 * Saves the user's email so GIS can skip the account-picker on silent refresh.
 * @param {string} email
 */
export function saveLoginHint(email) {
    localStorage.setItem(STORAGE.LOGIN_HINT, email);
}

/**
 * Returns the stored login hint email, or empty string if not set.
 * @returns {string}
 */
export function getLoginHint() {
    return localStorage.getItem(STORAGE.LOGIN_HINT) ?? '';
}

/**
 * Persists the Google Sheets spreadsheet ID.
 * @param {string} spreadsheetId
 */
export function saveSheetId(spreadsheetId) {
    localStorage.setItem(STORAGE.SHEET_ID, spreadsheetId);
}

/**
 * Returns the stored spreadsheet ID, or null if not set.
 * @returns {string|null}
 */
export function getSheetId() {
    return localStorage.getItem(STORAGE.SHEET_ID);
}

/**
 * Serialises and persists the expenses array.
 * @param {Array} expenses
 */
export function saveExpenses(expenses) {
    localStorage.setItem(STORAGE.EXPENSES, JSON.stringify(expenses));
}

/**
 * Deserialises and returns the cached expenses array.
 * Returns an empty array if nothing is cached or parsing fails.
 * @returns {Array}
 */
export function getExpenses() {
    try {
        const raw = localStorage.getItem(STORAGE.EXPENSES);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/**
 * Returns everything needed to restore a session in one call.
 * @returns {{ accessToken: string|null, sheetId: string|null, expenses: Array, loginHint: string, tokenExpired: boolean }}
 */
export function getStoredSession() {
    return {
        accessToken:  getAccessToken(),
        sheetId:      getSheetId(),
        expenses:     getExpenses(),
        loginHint:    getLoginHint(),
        tokenExpired: isTokenExpired(),
    };
}

/**
 * @param {number} numericSheetId
 */
export function saveNumericSheetId(numericSheetId) {
    localStorage.setItem(STORAGE.NUMERIC_SHEET_ID, String(numericSheetId));
}

/**
 * Returns the cached numeric sheet ID, or null if not yet stored.
 * @returns {number|null}
 */
export function getNumericSheetId() {
    const val = localStorage.getItem(STORAGE.NUMERIC_SHEET_ID);
    return val !== null ? Number(val) : null;
}

/**
 * Wipes all app data from both storages.
 * Call on sign-out to prevent data leaking to the next user on the same device.
 * Note: theme preference ('spengo-theme') is intentionally NOT cleared —
 * it is a device-level UX preference, not user account data.
 */
export function clearAll() {
    clearSession();
    localStorage.removeItem(STORAGE.SHEET_ID);
    localStorage.removeItem(STORAGE.EXPENSES);
    localStorage.removeItem(STORAGE.LOGIN_HINT);
    localStorage.removeItem(STORAGE.NUMERIC_SHEET_ID);
    localStorage.removeItem(STORAGE.PROFILE);
    localStorage.removeItem(STORAGE.SHARED_USERS);
    localStorage.removeItem(STORAGE.SHEET_OWNER_EMAIL);
    localStorage.removeItem(STORAGE.GUEST_SHEET_ID);
}

/**
 * Serialises and persists the user profile object.
 * Silently no-ops if serialisation fails (e.g. storage quota exceeded).
 * @param {{ email: string, name: string, picture: string, letter: string }} profile
 */
export function saveProfile(profile) {
    try {
        localStorage.setItem(STORAGE.PROFILE, JSON.stringify(profile));
    } catch {}
}

/**
 * Deserialises and returns the cached profile, or null if absent / corrupt.
 * @returns {{ email: string, name: string, picture: string, letter: string }|null}
 */
export function getProfile() {
    try {
        const raw = localStorage.getItem(STORAGE.PROFILE);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

/**
 * Removes the cached profile from localStorage.
 */
export function clearProfile() {
    localStorage.removeItem(STORAGE.PROFILE);
}

/**
 * Persists the list of users the spreadsheet is shared with.
 * @param {Array<{ permissionId: string, email: string, displayName: string, role: string, isPending: boolean }>} users
 */
export function saveSharedUsers(users) {
    try {
        localStorage.setItem(STORAGE.SHARED_USERS, JSON.stringify(users));
    } catch {}
}

/**
 * Returns the cached shared-users list, or an empty array on failure.
 * @returns {Array<{ permissionId: string, email: string, displayName: string, role: string, isPending: boolean }>}
 */
export function getSharedUsers() {
    try {
        const raw = localStorage.getItem(STORAGE.SHARED_USERS);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/**
 * @param {string} email
 */
export function saveSheetOwnerEmail(email) {
    try {
        localStorage.setItem(STORAGE.SHEET_OWNER_EMAIL, email);
    } catch {}
}

/**
 * @returns {string|null}
 */
export function getSheetOwnerEmail() {
    return localStorage.getItem(STORAGE.SHEET_OWNER_EMAIL) ?? null;
}

// ---------------------------------------------------------------------------
// Guest sheet ID (set when user enters via shared access URL)
// ---------------------------------------------------------------------------

/**
 * Persists the sheet ID received from the access URL (?id=...).
 * Allows guest mode to survive a page refresh without the URL param.
 * @param {string} sheetId
 */
export function saveGuestSheetId(sheetId) {
    try {
        localStorage.setItem(STORAGE.GUEST_SHEET_ID, sheetId);
    } catch {}
}

/**
 * Returns the stored guest sheet ID, or null if not in guest mode.
 * @returns {string|null}
 */
export function getGuestSheetId() {
    return localStorage.getItem(STORAGE.GUEST_SHEET_ID) ?? null;
}

/**
 * Removes the guest sheet ID — call on sign-out to fully exit guest mode.
 */
export function clearGuestSheetId() {
    localStorage.removeItem(STORAGE.GUEST_SHEET_ID);
}