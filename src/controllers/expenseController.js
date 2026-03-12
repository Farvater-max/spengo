import { STATE } from '../../state.js';
import { STORAGE } from '../constants/storage.js';
import { CATEGORIES } from '../constants/categories.js';
import * as SheetsService from '../services/sheetsService.js';
import * as AuthService from '../services/authService.js';
import { getI18nValue, } from '../i18n/localization.js';
import { uuid, todayStr, showToast, parseAmount } from '../utils/helpers.js';
import { showScreen, setSetupText, openModal } from '../ui/navigation.js';
import { renderUI } from '../ui/renderer.jsx';

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
    if (!STATE.accessToken) {
        renderUI();
        return;
    }

    try {
        STATE.accessToken = await AuthService.waitForToken();
        const expenses = await SheetsService.loadExpenses(STATE.accessToken, STATE.spreadsheetId);
        STATE.expenses = expenses;
        localStorage.setItem(STORAGE.EXPENSES, JSON.stringify(expenses));

        if (STATE.currentScreen === 'setup' || STATE.currentScreen === 'auth') showScreen('main');
        renderUI();
    } catch (err) {
        console.warn('[SpenGo] Background refresh failed:', err);
        const isAuthError = err.message.includes('401') || err.message.includes('403');
        if (isAuthError) {
            sessionStorage.removeItem('google_access_token');
            sessionStorage.removeItem('google_token_expires_at');
            STATE.accessToken = null;
            if (STATE.expenses.length === 0) {
                showScreen('auth');
            }
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
    btn.disabled = true;
    btn.textContent = getI18nValue('btn.saving');

    _setSubmitLoading(true);
    try {
        STATE.accessToken = await AuthService.waitForToken();
        await SheetsService.appendExpense(STATE.accessToken, STATE.spreadsheetId, expense);
        STATE.expenses.push(expense);
        localStorage.setItem(STORAGE.EXPENSES, JSON.stringify(STATE.expenses));
        document.getElementById('modal-add').classList.remove('open');
        renderUI();
        showToast(getI18nValue('toast.added'), 'success');
    } catch (err) {
        showToast(getI18nValue('toast.error_prefix') + err.message, 'error');
    } finally {
        _setSubmitLoading(false);
        btn.disabled = false;
        btn.textContent = getI18nValue('btn.add');
    }
}

function _setSubmitLoading(on) {
    const overlay = document.getElementById('add-loading-overlay');
    if (overlay) overlay.classList.toggle('visible', on);
}

// ─── EDIT MODAL ──────────────────────────────────────────────────────────────

/**
 * Opens the edit modal pre-filled with the expense data.
 * @param {string} id - expense id
 */
export function openEditModal(id) {
    const expense = STATE.expenses.find(e => e.id === id);
    if (!expense) return;

    // Store snapshot and init selected category
    STATE.editSelectedCat = expense.category;

    // Fill fields
    document.getElementById('edit-expense-id').value = id;
    document.getElementById('input-edit-amount').value  = expense.amount;
    document.getElementById('input-edit-comment').value = expense.comment || '';

    // Render category grid
    _renderEditCategoryGrid(expense.category);
    document.getElementById('modal-edit-title').textContent   = getI18nValue('modal.edit.title');
    document.getElementById('label-edit-amount').textContent   = getI18nValue('label.amount');
    document.getElementById('label-edit-category').textContent = getI18nValue('label.category');
    document.getElementById('label-edit-comment').textContent  = getI18nValue('label.comment');
    document.getElementById('btn-edit-delete').textContent     = getI18nValue('btn.delete');
    document.getElementById('btn-edit-submit').textContent     = getI18nValue('btn.update');

    const commentInput = document.getElementById('input-edit-comment');
    if (commentInput) commentInput.placeholder = getI18nValue('placeholder.comment');
    document.getElementById('btn-edit-submit').disabled = true;
    _attachEditChangeListeners(expense);
    openModal('modal-edit');
}

/**
 * Saves the edited expense to Google Sheets and updates STATE.
 */
export async function updateExpense() {
    const id      = document.getElementById('edit-expense-id').value;
    const amount  = parseAmount(document.getElementById('input-edit-amount').value);
    const comment = document.getElementById('input-edit-comment').value.trim();
    const cat     = STATE.editSelectedCat;

    if (!amount || amount <= 0) { showToast(getI18nValue('toast.enter_amount'), 'error'); return; }

    const original = STATE.expenses.find(e => e.id === id);
    if (!original) return;

    const updated = { ...original, amount, comment, category: cat };

    _setEditLoading(true);
    try {
        STATE.accessToken = await AuthService.waitForToken();
        await SheetsService.editExpense(STATE.accessToken, STATE.spreadsheetId, updated);
        STATE.expenses = STATE.expenses.map(e => e.id === id ? updated : e);
        localStorage.setItem(STORAGE.EXPENSES, JSON.stringify(STATE.expenses));
        document.getElementById('modal-edit').classList.remove('open');
        renderUI();
        showToast(getI18nValue('toast.updated'), 'success');
    } catch (err) {
        showToast(getI18nValue('toast.error_prefix') + err.message, 'error');
    } finally {
        _setEditLoading(false);
    }
}

/**
 * Delete from the edit modal (with loading state).
 */
export async function deleteExpenseFromEdit() {
    const id = document.getElementById('edit-expense-id').value;
    if (!id) return;

    _setEditLoading(true);
    try {
        STATE.accessToken = await AuthService.waitForToken();
        await SheetsService.deleteExpense(STATE.accessToken, STATE.spreadsheetId, id);
        STATE.expenses = STATE.expenses.filter(e => e.id !== id);
        localStorage.setItem(STORAGE.EXPENSES, JSON.stringify(STATE.expenses));
        document.getElementById('modal-edit').classList.remove('open');
        renderUI();
        showToast(getI18nValue('toast.deleted'), 'success');
    } catch {
        showToast(getI18nValue('toast.delete_error'), 'error');
    } finally {
        _setEditLoading(false);
    }
}

function _setEditLoading(on) {
    const overlay = document.getElementById('edit-loading-overlay');
    if (overlay) overlay.classList.toggle('visible', on);
}

function _renderEditCategoryGrid(selectedCatId) {
    const grid = document.getElementById('cat-edit-grid');
    if (!grid) return;
    grid.innerHTML = '';

    CATEGORIES.forEach(cat => {
        const el = document.createElement('div');
        el.className = `cat-option${(STATE.editSelectedCat || selectedCatId) === cat.id ? ' selected' : ''}`;
        el.innerHTML = `<div class="cat-emoji">${cat.emoji}</div><div>${cat.label}</div>`;
        el.addEventListener('mousedown', e => e.preventDefault());
        el.addEventListener('click', () => {
            STATE.editSelectedCat = cat.id;
            _renderEditCategoryGrid(cat.id);
            _checkEditDirty();
        });
        grid.appendChild(el);
    });
}

function _attachEditChangeListeners(original) {
    const amountEl  = document.getElementById('input-edit-amount');
    const commentEl = document.getElementById('input-edit-comment');

    // Remove old listeners by cloning
    const newAmount  = amountEl.cloneNode(true);
    const newComment = commentEl.cloneNode(true);
    amountEl.parentNode.replaceChild(newAmount, amountEl);
    commentEl.parentNode.replaceChild(newComment, commentEl);

    newAmount.addEventListener('input',  _checkEditDirty);
    newComment.addEventListener('input', _checkEditDirty);

    // Store original snapshot for comparison
    STATE._editOriginal = { ...original };
}

function _checkEditDirty() {
    const orig    = STATE._editOriginal;
    if (!orig) return;

    const amount  = parseAmount(document.getElementById('input-edit-amount').value);
    const comment = document.getElementById('input-edit-comment').value.trim();
    const cat     = STATE.editSelectedCat;

    const dirty = amount !== orig.amount || comment !== (orig.comment || '') || cat !== orig.category;
    document.getElementById('btn-edit-submit').disabled = !dirty;
}