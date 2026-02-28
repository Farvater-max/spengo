import { STATE } from '../../state.js';
import { STORAGE } from '../constants/storage.js';
import * as AuthService   from '../services/authService.js';
import * as SheetsService from '../services/sheetsService.js';
import { getI18nValue, } from '../i18n/localization.js';
import { uuid, todayStr, showToast, sleep } from '../utils/helpers.js';
import { showScreen, setSetupText } from '../ui/navigation.js';
import { renderUI } from '../ui/renderer.js';

/**
 * Restore expenses from localStorage without request.
 */
export function restoreCachedExpenses() {
    const savedSheetId = localStorage.getItem(STORAGE.SHEET_ID);
    if (!savedSheetId) return;

    const cached = localStorage.getItem(STORAGE.EXPENSES);
    if (cached) STATE.expenses = JSON.parse(cached);
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
    localStorage.setItem(STORAGE.SHEET_ID, spreadsheetId);
}

async function _loadAndCacheExpenses() {
    setSetupText(getI18nValue('setup.loading'), getI18nValue('setup.reading'));

    STATE.expenses = await SheetsService.loadExpenses(STATE.accessToken, STATE.spreadsheetId);
    localStorage.setItem(STORAGE.EXPENSES, JSON.stringify(STATE.expenses));
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
    try {
        const expenses = await SheetsService.loadExpenses(STATE.accessToken, STATE.spreadsheetId);
        STATE.expenses = expenses;
        localStorage.setItem(STORAGE.EXPENSES, JSON.stringify(expenses));

        if (STATE.currentScreen === 'setup') showScreen('main');
        renderUI();
    } catch (err) {
        console.error('[SpenGo] Background refresh failed:', err);
        const isAuthError = err.message.includes('401') || err.message.includes('auth');
        if (isAuthError) {
            showToast(getI18nValue('toast.auth_error') + err.message, 'error');
            showScreen('auth');
        }
    }
}

export async function submitExpense() {
    const amount  = parseFloat(document.getElementById('input-amount').value);
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
    btn.disabled = true;
    btn.textContent = getI18nValue('btn.saving');

    try {
        await SheetsService.appendExpense(STATE.accessToken, STATE.spreadsheetId, expense);
        STATE.expenses.push(expense);
        localStorage.setItem(STORAGE.EXPENSES, JSON.stringify(STATE.expenses));
        document.getElementById('modal-add').classList.remove('open');
        renderUI();
        showToast(getI18nValue('toast.added'), 'success');
    } catch (err) {
        showToast(getI18nValue('toast.error_prefix') + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = getI18nValue('btn.add');
    }
}

export async function deleteExpense(id) {
    await _animateRemoval(id);

    STATE.expenses = STATE.expenses.filter(e => e.id !== id);
    localStorage.setItem(STORAGE.EXPENSES, JSON.stringify(STATE.expenses));
    renderUI();

    try {
        await SheetsService.deleteExpense(STATE.accessToken, STATE.spreadsheetId, id);
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