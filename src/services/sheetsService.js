import { CONFIG } from '../constants/config.js';
import {
    verifySpreadsheet,
    findExistingSpreadsheet,
    createSpreadsheet,
    fetchExpenses,
    insertExpense,
    updateExpenseRow,
    removeExpenseRow,
} from '../helpers/sheetsHelpers.js';

/**
 * Ensures a valid spreadsheet exists.
 * Verifies the cached ID if provided, or searches and creates if absent/invalid.
 * Persistence of the resolved ID is handled by the caller (expenseController).
 *
 * @param {string} accessToken
 * @param {string|null} cachedId  - Previously stored spreadsheet ID, or null
 * @returns {Promise<{ spreadsheetId: string, isNew: boolean }>}
 */
export async function resolveSpreadsheet(accessToken, cachedId = null) {
    if (cachedId) {
        const ok = await verifySpreadsheet(accessToken, cachedId);
        if (ok) return { spreadsheetId: cachedId, isNew: false };
    }

    const found = await findExistingSpreadsheet(accessToken, CONFIG.SPREADSHEET_TITLE);
    if (found) return { spreadsheetId: found, isNew: false };

    const created = await createSpreadsheet(accessToken, {
        title:     CONFIG.SPREADSHEET_TITLE,
        sheetName: CONFIG.SHEET_NAME,
    });
    return { spreadsheetId: created, isNew: true };
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
 * Updates an existing expense row in the sheet.
 *
 * @param {string} accessToken
 * @param {string} spreadsheetId
 * @param {{ id, date, category, amount, comment }} expense
 * @returns {Promise<void>}
 */
export async function editExpense(accessToken, spreadsheetId, expense) {
    await updateExpenseRow(accessToken, spreadsheetId, CONFIG.SHEET_NAME, expense);
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