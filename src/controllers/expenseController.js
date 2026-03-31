import { STATE } from '../state.js';
import * as SheetsService from '../services/sheetsService.js';
import * as SharingService from '../services/sharingService.js';
import * as AuthService from '../services/authService.js';
import * as Storage from '../services/storageService.js';
import { getI18nValue } from '../i18n/localization.js';
import { uuid, todayStr, showToast } from '../utils/helpers.js';
import { showScreen } from '../ui/navigation.js';
import { renderAddModal, renderEditModal, renderSetupScreen } from '../ui/renderer.jsx';

// ─── Helpers ──────────────────────────────────────────

async function _withToken(fn) {
    STATE.accessToken = await AuthService.waitForToken();
    return fn(STATE.accessToken);
}

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

// ─── Init ─────────────────────────────────────────────

export function restoreCachedExpenses() {
    if (!Storage.getSheetId()) return;
    const cached = Storage.getExpenses();
    if (cached.length > 0) STATE.expenses = cached;
}

export async function initSpreadsheet() {
    try {
        await _resolveAndSaveSpreadsheet();
        await _loadAndCacheExpenses();
        await _transitionToMain();
        // Fire-and-forget: determine owner vs guest without blocking the UI.
        // ProfileModal reads ownerEmail from Storage — once this resolves
        // the next time the user opens ProfileModal it shows the correct state.
        _syncOwnershipInBackground();
    } catch (err) {
        _handleInitError(err);
    }
}

async function _resolveAndSaveSpreadsheet() {
    renderSetupScreen({
        title: getI18nValue('setup.finding'),
        sub:   getI18nValue('setup.checking'),
    });

    const { spreadsheetId, isNew } = await SheetsService.resolveSpreadsheet(
        STATE.accessToken,
        Storage.getSheetId(),
    );

    if (isNew) {
        renderSetupScreen({
            title: getI18nValue('setup.creating'),
            sub:   getI18nValue('setup.first_time'),
        });
    }

    STATE.spreadsheetId = spreadsheetId;
    Storage.saveSheetId(spreadsheetId);
}

async function _loadAndCacheExpenses() {
    renderSetupScreen({
        title: getI18nValue('setup.loading'),
        sub:   getI18nValue('setup.reading'),
    });
    const expenses = await SheetsService.loadExpenses(STATE.accessToken, STATE.spreadsheetId);
    _saveExpenses(expenses);
}

async function _transitionToMain() {
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    showScreen('main');
}

function _handleInitError(err) {
    console.error('[SpenGo] initSpreadsheet failed:', err);
    showToast(getI18nValue('toast.sheet_error') + err.message, 'error');
    showScreen('auth');
}

/**
 * Fetches the permissions list for the current spreadsheet in the background
 * and caches the owner email + shared users list into localStorage.
 *
 * This runs after _transitionToMain() so it never delays the UI.
 * ProfileModal reads ownerEmail from Storage to decide isOwner — after this
 * resolves, the next modal open will show the correct owner/guest state.
 *
 * Errors are swallowed — a failed permissions fetch should never crash the app.
 */
async function _syncOwnershipInBackground() {
    try {
        const token = await AuthService.waitForToken();
        const { sharedUsers, ownerEmail } = await SharingService.getSharedUsers(
            token,
            STATE.spreadsheetId,
        );
        if (ownerEmail) 
        Storage.saveSheetOwnerEmail(ownerEmail);
        Storage.saveSharedUsers(sharedUsers);
    } catch (err) {
        console.warn('[SpenGo] Background ownership sync failed:', err);
    }
}

export async function refreshDataInBackground() {
    if (!STATE.accessToken) {
        await _transitionToMain();
        return;
    }
    try {
        await _withToken(() => _loadAndCacheExpenses());
        await _transitionToMain();
        _syncOwnershipInBackground();
    } catch (err) {
        console.warn('[SpenGo] Background refresh failed:', err);
        const isAuthError = err.message.includes('401') || err.message.includes('403');
        if (isAuthError) {
            Storage.clearSession();
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

export async function submitExpense({ amount, category, comment, date }) {
    STATE.selectedCat = category;
    const expense = {
        id: uuid(),
        date: _safeDate(date),  // ← server-side guard: future dates silently clamped to today
        category,
        amount,
        comment,
    };
    try {
        await _withToken(token =>
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
        date: _safeDate(date ?? original.date),  // ← server-side guard
    };
    try {
        await _withToken(token =>
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
        await _withToken(token =>
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