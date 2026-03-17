import { STATE } from '../../state.js';
import { STORAGE } from '../constants/storage.js';
import * as SheetsService from '../services/sheetsService.js';
import * as AuthService from '../services/authService.js';
import { getI18nValue } from '../i18n/localization.js';
import { uuid, todayStr, showToast } from '../utils/helpers.js';
import { showScreen, setSetupText } from '../ui/navigation.js';
import { renderUI, renderAddModal, renderEditModal, renderSetupScreen } from '../ui/renderer.jsx';

// ─── Init ─────────────────────────────────────────────

export function restoreCachedExpenses() {
    const savedSheetId = localStorage.getItem(STORAGE.SHEET_ID);
    if (!savedSheetId) return;
    const cached = localStorage.getItem(STORAGE.EXPENSES);
    if (cached) STATE.expenses = JSON.parse(cached);
}

/**
 * Первый вход — создаём таблицу, грузим данные.
 * Тексты: setup.creating → setup.first_time → setup.loading → setup.reading → main
 */
export async function initSpreadsheet() {
    try {
        await _resolveAndSaveSpreadsheet();
        await _loadAndCacheExpenses();
        await _transitionToMain();
    } catch (err) {
        _handleInitError(err);
    }
}

async function _resolveAndSaveSpreadsheet() {
    renderSetupScreen({
        title: getI18nValue('setup.finding'),
        sub:   getI18nValue('setup.checking'),
    });
    const { spreadsheetId, isNew } = await SheetsService.resolveSpreadsheet(STATE.accessToken);

    if (isNew) {
        renderSetupScreen({
            title: getI18nValue('setup.creating'),
            sub:   getI18nValue('setup.first_time'),
        });
    }

    STATE.spreadsheetId = spreadsheetId;
    localStorage.setItem(STORAGE.SHEET_ID, spreadsheetId);
}

async function _loadAndCacheExpenses() {
    renderSetupScreen({
        title: getI18nValue('setup.loading'),
        sub:   getI18nValue('setup.reading'),
    });
    STATE.expenses = await SheetsService.loadExpenses(STATE.accessToken, STATE.spreadsheetId);
    localStorage.setItem(STORAGE.EXPENSES, JSON.stringify(STATE.expenses));
}

/**
 * Рендерим main в фоне пока setup ещё виден,
 * ждём один paint кадр, затем переключаем — нет чёрного экрана.
 */
async function _transitionToMain() {
    renderUI();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    showScreen('main');
}

function _handleInitError(err) {
    console.error('[SpenGo] initSpreadsheet failed:', err);
    const message = getI18nValue('toast.sheet_error') + err.message;
    showToast(message, 'error');
    showScreen('auth');
}

/**
 * Повторный вход / обновление страницы — грузим свежие данные.
 * Setup экран уже показан в authController.
 */
export async function refreshDataInBackground() {
    if (!STATE.accessToken) {
        await _transitionToMain();
        return;
    }
    try {
        STATE.accessToken = await AuthService.waitForToken();

        renderSetupScreen({
            title: getI18nValue('setup.loading'),
            sub:   getI18nValue('setup.reading'),
        });

        const expenses = await SheetsService.loadExpenses(STATE.accessToken, STATE.spreadsheetId);
        STATE.expenses = expenses;
        localStorage.setItem(STORAGE.EXPENSES, JSON.stringify(expenses));

        await _transitionToMain();
    } catch (err) {
        console.warn('[SpenGo] Background refresh failed:', err);
        const isAuthError = err.message.includes('401') || err.message.includes('403');
        if (isAuthError) {
            sessionStorage.removeItem('google_access_token');
            sessionStorage.removeItem('google_token_expires_at');
            STATE.accessToken = null;
            if (STATE.expenses.length === 0) showScreen('auth');
            else await _transitionToMain();
        } else {
            // ошибка сети — показываем кэш
            await _transitionToMain();
        }
    }
}

// ─── Add modal ────────────────────────────────────────

export function openAddModal() {
    STATE.selectedCat = 'food';
    _renderAdd({ loading: false });
}

function _renderAdd({ loading }) {
    renderAddModal({
        open: true,
        loading,
        onSubmit: submitExpense,
        onClose:  _closeAdd,
    });
}

function _closeAdd() {
    renderAddModal({ open: false });
}

export async function submitExpense({ amount, category, comment }) {
    STATE.selectedCat = category;

    const expense = {
        id:       uuid(),
        date:     todayStr(),
        category,
        amount,
        comment,
    };

    _renderAdd({ loading: true });
    try {
        STATE.accessToken = await AuthService.waitForToken();
        await SheetsService.appendExpense(STATE.accessToken, STATE.spreadsheetId, expense);
        STATE.expenses.push(expense);
        localStorage.setItem(STORAGE.EXPENSES, JSON.stringify(STATE.expenses));
        _closeAdd();
        renderUI();
        showToast(getI18nValue('toast.added'), 'success');
    } catch (err) {
        showToast(getI18nValue('toast.error_prefix') + err.message, 'error');
        _renderAdd({ loading: false });
    }
}

// ─── Edit modal ───────────────────────────────────────

export function openEditModal(id) {
    const expense = STATE.expenses.find(e => e.id === id);
    if (!expense) return;
    _renderEdit({ expense, loading: false });
}

function _renderEdit({ expense, loading }) {
    renderEditModal({
        expense,
        loading,
        onUpdate: updateExpense,
        onDelete: deleteExpense,
        onClose:  _closeEdit,
    });
}

function _closeEdit() {
    renderEditModal({ expense: null });
}

export async function updateExpense(id, amount, category, comment) {
    const original = STATE.expenses.find(e => e.id === id);
    if (!original) return;

    const updated = { ...original, amount, category, comment };

    _renderEdit({ expense: updated, loading: true });
    try {
        STATE.accessToken = await AuthService.waitForToken();
        await SheetsService.editExpense(STATE.accessToken, STATE.spreadsheetId, updated);
        STATE.expenses = STATE.expenses.map(e => e.id === id ? updated : e);
        localStorage.setItem(STORAGE.EXPENSES, JSON.stringify(STATE.expenses));
        _closeEdit();
        renderUI();
        showToast(getI18nValue('toast.updated'), 'success');
    } catch (err) {
        showToast(getI18nValue('toast.error_prefix') + err.message, 'error');
        _renderEdit({ expense: updated, loading: false });
    }
}

export async function deleteExpense(id) {
    const expense = STATE.expenses.find(e => e.id === id);
    if (!expense) return;

    _renderEdit({ expense, loading: true });
    try {
        STATE.accessToken = await AuthService.waitForToken();
        await SheetsService.deleteExpense(STATE.accessToken, STATE.spreadsheetId, id);
        STATE.expenses = STATE.expenses.filter(e => e.id !== id);
        localStorage.setItem(STORAGE.EXPENSES, JSON.stringify(STATE.expenses));
        _closeEdit();
        renderUI();
        showToast(getI18nValue('toast.deleted'), 'success');
    } catch {
        showToast(getI18nValue('toast.delete_error'), 'error');
        _renderEdit({ expense, loading: false });
    }
}