import { STATE } from '../../state.js';
import {
    renderSummary,
    renderExpenseList,
    renderCategoryFilter,
    renderStatistics,
} from './renderer.jsx';

/**
 * @param {string} catId
 */
export function setCategoryFilter(catId) {
    STATE.currentCategoryFilter = catId;
    renderCategoryFilter();
    renderExpenseList();
    renderSummary();
}

export function openGoogleSheet() {
    if (STATE.spreadsheetId) {
        window.open(`https://docs.google.com/spreadsheets/d/${STATE.spreadsheetId}`, '_blank');
    }
}