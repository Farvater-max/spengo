import { CONFIG } from '../constants/config.js';
import * as Storage from '../services/storageService.js';
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
 * Persists the resolved ID via storageService.
 *
 * @param {string} accessToken
 * @returns {Promise<{ spreadsheetId: string, isNew: boolean }>}
 */
export async function resolveSpreadsheet(accessToken) {
    let spreadsheetId = Storage.getSheetId();

    if (spreadsheetId) {
        const ok = await verifySpreadsheet(accessToken, spreadsheetId);
        if (ok) return { spreadsheetId, isNew: false };

        spreadsheetId = null;
        Storage.saveSheetId('');
    }
    spreadsheetId = await findExistingSpreadsheet(accessToken, CONFIG.SPREADSHEET_TITLE);

    if (spreadsheetId) {
        Storage.saveSheetId(spreadsheetId);
        return { spreadsheetId, isNew: false };
    }

    spreadsheetId = await createSpreadsheet(accessToken, {
        title:     CONFIG.SPREADSHEET_TITLE,
        sheetName: CONFIG.SHEET_NAME,
    });
    Storage.saveSheetId(spreadsheetId);
    return { spreadsheetId, isNew: true };
}

/**
 * Loads all expenses from the sheet. Caching is handled by the caller.
 *
 * @param {string} accessToken
 * @param {string} spreadsheetId
 * @returns {Promise<Array>}
 */
export async function loadExpenses(accessToken, spreadsheetId) {
    return await fetchExpenses(accessToken, spreadsheetId, CONFIG.SHEET_NAME);
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