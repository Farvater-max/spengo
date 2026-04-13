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
    const amount = parseAmount(row[3]);
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
 * Fetches all rows from the sheet with no row-count limit.
 * Open-ended range "A2:E" reads to the last populated row — no silent truncation.
 * @param {string} accessToken
 * @param {string} spreadsheetId
 * @param {string} sheetName
 * @returns {Promise<Array<Array>>} raw 2-D array
 */
async function _fetchAllRows(accessToken, spreadsheetId, sheetName) {
    const data = await SheetsClient.get(
        accessToken,
        `${CONFIG.SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range(sheetName, 'A2:E'))}`
    );
    return data.values || [];
}

/**
 * Loads "hot" expenses: current month + previous month.
 * Used on app startup so the main screen is ready with minimal data transferred.
 * @param {string} accessToken
 * @param {string} spreadsheetId
 * @param {string} sheetName
 * @returns {Promise<Array>}
 */
export async function fetchRecentExpenses(accessToken, spreadsheetId, sheetName) {
    const rows    = await _fetchAllRows(accessToken, spreadsheetId, sheetName);
    const cutoff  = _prevMonthStart();
    return rowsToExpenses(rows).filter(e => e.date >= cutoff);
}

/**
 * Loads all expenses for a specific calendar year.
 * Used by the Statistics screen on demand.
 * @param {string} accessToken
 * @param {string} spreadsheetId
 * @param {string} sheetName
 * @param {number} year
 * @returns {Promise<Array>}
 */
export async function fetchExpensesByYear(accessToken, spreadsheetId, sheetName, year) {
    const rows   = await _fetchAllRows(accessToken, spreadsheetId, sheetName);
    const prefix = String(year);
    return rowsToExpenses(rows).filter(e => e.date.startsWith(prefix));
}

/**
 * @deprecated  Use fetchRecentExpenses for startup, fetchExpensesByYear for statistics.
 */
export async function fetchExpenses(accessToken, spreadsheetId, sheetName) {
    const rows = await _fetchAllRows(accessToken, spreadsheetId, sheetName);
    return rowsToExpenses(rows);
}

/**
 * Returns the ISO date string (YYYY-MM-DD) for the 1st of the previous month.
 * @returns {string}
 */
function _prevMonthStart() {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
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
 * Updates the row matching the given expense ID with new values.
 * Makes two API calls: one to locate the row, one to update it.
 * @param {string} accessToken
 * @param {string} spreadsheetId
 * @param {string} sheetName
 * @param {Object} expense - Full updated expense object
 * @returns {Promise<void>}
 */
export async function updateExpenseRow(accessToken, spreadsheetId, sheetName, expense) {
    const colA = await SheetsClient.get(
        accessToken,
        `${CONFIG.SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range(sheetName, 'A2:A1000'))}`
    );

    const rowIndex = findRowIndex(colA.values || [], expense.id);
    if (rowIndex === -1) throw new Error('Row not found in spreadsheet');

    // findRowIndex returns offset+1 (0-based sheet coords, header=0).
    // In 1-based A1 notation: header=row1, first data=row2, so sheetRow = rowIndex + 1
    const sheetRow    = rowIndex + 1;
    const targetRange = encodeURIComponent(range(sheetName, `A${sheetRow}:E${sheetRow}`));

    await SheetsClient.put(
        accessToken,
        `${CONFIG.SHEETS_BASE}/${spreadsheetId}/values/${targetRange}?valueInputOption=RAW`,
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
    const cachedNumericId = getNumericSheetId();

    const [colA, meta] = await Promise.all([
        SheetsClient.get(
            accessToken,
            `${CONFIG.SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range(sheetName, 'A2:A1000'))}`
        ),
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
 *
 * Searches BOTH files owned by the user AND files shared with them.
 * This is the key fix for guest users: without includeItemsFromAllDrives=true
 * and the sharedWithMe clause, Drive API only returns files the current user
 * owns — shared spreadsheets are invisible to the search, causing a new blank
 * spreadsheet to be created instead of loading the shared one.
 *
 * Search strategy — two parallel queries, first result wins:
 *   1. owned by me  (original behaviour — fast path for the owner)
 *   2. sharedWithMe (new path — finds spreadsheets shared with the guest)
 *
 * We run them in parallel and take whichever returns a file first so neither
 * owner nor guest pays an extra sequential round-trip.
 *
 * @param {string} accessToken
 * @param {string} title - e.g. CONFIG.SPREADSHEET_TITLE
 * @returns {Promise<string|null>}
 */
export async function findExistingSpreadsheet(accessToken, title) {
    const mime        = 'application/vnd.google-apps.spreadsheet';
    const baseFilter  = `name='${title}' and mimeType='${mime}' and trashed=false`;
    const fields      = 'files(id,name)';

    const ownedQuery  = encodeURIComponent(baseFilter);
    const sharedQuery = encodeURIComponent(`${baseFilter} and sharedWithMe=true`);

    const ownedUrl  = `${CONFIG.DRIVE_FILES}?q=${ownedQuery}&fields=${fields}&pageSize=1`;
    // includeItemsFromAllDrives + supportsAllDrives are required to reach
    // files in shared drives; they are harmless for regular My Drive files.
    const sharedUrl = `${CONFIG.DRIVE_FILES}?q=${sharedQuery}&fields=${fields}&pageSize=1&includeItemsFromAllDrives=true&supportsAllDrives=true`;

    try {
        const [ownedData, sharedData] = await Promise.all([
            SheetsClient.get(accessToken, ownedUrl).catch(() => ({ files: [] })),
            SheetsClient.get(accessToken, sharedUrl).catch(() => ({ files: [] })),
        ]);

        // Owner's own file takes priority to avoid accidentally loading
        // a same-named file shared from a different account.
        const file = ownedData.files?.[0] ?? sharedData.files?.[0];
        return file?.id || null;
    } catch (err) {
        console.warn('[SpenGo] Drive search failed:', err);
        return null;
    }
}