import { STORAGE } from '../constants/storage.js';
import { CATEGORIES } from '../constants/categories.js';

let TRANSLATIONS = {};
export let LANG = localStorage.getItem(STORAGE.LANG) || 'en';

export async function loadTranslations() {
    try {
        const res = await fetch('localization.json');
        TRANSLATIONS = await res.json();
    } catch (e) {
        console.warn('Could not load localization.json:', e);
        TRANSLATIONS = { ru: {}, en: {}, es: {}, pl: {}, cs: {} };
    }
}

export function getI18nValue(key) {
    return (TRANSLATIONS[LANG] && TRANSLATIONS[LANG][key])
        || (TRANSLATIONS['en'] && TRANSLATIONS['en'][key])
        || key;
}

export function setLang(lang, state, onLangChange) {
    LANG = lang;
    localStorage.setItem(STORAGE.LANG, lang);
    applyTranslations(state, onLangChange);
}

/**
 * Auth screen, nav labels и section title переехали в React.
 * Здесь остались только updateCategoryLabels и колбэк.
 */
export function applyTranslations(state = null, onLangChange = null) {
    updateCategoryLabels();
    onLangChange?.();
}

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