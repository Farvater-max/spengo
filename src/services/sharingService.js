import {
    addPermission,
    listPermissions,
    removePermission,
} from '../api/client/sharingClient.js';

/**
 * sharingService.js
 *
 * Business-logic layer for spreadsheet sharing.
 * Sits between the controller and the raw Drive API client.
 *
 * Responsibilities:
 *  - Filter the raw Drive permissions list to the shape the UI needs
 *  - Distinguish owner vs shared users so callers don't parse roles
 *  - Centralise the "writer" role default so it's changed in one place
 */

/**
 * @typedef {Object} SharedUser
 * @property {string} permissionId   - Drive permission ID (used for removal)
 * @property {string} email
 * @property {string} displayName    - May be empty if the user hasn't accepted yet
 * @property {'reader'|'writer'} role
 * @property {boolean} isPending     - true when displayName is absent (invite not yet accepted)
 */

/**
 * Grants writer access to the spreadsheet for the given email.
 * Sends a Google Drive notification email to the recipient.
 *
 * @param {string} accessToken
 * @param {string} spreadsheetId
 * @param {string} email
 * @returns {Promise<SharedUser>}
 */
export async function shareSpreadsheet(accessToken, spreadsheetId, email) {
    const perm = await addPermission(accessToken, spreadsheetId, email);
    return _toSharedUser(perm);
}

/**
 * Returns the list of non-owner users who have access to the spreadsheet.
 * Filters out the owner entry — they're always present but shouldn't appear
 * in the "shared with" list.
 *
 * @param {string} accessToken
 * @param {string} spreadsheetId
 * @returns {Promise<{ sharedUsers: SharedUser[], ownerEmail: string|null }>}
 */
export async function getSharedUsers(accessToken, spreadsheetId) {
    const permissions = await listPermissions(accessToken, spreadsheetId);

    let ownerEmail = null;
    const sharedUsers = [];

    for (const perm of permissions) {
        // Only handle user-type entries; skip 'anyone', 'domain', etc.
        if (perm.type !== 'user') continue;

        if (perm.role === 'owner') {
            ownerEmail = perm.emailAddress ?? null;
        } else {
            sharedUsers.push(_toSharedUser(perm));
        }
    }

    return { sharedUsers, ownerEmail };
}

/**
 * Revokes a specific permission by its Drive permission ID.
 *
 * @param {string} accessToken
 * @param {string} spreadsheetId
 * @param {string} permissionId
 * @returns {Promise<void>}
 */
export async function unshareSpreadsheet(accessToken, spreadsheetId, permissionId) {
    await removePermission(accessToken, spreadsheetId, permissionId);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Maps a raw Drive permission object to the SharedUser shape used by the UI.
 * @param {{ id, emailAddress, role, displayName }} perm
 * @returns {SharedUser}
 */
function _toSharedUser(perm) {
    return {
        permissionId: perm.id,
        email:        perm.emailAddress ?? '',
        displayName:  perm.displayName  ?? '',
        role:         perm.role,
        isPending:    !perm.displayName,
    };
}