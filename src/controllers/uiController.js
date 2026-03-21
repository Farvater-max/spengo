import { STATE } from '../state.js';

/**
 * uiController.js
 *
 * Single owner of UI state mutations (currentPeriod, currentCategoryFilter,
 * selectedCat). Writing to STATE automatically triggers the render functions
 * registered in initReactiveBindings() — no manual render() calls needed here.
 *
 * Rule: one function per user action, one STATE write per function.
 */

/**
 * Changes the active category filter on the main screen.
 * Triggers: renderCategoryFilter, renderExpenseList, renderSummary.
 *
 * @param {string} catId
 */
export function selectCategory(catId) {
    STATE.currentCategoryFilter = catId;
}

/**
 * Changes the active time period on the main screen.
 * Triggers: renderSummary, renderExpenseList.
 *
 * @param {string} period  'day' | 'week' | 'month'
 */
export function selectPeriod(period) {
    STATE.currentPeriod = period;
}

/**
 * Sets the selected category inside the add-expense form.
 * Triggers: renderCategorySelectGrid, renderCategoryEditGrid.
 *
 * @param {string} catId
 */
export function selectAddCategory(catId) {
    STATE.selectedCat = catId;
}

/**
 * Sets the selected category inside the edit-expense form.
 * Triggers: renderCategorySelectGrid, renderCategoryEditGrid.
 *
 * @param {string} catId
 */
export function selectEditCategory(catId) {
    STATE.selectedCat = catId;
}