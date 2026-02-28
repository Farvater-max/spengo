import { STATE } from './state.js';
import * as AuthService from './src/services/authService.js';
import { loadTranslations, applyTranslations, updateCategoryLabels } from './src/i18n/localization.js';
import { onAuthReady, onSignIn, onSignOut, onSilentFail } from './src/controllers/authController.js';
import { restoreCachedExpenses } from './src/controllers/expenseController.js';
import { showAuthError } from './src/ui/navigation.js';
import { bindEvents } from './src/ui/events.js';

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('btn-google').disabled = true;

    await loadTranslations();
    updateCategoryLabels();
    applyTranslations(STATE, null);
    restoreCachedExpenses();
    bindEvents();

    await AuthService.init({
        onReady:      onAuthReady,
        onSilentFail: onSilentFail,
        onSignIn:     onSignIn,
        onSignOut:    onSignOut,
        onError:      showAuthError,
    });
});