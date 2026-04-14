import { STATE } from '../state.js';
import { isGoogleEmail } from '../utils/helpers.js';
import { withToken } from '../services/authService.js';
import * as SharingService from '../services/sharingService.js';
import * as SheetsService from '../services/sheetsService.js';
import * as Storage from '../services/storageService.js';
import { getI18nValue } from '../i18n/localization.js';
import { showToast } from '../utils/helpers.js';
import { renderShareModal } from '../ui/renderer.jsx';
import { CONFIG } from '../constants/config.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _buildShareUrl() {
    return `${CONFIG.SHARE_URL_BASE}?sheets=${STATE.spreadsheetId}`;
}

async function _refreshSharedUsers() {
    const result = await withToken(token =>
        SharingService.getSharedUsers(token, STATE.spreadsheetId)
    );
    Storage.saveSharedUsers(result.sharedUsers);
    if (result.ownerEmail) Storage.saveSheetOwnerEmail(result.ownerEmail);
    return result;
}

function _render(overrides = {}) {
    renderShareModal({
        open:        true,
        sharedUsers: Storage.getSharedUsers(),
        loading:     false,
        shareUrl:    _buildShareUrl(),
        onShare:     submitShare,
        onRemove:    removeShare,
        onClose:     () => renderShareModal({ open: false }),
        ...overrides,
    });
}

// ---------------------------------------------------------------------------
// Open modal
// ---------------------------------------------------------------------------

export async function openShareModal() {
    _render();

    try {
        const { sharedUsers } = await _refreshSharedUsers();
        _render({ sharedUsers });
    } catch (err) {
        console.warn('[SpenGo] Failed to load sharing list:', err);
    }
}

// ---------------------------------------------------------------------------
// Share
// ---------------------------------------------------------------------------

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

    _render({ loading: true });

    try {
        await withToken(token =>
            SharingService.shareSpreadsheet(token, STATE.spreadsheetId, trimmed)
        );
        showToast(getI18nValue('share.success'), 'success');
    } catch (err) {
        showToast(getI18nValue('share.error_prefix') + err.message, 'error');
        _render();
        return;
    }

    try {
        const { sharedUsers } = await _refreshSharedUsers();
        _render({ sharedUsers });
    } catch {
        _render();
    }
}

// ---------------------------------------------------------------------------
// Remove
// ---------------------------------------------------------------------------

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
        _render({ sharedUsers });
    } catch {
        const updated = Storage.getSharedUsers().filter(u => u.permissionId !== permissionId);
        Storage.saveSharedUsers(updated);
        _render({ sharedUsers: updated });
    }
}

// ---------------------------------------------------------------------------
// Subuser: direct access via share URL (no Picker needed)
// ---------------------------------------------------------------------------

/**
 * Called by authController after sign-in when a pendingSheetId is present.
 * @param {string} accessToken
 * @param {string} pendingSheetId  - Sheet ID from ?sheets= URL param
 * @returns {Promise<string|null>}  Resolved spreadsheetId, or null on failure
 */
export async function resolveSubuserAccess(accessToken, pendingSheetId) {
    try {
        const { spreadsheetId } = await SheetsService.resolveSharedSpreadsheet(
            accessToken,
            pendingSheetId
        );

        Storage.saveSheetId(spreadsheetId);
        Storage.saveIsOwner(false);

        // Remove ?sheets= from URL without triggering a reload
        const url = new URL(window.location.href);
        url.searchParams.delete('sheets');
        window.history.replaceState({}, '', url.toString());

        Storage.clearPendingSheetId();

        return spreadsheetId;
    } catch (err) {
        console.error('[SpenGo] resolveSubuserAccess failed:', err);
        const msg = err.message.includes('no longer accessible')
            ? (getI18nValue('share.access_revoked') ?? 'Access to this spreadsheet has been revoked.')
            : (getI18nValue('share.access_error')   ?? 'Could not access the shared spreadsheet: ') + err.message;
        showToast(msg, 'error');
        return null;
    }
}