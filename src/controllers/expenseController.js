import { STATE } from '../state.js';
import * as SheetsService from '../services/sheetsService.js';
import { withToken } from '../services/authService.js';
import * as Storage from '../services/storageService.js';
import { getI18nValue } from '../i18n/localization.js';
import { uuid, todayStr, showToast } from '../utils/helpers.js';
import { renderAddModal, renderEditModal } from '../ui/renderer.jsx';

// ─── Helpers ──────────────────────────────────────────

function _saveExpenses(expenses) {
    STATE.expenses = expenses;
    Storage.saveExpenses(expenses);
}

/**
 * Guards against a date string being in the future.
 * Returns today's date string if the provided date is invalid or future.
 * @param {string} date - YYYY-MM-DD
 * @returns {string} - safe YYYY-MM-DD
 */
function _safeDate(date) {
    const today = todayStr();
    if (!date || date > today) return today;
    return date;
}

// ─── Cache restore (called on app start before auth) ──

export function restoreCachedExpenses() {
    if (!Storage.getSheetId()) return;
    const cached = Storage.getExpenses();
    if (cached.length > 0) STATE.expenses = cached;
}

// ─── Add modal ────────────────────────────────────────

export function openAddModal() {
    STATE.selectedCat = 'food';
    renderAddModal({
        open:     true,
        onSubmit: submitExpense,
        onClose:  () => renderAddModal({ open: false }),
    });
}

export async function submitExpense({ amount, category, comment, date }) {
    STATE.selectedCat = category;
    const expense = {
        id: uuid(),
        date: _safeDate(date),
        category,
        amount,
        comment,
    };
    try {
        await withToken(token =>
            SheetsService.appendExpense(token, STATE.spreadsheetId, expense)
        );
        _saveExpenses([...STATE.expenses, expense]);
        renderAddModal({ open: false });
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

export async function updateExpense(id, amount, category, comment, date) {
    const original = STATE.expenses.find(e => e.id === id);
    if (!original) return;
    const updated = {
        ...original,
        amount,
        category,
        comment,
        date: _safeDate(date ?? original.date),
    };
    try {
        await withToken(token =>
            SheetsService.editExpense(token, STATE.spreadsheetId, updated)
        );
        _saveExpenses(STATE.expenses.map(e => e.id === id ? updated : e));
        renderEditModal({ expense: null });
        showToast(getI18nValue('toast.updated'), 'success');
    } catch (err) {
        showToast(getI18nValue('toast.error_prefix') + err.message, 'error');
        throw err;
    }
}

export async function deleteExpense(id) {
    try {
        await withToken(token =>
            SheetsService.deleteExpense(token, STATE.spreadsheetId, id)
        );
        _saveExpenses(STATE.expenses.filter(e => e.id !== id));
        renderEditModal({ expense: null });
        showToast(getI18nValue('toast.deleted'), 'success');
    } catch {
        showToast(getI18nValue('toast.delete_error'), 'error');
        throw new Error('delete failed');
    }
}