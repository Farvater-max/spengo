/**
 * authService.js
 *
 * Owns the entire Google OAuth2 token lifecycle:
 *   init → (silent sign-in attempt) → signIn / signOut
 *
 * Public API
 * ----------
 *  init(callbacks)   – load SDKs, wire up token client, fire onReady / onSilentFail
 *  signIn()          – open the consent popup
 *  signOut()         – revoke token, clear local state, fire onSignOut
 *
 * Callbacks (all optional)
 * -------------------------
 *  onReady()                  – SDKs loaded, app can enable the sign-in button
 *  onSignIn({ accessToken })  – user obtained a valid token
 *  onSignOut()                – token revoked, session cleared
 *  onSilentFail()             – silent re-auth was attempted but failed
 *  onError(message: string)   – unrecoverable error, show UI feedback
 */

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

/** @type {Required<AuthCallbacks>} */
let _callbacks = {
    onReady:      () => {},
    onSignIn:     () => {},
    onSignOut:    () => {},
    onSilentFail: () => {},
    onError:      () => {},
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * @typedef {object} AuthCallbacks
 * @property {() => void}                    [onReady]
 * @property {(data: {accessToken:string}) => void} [onSignIn]
 * @property {() => void}                    [onSignOut]
 * @property {() => void}                    [onSilentFail]
 * @property {(message: string) => void}     [onError]
 */

/**
 * Bootstraps the auth layer. Must be called once on app start.
 *
 * @param {AuthCallbacks} callbacks
 * @returns {Promise<void>}
 */
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

    _callbacks.onSignOut();
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Creates and stores the GIS token client.
 * Separated from `init` so it can be reasoned about independently.
 */
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
    const flowType = _pendingFlowType;
    _pendingFlowType = null;

    if (response.error) {
        _handleFailedFlow(flowType, `OAuth error: ${response.error}`);
        return;
    }

    _accessToken = response.access_token;
    sessionStorage.setItem('google_access_token', _accessToken);

    _callbacks.onSignIn({ accessToken: _accessToken });
}

/**
 * Handles errors fired via the `error_callback` channel of GIS.
 *
 * @param {{ error?: string, type?: string, message?: string }} err
 */
function _onTokenError(err) {
    const flowType = _pendingFlowType;
    _pendingFlowType = null;

    if (isSilentAuthError(err)) {
        // User closed the popup — not an error worth surfacing.
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
    if (flowType === 'silent') {
        _callbacks.onSilentFail();
    } else {
        _callbacks.onError(errorMessage);
    }
}