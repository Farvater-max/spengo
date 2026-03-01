import { STATE } from '../../state.js';
import { CATEGORIES } from '../constants/categories.js';
import { formatMoney, formatDate, isInPeriod, getFilteredExpenses, setText } from '../utils/helpers.js';
import { getI18nValue } from '../i18n/localization.js';
import { deleteExpense } from '../controllers/expenseController.js';
import { setCategoryFilter, selectCategory } from './actions.js';

export function renderUI() {
    renderCategoryFilter();
    renderExpenseList();
    renderSummary();
    renderCategorySelectGrid();
    renderStatistics();
}

export function renderSummary() {
    const total = getFilteredExpenses(STATE).reduce((sum, e) => sum + e.amount, 0);
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

    list.querySelectorAll('[data-delete-id]').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            deleteExpense(btn.dataset.deleteId);
        });
    });

    list.querySelectorAll('.expense-item').forEach(_attachSwipeToReveal);
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
    const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    document.getElementById('stats-total').textContent = formatMoney(total);
    document.getElementById('stats-sub').textContent   = `${monthExpenses.length} ${getI18nValue('stats.ops')}`;

    const byCategory = _groupByCategory(monthExpenses);
    document.getElementById('stats-bar-content').innerHTML = _statsBarsHTML(byCategory);
}

export function updateAvatarUI() {
    const profile = STATE.userProfile;
    if (!profile) return;

    setText('avatar-letter',         profile.letter);
    setText('profile-avatar-letter', profile.letter);

    if (profile.picture) {
        document.getElementById('avatar-btn').innerHTML        = `<img src="${profile.picture}"/>`;
        document.getElementById('profile-avatar-lg').innerHTML = `<img src="${profile.picture}"/>`;
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
                    <span class="expense-date">· ${formatDate(item.date)}</span>
                </div>
            </div>
            <div class="expense-amount">${formatMoney(item.amount)}</div>
            <div class="expense-delete" data-delete-id="${item.id}">🗑</div>
        </div>`;
}

function _groupByCategory(expenses) {
    return expenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
    }, {});
}

function _statsBarsHTML(byCategory) {
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

function _attachSwipeToReveal(el) {
    let startX;
    el.addEventListener('touchstart', e => { startX = e.touches[0].clientX; });
    el.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - startX;
        if (dx < -50)  el.classList.add('swiped');
        else if (dx > 20) el.classList.remove('swiped');
    });
}