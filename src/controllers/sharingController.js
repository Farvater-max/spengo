import { STATE } from '../state.js';
import { isGoogleEmail } from '../utils/helpers.js';
import { withToken } from '../services/authService.js';
import * as SharingService from '../services/sharingService.js';
import * as Storage from '../services/storageService.js';
import { getI18nValue } from '../i18n/localization.js';
import { showToast } from '../utils/helpers.js';
import { renderShareModal } from '../ui/renderer.jsx';

/**
 * Orchestrates the full share lifecycle:
 *   openShareModal  → load current permissions → show modal
 *   submitShare     → add permission → refresh list → re-render modal
 *   removeShare     → delete permission → refresh list → re-render modal
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Fetches the current permissions list from Drive, updates the storage cache,
 * and stores the owner email for guest-user display.
 * Returns the resolved { sharedUsers, ownerEmail }.
 */
async function _refreshSharedUsers() {
    const result = await withToken(token =>
        SharingService.getSharedUsers(token, STATE.spreadsheetId)
    );

    Storage.saveSharedUsers(result.sharedUsers);
    if (result.ownerEmail) {
        Storage.saveSheetOwnerEmail(result.ownerEmail);
    }

    return result;
}

// ---------------------------------------------------------------------------
// Open modal
// ---------------------------------------------------------------------------

/**
 * Opens the ShareModal. Immediately renders with the cached list (instant UI),
 * then fires a background API call to refresh — re-renders once data arrives.
 */
export async function openShareModal() {
    const existingSharedUsers = Storage.getSharedUsers();
    const accessUrl = existingSharedUsers.length > 0
        ? `${window.location.origin}${window.location.pathname}?id=${STATE.spreadsheetId}`
        : null;

    renderShareModal({
        open:        true,
        sharedUsers: existingSharedUsers,
        accessUrl,
        loading:     false,
        onShare:     submitShare,
        onRemove:    removeShare,
        onClose:     () => renderShareModal({ open: false }),
    });

    try {
        const { sharedUsers } = await _refreshSharedUsers();
        const accessUrl = sharedUsers.length > 0
            ? `${window.location.origin}${window.location.pathname}?id=${STATE.spreadsheetId}`
            : null;
        renderShareModal({
            open:        true,
            sharedUsers,
            accessUrl,
            loading:     false,
            onShare:     submitShare,
            onRemove:    removeShare,
            onClose:     () => renderShareModal({ open: false }),
        });
    } catch (err) {
        console.warn('[SpenGo] Failed to load sharing list:', err);
    }
}

// ---------------------------------------------------------------------------
// Share
// ---------------------------------------------------------------------------

/**
 * Validates the email, calls Drive to add a writer permission,
 * then refreshes the list and re-renders the modal.
 *
 * @param {string} email
 */
export async function submitShare(email) {
    const trimmed = email.trim().toLowerCase();

    if (!isGoogleEmail(trimmed)) {
        showToast(getI18nValue('share.invalid_email'), 'error');
        return;
    }

    const ownerEmail = Storage.getSheetOwnerEmail();
    if (ownerEmail && trimmed === ownerEmail.toLowerCase()) {
        showToast(getI18nValue('share.already_owner'), 'error');
        return;
    }

    const alreadyShared = Storage.getSharedUsers().some(
        u => u.email.toLowerCase() === trimmed
    );
    if (alreadyShared) {
        showToast(getI18nValue('share.already_shared'), 'error');
        return;
    }

    renderShareModal({
        open:        true,
        sharedUsers: Storage.getSharedUsers(),
        accessUrl:   null,
        loading:     true,
        onShare:     submitShare,
        onRemove:    removeShare,
        onClose:     () => renderShareModal({ open: false }),
    });

    try {
        await withToken(token =>
            SharingService.shareSpreadsheet(token, STATE.spreadsheetId, trimmed)
        );
        showToast(getI18nValue('share.success'), 'success');
    } catch (err) {
        showToast(getI18nValue('share.error_prefix') + err.message, 'error');
        renderShareModal({
            open:        true,
            sharedUsers: Storage.getSharedUsers(),
            accessUrl:   null,
            loading:     false,
            onShare:     submitShare,
            onRemove:    removeShare,
            onClose:     () => renderShareModal({ open: false }),
        });
        return;
    }

    // After a successful share the list will have at least one entry —
    // generate the access URL and show it immediately.
    const accessUrl = `${window.location.origin}${window.location.pathname}?id=${STATE.spreadsheetId}`;

    try {
        const { sharedUsers } = await _refreshSharedUsers();
        renderShareModal({
            open:        true,
            sharedUsers,
            accessUrl,
            loading:     false,
            onShare:     submitShare,
            onRemove:    removeShare,
            onClose:     () => renderShareModal({ open: false }),
        });
    } catch {
        renderShareModal({
            open:        true,
            sharedUsers: Storage.getSharedUsers(),
            accessUrl,
            loading:     false,
            onShare:     submitShare,
            onRemove:    removeShare,
            onClose:     () => renderShareModal({ open: false }),
        });
    }
}

// ---------------------------------------------------------------------------
// Remove
// ---------------------------------------------------------------------------

/**
 * Revokes a permission by Drive permission ID, refreshes the list.
 *
 * @param {string} permissionId
 */
export async function removeShare(permissionId) {
    try {
        await withToken(token =>
            SharingService.unshareSpreadsheet(token, STATE.spreadsheetId, permissionId)
        );
        showToast(getI18nValue('share.removed'), 'success');
    } catch (err) {
        showToast(getI18nValue('share.remove_error') + err.message, 'error');
        return;
    }

    try {
        const { sharedUsers } = await _refreshSharedUsers();
        const accessUrl = sharedUsers.length > 0
            ? `${window.location.origin}${window.location.pathname}?id=${STATE.spreadsheetId}`
            : null;
        renderShareModal({
            open:        true,
            sharedUsers,
            accessUrl,
            loading:     false,
            onShare:     submitShare,
            onRemove:    removeShare,
            onClose:     () => renderShareModal({ open: false }),
        });
    } catch {
        const updated = Storage.getSharedUsers().filter(u => u.permissionId !== permissionId);
        Storage.saveSharedUsers(updated);
        const accessUrl = updated.length > 0
            ? `${window.location.origin}${window.location.pathname}?id=${STATE.spreadsheetId}`
            : null;
        renderShareModal({
            open:        true,
            sharedUsers: updated,
            accessUrl,
            loading:     false,
            onShare:     submitShare,
            onRemove:    removeShare,
            onClose:     () => renderShareModal({ open: false }),
        });
    }
}