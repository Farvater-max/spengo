import { Chart, DoughnutController, ArcElement, Tooltip } from 'chart.js';
import { formatMoney, sumAmounts, isInPeriod } from '../../utils/helpers.js';
import { STATE } from '../../../state.js';
import { getI18nValue } from '../../i18n/localization.js';
import { CATEGORIES } from '../../constants/categories.js';
import { onPeriodChange } from './statistics-state.js';

Chart.register(DoughnutController, ArcElement, Tooltip);

// ─── Module state ─────────────────────────────────────

let _donutInstance = null;

// ─── Public API ───────────────────────────────────────

/**
 * Builds and renders the donut chart for the given period.
 * Safe to call multiple times — destroys the previous instance first.
 * @param {'week' | 'month' | 'year'} period
 */
export function renderDonutChart(period = 'month') {
    const canvas = document.getElementById('stats-donut');
    if (!canvas) return;

    const titleEl = document.getElementById('stats-by-cat-title');
    if (titleEl) titleEl.textContent = getI18nValue(`stats.by_cat.${period}`);

    const { sorted, total } = buildDonutDataByPeriod(period);

    destroyInstanceHelper();

    if (!sorted.length) {
        showDonutEmpty(canvas);
        return;
    }

    hideDonutEmpty(canvas);
    drawDonutChart(canvas, sorted, total);
    drawDonutLegend(sorted, total);
}

// Subscribe once at module load — re-render whenever period changes
onPeriodChange(period => renderDonutChart(period));

// ─── Data ─────────────────────────────────────────────

function buildDonutDataByPeriod(period) {
    const now = new Date();

    const expenses = STATE.expenses.filter(e => {
        if (period === 'week')  return isInPeriod(e.date, 'week');
        if (period === 'month') return isInPeriod(e.date, 'month');
        if (period === 'year')  return new Date(e.date).getFullYear() === now.getFullYear();
        return false;
    });

    const grouped = expenses.reduce((acc, e) => {
        acc[e.category] = sumAmounts([{ amount: acc[e.category] || 0 }, { amount: e.amount }]);
        return acc;
    }, {});

    const sorted = Object.entries(grouped).sort(([, a], [, b]) => b - a);
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
                borderColor: '#151518',
                hoverBorderColor: '#151518',
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
                    backgroundColor: '#1e1e23',
                    borderColor: '#2a2a32',
                    borderWidth: 1,
                    titleColor: '#6b6b7e',
                    bodyColor: '#f0f0f5',
                    bodyFont:  { family: "'Unbounded', sans-serif", weight: '600', size: 12 },
                    titleFont: { family: "'Manrope', sans-serif", size: 11 },
                    padding: 10,
                    cornerRadius: 10,
                    displayColors: false,
                    callbacks: {
                        label: ctx => {
                            const pct = total > 0 ? Math.round(ctx.parsed / total * 100) : 0;
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
        const pct = total > 0 ? Math.round(amount / total * 100) : 0;
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
    const card  = canvas.closest('.stats-donut-card');
    const empty = card?.querySelector('.stats-donut-empty');
    const txt   = card?.querySelector('#stats-donut-empty-text');
    if (empty) empty.style.display = 'flex';
    if (txt)   txt.textContent = getI18nValue('stats.empty');
    canvas.style.display = 'none';
}

function hideDonutEmpty(canvas) {
    const empty = canvas.closest('.stats-donut-card')?.querySelector('.stats-donut-empty');
    if (empty) empty.style.display = 'none';
    canvas.style.display = 'block';
}