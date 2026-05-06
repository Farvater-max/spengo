import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import { formatMoney, sumAmounts, isInPeriod } from '../../utils/helpers.js';
import { STATE } from '../../state.js';
import { getI18nValue } from '../../i18n/localization.js';
import { getPeriod, onPeriodChange } from './statistics-state.js';
import * as SheetsService from '../../services/sheetsService.js';
import { withToken } from '../../services/authService.js';
import {
    getMonday,
    toIso,
    getDayLabel,
    getShortDay,
    getMonthLabel,
    buildWeekBarColors,
    buildPeriodBarColors,
    filterExpensesByPeriod,
} from './statistics-utils.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

// ─── Helpers ──────────────────────────────────────────

function _css(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

// ─── Module state ─────────────────────────────────────

let _chartInstance = null;

/**
 * Cache stores only raw server data. Hot-layer (STATE.expenses) is always
 * merged on top at read time, so the cache never needs invalidation when
 * the user adds/edits/deletes expenses within the same session.
 * @type {Object<number, Array>}
 */
const _yearCache = {};

// ─── Year data loader ─────────────────────────────────

/**
 * Returns expenses for the given year by merging:
 *   1. Sheet data (fetched once and cached per year)
 *   2. Hot-layer from STATE.expenses (always re-read so new/edited/deleted
 *      expenses are reflected immediately without needing clearYearCache)
 * @param {number} year
 * @returns {Promise<Array>}
 */
async function _getYearExpenses(year) {
    if (!_yearCache[year]) {
        // Cache only the raw server data — hot-layer is NOT baked in.
        _yearCache[year] = await withToken(token =>
            SheetsService.loadExpensesByYear(token, STATE.spreadsheetId, year)
        );
    }

    // Always re-merge fresh hot-layer so add/edit/delete is instantly visible
    // in year view without needing clearYearCache() to be called externally.
    const prefix = String(year);
    const hot    = STATE.expenses.filter(e => e.date.startsWith(prefix));
    const hotIds = new Set(hot.map(e => e.id));
    return [
        ..._yearCache[year].filter(e => !hotIds.has(e.id)),
        ...hot,
    ];
}

/**
 * Invalidates the server-data cache for a given year.
 * Only needed when Sheet data may have changed outside the current session
 * (e.g. a collaborator added expenses). Within the same session the
 * hot-layer merge in _getYearExpenses handles freshness automatically.
 * @param {number} year
 */
export function clearYearCache(year) {
    delete _yearCache[year];
}

// ─── Per-canvas loading overlay ───────────────────────

function _showCanvasLoading(canvasId) {
    _hideCanvasLoading(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const wrap = canvas.closest('.stats-chart-wrap') ?? canvas.parentElement;
    if (!wrap) return;
    const el = document.createElement('div');
    el.id = `${canvasId}-overlay`;
    el.className = 'stats-loading-overlay';
    const spinner = document.createElement('div');
    spinner.className = 'stats-spinner';
    el.appendChild(spinner);
    wrap.appendChild(el);
}

function _hideCanvasLoading(canvasId) {
    document.getElementById(`${canvasId}-overlay`)?.remove();
}

// ─── Empty state helpers ──────────────────────────────

function _showChartEmpty(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    canvas.style.display = 'none';
    const empty = document.getElementById(`${canvasId}-empty`);
    if (empty) {
        empty.style.display = 'flex';
        const txt = document.getElementById(`${canvasId}-empty-text`);
        if (txt) txt.textContent = getI18nValue('stats.empty');
    }
}

function _hideChartEmpty(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (canvas) canvas.style.display = 'block';
    const empty = document.getElementById(`${canvasId}-empty`);
    if (empty) empty.style.display = 'none';
}

// ─── Public API ───────────────────────────────────────

export async function renderChart() {
    const period = getPeriod();
    if (period === 'year') _showCanvasLoading('stats-chart');
    try {
        await renderingChartByPeriod(period);
        await updateStatsTotals(period);
    } finally {
        _hideCanvasLoading('stats-chart');
    }
}

export async function updateStatsTotals(period) {
    const now = new Date();

    const source = period === 'year'
        ? await _getYearExpenses(now.getFullYear())
        : STATE.expenses;

    const filtered = filterExpensesByPeriod(source, period, isInPeriod, now);

    const labelMap = {
        week:  getI18nValue('stats.total_label.week'),
        month: getI18nValue('stats.total_label.month'),
        year:  getI18nValue('stats.total_label.year'),
    };

    const labelEl = document.getElementById('stats-total-label');
    const totalEl = document.getElementById('stats-total');
    const subEl   = document.getElementById('stats-sub');

    if (labelEl) labelEl.textContent = labelMap[period];
    if (totalEl) totalEl.textContent = formatMoney(sumAmounts(filtered));
    if (subEl)   subEl.textContent   = `${filtered.length} ${getI18nValue('stats.ops')}`;
}

// ─── Chart rendering ──────────────────────────────────

async function renderingChartByPeriod(period) {
    const canvas = document.getElementById('stats-chart');
    if (!canvas) return;

    const { labels, data, barColors } = await buildChartDataByPeriod(period);

    if (_chartInstance) {
        _chartInstance.destroy();
        _chartInstance = null;
    }

    const allZero = data.every(v => !v || v <= 0);
    if (allZero) {
        _showChartEmpty('stats-chart');
        return;
    }
    _hideChartEmpty('stats-chart');

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
                    backgroundColor: _css('--color-surface2'),
                    borderColor: _css('--color-border'),
                    borderWidth: 1,
                    titleColor: _css('--color-muted'),
                    bodyColor: _css('--color-text'),
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
                        color: _css('--color-muted'),
                        font:  { family: "'Manrope', sans-serif", size: 10, weight: '600' },
                        maxRotation: 0,
                    },
                },
                y: {
                    grid:   { color: _css('--color-border') + '50', drawTicks: false },
                    border: { display: false, dash: [4, 4] },
                    ticks:  {
                        color: _css('--color-muted'),
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
onPeriodChange(async period => {
    if (period === 'year') _showCanvasLoading('stats-chart');
    try {
        await renderingChartByPeriod(period);
        await updateStatsTotals(period);
    } finally {
        _hideCanvasLoading('stats-chart');
    }
});

// ─── Data builders ────────────────────────────────────

async function buildChartDataByPeriod(period) {
    if (period === 'week')  return buildWeekData();
    if (period === 'month') return buildMonthData();
    if (period === 'year')  return await buildYearData();
    return { labels: [], data: [], barColors: [] };
}

function buildWeekData() {
    const now      = new Date();
    const monday   = getMonday(now);
    const todayIdx = (now.getDay() + 6) % 7;

    const labels = [], data = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        labels.push(getDayLabel(d));
        data.push(sumAmounts(STATE.expenses.filter(e => e.date === toIso(d))));
    }

    const barColors = buildWeekBarColors(data.length, todayIdx);
    return { labels, data, barColors };
}

function buildMonthData() {
    const now       = new Date();
    const curMonday = getMonday(now);
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
        labels.push(`${getShortDay(weekMonday)}–${getShortDay(weekSunday)}`);
        data.push(sum);
    }

    const barColors = buildPeriodBarColors(data.length);
    return { labels, data, barColors };
}

async function buildYearData() {
    const now      = new Date();
    const expenses = await _getYearExpenses(now.getFullYear());
    const labels = [], data = [];

    for (let i = 3; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = d.getMonth();
        const y = d.getFullYear();
        const sum = sumAmounts(
            expenses.filter(e => {
                const ed = new Date(e.date);
                return ed.getFullYear() === y && ed.getMonth() === m;
            })
        );
        labels.push(getMonthLabel(d));
        data.push(sum);
    }

    const barColors = buildPeriodBarColors(data.length);
    return { labels, data, barColors };
}