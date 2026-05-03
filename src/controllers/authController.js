import { STATE } from '../state.js';
import * as AuthService from '../services/authService.js';
import * as SheetsService from '../services/sheetsService.js';
import * as SharingService from '../services/sharingService.js';
import * as Storage from '../services/storageService.js';
import { showScreen } from '../ui/navigation.js';
import { getI18nValue } from '../i18n/localization.js';
import { showToast, isPermissionError, isAuthError, isSheetOwner } from '../utils/helpers.js';
import {
    updateAvatarUI,
    renderProfileModal,
    setNavEnabled,
    renderAuthScreen,
    renderSetupScreen,
    renderAvatarOnboardingPopover,
} from '../ui/renderer.jsx';

// ─── Auth lifecycle ────────────────────────────────────

/**
 * Entry point called once the GIS SDK is ready.
 *
 * Guest mode (access URL with ?id=):
 *   The URL param is read in app.js and stored in STATE.guestSheetId before
 *   this function runs. If guest mode is active we always require a fresh
 *   interactive sign-in — we cannot silently reuse the owner's cached token
 *   because it belongs to a different session context.
 *
 *   On subsequent page loads (after the URL param has been stripped) we fall
 *   back to Storage.getGuestSheetId() so the user stays in guest mode across
 *   refreshes without needing the URL again.
 *
 * Owner mode session types (unchanged):
 *   'fresh'           — valid token + sheetId → restore in-memory, background refresh
 *   'restore'         — token expired, cached expenses available → show UI immediately, silent refresh
 *   'silent'          — token expired, no cache → show spinner, silent refresh
 *   'unauthenticated' — no sheetId at all → show sign-in screen
 */
