import { CONFIG } from '../constants/config.js';
import * as SheetsClient from '../api/client/sheetsClient.js';
import { uuid, parseAmount } from '../utils/helpers.js';
import { getNumericSheetId, saveNumericSheetId } from '../services/storageService.js';

/**
 * Builds an A1-notation range string.
 * @param {string} sheetName
 * @param {string} a1
 * @returns {string}  e.g. "spends!A2:E1000"
 */
export function range(sheetName, a1) {
    return `${sheetName}!${a1}`;
}

/**
 * Returns the header row written on spreadsheet creation.
 * @returns {string[][]}
 */
export function headerRow() {
    return [['ID', 'Date', 'Category', 'Amount', 'Comment']];
}

/**
 * Serializes an expense object into a Sheets row array.
 * @param {{ id, date, category, amount, comment }} expense
 * @returns {Array}
 */
export function expenseToRow(expense) {
    return [expense.id, expense.date, expense.category, expense.amount, expense.comment];
}

/**
 * Deserializes a single Sheets row into an expense object.
 * Returns null for rows with amount <= 0.
 * @param {Array} row
 * @returns {{ id, date, category, amount, comment } | null}
 */
export function rowToExpense(row) {
    const amount = parseFloat(row[3]) || 0;
    if (amount <= 0) return null;
    return {
        id:       row[0] || uuid(),
        date:     row[1] || '',
        category: row[2] || 'other',
        amount,
        comment:  row[4] || '',
    };
}

/**
 * Maps a 2D array of raw rows into valid expense objects, dropping invalid ones.
 * @param {Array<Array>} rows
 * @returns {Array}
 */
export function rowsToExpenses(rows) {
    return (rows || []).map(rowToExpense).filter(Boolean);
}

/**
 * Builds a Sheets API deleteDimension request for a single row.
 * @param {number} numericSheetId
 * @param {number} zeroBasedIndex
 * @returns {Object}
 */
export function buildDeleteRowRequest(numericSheetId, zeroBasedIndex) {
    return {
        deleteDimension: {
            range: {
                sheetId:    numericSheetId,
                dimension:  'ROWS',
                startIndex: zeroBasedIndex,
                endIndex:   zeroBasedIndex + 1,
            },
        },
    };
}

/**
 * Finds the 0-based sheet row index for an expense ID inside column-A values.
 * Returns -1 if not found. Adds +1 to account for the header row.
 * @param {Array<Array>} idColumn
 * @param {string}       expenseId
 * @returns {number}
 */
export function findRowIndex(idColumn, expenseId) {
    const offset = idColumn.findIndex(r => r[0] === expenseId);
    if (offset === -1) return -1;
    return offset + 1; // +1 because row 0 is the header in 0-based sheet coordinates
}

/**
 * Extracts the numeric sheet id from spreadsheet metadata.
 * @param {Object} metadata - Response from SheetsClient.get with ?fields=sheets.properties
 * @returns {number}
 */
export function extractNumericSheetId(metadata) {
    return metadata.sheets[0].properties.sheetId;
}

/**
 * Checks whether a spreadsheet exists and is accessible.
 * @param {string} accessToken
 * @param {string} spreadsheetId
 * @returns {Promise<boolean>}
 */
export async function verifySpreadsheet(accessToken, spreadsheetId) {
    try {
        await SheetsClient.get(accessToken, `${CONFIG.SHEETS_BASE}/${spreadsheetId}?fields=spreadsheetId`);
        return true;
    } catch {
        return false;
    }
}

/**
 * Creates a new spreadsheet and writes the header row.
 * @param {string} accessToken
 * @param {{ title: string, sheetName: string }} options
 * @returns {Promise<string>} The new spreadsheet ID
 */
export async function createSpreadsheet(accessToken, { title, sheetName }) {
    const data = await SheetsClient.post(accessToken, CONFIG.SHEETS_BASE, {
        properties: { title },
        sheets:     [{ properties: { title: sheetName } }],
    });

    await SheetsClient.put(
        accessToken,
        `${CONFIG.SHEETS_BASE}/${data.spreadsheetId}/values/${encodeURIComponent(range(sheetName, 'A1:E1'))}?valueInputOption=RAW`,
        { values: headerRow() }
    );

    return data.spreadsheetId;
}

/**
 * Reads all data rows from the expenses sheet range.
 * @param {string} accessToken
 * @param {string} spreadsheetId
 * @param {string} sheetName
 * @returns {Promise<Array>}
 */
export async function fetchExpenses(accessToken, spreadsheetId, sheetName) {
    const data = await SheetsClient.get(
        accessToken,
        `${CONFIG.SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range(sheetName, 'A2:E1000'))}`
    );
    return rowsToExpenses(data.values);
}

/**
 * Appends a single expense row to the sheet.
 * @param {string} accessToken
 * @param {string} spreadsheetId
 * @param {string} sheetName
 * @param {Object} expense
 * @returns {Promise<void>}
 */
export async function insertExpense(accessToken, spreadsheetId, sheetName, expense) {
    const targetRange = encodeURIComponent(range(sheetName, 'A:E'));
    await SheetsClient.post(
        accessToken,
        `${CONFIG.SHEETS_BASE}/${spreadsheetId}/values/${targetRange}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
        { values: [expenseToRow(expense)] }
    );
}

/**
 * Deletes the row matching the given expense ID.
 * Makes two API calls: one to locate the row, one to delete it.
 * @param {string} accessToken
 * @param {string} spreadsheetId
 * @param {string} sheetName
 * @param {string} expenseId
 * @returns {Promise<void>}
 */
export async function removeExpenseRow(accessToken, spreadsheetId, sheetName, expenseId) {
    // The numeric sheetId never changes — use cached value when available.
    // If not cached yet, fetch it in parallel with the ID column lookup.
    const cachedNumericId = getNumericSheetId();

    const [colA, meta] = await Promise.all([
        SheetsClient.get(
            accessToken,
            `${CONFIG.SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range(sheetName, 'A2:A1000'))}`
        ),
        // Skip the metadata request if we already have the numeric sheet ID
        cachedNumericId !== null
            ? Promise.resolve(null)
            : SheetsClient.get(
                accessToken,
                `${CONFIG.SHEETS_BASE}/${spreadsheetId}?fields=sheets.properties`
            ),
    ]);

    const rowIndex = findRowIndex(colA.values || [], expenseId);
    if (rowIndex === -1) return;

    const numericSheetId = cachedNumericId ?? extractNumericSheetId(meta);

    // Persist for future deletes
    if (cachedNumericId === null) saveNumericSheetId(numericSheetId);

    await SheetsClient.post(
        accessToken,
        `${CONFIG.SHEETS_BASE}/${spreadsheetId}:batchUpdate`,
        { requests: [buildDeleteRowRequest(numericSheetId, rowIndex)] }
    );
}

/**
 * Searches Google Drive for an existing spreadsheet by exact title.
 * Returns the spreadsheetId if found, or null.
 * @param {string} accessToken
 * @param {string} title - e.g. CONFIG.SPREADSHEET_TITLE
 * @returns {Promise<string|null>}
 */
export async function findExistingSpreadsheet(accessToken, title) {
    try {
        const query  = encodeURIComponent(
            `name='${title}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
        );
        const url    = `${CONFIG.DRIVE_SEARCH_BASE}?q=${query}&fields=files(id,name)&pageSize=1`;
        const data   = await SheetsClient.get(accessToken, url);
        const file   = data.files?.[0];
        return file?.id || null;
    } catch (err) {
        console.warn('[SpenGo] Drive search failed:', err);
        return null;
    }
}