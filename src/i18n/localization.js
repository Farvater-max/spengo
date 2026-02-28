import { STORAGE } from '../constants/storage.js';
import { CATEGORIES } from '../constants/categories.js';
import { setText, setHTML } from '../utils/helpers.js';

let TRANSLATIONS = {};
export let LANG   = localStorage.getItem(STORAGE.LANG) || 'en';

/**
 * Fetches and parses localization.json.
 * Must be called before any other i18n function.
 * @returns {Promise<void>}
 */
export async function loadTranslations() {
    try {
        const res  = await fetch('localization.json');
        TRANSLATIONS = await res.json();
    } catch (e) {
        console.warn('Could not load localization.json:', e);
        TRANSLATIONS = { ru: {}, en: {}, es: {} };
    }
}

/**
 * Returns the translated string for the given key,
 * falling back to Russian, then to the raw key.
 * @param {string} key
 * @returns {string}
 */
export function getI18nValue(key) {
    return (TRANSLATIONS[LANG]   && TRANSLATIONS[LANG][key])
        || (TRANSLATIONS['ru']   && TRANSLATIONS['ru'][key])
        || key;
}

/**
 * Switches the active language and re-applies all translations.
 * @param {string} lang - 'ru' | 'en' | 'es'
 * @param {Object} state - Current application STATE (passed in to avoid circular import)
 * @param {Function} onLangChange - Callback to re-render dynamic UI after lang switch
 */
export function setLang(lang, state, onLangChange) {
    LANG = lang;
    localStorage.setItem(STORAGE.LANG, lang);
    applyTranslations(state, onLangChange);
}

/**
 * Writes all static i18n strings to the DOM.
 *
 * @param {Object|null} state - Current application STATE; pass null before auth
 * @param {Function|null} onLangChange - Called after DOM update to re-render dynamic parts
 */
export function applyTranslations(state = null, onLangChange = null) {
    ['ru', 'en', 'es'].forEach(l => {
        const el = document.getElementById('main-lang-' + l);
        if (el) el.classList.toggle('active', LANG === l);
    });

    setText('auth-logo',     getI18nValue('auth.logo'));
    setText('header-logo',   getI18nValue('auth.logo'));
    setText('auth-tagline',  getI18nValue('auth.tagline'));
    setHTML('auth-title',    getI18nValue('auth.title'));
    setText('auth-featureOne',     getI18nValue('auth.featureOne'));
    setText('auth-featureTwo',     getI18nValue('auth.featureTwo'));
    setText('auth-btn-text', getI18nValue('auth.btn'));
    setText('auth-note',     getI18nValue('auth.note'));

    setText('period-day',   getI18nValue('period.day'));
    setText('period-week',  getI18nValue('period.week'));
    setText('period-month', getI18nValue('period.month'));

    const periodKeys = {
        day:   'period.label.day',
        week:  'period.label.week',
        month: 'period.label.month',
    };
    const currentPeriod = state?.currentPeriod || 'day';
    setText('summary-label', getI18nValue(periodKeys[currentPeriod]));

    // Main screen
    setText('cat-all-label',      getI18nValue('cat.all'));
    setText('section-expenses',   getI18nValue('section.expenses'));

    // Stats screen
    setText('stats-header-title', getI18nValue('stats.title'));
    setText('stats-total-label',  getI18nValue('stats.total_label'));
    setText('stats-by-cat-title', getI18nValue('stats.by_cat'));

    // Nav
    setText('nav-home-label',  getI18nValue('nav.home'));
    setText('nav-stats-label', getI18nValue('nav.stats'));

    // Add modal
    setText('modal-add-title', getI18nValue('modal.add.title'));
    setText('label-amount',    getI18nValue('label.amount'));
    setText('label-category',  getI18nValue('label.category'));
    setText('label-comment',   getI18nValue('label.comment'));

    const commentInput = document.getElementById('input-comment');
    if (commentInput) commentInput.placeholder = getI18nValue('placeholder.comment');

    setText('profile-explain',     getI18nValue('auth.featureOne'));
    setText('profile-open-sheet-label', getI18nValue('profile.open_sheet'));
    setText('profile-sign-out-label',   getI18nValue('profile.sign_out'));

    const submitBtn = document.getElementById('btn-add-submit');
    if (submitBtn && !submitBtn.disabled) submitBtn.textContent = getI18nValue('btn.add');

    updateCategoryLabels();

    onLangChange?.();
}

/**
 * Overwrites each category's label with the current language string.
 * Mutates CATEGORIES in-place — intentional, as it's a shared singleton.
 */
export function updateCategoryLabels() {
    const map = {
        food:      'cat.food',
        transport: 'cat.transport',
        home:      'cat.home',
        health:    'cat.health',
        fun:       'cat.fun',
        sport:     'cat.sport',
        clothes:   'cat.clothes',
        school:    'cat.school',
        other:     'cat.other',
    };
    CATEGORIES.forEach(cat => {
        if (map[cat.id]) cat.label = getI18nValue(map[cat.id]);
    });
}