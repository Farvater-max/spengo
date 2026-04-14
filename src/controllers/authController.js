import { STATE } from '../state.js';
import * as AuthService from '../services/authService.js';
import * as SheetsService from '../services/sheetsService.js';
import * as SharingService from '../services/sharingService.js';
import * as Storage from '../services/storageService.js';
import { resolveSubuserAccess } from '../controllers/sharingController.js';
import { showScreen } from '../ui/navigation.js';
import { getI18nValue } from '../i18n/localization.js';
import { showToast } from '../utils/helpers.js';
import {
    updateAvatarUI,
    renderProfileModal,
    setNavEnabled,
    renderAuthScreen,
    renderSetupScreen,
} from '../ui/renderer.jsx';

// ─── Auth lifecycle ────────────────────────────────────
export function onAuthReady() {
    if (Storage.getPendingSheetId()) {
        _toUnauthenticated();
        return;
    }

    const session = AuthService.resolveSessionType();

    switch (session.type) {
        case 'unauthenticated':
            _toUnauthenticated();
            break;
        case 'fresh':
            _restoreSession(session);
            break;
        case 'restore':
        case 'silent':
            _startSilentRestore(session);
            break;
    }
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

    const pendingSheetId = Storage.getPendingSheetId();

if (pendingSheetId) {
    await _initSubuserSession(pendingSheetId);
    } else if (!Storage.getIsOwner() && STATE.spreadsheetId) {
        await _refreshDataInBackground();
    } else {
        if (STATE.spreadsheetId) {
            await _refreshDataInBackground();
        } else {
            await _initSpreadsheet();
        }   
    }     
}       

export function onSignOut() {
    STATE.reset();
    STATE.currentPeriod         = 'day';
    STATE.currentCategoryFilter = 'all';
    STATE.selectedCat           = null;

    Storage.clearAll();
    Storage.saveIsOwner(true);

    setNavEnabled(false);
    renderProfileModal({ open: false });
    showScreen('auth');
    renderAuthScreen({ loading: false, error: null, onSignIn: AuthService.signIn });
    showToast(getI18nValue('toast.signed_out'));
    _enableSignInButton();
}

// ─── Profile modal ─────────────────────────────────────

export function openProfileModal() {
    const isOwner     = Storage.getIsOwner();
    const sharedUsers = Storage.getSharedUsers();
    const ownerEmail  = Storage.getSheetOwnerEmail();

    renderProfileModal({
        open:          true,
        profile:       STATE.userProfile,
        sharedUsers,
        ownerEmail,
        isOwner,
        spreadsheetId: STATE.spreadsheetId,
        onSignOut:     _handleSignOut,
    });
}

function _handleSignOut() {
    renderProfileModal({ open: false });
    renderAuthScreen({ loading: false, error: null, onSignIn: AuthService.signIn, resetKey: true });
    AuthService.signOut();
}

// ─── Subuser flow ──────────────────────────────────────
async function _initSubuserSession(pendingSheetId) {
    renderSetupScreen({
        title: getI18nValue('setup.finding'),
        sub:   getI18nValue('setup.checking'),
    });

    const spreadsheetId = await resolveSubuserAccess(STATE.accessToken, pendingSheetId);

    if (!spreadsheetId) {
        Storage.clearPendingSheetId();
        _toUnauthenticated();
        return;
    }

    STATE.spreadsheetId = spreadsheetId;

    try {
        await _loadAndCacheExpenses();
        await _transitionToMain();
    } catch (err) {
        console.error('[SpenGo] Subuser expense load failed:', err);
        showToast(getI18nValue('toast.sheet_error') + err.message, 'error');
        showScreen('auth');
    }
}

// ─── Owner: session init & refresh ────────────────────

async function _initSpreadsheet() {
    try {
        Storage.saveIsOwner(true);
        await _resolveAndSaveSpreadsheet();
        await _loadAndCacheExpenses();
        await _transitionToMain();
        _syncOwnershipInBackground();
    } catch (err) {
        console.error('[SpenGo] _initSpreadsheet failed:', err);
        showToast(getI18nValue('toast.sheet_error') + err.message, 'error');
        showScreen('auth');
    }
}

async function _resolveAndSaveSpreadsheet() {
    renderSetupScreen({
        title: getI18nValue('setup.finding'),
        sub:   getI18nValue('setup.checking'),
    });

    const { spreadsheetId, isNew } = await AuthService.withToken(token =>
        SheetsService.resolveSpreadsheet(token, Storage.getSheetId())
    );

    if (isNew) {
        renderSetupScreen({
            title: getI18nValue('setup.creating'),
            sub:   getI18nValue('setup.first_time'),
        });
    }

    STATE.spreadsheetId = spreadsheetId;
    Storage.saveSheetId(spreadsheetId);
}

async function _loadAndCacheExpenses() {
    renderSetupScreen({
        title: getI18nValue('setup.loading'),
        sub:   getI18nValue('setup.reading'),
    });
    const expenses = await AuthService.withToken(token =>
        SheetsService.loadRecentExpenses(token, STATE.spreadsheetId)
    );
    STATE.expenses = expenses;
    Storage.saveExpenses(expenses);
}

async function _refreshDataInBackground() {
    if (!STATE.accessToken) {
        await _transitionToMain();
        return;
    }
    try {
        await _loadAndCacheExpenses();
        await _transitionToMain();
        if (Storage.getIsOwner()) {
            _syncOwnershipInBackground();
        }
    } catch (err) {
        console.warn('[SpenGo] Background refresh failed:', err);
        const isAuthError = err.message.includes('401') || err.message.includes('403');
        if (isAuthError) {
            Storage.clearSession();
            STATE.accessToken = null;
            if (STATE.expenses.length === 0) showScreen('auth');
            else await _transitionToMain();
        } else {
            await _transitionToMain();
        }
    }
}

async function _syncOwnershipInBackground() {
    try {
        const { sharedUsers, ownerEmail } = await AuthService.withToken(token =>
            SharingService.getSharedUsers(token, STATE.spreadsheetId)
        );
        if (ownerEmail) Storage.saveSheetOwnerEmail(ownerEmail);
        Storage.saveSharedUsers(sharedUsers);
        Storage.saveIsOwner(true);
    } catch (err) {
        console.warn('[SpenGo] Background ownership sync failed:', err);
    }
}

async function _transitionToMain() {
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    showScreen('main');
}

// ─── Session restore helpers ──────────────────────────

function _restoreSession({ accessToken, sheetId, expenses }) {
    STATE.accessToken   = accessToken;
    STATE.spreadsheetId = sheetId;
    STATE.authStatus    = 'restoring';
    _restoreProfileFromStorage();
    setNavEnabled(true);

    if (expenses.length > 0) {
        STATE.expenses = expenses;
        renderSetupScreen({ title: getI18nValue('setup.loading'), sub: getI18nValue('setup.reading') });
    } else {
        renderSetupScreen({ title: getI18nValue('setup.finding'), sub: getI18nValue('setup.checking') });
    }

    showScreen('setup');
    AuthService.silentRefresh();
}

function _startSilentRestore({ sheetId, expenses }) {
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
    renderAuthScreen({ loading: false, error: null, onSignIn: AuthService.signIn });
    _enableSignInButton();
}

export function _enableSignInButton() {
    renderAuthScreen({ loading: false, onSignIn: AuthService.signIn });
}