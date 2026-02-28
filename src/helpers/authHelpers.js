/**
 * Polls window until both Google SDK libraries are available,
 * then resolves. Rejects after `timeoutMs` if they never arrive.
 *
 * @param {object}  [opts]
 * @param {number}  [opts.intervalMs=100]
 * @param {number}  [opts.timeoutMs=10000]
 * @returns {Promise<void>}
 */
export function waitForGoogleSdk({ intervalMs = 100, timeoutMs = 10000 } = {}) {
    return new Promise((resolve, reject) => {
        if (window.gapi && window.google) {
            resolve();
            return;
        }

        const deadline = Date.now() + timeoutMs;

        const timer = setInterval(() => {
            if (window.gapi && window.google) {
                clearInterval(timer);
                resolve();
                return;
            }
            if (Date.now() >= deadline) {
                clearInterval(timer);
                reject(new Error(
                    'Google SDK did not load within the timeout. ' +
                    'Check your internet connection and reload the page.'
                ));
            }
        }, intervalMs);
    });
}

/**
 * Builds the config object for `google.accounts.oauth2.initTokenClient()`.
 *
 * @param {object}   opts
 * @param {string}   opts.clientId
 * @param {string}   opts.scopes
 * @param {Function} opts.onToken   - called with the token response
 * @param {Function} opts.onError   - called on auth errors
 * @returns {object}
 */
export function buildTokenClientConfig({ clientId, scopes, onToken, onError }) {
    return {
        client_id:      clientId,
        scope:          scopes,
        callback:       onToken,
        error_callback: onError,
    };
}

/**
 * Returns `true` for benign flow interruptions that should not surface
 * as errors to the user (e.g. user closed the popup).
 *
 * @param {{ error?: string, type?: string }} err
 * @returns {boolean}
 */
export function isSilentAuthError(err) {
    return err?.error === 'access_denied' || err?.type === 'popup_closed';
}

/**
 * Extracts a human-readable message from a GIS / OAuth error object.
 *
 * @param {{ message?: string, error?: string, type?: string }} err
 * @returns {string}
 */
export function formatAuthError(err) {
    return err?.message ?? err?.error ?? err?.type ?? JSON.stringify(err);
}