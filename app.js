import { STATE } from './state.js';
import * as AuthService from './src/services/authService.js';
import { loadTranslations, applyTranslations, updateCategoryLabels } from './src/i18n/localization.js';
import { onAuthReady, onSignIn, onSignOut, onSilentFail, _enableSignInButton } from './src/controllers/authController.js';
import { restoreCachedExpenses } from './src/controllers/expenseController.js';
import { showAuthError, navigate } from './src/ui/navigation.js';
import { renderAuthScreen, renderSetupScreen, mountStatsScreen } from './src/ui/renderer.jsx';
import { bindEvents } from './src/ui/events.js';

document.addEventListener('DOMContentLoaded', async () => {
    window.addEventListener('spengo:navigate', e => navigate(e.detail.name));

    await loadTranslations();
    updateCategoryLabels();
    applyTranslations(STATE, null);
    restoreCachedExpenses();
    bindEvents();

    renderAuthScreen({ loading: true });
    mountStatsScreen();

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