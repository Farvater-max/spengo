import { CATEGORIES } from '../../constants/categories.js';
import { getI18nValue } from '../../i18n/localization.js';

/**
 * @param {{
 *   expenses: Array,
 *   activeCat: string,
 *   onSelect: (catId: string) => void
 * }} props
 */
export function CategoryFilter({ expenses, activeCat, onSelect }) {
    const cats = ['all', ...new Set(expenses.map(e => e.category))];

    return (
        <div className="category-row">
            {cats.map(catId => {
                const cat   = CATEGORIES.find(x => x.id === catId);
                const isAll = catId === 'all';
                const color = isAll ? '#c8f135' : cat?.color || '#888';
                const label = isAll ? getI18nValue('cat.all') : (cat?.label || catId);

                return (
                    <div
                        key={catId}
                        className={`cat-pill${activeCat === catId ? ' active' : ''}`}
                        onClick={() => onSelect(catId)}
                    >
                        <div className="cat-dot" style={{ background: color }} />
                        {label}
                    </div>
                );
            })}
        </div>
    );
}