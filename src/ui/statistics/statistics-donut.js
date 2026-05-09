import { Chart, DoughnutController, ArcElement, Tooltip } from 'chart.js';
import { formatMoney, sumAmounts } from '../../utils/helpers.js';
import { STATE } from '../../state.js';
import { getI18nValue } from '../../i18n/localization.js';
import { CATEGORIES } from '../../constants/categories.js';
import { onMonthChange } from './statistics-state.js';
import * as SheetsService from '../../services/sheetsService.js';
import { withToken } from '../../services/authService.js';
import {
    groupExpensesByCategory,
    calcPercentage,
} from './statistics-utils.js';

Chart.register(DoughnutController, ArcElement, Tooltip);

// ─── Helpers ──────────────────────────────────────────

function _css(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

// ─── Module state ─────────────────────────────────────

let _donutInstance = null;

// ─── Per-canvas loading overlay ───────────────────────

function _showLoading() {
    _hideLoading();
    const canvas = document.getElementById('stats-donut');
    if (!canvas) return;
    const wrap = canvas.closest('.stats-donut-wrap') ?? canvas.parentElement;
    if (!wrap) return;
    const el = document.createElement('div');
    el.id = 'stats-donut-overlay';
    el.className = 'stats-loading-overlay';
    const spinner = document.createElement('div');
    spinner.className = 'stats-spinner';
    el.appendChild(spinner);
    wrap.appendChild(el);
}

function _hideLoading() {
    document.getElementById('stats-donut-overlay')?.remove();
}

// ─── Public API ───────────────────────────────────────

/**
 * Builds and renders the donut chart for the given period.
 * For the 'year' period, fetches full-year data on demand (cached in statistics-chart).
 * Safe to call multiple times — destroys the previous instance first.
 * @param {'week' | 'month' | 'year'} period
 */
export async function renderDonutChart(year, month) {
    const canvas = document.getElementById('stats-donut');
    if (!canvas) return;

    const titleEl = document.getElementById('stats-by-cat-title');
    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    if (titleEl) titleEl.textContent = isCurrentMonth
        ? getI18nValue('stats.by_cat.month')
        : new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    _showLoading();
    try {
        const { sorted, total } = await buildDonutDataByPeriod(year, month);

        destroyInstanceHelper();

        if (!sorted.length) {
            showDonutEmpty(canvas);
            return;
        }

        hideDonutEmpty(canvas);
        drawDonutChart(canvas, sorted, total);
        drawDonutLegend(sorted, total);
    } finally {
        _hideLoading();
    }
}

// Subscribe once at module load — re-render whenever month changes
onMonthChange(async ({ year, month }) => renderDonutChart(year, month));

// ─── Data ─────────────────────────────────────────────

async function buildDonutDataByPeriod(year, month) {
    const now            = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

    let expenses;
    if (isCurrentMonth) {
        expenses = STATE.expenses.filter(e => {
            const d = new Date(e.date);
            return d.getFullYear() === year && d.getMonth() === month;
        });
    } else {
        const all = await withToken(token =>
            SheetsService.loadExpensesByYear(token, STATE.spreadsheetId, year)
        );
        // Merge with hot-layer edits for this month
        const hot    = STATE.expenses.filter(e => {
            const d = new Date(e.date);
            return d.getFullYear() === year && d.getMonth() === month;
        });
        const hotIds = new Set(hot.map(e => e.id));
        expenses = [
            ...all.filter(e => {
                const d = new Date(e.date);
                return d.getFullYear() === year && d.getMonth() === month && !hotIds.has(e.id);
            }),
            ...hot,
        ];
    }

    const sorted = groupExpensesByCategory(expenses);
    const total  = sumAmounts(expenses);

    return { sorted, total };
}

// ─── Chart ────────────────────────────────────────────

function drawDonutChart(canvas, sorted, total) {
    const labels = sorted.map(([id]) => {
        const cat = CATEGORIES.find(c => c.id === id);
        return cat ? `${cat.emoji} ${cat.label}` : id;
    });
    const data   = sorted.map(([, v]) => v);
    const colors = sorted.map(([id]) => CATEGORIES.find(c => c.id === id)?.color || '#888');

    _donutInstance = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: _css('--color-surface'),
                hoverBorderColor: _css('--color-surface'),
                hoverOffset: 6,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            animation: { duration: 500, easing: 'easeOutQuart' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: _css('--color-surface2'),
                    borderColor: _css('--color-border'),
                    borderWidth: 1,
                    titleColor: _css('--color-muted'),
                    bodyColor: _css('--color-text'),
                    bodyFont:  { family: "'Unbounded', sans-serif", weight: '600', size: 12 },
                    titleFont: { family: "'Manrope', sans-serif", size: 11 },
                    padding: 10,
                    cornerRadius: 10,
                    displayColors: false,
                    callbacks: {
                        label: ctx => {
                            const pct = calcPercentage(ctx.parsed, total);
                            return `${formatMoney(ctx.parsed)}  ·  ${pct}%`;
                        },
                    },
                },
            },
        },
    });
}

// ─── Legend ───────────────────────────────────────────

function drawDonutLegend(sorted, total) {
    const el = document.getElementById('stats-donut-legend');
    if (!el) return;

    el.innerHTML = sorted.map(([id, amount]) => {
        const cat = CATEGORIES.find(c => c.id === id);
        const pct = calcPercentage(amount, total);
        return `
            <div class="donut-legend-item">
                <span class="donut-legend-dot" style="background:${cat?.color || '#888'}"></span>
                <span class="donut-legend-emoji">${cat?.emoji || ''}</span>
                <span class="donut-legend-label">${cat?.label || id}</span>
                <span class="donut-legend-value">${pct}%</span>
            </div>`;
    }).join('');
}

// ─── Helpers ──────────────────────────────────────────

function destroyInstanceHelper() {
    if (_donutInstance) {
        _donutInstance.destroy();
        _donutInstance = null;
    }
}

function showDonutEmpty(canvas) {
    const card   = canvas.closest('.stats-donut-card');
    const empty  = card?.querySelector('.stats-donut-empty');
    const txt    = card?.querySelector('#stats-donut-empty-text');
    const legend = document.getElementById('stats-donut-legend');
    if (empty)  empty.style.display = 'flex';
    if (txt)    txt.textContent = getI18nValue('stats.empty');
    if (legend) legend.innerHTML = '';
    canvas.style.display = 'none';
}

function hideDonutEmpty(canvas) {
    const empty = canvas.closest('.stats-donut-card')?.querySelector('.stats-donut-empty');
    if (empty) empty.style.display = 'none';
    canvas.style.display = 'block';
}