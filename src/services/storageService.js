/**
 * storageService.js
 *
 * Single owner of every read/write to localStorage and sessionStorage.
 * No other module should touch storage directly.
 *
 * localStorage  — survives browser restarts: sheetId, expenses, login_hint
 * sessionStorage — tab-scoped: access token, token expiry
 *
 * Consumers call the named methods; the key strings live here and nowhere else.
 */

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

const LOCAL_STORAGE = {
    SHEET_ID:          'spengo_sheet_id',
    EXPENSES:          'spengo_expenses',
    LOGIN_HINT:        'google_login_hint',
    NUMERIC_SHEET_ID:  'spengo_numeric_sheet_id',
};

const SESSION_STORAGE = {
    ACCESS_TOKEN: 'google_access_token',
    EXPIRES_AT:   'google_token_expires_at',
};

// ---------------------------------------------------------------------------
// Session (tab-scoped token storage)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Persistent auth hints
// ---------------------------------------------------------------------------

/**
 * Saves the user's email so GIS can skip the account-picker on silent refresh.
 * @param {string} email
 */
export function saveLoginHint(email) {
    localStorage.setItem(LOCAL_STORAGE.LOGIN_HINT, email);
}

/**
 * Returns the stored login hint email, or empty string if not set.
 * @returns {string}
 */
export function getLoginHint() {
    return localStorage.getItem(LOCAL_STORAGE.LOGIN_HINT) ?? '';
}

// ---------------------------------------------------------------------------
// Spreadsheet identity
// ---------------------------------------------------------------------------

/**
 * Persists the Google Sheets spreadsheet ID.
 * @param {string} spreadsheetId
 */
export function saveSheetId(spreadsheetId) {
    localStorage.setItem(LOCAL_STORAGE.SHEET_ID, spreadsheetId);
}

/**
 * Returns the stored spreadsheet ID, or null if not set.
 * @returns {string|null}
 */
export function getSheetId() {
    return localStorage.getItem(LOCAL_STORAGE.SHEET_ID);
}

// ---------------------------------------------------------------------------
// Expenses cache
// ---------------------------------------------------------------------------

/**
 * Serialises and persists the expenses array.
 * @param {Array} expenses
 */
export function saveExpenses(expenses) {
    localStorage.setItem(LOCAL_STORAGE.EXPENSES, JSON.stringify(expenses));
}

/**
 * Deserialises and returns the cached expenses array.
 * Returns an empty array if nothing is cached or parsing fails.
 * @returns {Array}
 */
export function getExpenses() {
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE.EXPENSES);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

// ---------------------------------------------------------------------------
// Bulk operations
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Numeric sheet ID cache
// The numeric sheetId (used in batchUpdate) never changes for a given
// spreadsheet. Caching it removes one GET per delete operation.
// ---------------------------------------------------------------------------

/**
 * @param {number} numericSheetId
 */
export function saveNumericSheetId(numericSheetId) {
    localStorage.setItem(LOCAL_STORAGE.NUMERIC_SHEET_ID, String(numericSheetId));
}

/**
 * Returns the cached numeric sheet ID, or null if not yet stored.
 * @returns {number|null}
 */
export function getNumericSheetId() {
    const val = localStorage.getItem(LOCAL_STORAGE.NUMERIC_SHEET_ID);
    return val !== null ? Number(val) : null;
}

/**
 * Wipes all app data from both storages.
 * Call on sign-out to prevent data leaking to the next user on the same device.
 */
export function clearAll() {
    clearSession();
    localStorage.removeItem(LOCAL_STORAGE.SHEET_ID);
    localStorage.removeItem(LOCAL_STORAGE.EXPENSES);
    localStorage.removeItem(LOCAL_STORAGE.LOGIN_HINT);
    localStorage.removeItem(LOCAL_STORAGE.NUMERIC_SHEET_ID);
}