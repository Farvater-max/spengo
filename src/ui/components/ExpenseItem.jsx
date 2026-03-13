import { CATEGORIES } from '../../constants/categories.js';
import { formatMoney, formatDate } from '../../utils/helpers.js';

/**
 * @param {{ item: object, onEdit: (id: string) => void, style: object }} props
 */
export function ExpenseItem({ item, onEdit, style }) {
    const cat = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[5];

    return (
        <div className="expense-item" data-id={item.id} style={style}>
            <div className="expense-icon" style={{ background: `${cat.color}22` }}>
                {cat.emoji}
            </div>
            <div className="expense-info">
                <div className="expense-name">{item.comment || cat.label}</div>
                <div className="expense-meta">
                    <span className="expense-cat">{cat.label}</span>
                    <span className="expense-date">{formatDate(item.date)}</span>
                </div>
            </div>
            <div className="expense-amount">{formatMoney(item.amount)}</div>
            <div
                className="expense-edit"
                title="Edit"
                onClick={e => { e.stopPropagation(); onEdit(item.id); }}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2"
                     strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </div>
        </div>
    );
}