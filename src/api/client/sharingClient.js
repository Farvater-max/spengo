import { CONFIG } from '../../constants/config.js';

/**
 * sharingClient.js
 *
 * Low-level wrappers around the Google Drive Permissions API.
 * Mirror the pattern of sheetsClient.js — each function maps to one HTTP call.
 *
 * Endpoint base: GET/POST/DELETE
 *   https://www.googleapis.com/drive/v3/files/{fileId}/permissions
 */

function _headers(accessToken) {
    return {
        Authorization:  'Bearer ' + accessToken,
        'Content-Type': 'application/json',
    };
}

async function _unwrap(res) {
    // 204 No Content (DELETE success) has no body — handle gracefully
    if (res.status === 204) return {};
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
    return data;
}

function _permissionsUrl(spreadsheetId) {
    return `${CONFIG.DRIVE_FILES}/${spreadsheetId}/permissions`;
}

/**
 * Adds a writer permission for a Google account email.
 * Sends an email notification to the recipient.
 *
 * @param {string} accessToken
 * @param {string} spreadsheetId
 * @param {string} email
 * @returns {Promise<{ id: string, emailAddress: string, role: string }>}
 */
export async function addPermission(accessToken, spreadsheetId, email) {
    const url = `${_permissionsUrl(spreadsheetId)}?sendNotificationEmail=true&fields=id,emailAddress,role`;
    const res = await fetch(url, {
        method:  'POST',
        headers: _headers(accessToken),
        body:    JSON.stringify({
            type:         'user',
            role:         'writer',
            emailAddress: email,
        }),
    });
    return _unwrap(res);
}

/**
 * Lists all permissions for the spreadsheet.
 * Requests only the fields we actually use.
 *
 * @param {string} accessToken
 * @param {string} spreadsheetId
 * @returns {Promise<Array<{ id: string, emailAddress: string, role: string, displayName: string }>>}
 */
export async function listPermissions(accessToken, spreadsheetId) {
    const url = `${_permissionsUrl(spreadsheetId)}?fields=permissions(id,emailAddress,role,displayName,type)`;
    const res = await fetch(url, {
        method:  'GET',
        headers: _headers(accessToken),
    });
    const data = await _unwrap(res);
    return data.permissions ?? [];
}

/**
 * Removes a single permission by its Drive permission ID.
 *
 * @param {string} accessToken
 * @param {string} spreadsheetId
 * @param {string} permissionId - the Drive permission ID (not an email)
 * @returns {Promise<void>}
 */
export async function removePermission(accessToken, spreadsheetId, permissionId) {
    const url = `${_permissionsUrl(spreadsheetId)}/${encodeURIComponent(permissionId)}`;
    const res = await fetch(url, {
        method:  'DELETE',
        headers: _headers(accessToken),
    });
    await _unwrap(res);
}