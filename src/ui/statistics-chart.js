import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import { formatMoney, sumAmounts } from '../utils/helpers.js';
import { STATE } from '../../state.js';
import { getI18nValue } from '../i18n/localization.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

const ACCENT     = '#c8f135';
const ACCENT_DIM  = '#c8f13560';
const ACCENT2_DIM = '#7b61ff60';
const GRID_COLOR = '#2a2a3230';
const TEXT_COLOR = '#6b6b7e';

let chartInstance = null;
let chartPeriod   = 'month';

/**
 * Renders the chart for the given period and binds period-switcher buttons.
 * Safe to call multiple times — destroys the previous Chart instance first.
 */
export function renderChart() {
    bindPeriodButtons();
    chartRendering(chartPeriod);
}

/**
 * Returns the currently selected chart period ('week' | 'month' | 'year').
 */
export function getChartPeriod() {
    return chartPeriod;
}

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

        document.getElementById('chart-period-week').textContent  = getI18nValue('chart.period.week');
        document.getElementById('chart-period-month').textContent = getI18nValue('chart.period.month');
        document.getElementById('chart-period-year').textContent  = getI18nValue('chart.period.year');

        document.getElementById(id).addEventListener('click', () => {
            chartPeriod = period;
            document.querySelectorAll('.chart-period-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            chartRendering(period);
        });
    });
}

function chartRendering(period) {
    const canvas = document.getElementById('stats-chart');
    if (!canvas) return;

    const { labels, data, barColors } = buildChartData(period);

    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    chartInstance = new Chart(canvas.getContext('2d'), {
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

function buildChartData(period) {
    if (period === 'week')  return buildWeekData();
    if (period === 'month') return buildMonthData();
    if (period === 'year')  return buildYearData();
    return { labels: [], data: [], barColors: [] };
}

/** 7 bars — Mon through Sun of the current week. Today is highlighted. */
function buildWeekData() {
    const now    = new Date();
    const monday = getMonday(now);
    const todayIdx = (now.getDay() + 6) % 7; // Mon = 0

    const labels = [], data = [];

    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const iso = formatToIso(d);
        labels.push(getDayLabel(d));
        data.push(sumAmounts(STATE.expenses.filter(e => e.date === iso)));
    }

    const barColors = data.map((_, i) =>
        i === todayIdx ? ACCENT : ((todayIdx - i) % 2 === 0 ? ACCENT_DIM : ACCENT2_DIM)
    );
    return { labels, data, barColors };
}

/**
 * 4 bars — the 3 calendar weeks before the current one + the current week.
 * Each bar = Mon–Sun ISO week, regardless of month boundary.
 * The current (rightmost) bar is highlighted.
 */
function buildMonthData() {
    const now         = new Date();
    const curMonday   = getMonday(now);
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

        labels.push(`${shortDaySign(weekMonday)}–${shortDaySign(weekSunday)}`);
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

        labels.push(monthLabelSign(d));
        data.push(sum);
    }

    const barColors = data.map((_, i, arr) =>
        i === arr.length - 1 ? ACCENT : ((arr.length - 1 - i) % 2 === 0 ? ACCENT_DIM : ACCENT2_DIM)
    );
    return { labels, data, barColors };
}

function getMonday(date) {
    const startDay   = new Date(date);
    const day = startDay.getDay();
    startDay.setDate(startDay.getDate() + (day === 0 ? -6 : 1 - day));
    startDay.setHours(0, 0, 0, 0);
    return startDay;
}

function formatToIso(data) {
    const year  = data.getFullYear();
    const month  = String(data.getMonth() + 1).padStart(2, '0');
    const dayDate = String(data.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayDate}`;
}

function getDayLabel(day) {
    return day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase().slice(0, 2);
}

function shortDaySign(day) {
    return day.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function monthLabelSign(day) {
    return day.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}