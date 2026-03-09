import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import { formatMoney, sumAmounts, isInPeriod } from '../../utils/helpers.js';
import { STATE } from '../../../state.js';
import { getI18nValue } from '../../i18n/localization.js';
import { getPeriod, setPeriod, onPeriodChange } from './statistics-state.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

// ─── Constants ────────────────────────────────────────

const ACCENT      = '#c8f135';
const ACCENT_DIM  = '#c8f13560';
const ACCENT2_DIM = '#7b61ff60';
const GRID_COLOR  = '#2a2a3230';
const TEXT_COLOR  = '#6b6b7e';

// ─── Module state ─────────────────────────────────────

let _chartInstance = null;

// ─── Public API ───────────────────────────────────────

/**
 * Initialises the bar chart: binds period buttons, subscribes to period
 * changes, and renders for the current period.
 * Safe to call multiple times — re-binds buttons and re-renders.
 */
export function renderChart() {
    bindPeriodButtons();
    renderingChartByPeriod(getPeriod());
    updateStatsTotals(getPeriod());
}

/**
 * Updates the totals block (label, amount, transaction count)
 * for the given period.
 * @param {'week' | 'month' | 'year'} period
 */
export function updateStatsTotals(period) {
    const now = new Date();

    const filtered = STATE.expenses.filter(e => {
        if (period === 'week')  return isInPeriod(e.date, 'week');
        if (period === 'month') return isInPeriod(e.date, 'month');
        if (period === 'year')  return new Date(e.date).getFullYear() === now.getFullYear();
    });

    const labelMap = {
        week:  getI18nValue('stats.total_label.week'),
        month: getI18nValue('stats.total_label.month'),
        year:  getI18nValue('stats.total_label.year'),
    };

    document.getElementById('stats-total-label').textContent = labelMap[period];
    document.getElementById('stats-total').textContent       = formatMoney(sumAmounts(filtered));
    document.getElementById('stats-sub').textContent         = `${filtered.length} ${getI18nValue('stats.ops')}`;
}

// ─── Period buttons ───────────────────────────────────

function bindPeriodButtons() {
    const map = {
        'chart-period-week':  'week',
        'chart-period-month': 'month',
        'chart-period-year':  'year',
    };

    Object.entries(map).forEach(([id, period]) => {
        const btn = document.getElementById(id);
        if (!btn) return;

        // Replace node to wipe stale listeners
        const fresh = btn.cloneNode(true);
        btn.parentNode.replaceChild(fresh, btn);

        document.getElementById(id).addEventListener('click', () => {
            document.querySelectorAll('.chart-period-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            setPeriod(period); // notifies all subscribers — chart + donut
        });
    });

    // Set localised button labels
    document.getElementById('chart-period-week').textContent  = getI18nValue('chart.period.week');
    document.getElementById('chart-period-month').textContent = getI18nValue('chart.period.month');
    document.getElementById('chart-period-year').textContent  = getI18nValue('chart.period.year');
}

// ─── Chart rendering ──────────────────────────────────

function renderingChartByPeriod(period) {
    const canvas = document.getElementById('stats-chart');
    if (!canvas) return;

    const { labels, data, barColors } = buildChartDataByPeriod(period);

    if (_chartInstance) {
        _chartInstance.destroy();
        _chartInstance = null;
    }

    _chartInstance = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: barColors,
                borderRadius: 6,
                borderSkipped: false,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 400, easing: 'easeOutQuart' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e1e23',
                    borderColor: '#2a2a32',
                    borderWidth: 1,
                    titleColor: TEXT_COLOR,
                    bodyColor: '#f0f0f5',
                    bodyFont:  { family: "'Unbounded', sans-serif", weight: '600', size: 13 },
                    titleFont: { family: "'Manrope', sans-serif", size: 11 },
                    padding: 10,
                    cornerRadius: 10,
                    displayColors: false,
                    callbacks: { label: ctx => formatMoney(ctx.parsed.y) },
                },
            },
            scales: {
                x: {
                    grid:   { display: false },
                    border: { display: false },
                    ticks:  {
                        color: TEXT_COLOR,
                        font:  { family: "'Manrope', sans-serif", size: 10, weight: '600' },
                        maxRotation: 0,
                    },
                },
                y: {
                    grid:   { color: GRID_COLOR, drawTicks: false },
                    border: { display: false, dash: [4, 4] },
                    ticks:  {
                        color: TEXT_COLOR,
                        font:  { family: "'Manrope', sans-serif", size: 10 },
                        maxTicksLimit: 4,
                        callback: v => v === 0 ? '0' : formatMoney(v),
                    },
                },
            },
        },
    });
}

