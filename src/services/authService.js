import { CONFIG } from '../constants/config.js';
import { revokeToken, initGapiClient, fetchUserProfile } from '../api/client/googleClient.js';
import {
    waitForGoogleSdk,
    buildTokenClientConfig,
    isSilentAuthError,
    formatAuthError,
} from '../helpers/authHelpers.js';
import * as Storage from './storageService.js';

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/** @type {google.accounts.oauth2.TokenClient | null} */
let _tokenClient = null;

/** @type {string | null} */
let _accessToken = null;

/**
 * Tracks whether the current requestAccessToken call is a background
 * (silent) attempt, so we can route the response correctly.
 * @type {'silent' | 'interactive' | null}
 */
let _pendingFlowType = null;

/**
 * GIS does not fire error_callback when there is no active Google session
 * and prompt is empty — it simply stays silent forever. This timer detects
 * that case and fires onSilentFail so the UI is never left in a stuck state.
 * @type {ReturnType<typeof setTimeout> | null}
 */
let _silentRefreshTimer = null;

const SILENT_REFRESH_TIMEOUT_MS = 5000;

/**
 * Queue of resolve functions waiting for a fresh token.
 * Populated by waitForToken() when a silentRefresh is in flight.
 * Drained in _onTokenResponse once the new token arrives.
 * @type {Array<{ resolve: Function, reject: Function }>}
 */
let _tokenWaiters = [];

/** @type {Required<AuthCallbacks>} */
let _callbacks = {
    onReady:      () => {},
    onSignIn:     () => {},
    onSignOut:    () => {},
    onSilentFail: () => {},
    onError:      () => {},
};

// ---------------------------------------------------------------------------
// Session type resolution
// ---------------------------------------------------------------------------

/**
 * @typedef {'fresh' | 'restore' | 'silent' | 'unauthenticated'} SessionType
 */

/**
 * @typedef {Object} SessionSnapshot
 * @property {SessionType} type
 * @property {string|null}  accessToken
 * @property {string|null}  sheetId
 * @property {Array}        expenses
 */

/**
 * Reads storage once and decides what kind of session startup to perform.
 * This is the single place that owns the "what do we do on app load?" logic —
 * the controller simply branches on the returned type.
 *
 * | type             | meaning                                                      |
 * |------------------|--------------------------------------------------------------|
 * | 'unauthenticated'| No sheetId — first visit or fully signed out                 |
 * | 'fresh'          | Valid token + sheetId — restore without a network round-trip |
 * | 'restore'        | sheetId present but token is missing/expired — silent refresh needed, cached expenses available to show immediately |
 * | 'silent'         | sheetId present, no token, no cached expenses — silent refresh needed but nothing to show yet |
 *
 * @returns {SessionSnapshot}
 */
