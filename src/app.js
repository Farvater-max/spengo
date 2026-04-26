import { STATE } from '../src/state.js';
import * as AuthService from './services/authService.js';
import { loadTranslations, applyTranslations, updateCategoryLabels } from './i18n/localization.js';
import { onAuthReady, onSignIn, onSignOut, onSilentFail, enableSignInButton } from './controllers/authController.js';
import { restoreCachedExpenses } from './controllers/expenseController.js';
import { showAuthError, navigate } from './ui/navigation.js';
import { renderAuthScreen, mountStatsScreen, initReactiveBindings } from './ui/renderer.jsx';

document.addEventListener('DOMContentLoaded', async () => {
    window.addEventListener('spengo:navigate', e => navigate(e.detail.name));

    await loadTranslations();
    updateCategoryLabels();
    applyTranslations(STATE, null);
    restoreCachedExpenses();

    // ── Guest mode: detect shared access URL (?id=SPREADSHEET_ID) ──────────
    // Must run before AuthService.init so onAuthReady sees the correct flags.
    const urlParams     = new URLSearchParams(window.location.search);
    const sharedSheetId = urlParams.get('id');

    if (sharedSheetId) {
        STATE.guestSheetId = sharedSheetId;
        STATE.isGuestMode  = true;
        // Strip the param from the address bar immediately so it isn't
        // accidentally bookmarked or shared again as a secondary URL.
        window.history.replaceState({}, '', window.location.pathname);
    }
    // ───────────────────────────────────────────────────────────────────────

    renderAuthScreen({ loading: true });
    mountStatsScreen();
    initReactiveBindings();

    await AuthService.init({
        onReady:      onAuthReady,
        onSilentFail: onSilentFail,
        onSignIn:     onSignIn,
        onSignOut:    onSignOut,
        onError: (msg) => {
            showAuthError(msg);
            enableSignInButton();
        },
    });
});