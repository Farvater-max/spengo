import { ExpenseItem } from './ExpenseItem.jsx';
import { getFilteredExpenses } from '../../utils/helpers.js';
import { getI18nValue } from '../../i18n/localization.js';

/**
 * @param {{
 *   expenses: Array,
 *   currentPeriod: string,
 *   currentCategoryFilter: string,
 *   onEdit: (id: string) => void
 * }} props
 */
export function ExpenseList({ expenses, currentPeriod, currentCategoryFilter, onEdit }) {
    const filtered = getFilteredExpenses({
        expenses,
        currentPeriod,
        currentCategoryFilter,
    }).slice().reverse();

    if (!filtered.length) {
        return (
            <div className="empty-state">
                <div className="empty-icon">🌱</div>
                <p>{getI18nValue('empty.no_period')}</p>
            </div>
        );
    }

    return (
        <>
            {filtered.map((item, i) => (
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