export function onAuthReady() {
    // ── Guest mode: URL param already parsed into STATE by app.js ──────────
    if (STATE.isGuestMode && STATE.guestSheetId) {
        _showAuthScreen({ isGuestMode: true });
        return;
    }

    // ── Guest mode: returning visitor (F5 after URL param was stripped) ────
    const savedGuestSheetId = Storage.getGuestSheetId();
    if (savedGuestSheetId) {
        STATE.guestSheetId = savedGuestSheetId;
        STATE.isGuestMode  = true;

        // If a valid token is still alive in sessionStorage — restore immediately,
        // same as owner 'fresh' path. Otherwise attempt a silent refresh so the
        // guest doesn't have to tap "Sign in" again on every F5.
        const { accessToken, tokenExpired } = Storage.getStoredSession();
        const cachedExpenses = Storage.getExpenses();

        if (accessToken && !tokenExpired) {
            STATE.accessToken = accessToken;
            _restoreProfileFromStorage();
            setNavEnabled(false);
            showScreen('setup');
            _showLoadingSetup();
            if (cachedExpenses.length > 0) {
                STATE.expenses = cachedExpenses;
                setNavEnabled(true);
            }
            AuthService.silentRefresh();
        } else {
            _startSilentRestore({ expenses: cachedExpenses });
        }
        return;
    }

    // ── Owner mode ─────────────────────────────────────────────────────────
    const session = AuthService.resolveSessionType();

    switch (session.type) {
        case 'unauthenticated':
            _showAuthScreen();
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

    // In guest mode a silent-refresh failure just means the user needs to
    // sign in interactively again — keep guest context alive.
    if (STATE.isGuestMode) {
        _showAuthScreen({ isGuestMode: true });
    } else {
        _showAuthScreen();
    }
}

export async function onSignIn({ accessToken }) {
    STATE.accessToken = accessToken;
    STATE.authStatus  = 'ready';

    // Load profile first — it's needed for both owner and guest paths.
    const profile = await AuthService.getUserProfile(accessToken);
    if (profile) {
        STATE.userProfile = profile;
        Storage.saveLoginHint(profile.email);
        Storage.saveProfile(profile);
        updateAvatarUI();
    }

    // ── Guest mode ─────────────────────────────────────────────────────────
    if (STATE.isGuestMode && STATE.guestSheetId) {
        await _initGuestSession();
        return;
    }

    // ── Owner mode ─────────────────────────────────────────────────────────
    setNavEnabled(true);
    showScreen('setup');
    renderSetupScreen({
        title: getI18nValue('setup.finding'),
        sub:   getI18nValue('setup.checking'),
    });

    if (STATE.spreadsheetId) {
        await _refreshDataInBackground();
    } else {
        await _initSpreadsheet();
    }
}

export function onSignOut() {
    // Fully exit guest mode so the next load starts as owner.
    Storage.clearGuestSheetId();

    STATE.reset();
    STATE.currentPeriod         = 'week';
    STATE.currentCategoryFilter = 'all';
    STATE.selectedCat           = null;

    Storage.clearAll();

    setNavEnabled(false);
    renderProfileModal({ open: false });
    showScreen('auth');
    renderAuthScreen({ loading: false, error: null, onSignIn: AuthService.signIn });
    showToast(getI18nValue('toast.signed_out'));
    enableSignInButton();
}

// ─── Profile modal ────────────────────────────────────
//
// Ownership logic lives here, not in the renderer.
// renderer receives ready-made values and just renders them.

export function openProfileModal() {
    const ownerEmail  = Storage.getSheetOwnerEmail();
    const myEmail     = STATE.userProfile?.email ?? null;
    const sharedUsers = Storage.getSharedUsers();

    renderProfileModal({
        open:          true,
        profile:       STATE.userProfile,
        sharedUsers,
        ownerEmail,
        isOwner:       isSheetOwner(STATE, ownerEmail, myEmail),
        spreadsheetId: STATE.spreadsheetId,
        onSignOut:     _handleSignOut,
    });
}

// Separated so renderer can call close then trigger sign-out
// without knowing about AuthService.
function _handleSignOut() {
    renderProfileModal({ open: false });
    renderAuthScreen({ loading: false, error: null, onSignIn: AuthService.signIn, resetKey: true });
    AuthService.signOut();
}

// ─── Guest session ────────────────────────────────────

/**
 * Verifies that the signed-in user can access the shared spreadsheet,
 * then loads its data and transitions to the main screen.
 *
 * Error cases:
 *  - 403 / sheet not found → show a clear "no access" error on the auth screen.
 *  - Any other network error → show a generic error and let the user retry.
 */
async function _initGuestSession() {
    showScreen('setup');
    renderSetupScreen({
        title: getI18nValue('setup.verifying_access'),
        sub:   getI18nValue('setup.checking_permissions'),
    });

    try {
        const hasAccess = await AuthService.withToken(token =>
            SheetsService.verifyGuestAccess(token, STATE.guestSheetId)
        );

        if (!hasAccess) {
            _showAuthScreen({ error: getI18nValue('guest.no_access'), isGuestMode: true });
            return;
        }

        // Access confirmed — use the guest sheet as the active spreadsheet.
        STATE.spreadsheetId = STATE.guestSheetId;
        Storage.saveGuestSheetId(STATE.guestSheetId); // persist for F5

        // Load expenses from the shared sheet.
        _showLoadingSetup();
        const expenses = await AuthService.withToken(token =>
            SheetsService.loadRecentExpenses(token, STATE.spreadsheetId)
        );
        STATE.expenses = expenses;
        Storage.saveExpenses(expenses);

        setNavEnabled(true);
        await _transitionToMain();

    } catch (err) {
        console.error('[SpenGo] _initGuestSession failed:', err);

        _showAuthScreen({
            error:       isPermissionError(err)
                             ? getI18nValue('guest.access_denied')
                             : getI18nValue('guest.generic_error'),
            isGuestMode: true,
        });
    }
}

/**
 * Transitions to the auth screen.
 *
 * @param {{ error?: string|null, isGuestMode?: boolean }} [opts]
 */
function _showAuthScreen({ error = null, isGuestMode = false } = {}) {
    STATE.authStatus = 'unauthenticated';
    setNavEnabled(false);
    showScreen('auth');
    renderAuthScreen({ loading: false, error, onSignIn: AuthService.signIn, isGuestMode });
    enableSignInButton();
}

function _showLoadingSetup() {
    renderSetupScreen({
        title: getI18nValue('setup.loading'),
        sub:   getI18nValue('setup.reading'),
    });
}

// ─── Owner session init & refresh ─────────────────────

async function _initSpreadsheet() {
    try {
        const isNew = await _resolveAndSaveSpreadsheet();
        await _loadAndCacheExpenses();
        await _transitionToMain();
        _syncOwnershipInBackground();
        if (isNew) _showAvatarOnboarding();
    } catch (err) {
        console.error('[SpenGo] _initSpreadsheet failed:', err);
        showToast(getI18nValue('toast.sheet_error') + err.message, 'error');
        showScreen('auth');
    }
}

/**
 * Shows the one-time onboarding popover anchored to the avatar icon.
 * Called only when a brand-new spreadsheet was just created.
 * No-ops gracefully if the avatar element isn't in the DOM yet.
 */
function _showAvatarOnboarding() {
    const avatarEl = document.querySelector('.header-avatar');
    if (!avatarEl) return;
    renderAvatarOnboardingPopover({
        open:       true,
        anchorRect: avatarEl.getBoundingClientRect(),
    });
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
    return isNew;
}

async function _loadAndCacheExpenses() {
    _showLoadingSetup();
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
        _syncOwnershipInBackground();
    } catch (err) {
        console.warn('[SpenGo] Background refresh failed:', err);
        if (isAuthError(err)) {
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
    // Sharing metadata only makes sense for the owner.
    if (STATE.isGuestMode) return;

    try {
        const { sharedUsers, ownerEmail } = await AuthService.withToken(token =>
            SharingService.getSharedUsers(token, STATE.spreadsheetId)
        );
        if (ownerEmail) Storage.saveSheetOwnerEmail(ownerEmail);
        Storage.saveSharedUsers(sharedUsers);
    } catch (err) {
        console.warn('[SpenGo] Background ownership sync failed:', err);
    }
}

async function _transitionToMain() {
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    showScreen('main');
}

// ─── Session restore helpers ──────────────────────────

/**
 * Restores a session that has a valid token — no network round-trip needed.
 * Kicks off a background data refresh via the existing sign-in path.
 *
 * @param {{ accessToken: string, sheetId: string, expenses: Array }} session
 */
function _restoreSession({ accessToken, sheetId, expenses }) {
    STATE.accessToken   = accessToken;
    STATE.spreadsheetId = sheetId;
    STATE.authStatus    = 'restoring';
    _restoreProfileFromStorage();
    setNavEnabled(true);

    if (expenses.length > 0) {
        STATE.expenses = expenses;
        _showLoadingSetup();
    } else {
        renderSetupScreen({ title: getI18nValue('setup.finding'), sub: getI18nValue('setup.checking') });
    }

    showScreen('setup');
    AuthService.silentRefresh();
}

/**
 * Starts a silent token refresh when the token is expired or absent.
 * Shows cached expenses immediately if available, or just a spinner if not.
 * Works for both owner (pass sheetId) and guest (omit sheetId) paths.
 *
 * @param {{ sheetId?: string|null, expenses: Array }} opts
 */
function _startSilentRestore({ sheetId = null, expenses } = {}) {
    if (sheetId) STATE.spreadsheetId = sheetId;
    STATE.authStatus = 'restoring';
    _restoreProfileFromStorage();

    showScreen('setup');
    _showLoadingSetup();

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

export function enableSignInButton() {
    renderAuthScreen({ loading: false, onSignIn: AuthService.signIn });
}