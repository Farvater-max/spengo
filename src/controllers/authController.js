/**
 * authController.js
 *
 * Bridges authService events to the rest of the application.
 * Responsible for:
 *   – reading / writing session / local storage related to auth
 *   – updating STATE
 *   – delegating UI transitions to navigation / renderer helpers
 *
 * It deliberately contains NO direct DOM manipulation beyond calling
 * the dedicated UI helpers, keeping it easy to test in isolation.
 */

import { STATE } from '../../state.js';
import { STORAGE } from '../constants/storage.js';
import { initSpreadsheet, refreshDataInBackground } from './expenseController.js';
import { showScreen, setNavEnabled } from '../ui/navigation.js';
import { renderUI, updateAvatarUI } from '../ui/renderer.js';
import { getI18nValue } from '../i18n/localization.js';
import { showToast } from '../utils/helpers.js';

// ---------------------------------------------------------------------------
// Auth lifecycle callbacks (passed to authService.init)
// ---------------------------------------------------------------------------

/**
 * Called once the Google SDKs have loaded and the token client is ready.
 *
 * Restores a previous session from storage when possible; otherwise shows
 * the sign-in screen.
 */
export function onAuthReady() {
    const savedSheetId  = localStorage.getItem(STORAGE.SHEET_ID);
    const cachedToken   = sessionStorage.getItem('google_access_token');

    if (savedSheetId && cachedToken) {
        _restoreSession({ accessToken: cachedToken, spreadsheetId: savedSheetId });
    } else {
        _showSignInScreen();
    }
}

/**
 * Called when a background (silent) re-authentication attempt fails.
 * Clears the stale token and returns the user to the sign-in screen.
 */
export function onSilentFail() {
    sessionStorage.removeItem('google_access_token');
    _showSignInScreen();
}

/**
 * Called after the user successfully completes the Google consent flow.
 *
 * @param {{ accessToken: string }} param0
 */
export async function onSignIn({ accessToken }) {
    STATE.accessToken = accessToken;
    sessionStorage.setItem('google_access_token', accessToken);

    setNavEnabled(true);
    updateAvatarUI();
    showScreen('setup');

    await initSpreadsheet();
}

/**
 * Called after the token has been revoked and local state cleared.
 * Resets application state and returns to the sign-in screen.
 */
export function onSignOut() {
    STATE.reset();
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
 * Hydrates STATE from storage and decides which screen to show.
 * Kicks off a background data refresh in either case.
 *
 * @param {{ accessToken: string, spreadsheetId: string }} session
 */
function _restoreSession({ accessToken, spreadsheetId }) {
    STATE.accessToken   = accessToken;
    STATE.spreadsheetId = spreadsheetId;
    setNavEnabled(true);

    const hasCachedExpenses = STATE.expenses.length > 0;

    if (hasCachedExpenses) {
        showScreen('main');
        renderUI();
    } else {
        showScreen('setup');
    }

    refreshDataInBackground();
}

/** Transitions to the unauthenticated state. */
function _showSignInScreen() {
    setNavEnabled(false);
    showScreen('auth');
    _enableSignInButton();
}

function _enableSignInButton() {
    const btn = document.getElementById('btn-google');
    if (btn) btn.disabled = false;
}