import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import { formatMoney, sumAmounts } from '../../utils/helpers.js';
import { STATE } from '../../state.js';
import { getI18nValue } from '../../i18n/localization.js';
import { getSelectedMonth, onMonthChange } from './statistics-state.js';
import * as SheetsService from '../../services/sheetsService.js';
import { withToken } from '../../services/authService.js';
import {
    toIso,
    getShortDay,
    buildPeriodBarColors,
} from './statistics-utils.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

// ─── Helpers ──────────────────────────────────────────

function _css(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

// ─── Module state ─────────────────────────────────────

let _chartInstance = null;

/**
 * Cache stores only raw server data keyed by "YYYY-MM".
 * Hot-layer (STATE.expenses) is always merged on top at read time.
 * @type {Object<string, Array>}
 */
const _monthCache = {};

// ─── Month data loader ────────────────────────────────

/**
 * Returns expenses for the given year+month by merging:
 *   1. Sheet data (fetched once and cached per month)
 *   2. Hot-layer from STATE.expenses (always re-read)
 * @param {number} year
 * @param {number} month  0-based
 * @returns {Promise<Array>}
 */
async function _getMonthExpenses(year, month) {
    const key    = `${year}-${String(month + 1).padStart(2, '0')}`;
    const now    = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

    if (!_monthCache[key]) {
        if (isCurrentMonth) {
            // Current month: use hot STATE.expenses directly — no extra fetch needed
            _monthCache[key] = [];
        } else {
            _monthCache[key] = await withToken(token =>
                SheetsService.loadExpensesByYear(token, STATE.spreadsheetId, year)
            ).then(all => all.filter(e => {
                const d = new Date(e.date);
                return d.getFullYear() === year && d.getMonth() === month;
            }));
        }
    }

    if (isCurrentMonth) {
        // Current month — hot-layer IS the source of truth
        return STATE.expenses.filter(e => {
            const d = new Date(e.date);
            return d.getFullYear() === year && d.getMonth() === month;
        });
    }

    // Past month — merge cached server data with any hot-layer edits
    const hot    = STATE.expenses.filter(e => {
        const d = new Date(e.date);
        return d.getFullYear() === year && d.getMonth() === month;
    });
    const hotIds = new Set(hot.map(e => e.id));
    return [
        ..._monthCache[key].filter(e => !hotIds.has(e.id)),
        ...hot,
    ];
}

/**
 * Invalidates the server-data cache for a given year+month.
 * @param {number} year
 * @param {number} month  0-based
 */
export function clearMonthCache(year, month) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    delete _monthCache[key];
}

/** @deprecated kept for call-sites that used clearYearCache */
export function clearYearCache(year) {
    Object.keys(_monthCache)
        .filter(k => k.startsWith(`${year}-`))
        .forEach(k => delete _monthCache[k]);
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
    const { year, month } = getSelectedMonth();
    _showCanvasLoading('stats-chart');
    try {
        await _renderChartForMonth(year, month);
        await updateStatsTotals(year, month);
    } finally {
        _hideCanvasLoading('stats-chart');
    }
}

export async function updateStatsTotals(year, month) {
    const expenses = await _getMonthExpenses(year, month);

    const now      = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

    const labelEl = document.getElementById('stats-total-label');
    const totalEl = document.getElementById('stats-total');
    const subEl   = document.getElementById('stats-sub');

    if (labelEl) {
        labelEl.textContent = isCurrentMonth
            ? getI18nValue('stats.total_label.month')
            : new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (totalEl) totalEl.textContent = formatMoney(sumAmounts(expenses));
    if (subEl)   subEl.textContent   = `${expenses.length} ${getI18nValue('stats.ops')}`;
}

// ─── Chart rendering ──────────────────────────────────

async function _renderChartForMonth(year, month) {
    const canvas = document.getElementById('stats-chart');
    if (!canvas) return;

    const { labels, data, barColors } = await _buildMonthData(year, month);

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

// Subscribe once at module load — re-render whenever month changes
onMonthChange(async ({ year, month }) => {
    _showCanvasLoading('stats-chart');
    try {
        await _renderChartForMonth(year, month);
        await updateStatsTotals(year, month);
    } finally {
        _hideCanvasLoading('stats-chart');
    }
});

// ─── Data builder ─────────────────────────────────────

/**
 * Splits the given calendar month into 4 fixed week-bands and sums expenses.
 * W1: 1–7 · W2: 8–14 · W3: 15–21 · W4: 22–end
 */
async function _buildMonthData(year, month) {
    const expenses    = await _getMonthExpenses(year, month);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const bands       = [[1, 7], [8, 14], [15, 21], [22, daysInMonth]];

    const labels = [], data = [];

    for (const [startDay, endDay] of bands) {
        const from = new Date(year, month, startDay);
        const to   = new Date(year, month, endDay, 23, 59, 59, 999);

        const sum = sumAmounts(
            expenses.filter(e => {
                const d = new Date(e.date);
                return d >= from && d <= to;
            })
        );
        labels.push(`${getShortDay(from)}–${endDay}`);
        data.push(sum);
    }

    const now            = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

    // Highlight the current week's band; for past months highlight last bar
    let activeIdx = data.length - 1;
    if (isCurrentMonth) {
        const day = now.getDate();
        if      (day <= 7)  activeIdx = 0;
        else if (day <= 14) activeIdx = 1;
        else if (day <= 21) activeIdx = 2;
        else                activeIdx = 3;
    }

    const barColors = buildPeriodBarColors(data.length, activeIdx);
    return { labels, data, barColors };
}