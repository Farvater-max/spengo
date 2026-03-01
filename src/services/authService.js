import { CONFIG } from '../constants/config.js';
import { revokeToken, initGapiClient } from '../api/client/googleClient.js';
import {
    waitForGoogleSdk,
    buildTokenClientConfig,
    isSilentAuthError,
    formatAuthError,
} from '../helpers/authHelpers.js';

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

    const hint = localStorage.getItem('google_login_hint') ?? '';
    _tokenClient.requestAccessToken({ prompt: '', login_hint: hint });
}

/**
 * Returns a Promise that resolves with a valid access token.
 *
 * - If the current token is still valid → resolves immediately.
 * - If a silentRefresh is already in flight → waits for it to complete.
 * - If the token is expired and no refresh is running → starts one.
 *
 * This lets API callers (submitExpense, deleteExpense, etc.) simply
 * `await AuthService.waitForToken()` instead of hoping the token is ready.
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
    sessionStorage.removeItem('google_access_token');
    sessionStorage.removeItem('google_token_expires_at');
    _callbacks.onSignOut();
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Creates and stores the GIS token client.
 * Separated from `init` so it can be reasoned about independently.
 */
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
    sessionStorage.setItem('google_access_token', _accessToken);
    sessionStorage.setItem('google_token_expires_at', String(expiresAt));

    // Resolve any callers that were waiting for a fresh token
    const waiters = _tokenWaiters.splice(0);
    waiters.forEach(w => w.resolve(_accessToken));

    _callbacks.onSignIn({ accessToken: _accessToken });
}

export function isTokenExpired() {
    const expiresAt = sessionStorage.getItem('google_token_expires_at');
    if (!expiresAt) return true;
    return Date.now() > Number(expiresAt);
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
 * Routes a failed auth flow to the appropriate callback depending on
 * whether it was a silent background attempt or an interactive one.
 *
 * @param {'silent' | 'interactive' | null} flowType
 * @param {string} errorMessage
 */
function _handleFailedFlow(flowType, errorMessage) {
    // Reject any callers waiting for a token so they don't hang forever
    const waiters = _tokenWaiters.splice(0);
    waiters.forEach(w => w.reject(new Error(errorMessage)));

    if (flowType === 'silent') {
        _callbacks.onSilentFail();
    } else {
        _callbacks.onError(errorMessage);
    }
}