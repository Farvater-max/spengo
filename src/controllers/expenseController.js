import { STATE } from '../../state.js';
import { STORAGE } from '../constants/storage.js';
import * as SheetsService from '../services/sheetsService.js';
import * as AuthService from '../services/authService.js';
import { getI18nValue } from '../i18n/localization.js';
import { uuid, todayStr, showToast } from '../utils/helpers.js';
import { showScreen } from '../ui/navigation.js';
import { renderUI, renderAddModal, renderEditModal, renderSetupScreen } from '../ui/renderer.jsx';

// ─── Helpers ──────────────────────────────────────────

async function _withToken(fn) {
    STATE.accessToken = await AuthService.waitForToken();
    return fn(STATE.accessToken);
}

function _saveExpenses(expenses) {
    STATE.expenses = expenses;
    localStorage.setItem(STORAGE.EXPENSES, JSON.stringify(expenses));
}

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
    const expenses = await SheetsService.loadExpenses(STATE.accessToken, STATE.spreadsheetId);
    _saveExpenses(expenses);
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
    showToast(getI18nValue('toast.sheet_error') + err.message, 'error');
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
        await _withToken(() => _loadAndCacheExpenses());
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
            await _transitionToMain();
        }
    }
}

// ─── Add modal ────────────────────────────────────────

export function openAddModal() {
    STATE.selectedCat = 'food';
    renderAddModal({
        open: true,
        onSubmit: submitExpense,
        onClose: () => renderAddModal({ open: false }),
    });
}

export async function submitExpense({ amount, category, comment }) {
    STATE.selectedCat = category;
    const expense = { id: uuid(), date: todayStr(), category, amount, comment };
    try {
        await _withToken(token =>
            SheetsService.appendExpense(token, STATE.spreadsheetId, expense)
        );
        _saveExpenses([...STATE.expenses, expense]);
        renderAddModal({ open: false });
        renderUI();
        showToast(getI18nValue('toast.added'), 'success');
    } catch (err) {
        showToast(getI18nValue('toast.error_prefix') + err.message, 'error');
        throw err;
    }
}

// ─── Edit modal ───────────────────────────────────────

export function openEditModal(id) {
    const expense = STATE.expenses.find(e => e.id === id);
    if (!expense) return;
    renderEditModal({
        expense,
        onUpdate: updateExpense,
        onDelete: deleteExpense,
        onClose:  () => renderEditModal({ expense: null }),
    });
}

export async function updateExpense(id, amount, category, comment) {
    const original = STATE.expenses.find(e => e.id === id);
    if (!original) return;
    const updated = { ...original, amount, category, comment };
    try {
        await _withToken(token =>
            SheetsService.editExpense(token, STATE.spreadsheetId, updated)
        );
        _saveExpenses(STATE.expenses.map(e => e.id === id ? updated : e));
        renderEditModal({ expense: null });
        renderUI();
        showToast(getI18nValue('toast.updated'), 'success');
    } catch (err) {
        showToast(getI18nValue('toast.error_prefix') + err.message, 'error');
        throw err;
    }
}

export async function deleteExpense(id) {
    try {
        await _withToken(token =>
            SheetsService.deleteExpense(token, STATE.spreadsheetId, id)
        );
        _saveExpenses(STATE.expenses.filter(e => e.id !== id));
        renderEditModal({ expense: null });
        renderUI();
        showToast(getI18nValue('toast.deleted'), 'success');
    } catch {
        showToast(getI18nValue('toast.delete_error'), 'error');
        throw new Error('delete failed');
    }
}