import { STATE } from '../../state.js';
import { setLang } from '../i18n/localization.js';
import {
    renderSummary,
    renderExpenseList,
    renderCategoryFilter,
    renderCategorySelectGrid,
    renderCategoryEditGrid,
    renderStatistics,
} from './renderer.jsx';

/**
 * @param {'day'|'week'|'month'} period
 * @param {HTMLElement} btn
 */
export function setPeriod(period, btn) {
    STATE.currentPeriod = period;
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderSummary();
    renderExpenseList();
}

/**
 * @param {string} catId
 */
export function setCategoryFilter(catId) {
    STATE.currentCategoryFilter = catId;
    renderCategoryFilter();
    renderExpenseList();
    renderSummary();
}

export function changeLang(lang) {
    setLang(lang, STATE, () => {
        renderExpenseList();
        renderStatistics();
        renderCategoryFilter();
        renderCategorySelectGrid();
        renderCategoryEditGrid();
        renderSummary();
    });
}

export function openGoogleSheet() {
    if (STATE.spreadsheetId) {
        window.open(`https://docs.google.com/spreadsheets/d/${STATE.spreadsheetId}`, '_blank');
    }
}