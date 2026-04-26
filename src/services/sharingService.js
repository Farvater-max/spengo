import {
    addPermission,
    listPermissions,
    removePermission,
} from '../api/client/sharingClient.js';

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

    for (const perm of permissions.filter(_isUserPerm)) {
        switch (perm.role) {
            case 'owner':
                ownerEmail = perm.emailAddress ?? null;
                break;
            default:
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
 * Returns true for user-type permissions only.
 * Excludes 'anyone', 'domain', and other non-user entries.
 * @param {{ type: string }} perm
 * @returns {boolean}
 */
const _isUserPerm = (perm) => perm.type === 'user';

/**
 * Maps a raw Drive permission object to the SharedUser shape used by the UI.
 * @param {{ id: string, emailAddress?: string, displayName?: string, role: string }} perm
 * @returns {SharedUser}
 */
function _toSharedUser({ id, emailAddress = '', displayName = '', role }) {
    return {
        permissionId: id,
        email:        emailAddress,
        displayName,
        role,
        isPending:    !displayName,
    };
}