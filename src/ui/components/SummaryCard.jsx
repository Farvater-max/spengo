import { formatMoney } from '../../utils/helpers.js';
import { getI18nValue } from '../../i18n/localization.js';

const PERIODS = ['day', 'week', 'month'];

/**
 * @param {{
 *   total: number,
 *   currentPeriod: string,
 *   onPeriodChange: (period: string) => void
 * }} props
 */
export function SummaryCard({ total, currentPeriod, onPeriodChange }) {
    return (
        <div className="summary-card">
            <div className="summary-period">
                {PERIODS.map(p => (
                    <button
                        key={p}
                        className={`period-btn${currentPeriod === p ? ' active' : ''}`}
                        onClick={() => onPeriodChange(p)}
                    >
                        {getI18nValue(`period.${p}`)}
                    </button>
                ))}
            </div>
            <div className="summary-amount">
                <span>{formatMoney(total)}</span>
            </div>
            <div className="summary-label">
                {getI18nValue(`period.label.${currentPeriod}`)}
            </div>
        </div>
    );
}