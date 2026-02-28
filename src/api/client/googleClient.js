import { CONFIG } from '../../constants/config.js';

/**
 * Revokes an OAuth2 access token so it can no longer be used.
 * Errors are intentionally swallowed — a failed revocation should
 * never block the local sign-out flow.
 *
 * @param {string} accessToken
 * @returns {Promise<void>}
 */
export async function revokeToken(accessToken) {
    try {
        await fetch(
            `${CONFIG.REVOKE_URL}?token=${encodeURIComponent(accessToken)}`,
            { method: 'POST' }
        );
    } catch {
        // Network failure during revocation is non-fatal; ignore silently.
    }
}

/**
 * Initialises the GAPI client with a given API key.
 * Wraps the callback-based `gapi.load` / `gapi.client.init` in a Promise.
 *
 * @param {string} apiKey
 * @returns {Promise<void>}
 */
export function initGapiClient(apiKey) {
    return new Promise((resolve, reject) => {
        gapi.load('client', async () => {
            try {
                await gapi.client.init({ apiKey, discoveryDocs: [] });
                resolve();
            } catch (err) {
                reject(new Error('GAPI client init failed: ' + (err?.message ?? JSON.stringify(err))));
            }
        });
    });
}