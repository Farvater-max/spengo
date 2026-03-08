import { STATE } from '../../state.js';
import { CATEGORIES } from '../constants/categories.js';
import { formatMoney, formatDate, isInPeriod, getFilteredExpenses, setText, sumAmounts } from '../utils/helpers.js';
import { getI18nValue } from '../i18n/localization.js';
import { openEditModal } from '../controllers/expenseController.js';
import { setCategoryFilter, selectCategory } from './actions.js';
import { renderChart } from './statistics-chart.js';

export function renderUI() {
    renderCategoryFilter();
    renderExpenseList();
    renderSummary();
    renderCategorySelectGrid();
    renderStatistics();
}

export function renderSummary() {
    const total = sumAmounts(getFilteredExpenses(STATE));
    document.getElementById('summary-num').textContent   = formatMoney(total);
    document.getElementById('summary-label').textContent = _periodLabel(STATE.currentPeriod);
}

export function renderExpenseList() {
    const list     = document.getElementById('expense-list');
    const expenses = getFilteredExpenses(STATE).slice().reverse();

    if (!expenses.length) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🌱</div>
                <p>${getI18nValue('empty.no_period')}</p>
            </div>`;
        return;
    }

    list.innerHTML = expenses.map((item, i) => _expenseItemHTML(item, i)).join('');

    list.querySelectorAll('[data-edit-id]').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            openEditModal(btn.dataset.editId);
        });
    });
}

export function renderCategoryFilter() {
    const row  = document.getElementById('cat-filter-row');
    const cats = ['all', ...new Set(STATE.expenses.map(e => e.category))];

    row.innerHTML = '';
    cats.forEach(catId => {
        const pill = _categoryPill(catId);
        pill.addEventListener('click', () => setCategoryFilter(catId, pill));
        row.appendChild(pill);
    });
}

export function renderCategorySelectGrid() {
    const grid = document.getElementById('cat-select-grid');
    grid.innerHTML = '';

    CATEGORIES.forEach(cat => {
        const el = document.createElement('div');
        el.className = `cat-option${STATE.selectedCat === cat.id ? ' selected' : ''}`;
        el.innerHTML = `<div class="cat-emoji">${cat.emoji}</div><div>${cat.label}</div>`;
        el.addEventListener('mousedown', e => e.preventDefault());
        el.addEventListener('click', () => selectCategory(cat.id));
        grid.appendChild(el);
    });
}

export function renderStatistics() {
    const monthExpenses = STATE.expenses.filter(e => isInPeriod(e.date, 'month'));
    const total = sumAmounts(monthExpenses);

    document.getElementById('stats-total').textContent = formatMoney(total);
    document.getElementById('stats-sub').textContent   = `${monthExpenses.length} ${getI18nValue('stats.ops')}`;

    renderChart();

    const byCategory = _groupByCategory(monthExpenses);
    document.getElementById('stats-bar-content').innerHTML = statsCategoryBars(byCategory);
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

function _periodLabel(period) {
    return {
        day:   getI18nValue('period.label.day'),
        week:  getI18nValue('period.label.week'),
        month: getI18nValue('period.label.month'),
    }[period];
}

function _categoryPill(catId) {
    const cat   = CATEGORIES.find(x => x.id === catId);
    const isAll = catId === 'all';
    const pill  = document.createElement('div');

    pill.className = `cat-pill${STATE.currentCategoryFilter === catId ? ' active' : ''}`;
    pill.innerHTML = `
        <div class="cat-dot" style="background:${isAll ? '#c8f135' : cat?.color || '#888'}"></div>
        ${isAll ? getI18nValue('cat.all') : (cat?.label || catId)}`;

    return pill;
}

function _expenseItemHTML(item, index) {
    const cat = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[5];
    return `
        <div class="expense-item" style="animation-delay:${index * 30}ms" data-id="${item.id}">
            <div class="expense-icon" style="background:${cat.color}22">${cat.emoji}</div>
            <div class="expense-info">
                <div class="expense-name">${item.comment || cat.label}</div>
                <div class="expense-meta">
                    <span class="expense-cat">${cat.label}</span>
                    <span class="expense-date">${formatDate(item.date)}</span>
                </div>
            </div>
            <div class="expense-amount">${formatMoney(item.amount)}</div>
            <div class="expense-edit" data-edit-id="${item.id}" title="Edit">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </div>
        </div>`;
}

function _groupByCategory(expenses) {
    return expenses.reduce((acc, e) => {
        acc[e.category] = sumAmounts([{ amount: acc[e.category] || 0 }, { amount: e.amount }]);
        return acc;
    }, {});
}

function statsCategoryBars(byCategory) {
    const sorted = Object.entries(byCategory).sort(([, a], [, b]) => b - a);
    if (!sorted.length) {
        return `<div style="color:var(--muted);font-size:13px">${getI18nValue('stats.empty')}</div>`;
    }

    const max = sorted[0][1];
    return sorted.map(([catId, amount]) => {
        const cat = CATEGORIES.find(c => c.id === catId) || CATEGORIES[5];
        const pct = Math.round(amount / max * 100);
        return `
            <div class="bar-item">
                <div class="bar-row">
                    <div class="bar-label">${cat.emoji} ${cat.label}</div>
                    <div class="bar-value">${formatMoney(amount)}</div>
                </div>
                <div class="bar-track">
                    <div class="bar-fill" style="width:${pct}%;background:${cat.color}"></div>
                </div>
            </div>`;
    }).join('');
}