// Subscribe once at module load — re-render whenever period changes
onPeriodChange(period => {
    renderingChartByPeriod(period);
    updateStatsTotals(period);
});

// ─── Data builders ────────────────────────────────────

function buildChartDataByPeriod(period) {
    if (period === 'week')  return buildWeekData();
    if (period === 'month') return buildMonthData();
    if (period === 'year')  return buildYearData();
    return { labels: [], data: [], barColors: [] };
}

/** 7 bars — Mon–Sun of the current week. Today is highlighted. */
function buildWeekData() {
    const now      = new Date();
    const monday   = _getMonday(now);
    const todayIdx = (now.getDay() + 6) % 7; // Mon = 0

    const labels = [], data = [];

    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        labels.push(_dayLabel(d));
        data.push(sumAmounts(STATE.expenses.filter(e => e.date === _toIso(d))));
    }

    const barColors = data.map((_, i) =>
        i === todayIdx ? ACCENT : ((todayIdx - i) % 2 === 0 ? ACCENT_DIM : ACCENT2_DIM)
    );
    return { labels, data, barColors };
}

/** 4 bars — 3 previous ISO weeks + current week. Current is highlighted. */
function buildMonthData() {
    const now       = new Date();
    const curMonday = _getMonday(now);
    const labels = [], data = [];

    for (let i = 3; i >= 0; i--) {
        const weekMonday = new Date(curMonday);
        weekMonday.setDate(curMonday.getDate() - i * 7);

        const weekSunday = new Date(weekMonday);
        weekSunday.setDate(weekMonday.getDate() + 6);

        const sum = sumAmounts(
            STATE.expenses.filter(e => {
                const d = new Date(e.date);
                return d >= weekMonday && d <= weekSunday;
            })
        );

        labels.push(`${_shortDay(weekMonday)}–${_shortDay(weekSunday)}`);
        data.push(sum);
    }

    const barColors = data.map((_, i, arr) =>
        i === arr.length - 1 ? ACCENT : ((arr.length - 1 - i) % 2 === 0 ? ACCENT_DIM : ACCENT2_DIM)
    );
    return { labels, data, barColors };
}

/** 4 bars — 3 previous months + current month. Current is highlighted. */
function buildYearData() {
    const now = new Date();
    const labels = [], data = [];

    for (let i = 3; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = d.getMonth();
        const y = d.getFullYear();

        const sum = sumAmounts(
            STATE.expenses.filter(e => {
                const ed = new Date(e.date);
                return ed.getFullYear() === y && ed.getMonth() === m;
            })
        );

        labels.push(_monthLabel(d));
        data.push(sum);
    }

    const barColors = data.map((_, i, arr) =>
        i === arr.length - 1 ? ACCENT : ((arr.length - 1 - i) % 2 === 0 ? ACCENT_DIM : ACCENT2_DIM)
    );
    return { labels, data, barColors };
}

// ─── Date helpers ─────────────────────────────────────

function _getMonday(date) {
    const d   = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    d.setHours(0, 0, 0, 0);
    return d;
}

function _toIso(d) {
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}

function _dayLabel(d) {
    return d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase().slice(0, 2);
}

function _shortDay(d) {
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function _monthLabel(d) {
    return d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}