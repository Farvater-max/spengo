
/**
 * @param {string} accessToken
 * @param {string} url
 * @returns {Promise<Object>}
 */
export async function get(accessToken, url) {
    const res = await fetch(url, { method: 'GET', headers: _headers(accessToken) });
    return _unwrap(res);
}

/**
 * @param {string} accessToken
 * @param {string} url
 * @param {Object} body
 * @returns {Promise<Object>}
 */
export async function post(accessToken, url, body) {
    const res = await fetch(url, {
        method:  'POST',
        headers: _headers(accessToken),
        body:    JSON.stringify(body),
    });
    return _unwrap(res);
}

/**
 * @param {string} accessToken
 * @param {string} url
 * @param {Object} body
 * @returns {Promise<Object>}
 */
export async function put(accessToken, url, body) {
    const res = await fetch(url, {
        method:  'PUT',
        headers: _headers(accessToken),
        body:    JSON.stringify(body),
    });
    return _unwrap(res);
}

function _headers(accessToken) {
    return {
        Authorization:  'Bearer ' + accessToken,
        'Content-Type': 'application/json',
    };
}

async function _unwrap(res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
    return data;
}