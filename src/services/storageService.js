const LOCAL_STORAGE = {
    SHEET_ID:          'spengo_sheet_id',
    EXPENSES:          'spengo_expenses',
    LOGIN_HINT:        'google_login_hint',
    NUMERIC_SHEET_ID:  'spengo_numeric_sheet_id',
    PROFILE:           'spengo_profile',
    SHARED_USERS:      'spengo_shared_users',
    SHEET_OWNER_EMAIL: 'spengo_sheet_owner',
    IS_OWNER:          'spengo_is_owner',         
    PENDING_SHEET_ID:  'spengo_pending_sheet_id',
};

const SESSION_STORAGE = {
    ACCESS_TOKEN: 'google_access_token',
    EXPIRES_AT:   'google_token_expires_at',
};


// ---------------------------------------------------------------------------
// Session (access token)
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
 */
export function clearSession() {
    sessionStorage.removeItem(SESSION_STORAGE.ACCESS_TOKEN);
    sessionStorage.removeItem(SESSION_STORAGE.EXPIRES_AT);
}

/**
 * @returns {string|null}
 */
export function getAccessToken() {
    return sessionStorage.getItem(SESSION_STORAGE.ACCESS_TOKEN);
}

/**
 * @returns {boolean}
 */
export function isTokenExpired() {
    const expiresAt = sessionStorage.getItem(SESSION_STORAGE.EXPIRES_AT);
    if (!expiresAt) return true;
    return Date.now() > Number(expiresAt);
}

// ---------------------------------------------------------------------------
// Login hint
// ---------------------------------------------------------------------------

/** @param {string} email */
export function saveLoginHint(email) {
    localStorage.setItem(LOCAL_STORAGE.LOGIN_HINT, email);
}

/** @returns {string} */
export function getLoginHint() {
    return localStorage.getItem(LOCAL_STORAGE.LOGIN_HINT) ?? '';
}

// ---------------------------------------------------------------------------
// Sheet ID
// ---------------------------------------------------------------------------

/** @param {string} spreadsheetId */
export function saveSheetId(spreadsheetId) {
    localStorage.setItem(LOCAL_STORAGE.SHEET_ID, spreadsheetId);
}

/** @returns {string|null} */
export function getSheetId() {
    return localStorage.getItem(LOCAL_STORAGE.SHEET_ID);
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

/** @param {Array} expenses */
export function saveExpenses(expenses) {
    localStorage.setItem(LOCAL_STORAGE.EXPENSES, JSON.stringify(expenses));
}

/**
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
// Composite session restore
// ---------------------------------------------------------------------------

/**
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
// Numeric sheet ID
// ---------------------------------------------------------------------------

/** @param {number} numericSheetId */
export function saveNumericSheetId(numericSheetId) {
    localStorage.setItem(LOCAL_STORAGE.NUMERIC_SHEET_ID, String(numericSheetId));
}

/** @returns {number|null} */
export function getNumericSheetId() {
    const val = localStorage.getItem(LOCAL_STORAGE.NUMERIC_SHEET_ID);
    return val !== null ? Number(val) : null;
}

// ---------------------------------------------------------------------------
// Clear all
// ---------------------------------------------------------------------------

/**
 * Wipes all app data from both storages.
 * Does NOT clear pendingSheetId — that's a pre-auth value managed separately.
 */
export function clearAll() {
    clearSession();
    localStorage.removeItem(LOCAL_STORAGE.SHEET_ID);
    localStorage.removeItem(LOCAL_STORAGE.EXPENSES);
    localStorage.removeItem(LOCAL_STORAGE.LOGIN_HINT);
    localStorage.removeItem(LOCAL_STORAGE.NUMERIC_SHEET_ID);
    localStorage.removeItem(LOCAL_STORAGE.PROFILE);
    localStorage.removeItem(LOCAL_STORAGE.SHARED_USERS);
    localStorage.removeItem(LOCAL_STORAGE.SHEET_OWNER_EMAIL);
    localStorage.removeItem(LOCAL_STORAGE.IS_OWNER);
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/** @param {{ email: string, name: string, picture: string, letter: string }} profile */
export function saveProfile(profile) {
    try {
        localStorage.setItem(LOCAL_STORAGE.PROFILE, JSON.stringify(profile));
    } catch {}
}

/**
 * @returns {{ email: string, name: string, picture: string, letter: string }|null}
 */
export function getProfile() {
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE.PROFILE);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function clearProfile() {
    localStorage.removeItem(LOCAL_STORAGE.PROFILE);
}

// ---------------------------------------------------------------------------
// Shared users
// ---------------------------------------------------------------------------

/**
 * @param {Array<{ permissionId: string, email: string, displayName: string, role: string, isPending: boolean }>} users
 */
export function saveSharedUsers(users) {
    try {
        localStorage.setItem(LOCAL_STORAGE.SHARED_USERS, JSON.stringify(users));
    } catch {}
}

/**
 * @returns {Array<{ permissionId: string, email: string, displayName: string, role: string, isPending: boolean }>}
 */
export function getSharedUsers() {
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE.SHARED_USERS);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

// ---------------------------------------------------------------------------
// Sheet owner email
// ---------------------------------------------------------------------------

/** @param {string} email */
export function saveSheetOwnerEmail(email) {
    try {
        localStorage.setItem(LOCAL_STORAGE.SHEET_OWNER_EMAIL, email);
    } catch {}
}

/** @returns {string|null} */
export function getSheetOwnerEmail() {
    return localStorage.getItem(LOCAL_STORAGE.SHEET_OWNER_EMAIL) ?? null;
}

// ---------------------------------------------------------------------------
// Owner flag
// ---------------------------------------------------------------------------

/**
 * Persists whether the current user is the owner of the active spreadsheet.
 * false = subuser who obtained access via share link + Picker consent.
 * @param {boolean} isOwner
 */
export function saveIsOwner(isOwner) {
    localStorage.setItem(LOCAL_STORAGE.IS_OWNER, isOwner ? 'true' : 'false');
}

/**
 * Returns true if the stored flag is explicitly 'false', otherwise defaults to true
 * (owner is the normal case; subuser is opt-in via URL).
 * @returns {boolean}
 */
export function getIsOwner() {
    const val = localStorage.getItem(LOCAL_STORAGE.IS_OWNER);
    return val !== 'false';
}

// ---------------------------------------------------------------------------
// Pending sheet ID  (parsed from URL before auth completes)
// ---------------------------------------------------------------------------

/**
 * Temporarily stores the sheet ID extracted from the share URL
 * (?sheets=<id>) so it survives the OAuth redirect / popup flow.
 * @param {string} sheetId
 */
export function savePendingSheetId(sheetId) {
    localStorage.setItem(LOCAL_STORAGE.PENDING_SHEET_ID, sheetId);
}

/**
 * @returns {string|null}
 */
export function getPendingSheetId() {
    return localStorage.getItem(LOCAL_STORAGE.PENDING_SHEET_ID) ?? null;
}

/**
 * Clears the pending sheet ID after it has been consumed by the auth flow.
 */
export function clearPendingSheetId() {
    localStorage.removeItem(LOCAL_STORAGE.PENDING_SHEET_ID);
}