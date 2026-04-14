import { CONFIG } from '../constants/config.js';
import {
    verifySpreadsheet,
    createSpreadsheet,
    fetchExpenses,
    fetchRecentExpenses,
    fetchExpensesByYear,
    insertExpense,
    updateExpenseRow,
    removeExpenseRow,
} from '../helpers/sheetsHelpers.js';

/**
 * Ensures a valid spreadsheet exists for the **owner** flow.
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

    // No valid cached ID → create a fresh spreadsheet for this owner
    const created = await createSpreadsheet(accessToken, {
        title:     CONFIG.SPREADSHEET_TITLE,
        sheetName: CONFIG.SHEET_NAME,
    });
    return { spreadsheetId: created, isNew: true };
}

/**
 * Resolves a spreadsheet for the **subuser** flow.
 *
 * @param {string} accessToken
 * @param {string} sharedSheetId  - ID from share link, confirmed via Picker
 * @returns {Promise<{ spreadsheetId: string, isNew: false }>}
 */
export async function resolveSharedSpreadsheet(accessToken, sharedSheetId) {
    const ok = await verifySpreadsheet(accessToken, sharedSheetId);
    if (!ok) {
        throw new Error('The shared spreadsheet is no longer accessible. The owner may have revoked access.');
    }
    return { spreadsheetId: sharedSheetId, isNew: false };
}

/**
 * Loads "hot" expenses: current month + previous month.
 *
 * @param {string} accessToken
 * @param {string} spreadsheetId
 * @returns {Promise<Array>}
 */
export async function loadRecentExpenses(accessToken, spreadsheetId) {
    return await fetchRecentExpenses(accessToken, spreadsheetId, CONFIG.SHEET_NAME);
}

/**
 * Loads all expenses for a specific calendar year.
 *
 * @param {string} accessToken
 * @param {string} spreadsheetId
 * @param {number} year
 * @returns {Promise<Array>}
 */
export async function loadExpensesByYear(accessToken, spreadsheetId, year) {
    return await fetchExpensesByYear(accessToken, spreadsheetId, CONFIG.SHEET_NAME, year);
}

/**
 * @deprecated  Prefer loadRecentExpenses for startup loads.
 */
export async function loadExpenses(accessToken, spreadsheetId) {
    return await fetchExpenses(accessToken, spreadsheetId, CONFIG.SHEET_NAME);
}

/**
 * @param {string} accessToken
 * @param {string} spreadsheetId
 * @param {{ id, date, category, amount, comment }} expense
 */
export async function appendExpense(accessToken, spreadsheetId, expense) {
    await insertExpense(accessToken, spreadsheetId, CONFIG.SHEET_NAME, expense);
}

/**
 * @param {string} accessToken
 * @param {string} spreadsheetId
 * @param {{ id, date, category, amount, comment }} expense
 */
export async function editExpense(accessToken, spreadsheetId, expense) {
    await updateExpenseRow(accessToken, spreadsheetId, CONFIG.SHEET_NAME, expense);
}

/**
 * @param {string} accessToken
 * @param {string} spreadsheetId
 * @param {string} expenseId
 */
export async function deleteExpense(accessToken, spreadsheetId, expenseId) {
    await removeExpenseRow(accessToken, spreadsheetId, CONFIG.SHEET_NAME, expenseId);
}