export function resolveSessionType() {
    const { accessToken, sheetId, expenses, tokenExpired } = Storage.getStoredSession();

    if (!sheetId) {
        return { type: 'unauthenticated', accessToken: null, sheetId: null, expenses: [] };
    }

    if (accessToken && !tokenExpired) {
        return { type: 'fresh', accessToken, sheetId, expenses };
    }

    // sheetId exists but token needs renewal
    const type = expenses.length > 0 ? 'restore' : 'silent';
    return { type, accessToken: null, sheetId, expenses };
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export async function init(callbacks = {}) {
    _callbacks = { ..._callbacks, ...callbacks };
    try {
        await waitForGoogleSdk();
        await initGapiClient(CONFIG.API_KEY);
        _initTokenClient();
        _callbacks.onReady();
    } catch (err) {
        _callbacks.onError(err.message);
    }
}

/**
 * Opens the Google consent/account-picker popup.
 * No-ops with an error callback if the token client isn't ready yet.
 */
export function signIn() {
    if (!_tokenClient) {
        _callbacks.onError('Google API is still loading — please try again in a moment.');
        return;
    }
    _pendingFlowType = 'interactive';
    _tokenClient.requestAccessToken({ prompt: '' });
}

/**
 * Attempts a silent token refresh without showing a popup.
 * On success fires onSignIn, on failure fires onSilentFail.
 *
 * - login_hint: skips the account picker when the user's email is known.
 * - timeout: GIS never calls error_callback if there is no active session
 *   and prompt is empty — the timer ensures onSilentFail always fires.
 */
export function silentRefresh() {
    if (!_tokenClient) return;

    _pendingFlowType = 'silent';

    _silentRefreshTimer = setTimeout(() => {
        if (_pendingFlowType === 'silent') {
            _pendingFlowType = null;
            _callbacks.onSilentFail();
        }
    }, SILENT_REFRESH_TIMEOUT_MS);

    _tokenClient.requestAccessToken({ prompt: '', login_hint: Storage.getLoginHint() });
}

/**
 * Returns a Promise that resolves with a valid access token.
 *
 * - If the current token is still valid → resolves immediately.
 * - If a silentRefresh is already in flight → waits for it to complete.
 * - If the token is expired and no refresh is running → starts one.
 *
 * @returns {Promise<string>} A valid access token
 */
export function waitForToken() {
    if (_accessToken && !isTokenExpired()) {
        return Promise.resolve(_accessToken);
    }

    return new Promise((resolve, reject) => {
        _tokenWaiters.push({ resolve, reject });

        if (_pendingFlowType !== 'silent') {
            silentRefresh();
        }
    });
}

/**
 * Resolves a fresh token and passes it to fn, returning whatever fn returns.
 * Single source of truth for token-gated API calls.
 *
 * @template T
 * @param {(token: string) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withToken(fn) {
    const token = await waitForToken();
    return fn(token);
}

/**
 * Revokes the current access token and clears all session state.
 *
 * @returns {Promise<void>}
 */
export async function signOut() {
    if (_accessToken) {
        await revokeToken(_accessToken);
    }

    _accessToken = null;
    _pendingFlowType = null;
    Storage.clearSession();
    _callbacks.onSignOut();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fetches the basic profile of the authenticated user.
 *
 * @param {string} accessToken
 * @returns {Promise<{ email: string, name: string, picture: string, letter: string }|null>}
 */
export function getUserProfile(accessToken) {
    return fetchUserProfile(accessToken);
}

/**
 * @returns {boolean} True if the cached token is absent or past its expiry window.
 */
export function isTokenExpired() {
    return Storage.isTokenExpired();
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

function _clearSilentTimer() {
    if (_silentRefreshTimer !== null) {
        clearTimeout(_silentRefreshTimer);
        _silentRefreshTimer = null;
    }
}

function _initTokenClient() {
    _tokenClient = google.accounts.oauth2.initTokenClient(
        buildTokenClientConfig({
            clientId: CONFIG.CLIENT_ID,
            scopes:   CONFIG.SCOPES,
            onToken:  _onTokenResponse,
            onError:  _onTokenError,
        })
    );
}

/**
 * Handles a successful (or errored) token response from GIS.
 *
 * @param {google.accounts.oauth2.TokenResponse} response
 */
function _onTokenResponse(response) {
    _clearSilentTimer();

    const flowType = _pendingFlowType;
    _pendingFlowType = null;

    if (response.error) {
        _handleFailedFlow(flowType, `OAuth error: ${response.error}`);
        return;
    }

    _accessToken = response.access_token;
    const expiresAt = Date.now() + (response.expires_in - 60) * 1000;
    Storage.saveSession(_accessToken, expiresAt);

    const waiters = _tokenWaiters.splice(0);
    waiters.forEach(w => w.resolve(_accessToken));

    _callbacks.onSignIn({ accessToken: _accessToken });
}

/**
 * Handles errors fired via the `error_callback` channel of GIS.
 *
 * @param {{ error?: string, type?: string, message?: string }} err
 */
function _onTokenError(err) {
    _clearSilentTimer();

    const flowType = _pendingFlowType;
    _pendingFlowType = null;

    if (isSilentAuthError(err)) {
        if (flowType === 'silent') return;
        if (err?.type === 'popup_closed') return;
        _callbacks.onError('Access was denied. Please grant the required permissions.');
        return;
    }
    _handleFailedFlow(flowType, `OAuth error: ${formatAuthError(err)}`);
}

/**
 * Routes a failed auth flow to the appropriate callback.
 *
 * @param {'silent' | 'interactive' | null} flowType
 * @param {string} errorMessage
 */
function _handleFailedFlow(flowType, errorMessage) {
    const waiters = _tokenWaiters.splice(0);
    waiters.forEach(w => w.reject(new Error(errorMessage)));

    if (flowType === 'silent') {
        _callbacks.onSilentFail();
    } else {
        _callbacks.onError(errorMessage);
    }
}