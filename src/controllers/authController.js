import { STATE } from '../state.js';
import * as AuthService from '../services/authService.js';
import * as Storage from '../services/storageService.js';
import { initSpreadsheet, refreshDataInBackground } from './expenseController.js';
import { showScreen } from '../ui/navigation.js';
import { renderUI, updateAvatarUI, renderProfileModal, setNavEnabled, renderAuthScreen, renderSetupScreen } from '../ui/renderer.jsx';
import { getI18nValue } from '../i18n/localization.js';
import { showToast } from '../utils/helpers.js';

// ─── Auth lifecycle ────────────────────────────────────

export function onAuthReady() {
    const { accessToken, sheetId, expenses, tokenExpired } = Storage.getStoredSession();

    if (!sheetId) { _toUnauthenticated(); return; }
    if (!accessToken || tokenExpired) { _startSilentRestore(sheetId, expenses); return; }
    _restoreSession({ accessToken, sheetId, expenses });
}

export function onSilentFail() {
    Storage.clearSession();
    STATE.accessToken = null;
    _toUnauthenticated();
}

export async function onSignIn({ accessToken }) {
    STATE.accessToken = accessToken;
    STATE.authStatus  = 'ready';
    setNavEnabled(true);

    showScreen('setup');
    renderSetupScreen({
        title: getI18nValue('setup.finding'),
        sub:   getI18nValue('setup.checking'),
    });

    const profile = await AuthService.getUserProfile(accessToken);
    if (profile) {
        STATE.userProfile = profile;
        Storage.saveLoginHint(profile.email);
        Storage.saveProfile(profile);
        updateAvatarUI();
    }

    if (STATE.spreadsheetId) {
        await refreshDataInBackground();
    } else {
        await initSpreadsheet();
    }
}

export function onSignOut() {
    STATE.reset();
    STATE.currentPeriod         = 'day';
    STATE.currentCategoryFilter = 'all';
    STATE.selectedCat           = null;

    Storage.clearAll();

    setNavEnabled(false);
    renderProfileModal({ open: false });
    showScreen('auth');
    renderAuthScreen({ loading: false, error: null });
    showToast(getI18nValue('toast.signed_out'));
    _enableSignInButton();
}

// ─── Private helpers ───────────────────────────────────
function _restoreSession({ accessToken, sheetId, expenses }) {
    STATE.accessToken   = accessToken;
    STATE.spreadsheetId = sheetId;
    STATE.authStatus    = 'restoring';
    _restoreProfileFromStorage();
    setNavEnabled(true);

    if (expenses.length > 0) {
        showScreen('setup');
        renderSetupScreen({
            title: getI18nValue('setup.loading'),
            sub:   getI18nValue('setup.reading'),
        });
        STATE.expenses = expenses;
    } else {
        showScreen('setup');
        renderSetupScreen({
            title: getI18nValue('setup.finding'),
            sub:   getI18nValue('setup.checking'),
        });
    }

    AuthService.silentRefresh();
}

function _startSilentRestore(sheetId, expenses) {
    STATE.spreadsheetId = sheetId;
    STATE.authStatus    = 'restoring';
    _restoreProfileFromStorage();

    showScreen('setup');
    renderSetupScreen({
        title: getI18nValue('setup.loading'),
        sub:   getI18nValue('setup.reading'),
    });

    if (expenses.length > 0) {
        STATE.expenses = expenses;
        setNavEnabled(true);
    } else {
        setNavEnabled(false);
    }

    AuthService.silentRefresh();
}

function _restoreProfileFromStorage() {
    const profile = Storage.getProfile();
    if (profile) { STATE.userProfile = profile; updateAvatarUI(); }
}

function _toUnauthenticated() {
    STATE.authStatus = 'unauthenticated';
    setNavEnabled(false);
    showScreen('auth');
    renderAuthScreen({ loading: false, error: null });
    _enableSignInButton();
}

export function _enableSignInButton() {
    renderAuthScreen({ loading: false });
}