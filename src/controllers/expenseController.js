import { STATE } from '../../state.js';
import * as SheetsService from '../services/sheetsService.js';
import * as Storage from '../services/storageService.js';
import * as AuthService from '../services/authService.js';
import { getI18nValue } from '../i18n/localization.js';
import { uuid, todayStr, showToast, sleep, parseAmount } from '../utils/helpers.js';
import { showScreen, setSetupText } from '../ui/navigation.js';
import { renderUI } from '../ui/renderer.js';

/**
 * Restores cached expenses from storage into STATE on app start.
 * Called before AuthService.init() so the UI has data immediately.
 */
export function restoreCachedExpenses() {
    if (!Storage.getSheetId()) return;
    const expenses = Storage.getExpenses();
    if (expenses.length > 0) STATE.expenses = expenses;
}

export async function initSpreadsheet() {
    try {
        await _resolveAndSaveSpreadsheet();
        await _loadAndCacheExpenses();
        showScreen('main');
        renderUI();
    } catch (err) {
        _handleInitError(err);
    }
}

async function _resolveAndSaveSpreadsheet() {
    setSetupText(getI18nValue('setup.finding'), getI18nValue('setup.checking'));

    const { spreadsheetId, isNew } = await SheetsService.resolveSpreadsheet(STATE.accessToken);
    if (isNew) setSetupText(getI18nValue('setup.creating'), getI18nValue('setup.first_time'));

    STATE.spreadsheetId = spreadsheetId;
    Storage.saveSheetId(spreadsheetId);
}

async function _loadAndCacheExpenses() {
    setSetupText(getI18nValue('setup.loading'), getI18nValue('setup.reading'));

    const expenses = await SheetsService.loadExpenses(STATE.accessToken, STATE.spreadsheetId);
    STATE.expenses = expenses;
    Storage.saveExpenses(expenses);
}

function _handleInitError(err) {
    console.error('[SpenGo] initSpreadsheet failed:', err);
    const message = getI18nValue('toast.sheet_error') + err.message;
    showToast(message, 'error');
    showScreen('auth');

    const el = document.getElementById('auth-error');
    if (el) { el.textContent = message; el.style.display = 'block'; }
}

export async function refreshDataInBackground() {
    if (!STATE.accessToken) {
        renderUI();
        return;
    }

    try {
        const expenses = await SheetsService.loadExpenses(STATE.accessToken, STATE.spreadsheetId);
        STATE.expenses = expenses;
        Storage.saveExpenses(expenses);

        if (STATE.currentScreen === 'setup' || STATE.currentScreen === 'auth') {
            showScreen('main');
        }
        renderUI();
    } catch (err) {
        console.warn('[SpenGo] Background refresh failed:', err);
        const isAuthError = err.message.includes('401') || err.message.includes('403');
        if (isAuthError) {
            Storage.clearSession();
            STATE.accessToken = null;
            // Attempt silent re-auth; onSilentFail will redirect if GIS can't help
            AuthService.silentRefresh();
        }
    }
}

export async function submitExpense() {
    const amount  = parseAmount(document.getElementById('input-amount').value);
    const comment = document.getElementById('input-comment').value.trim();

    if (!amount || amount <= 0) { showToast(getI18nValue('toast.enter_amount'), 'error'); return; }
    if (!STATE.selectedCat)     { showToast(getI18nValue('toast.select_cat'),   'error'); return; }

    const expense = {
        id:       uuid(),
        date:     todayStr(),
        category: STATE.selectedCat,
        amount,
        comment,
    };

    const btn = document.getElementById('btn-add-submit');
    btn.disabled    = true;
    btn.textContent = getI18nValue('btn.saving');

    try {
        await SheetsService.appendExpense(STATE.accessToken, STATE.spreadsheetId, expense);
        STATE.expenses.push(expense);
        Storage.saveExpenses(STATE.expenses);
        document.getElementById('modal-add').classList.remove('open');
        renderUI();
        showToast(getI18nValue('toast.added'), 'success');
    } catch (err) {
        showToast(getI18nValue('toast.error_prefix') + err.message, 'error');
    } finally {
        btn.disabled    = false;
        btn.textContent = getI18nValue('btn.add');
    }
}

export async function deleteExpense(id) {
    _animateRemoval(id);
    try {
        await SheetsService.deleteExpense(STATE.accessToken, STATE.spreadsheetId, id);
        STATE.expenses = STATE.expenses.filter(e => e.id !== id);
        Storage.saveExpenses(STATE.expenses);
        renderUI();
        showToast(getI18nValue('toast.deleted'), 'success');
    } catch {
        showToast(getI18nValue('toast.delete_error'), 'error');
    }
}

async function _animateRemoval(id) {
    const item = document.querySelector(`.expense-item[data-id="${id}"]`);
    if (!item) return;
    item.style.transition = 'all .25s ease';
    item.style.opacity    = '0';
    item.style.transform  = 'translateX(100%)';
    await sleep(250);
}