import { CONFIG } from '../constants/config.js';
import { STORAGE } from '../constants/storage.js';
import {
    verifySpreadsheet,
    findExistingSpreadsheet,
    createSpreadsheet,
    fetchExpenses,
    insertExpense,
    removeExpenseRow,
} from '../helpers/sheetsHelpers.js';

/**
 * Ensures a valid spreadsheet exists.
 * Verifies the cached ID, or creates a fresh one if absent/inaccessible.
 * Persists the resolved ID to localStorage.
 *
 * @param {string} accessToken
 * @returns {Promise<{ spreadsheetId: string, isNew: boolean }>}
 */
export async function resolveSpreadsheet(accessToken) {
    let spreadsheetId = localStorage.getItem(STORAGE.SHEET_ID);

    if (spreadsheetId) {
        const ok = await verifySpreadsheet(accessToken, spreadsheetId);
        if (ok) return { spreadsheetId, isNew: false };

        spreadsheetId = null;
        localStorage.removeItem(STORAGE.SHEET_ID);
    }
    spreadsheetId = await findExistingSpreadsheet(accessToken, CONFIG.SPREADSHEET_TITLE);

    if (spreadsheetId) {
        localStorage.setItem(STORAGE.SHEET_ID, spreadsheetId);
        return { spreadsheetId, isNew: false };
    }

    spreadsheetId = await createSpreadsheet(accessToken, {
        title:     CONFIG.SPREADSHEET_TITLE,
        sheetName: CONFIG.SHEET_NAME,
    });
    localStorage.setItem(STORAGE.SHEET_ID, spreadsheetId);
    return { spreadsheetId, isNew: true };
}

/**
 * Loads all expenses from the sheet and caches them in localStorage.
 *
 * @param {string} accessToken
 * @param {string} spreadsheetId
 * @returns {Promise<Array>}
 */
export async function loadExpenses(accessToken, spreadsheetId) {
    const expenses = await fetchExpenses(accessToken, spreadsheetId, CONFIG.SHEET_NAME);
    localStorage.setItem(STORAGE.EXPENSES, JSON.stringify(expenses));
    return expenses;
}

/**
 * Appends one expense to the sheet.
 *
 * @param {string} accessToken
 * @param {string} spreadsheetId
 * @param {{ id, date, category, amount, comment }} expense
 * @returns {Promise<void>}
 */
export async function appendExpense(accessToken, spreadsheetId, expense) {
    await insertExpense(accessToken, spreadsheetId, CONFIG.SHEET_NAME, expense);
}

/**
 * Removes the row matching the given expense ID from the sheet.
 *
 * @param {string} accessToken
 * @param {string} spreadsheetId
 * @param {string} expenseId
 * @returns {Promise<void>}
 */
export async function deleteExpense(accessToken, spreadsheetId, expenseId) {
    await removeExpenseRow(accessToken, spreadsheetId, CONFIG.SHEET_NAME, expenseId);
}