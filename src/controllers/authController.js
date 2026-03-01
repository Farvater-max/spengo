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
import * as AuthService from '../services/authService.js';
import { fetchUserProfile } from '../api/client/googleClient.js';
import { initSpreadsheet, refreshDataInBackground } from './expenseController.js';
import {showScreen, setNavEnabled, setSetupText} from '../ui/navigation.js';
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
    const savedSheetId = localStorage.getItem(STORAGE.SHEET_ID);
    const cachedToken  = sessionStorage.getItem('google_access_token');

    if (savedSheetId && cachedToken) {
        if (AuthService.isTokenExpired()) {
            STATE.spreadsheetId = savedSheetId;
            STATE.accessToken   = null;
            setNavEnabled(true);

            if (STATE.expenses.length > 0) {
                // Есть кеш — показываем его пока ждём токен
                showScreen('main');
                renderUI();
            } else {
                showScreen('setup');
                setSetupText('Restoring session…', '');
            }
            AuthService.silentRefresh();

        } else {
            _restoreSession({ accessToken: cachedToken, spreadsheetId: savedSheetId });
        }

    } else if (savedSheetId && !cachedToken) {
        STATE.spreadsheetId = savedSheetId;
        setNavEnabled(false);
        showScreen('auth');
        document.getElementById('btn-google').disabled = true;
        AuthService.silentRefresh();
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
    sessionStorage.removeItem('google_token_expires_at');
    STATE.accessToken = null;
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

    // Fetch profile once per sign-in and persist the email as login_hint.
    // login_hint tells GIS which account to use on the next silentRefresh,
    // preventing the account-picker popup from appearing on page reload.
    const profile = await fetchUserProfile(accessToken);
    if (profile) {
        STATE.userProfile = profile;
        localStorage.setItem('google_login_hint', profile.email);
        updateAvatarUI();
    }

    const alreadyHasSheet = !!STATE.spreadsheetId;

    if (alreadyHasSheet) {
        await refreshDataInBackground();
    } else {
        showScreen('setup');
        await initSpreadsheet();
    }
}

/**
 * Called after the token has been revoked and local state cleared.
 * Resets application state and returns to the sign-in screen.
 */
export function onSignOut() {
    STATE.reset();
    STATE.currentScreen = 'auth';
    STATE.currentPeriod = 'day';
    STATE.currentCategoryFilter = 'all';
    STATE.selectedCat = null;

    localStorage.removeItem(STORAGE.SHEET_ID);
    localStorage.removeItem(STORAGE.EXPENSES);
    localStorage.removeItem('google_login_hint');

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

    if (STATE.expenses.length > 0) {
        showScreen('main');
        renderUI();
    } else {
        showScreen('setup');
        setSetupText('Loading data…', '');
    }

    // Proactively get a fresh token — the cached one may be technically
    // within its expiry window but already revoked or invalidated server-side
    // (e.g. manually cleared in devtools, or Google revoked it).
    // silentRefresh → onSignIn → refreshDataInBackground is the happy path.
    // If it fails, refreshDataInBackground's 401 handler will call silentRefresh
    // as a fallback, and onSilentFail will redirect to sign-in if GIS can't help.
    AuthService.silentRefresh();
}

/** Transitions to the unauthenticated state. */
function _showSignInScreen() {
    setNavEnabled(false);
    showScreen('auth');
    _enableSignInButton();
}

export function _enableSignInButton() {
    const btn = document.getElementById('btn-google');
    if (btn) btn.disabled = false;
}