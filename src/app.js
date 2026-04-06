import { STATE } from '../src/state.js';
import * as AuthService from './services/authService.js';
import { loadTranslations, applyTranslations, updateCategoryLabels } from './i18n/localization.js';
import { onAuthReady, onSignIn, onSignOut, onSilentFail, _enableSignInButton } from './controllers/authController.js';
import { restoreCachedExpenses } from './controllers/expenseController.js';
import { showAuthError, navigate } from './ui/navigation.js';
import { renderAuthScreen, mountStatsScreen, initReactiveBindings } from './ui/renderer.jsx';

document.addEventListener('DOMContentLoaded', async () => {
    window.addEventListener('spengo:navigate', e => navigate(e.detail.name));

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