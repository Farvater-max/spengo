import { STATE } from '../../state.js';
import { setLang } from '../i18n/localization.js';
import {
    renderSummary,
    renderExpenseList,
    renderCategoryFilter,
    renderCategorySelectGrid,
    renderStatistics,
} from './renderer.js';
import { openModal } from './navigation.js';

/**
 * @param {'day'|'week'|'month'} period
 * @param {HTMLElement} btn - clicking button
 */
export function setPeriod(period, btn) {
    STATE.currentPeriod = period;
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderSummary();
    renderExpenseList();
}

/**
 * @param {string} catId — category id or 'all'
 * @param {HTMLElement} el — clicking pills
 */
export function setCategoryFilter(catId, el) {
    STATE.currentCategoryFilter = catId;
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    renderExpenseList();
    renderSummary();
}

/**
 * @param {string} catId - category id
 */
export function selectCategory(catId) {
    STATE.selectedCat = catId;
    renderCategorySelectGrid();
}

export function changeLang(lang) {
    setLang(lang, STATE, () => {
        renderExpenseList();
        renderStatistics();
        renderCategoryFilter();
    });
}

export function openAddModal() {
    STATE.selectedCat = 'food';
    document.getElementById('input-amount').value  = '';
    document.getElementById('input-comment').value = '';
    renderCategorySelectGrid();
    openModal('modal-add');
    setTimeout(() => document.getElementById('input-amount').focus(), 350);
}

export function openGoogleSheet() {
    if (STATE.spreadsheetId) {
        window.open(`https://docs.google.com/spreadsheets/d/${STATE.spreadsheetId}`, '_blank');
    }
}