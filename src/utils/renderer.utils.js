/**
 * Returns the opposite sort direction.
 * @param {'asc' | 'desc'} dir
 * @returns {'asc' | 'desc'}
 */
export function nextSortDir(dir) {
    return dir === 'desc' ? 'asc' : 'desc';
}

/**
 * Returns the opposite sort field.
 * @param {'date' | 'amount'} field
 * @returns {'date' | 'amount'}
 */
export function nextSortField(field) {
    return field === 'date' ? 'amount' : 'date';
}

/**
 * Resolves the i18n label for a sort field.
 * @param {'date' | 'amount'} field
 * @param {(key: string) => string} t  - i18n lookup function
 * @returns {string}
 */
export function getSortFieldLabel(field, t) {
    return t(field === 'date' ? 'sort.date' : 'sort.amount');
}

/**
 * Returns the three SVG line x2 values for the sort direction icon.
 * desc → lines decrease left-to-right (13, 9, 5).
 * asc  → lines increase left-to-right (5, 9, 13).
 * @param {'asc' | 'desc'} dir
 * @returns {Array<{ x2: number }>}
 */
export function getSortLines(dir) {
    return dir === 'desc'
        ? [{ x2: 13 }, { x2: 9 }, { x2: 5 }]
        : [{ x2: 5  }, { x2: 9 }, { x2: 13 }];
}

/**
 * Builds a spengo:navigate CustomEvent.
 * @param {'main' | 'stats'} name
 * @returns {CustomEvent}
 */
export function buildNavEvent(name) {
    return new CustomEvent('spengo:navigate', { detail: { name } });
}