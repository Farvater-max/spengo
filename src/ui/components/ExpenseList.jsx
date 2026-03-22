import { ExpenseItem } from './ExpenseItem.jsx';
import { getFilteredExpenses, sortExpenses } from '../../utils/helpers.js';
import { getI18nValue } from '../../i18n/localization.js';

/**
 * @param {{
 *   expenses: Array,
 *   currentPeriod: string,
 *   currentCategoryFilter: string,
 *   sortField: 'date' | 'amount',
 *   sortDir: 'asc' | 'desc',
 *   onEdit: (id: string) => void
 * }} props
 */
export function ExpenseList({ expenses, currentPeriod, currentCategoryFilter, sortField, sortDir, onEdit }) {
    const filtered = getFilteredExpenses({ expenses, currentPeriod, currentCategoryFilter });
    const sorted   = sortExpenses(filtered, sortField, sortDir);

    if (!sorted.length) {
        return (
            <div className="empty-state">
                <div className="empty-icon">🌱</div>
                <p>{getI18nValue('empty.no_period')}</p>
            </div>
        );
    }

    return (
        <>
            {sorted.map((item, i) => (
                <ExpenseItem
                    key={item.id}
                    item={item}
                    onEdit={onEdit}
                    style={{ animationDelay: `${i * 30}ms` }}
                />
            ))}
        </>
    );
}