import { STATE } from '../../state.js';
import { getFilteredExpenses, setText, sumAmounts } from '../utils/helpers.js';
import { openEditModal } from '../controllers/expenseController.js';
import { renderChart } from './statistics/statistics-chart.js';
import { renderDonutChart } from './statistics/statistics-donut.js';
import { getPeriod } from './statistics/statistics-state.js';
import { createRoot } from 'react-dom/client';
import { ExpenseList }        from './components/ExpenseList.jsx';
import { CategoryFilter }     from './components/CategoryFilter.jsx';
import { CategorySelectGrid } from './components/CategorySelectGrid.jsx';
import { SummaryCard }        from './components/SummaryCard.jsx';
import { AddExpenseModal }    from './components/AddExpenseModal.jsx';
import { EditExpenseModal }   from './components/EditExpenseModal.jsx';

export function renderUI() {
    renderSummary();
    renderCategoryFilter();
    renderExpenseList();
    renderCategorySelectGrid();
    renderCategoryEditGrid();
    renderStatistics();
}

// ─── SummaryCard ──────────────────────────────────────

let _summaryRoot = null;

export function renderSummary() {
    const container = document.getElementById('summary-card-root');
    if (!container) return;
    if (!_summaryRoot) _summaryRoot = createRoot(container);

    const total = sumAmounts(getFilteredExpenses(STATE));

    _summaryRoot.render(
        <SummaryCard
            total={total}
            currentPeriod={STATE.currentPeriod}
            onPeriodChange={period => {
                STATE.currentPeriod = period;
                renderSummary();
                renderExpenseList();
            }}
        />
    );
}

// ─── ExpenseList ──────────────────────────────────────

let _expenseListRoot = null;

export function renderExpenseList() {
    const container = document.getElementById('expense-list');
    if (!container) return;
    if (!_expenseListRoot) _expenseListRoot = createRoot(container);

    _expenseListRoot.render(
        <ExpenseList
            expenses={STATE.expenses}
            currentPeriod={STATE.currentPeriod}
            currentCategoryFilter={STATE.currentCategoryFilter}
            onEdit={openEditModal}
        />
    );
}

// ─── CategoryFilter ───────────────────────────────────

let _categoryFilterRoot = null;

export function renderCategoryFilter() {
    const container = document.getElementById('cat-filter-row');
    if (!container) return;
    if (!_categoryFilterRoot) _categoryFilterRoot = createRoot(container);

    _categoryFilterRoot.render(
        <CategoryFilter
            expenses={STATE.expenses}
            activeCat={STATE.currentCategoryFilter}
            onSelect={catId => {
                STATE.currentCategoryFilter = catId;
                renderCategoryFilter();
                renderExpenseList();
                renderSummary();
            }}
        />
    );
}

// ─── CategorySelectGrid (add modal) ───────────────────

let _catSelectRoot = null;

export function renderCategorySelectGrid() {
    const container = document.getElementById('cat-select-grid');
    if (!container) return;
    if (!_catSelectRoot) _catSelectRoot = createRoot(container);

    _catSelectRoot.render(
        <CategorySelectGrid
            selectedCat={STATE.selectedCat}
            onSelect={catId => {
                STATE.selectedCat = catId;
                renderCategorySelectGrid();
                renderCategoryEditGrid();
            }}
        />
    );
}

// ─── CategoryEditGrid (edit modal) ────────────────────

let _catEditRoot = null;

export function renderCategoryEditGrid() {
    const container = document.getElementById('cat-edit-grid');
    if (!container) return;
    if (!_catEditRoot) _catEditRoot = createRoot(container);

    _catEditRoot.render(
        <CategorySelectGrid
            selectedCat={STATE.selectedCat}
            onSelect={catId => {
                STATE.selectedCat = catId;
                renderCategorySelectGrid();
                renderCategoryEditGrid();
            }}
        />
    );
}

// ─── AddExpenseModal ──────────────────────────────────

let _addModalRoot = null;

export function renderAddModal({ open = false, loading = false, onSubmit, onClose }) {
    const container = document.getElementById('modal-add-root');
    if (!container) return;
    if (!_addModalRoot) _addModalRoot = createRoot(container);

    if (!open) {
        _addModalRoot.render(null);
        return;
    }

    _addModalRoot.render(
        <AddExpenseModal
            initialCat={STATE.selectedCat || 'food'}
            loading={loading}
            onSubmit={onSubmit}
            onClose={onClose}
        />
    );
}

// ─── EditExpenseModal ─────────────────────────────────

let _editModalRoot = null;

export function renderEditModal({ expense = null, loading = false, onUpdate, onDelete, onClose }) {
    const container = document.getElementById('modal-edit-root');
    if (!container) return;
    if (!_editModalRoot) _editModalRoot = createRoot(container);

    _editModalRoot.render(
        <EditExpenseModal
            expense={expense}
            loading={loading}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onClose={onClose}
        />
    );
}

// ─── Statistics ───────────────────────────────────────

export function renderStatistics() {
    renderChart();
    renderDonutChart(getPeriod());
}

export function updateAvatarUI() {
    const profile = STATE.userProfile;
    if (!profile) return;

    setText('avatar-letter',         profile.letter);
    setText('stats-avatar-letter',   profile.letter);
    setText('profile-avatar-letter', profile.letter);

    if (profile.picture) {
        const pic = `<img src="${profile.picture}"/>`;
        document.getElementById('avatar-btn').innerHTML       = pic;
        document.getElementById('stats-avatar-btn').innerHTML = pic;
        document.getElementById('profile-avatar-lg').innerHTML = pic;
    }
}