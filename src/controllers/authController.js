import { STATE } from '../state.js';
import * as AuthService from '../services/authService.js';
import * as Storage from '../services/storageService.js';
import { fetchUserProfile } from '../api/client/googleClient.js';
import { initSpreadsheet, refreshDataInBackground } from './expenseController.js';
import { showScreen, setSetupText } from '../ui/navigation.js';
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

/**
 * Сценарий: пользователь нажал Sign in и прошёл OAuth.
 * Показываем setup.finding → затем initSpreadsheet обновит тексты.
 */
export async function onSignIn({ accessToken }) {
    STATE.accessToken = accessToken;
    STATE.authStatus  = 'ready';
    setNavEnabled(true);

    // показываем setup сразу — пользователь видит спиннер
    showScreen('setup');
    renderSetupScreen({
        title: getI18nValue('setup.finding'),
        sub:   getI18nValue('setup.checking'),
    });

    // грузим профиль параллельно — не блокируем UI
    const profile = await fetchUserProfile(accessToken);
    if (profile) {
        STATE.userProfile = profile;
        Storage.saveLoginHint(profile.email);
        try { localStorage.setItem('spengo_profile', JSON.stringify(profile)); } catch {}
        updateAvatarUI();
    }

    if (STATE.spreadsheetId) {
        // повторный вход — грузим данные, setup уже показан
        await refreshDataInBackground();
    } else {
        // первый вход — initSpreadsheet обновит тексты и переключит на main
        await initSpreadsheet();
    }
}

export function onSignOut() {
    STATE.reset();
    STATE.currentPeriod         = 'day';
    STATE.currentCategoryFilter = 'all';
    STATE.selectedCat           = null;

    Storage.clearAll();
    try { localStorage.removeItem('spengo_profile'); } catch {}

    setNavEnabled(false);
    renderProfileModal({ open: false });
    showScreen('auth');
    renderAuthScreen({ loading: false, error: null });
    showToast(getI18nValue('toast.signed_out'));
    _enableSignInButton();
}

// ─── Private helpers ───────────────────────────────────

/**
 * Сценарий: обновление страницы — токен есть, данные в кэше.
 * Показываем setup.reading пока идёт silentRefresh.
 */
function _restoreSession({ accessToken, sheetId, expenses }) {
    STATE.accessToken   = accessToken;
    STATE.spreadsheetId = sheetId;
    STATE.authStatus    = 'restoring';
    _restoreProfileFromStorage();
    setNavEnabled(true);

    if (expenses.length > 0) {
        // есть кэш — показываем setup.reading пока проверяем токен
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

/**
 * Сценарий: токен истёк или отсутствует — тихий рефреш.
 */
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
    try {
        const raw = localStorage.getItem('spengo_profile');
        if (raw) { STATE.userProfile = JSON.parse(raw); updateAvatarUI(); }
    } catch {}
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