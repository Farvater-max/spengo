import { STATE } from '../src/state.js';
import * as AuthService from './services/authService.js';
import * as Storage from './services/storageService.js';
import { loadTranslations, applyTranslations, updateCategoryLabels } from './i18n/localization.js';
import { onAuthReady, onSignIn, onSignOut, onSilentFail, _enableSignInButton } from './controllers/authController.js';
import { restoreCachedExpenses } from './controllers/expenseController.js';
import { showAuthError, navigate } from './ui/navigation.js';
import { renderAuthScreen, mountStatsScreen, initReactiveBindings } from './ui/renderer.jsx';

/**
 * Parses the share link param from the current URL.
 *
 * Supported formats:
 *   https://webspengo.xyz/?sheets=<id>
 *   https://webspengo.xyz/#sheets=<id>   (fallback for hash-based routers)
 *
 * If found, persists the ID so the post-auth flow can trigger the Picker consent.
 * The param is intentionally NOT removed from the URL here — we keep it visible
 * until auth completes, then clean up.
 */
function _parsePendingShareParam() {
    // 1. Check query string: ?sheets=<id>
    const searchParams = new URLSearchParams(window.location.search);
    const fromSearch   = searchParams.get('sheets');
    if (fromSearch) {
        Storage.savePendingSheetId(fromSearch.trim());
        return;
    }

    // 2. Check hash: #sheets=<id>  (e.g. after OAuth redirect on some hosts)
    const hash = window.location.hash.slice(1); // strip leading '#'
    const hashParams = new URLSearchParams(hash);
    const fromHash   = hashParams.get('sheets');
    if (fromHash) {
        Storage.savePendingSheetId(fromHash.trim());
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    window.addEventListener('spengo:navigate', e => navigate(e.detail.name));

    // Must run before auth so that the pending ID is available to authController
    _parsePendingShareParam();

    await loadTranslations();
    updateCategoryLabels();
    applyTranslations(STATE, null);
    restoreCachedExpenses();

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
            _enableSignInButton();
        },
    });
});