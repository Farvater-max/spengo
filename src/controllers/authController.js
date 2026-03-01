/**
 * authController.js
 *
 * Bridges authService events to the rest of the application.
 * Responsible for:
 *   – reading / writing session state via storageService
 *   – updating STATE (including authStatus)
 *   – delegating UI transitions to navigation / renderer helpers
 *
 * It contains NO direct localStorage/sessionStorage calls.
 */

import { STATE } from '../../state.js';
import * as AuthService from '../services/authService.js';
import * as Storage from '../services/storageService.js';
import { fetchUserProfile } from '../api/client/googleClient.js';
import { initSpreadsheet, refreshDataInBackground } from './expenseController.js';
import { showScreen, setNavEnabled, setSetupText } from '../ui/navigation.js';
import { renderUI, updateAvatarUI } from '../ui/renderer.js';
import { getI18nValue } from '../i18n/localization.js';
import { showToast } from '../utils/helpers.js';

// ---------------------------------------------------------------------------
// Auth lifecycle callbacks (passed to authService.init)
// ---------------------------------------------------------------------------

/**
 * Called once the Google SDKs have loaded and the token client is ready.
 * Reads a single snapshot from storageService and decides what to do.
 */
export function onAuthReady() {
    const { accessToken, sheetId, expenses, tokenExpired } = Storage.getStoredSession();

    // No previous session at all → straight to sign-in
    if (!sheetId) {
        _toUnauthenticated();
        return;
    }

    // Have a sheet but no token → attempt silent refresh
    if (!accessToken) {
        _startSilentRestore(sheetId, expenses);
        return;
    }

    // Have both but token has expired → show cached data while refreshing
    if (tokenExpired) {
        _startSilentRestore(sheetId, expenses);
        return;
    }

    // Everything looks good → restore normally
    _restoreSession({ accessToken, sheetId, expenses });
}

/**
 * Called when a background (silent) re-authentication attempt fails.
 */
export function onSilentFail() {
    Storage.clearSession();
    STATE.accessToken = null;
    _toUnauthenticated();
}

/**
 * Called after the user successfully completes the Google consent flow
 * OR after a successful silent refresh.
 *
 * @param {{ accessToken: string }} param0
 */
export async function onSignIn({ accessToken }) {
    STATE.accessToken = accessToken;
    // authService already called Storage.saveSession() — no duplicate write here
    STATE.authStatus = 'ready';
    setNavEnabled(true);

    // Fetch profile and persist login_hint to suppress account-picker on reload
    const profile = await fetchUserProfile(accessToken);
    if (profile) {
        STATE.userProfile = profile;
        Storage.saveLoginHint(profile.email);
        updateAvatarUI();
    }

    if (STATE.spreadsheetId) {
        await refreshDataInBackground();
    } else {
        showScreen('setup');
        await initSpreadsheet();
    }
}

/**
 * Called after the token has been revoked and local state cleared.
 */
export function onSignOut() {
    STATE.reset(); // sets authStatus = 'unauthenticated'
    STATE.currentPeriod = 'day';
    STATE.currentCategoryFilter = 'all';
    STATE.selectedCat = null;

    Storage.clearAll(); // single call wipes everything

    setNavEnabled(false);
    document.getElementById('modal-profile').classList.remove('open');
    showScreen('auth');
    showToast(getI18nValue('toast.signed_out'));
    _enableSignInButton();
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Handles both "no token" and "token expired" cases.
 * Loads cached expenses into STATE so the UI can show stale data while
 * the silent refresh is in flight.
 *
 * @param {string} sheetId
 * @param {Array}  expenses
 */
function _startSilentRestore(sheetId, expenses) {
    STATE.spreadsheetId = sheetId;
    STATE.authStatus    = 'restoring';

    if (expenses.length > 0) {
        STATE.expenses = expenses;
        setNavEnabled(true);
        showScreen('main');
        renderUI();
    } else {
        setNavEnabled(false);
        showScreen('auth');
        _disableSignInButton(); // visually indicate background activity
    }

    AuthService.silentRefresh();
}

/**
 * Restores a fully valid session (token present and not expired).
 * Still kicks off a proactive silent refresh because the token may be
 * revoked server-side even if the local expiry has not passed.
 *
 * @param {{ accessToken: string, sheetId: string, expenses: Array }} session
 */
function _restoreSession({ accessToken, sheetId, expenses }) {
    STATE.accessToken   = accessToken;
    STATE.spreadsheetId = sheetId;
    STATE.authStatus    = 'restoring';
    setNavEnabled(true);

    if (expenses.length > 0) {
        STATE.expenses = expenses;
        showScreen('main');
        renderUI();
    } else {
        showScreen('setup');
        setSetupText('Loading data…', '');
    }

    // Proactive refresh — if the token is invalid server-side, the 401 in
    // refreshDataInBackground will call silentRefresh as a fallback.
    AuthService.silentRefresh();
}

/** Transitions to the fully unauthenticated state. */
function _toUnauthenticated() {
    STATE.authStatus = 'unauthenticated';
    setNavEnabled(false);
    showScreen('auth');
    _enableSignInButton();
}

export function _enableSignInButton() {
    const btn = document.getElementById('btn-google');
    if (btn) btn.disabled = false;
}

function _disableSignInButton() {
    const btn = document.getElementById('btn-google');
    if (btn) btn.disabled = true;
}