import { STATE } from '../state.js';
import { isGoogleEmail } from '../utils/helpers.js';
import * as AuthService from '../services/authService.js';
import * as SharingService from '../services/sharingService.js';
import * as Storage from '../services/storageService.js';
import { getI18nValue } from '../i18n/localization.js';
import { showToast } from '../utils/helpers.js';
import { renderShareModal } from '../ui/renderer.jsx';

/**
 * sharingController.js
 *
 * Orchestrates the full share lifecycle:
 *   openShareModal  → load current permissions → show modal
 *   submitShare     → add permission → refresh list → re-render modal
 *   removeShare     → delete permission → refresh list → re-render modal
 *
 * Mirrors the structure of expenseController — uses _withToken so all API
 * calls transparently handle expired tokens the same way.
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function _withToken(fn) {
    STATE.accessToken = await AuthService.waitForToken();
    return fn(STATE.accessToken);
}

/**
 * Fetches the current permissions list from Drive, updates the storage cache,
 * and stores the owner email for guest-user display.
 * Returns the resolved { sharedUsers, ownerEmail }.
 */
async function _refreshSharedUsers() {
    const result = await _withToken(token =>
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
    // Render immediately with whatever is cached — no spinner flash
    renderShareModal({
        open:        true,
        sharedUsers: Storage.getSharedUsers(),
        loading:     false,
        onShare:     submitShare,
        onRemove:    removeShare,
        onClose:     () => renderShareModal({ open: false }),
    });

    // Refresh from Drive in the background; re-render when done
    try {
        const { sharedUsers } = await _refreshSharedUsers();
        renderShareModal({
            open:        true,
            sharedUsers,
            loading:     false,
            onShare:     submitShare,
            onRemove:    removeShare,
            onClose:     () => renderShareModal({ open: false }),
        });
    } catch (err) {
        console.warn('[SpenGo] Failed to load sharing list:', err);
        // Keep the modal open with the stale cached list — don't crash the UI
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

    // Show loading state in modal immediately
    renderShareModal({
        open:        true,
        sharedUsers: Storage.getSharedUsers(),
        loading:     true,
        onShare:     submitShare,
        onRemove:    removeShare,
        onClose:     () => renderShareModal({ open: false }),
    });

    try {
        await _withToken(token =>
            SharingService.shareSpreadsheet(token, STATE.spreadsheetId, trimmed)
        );
        showToast(getI18nValue('share.success'), 'success');
    } catch (err) {
        showToast(getI18nValue('share.error_prefix') + err.message, 'error');
        // Restore modal without loading state
        renderShareModal({
            open:        true,
            sharedUsers: Storage.getSharedUsers(),
            loading:     false,
            onShare:     submitShare,
            onRemove:    removeShare,
            onClose:     () => renderShareModal({ open: false }),
        });
        return;
    }

    // Reload list from Drive to get the canonical permissionId + displayName
    try {
        const { sharedUsers } = await _refreshSharedUsers();
        renderShareModal({
            open:        true,
            sharedUsers,
            loading:     false,
            onShare:     submitShare,
            onRemove:    removeShare,
            onClose:     () => renderShareModal({ open: false }),
        });
    } catch {
        renderShareModal({
            open:        true,
            sharedUsers: Storage.getSharedUsers(),
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
        await _withToken(token =>
            SharingService.unshareSpreadsheet(token, STATE.spreadsheetId, permissionId)
        );
        showToast(getI18nValue('share.removed'), 'success');
    } catch (err) {
        showToast(getI18nValue('share.remove_error') + err.message, 'error');
        return;
    }

    try {
        const { sharedUsers } = await _refreshSharedUsers();
        renderShareModal({
            open:        true,
            sharedUsers,
            loading:     false,
            onShare:     submitShare,
            onRemove:    removeShare,
            onClose:     () => renderShareModal({ open: false }),
        });
    } catch {
        // Fallback: remove from cache optimistically
        const updated = Storage.getSharedUsers().filter(u => u.permissionId !== permissionId);
        Storage.saveSharedUsers(updated);
        renderShareModal({
            open:        true,
            sharedUsers: updated,
            loading:     false,
            onShare:     submitShare,
            onRemove:    removeShare,
            onClose:     () => renderShareModal({ open: false }),
        });
    }
}