import { CATEGORIES } from '../../constants/categories.js';

/**
 * @param {{
 *   selectedCat: string|null,
 *   onSelect: (catId: string) => void
 * }} props
 */
export function CategorySelectGrid({ selectedCat, onSelect }) {
    return (
        <div className="cat-grid">
            {CATEGORIES.map(cat => (
                <div
                    key={cat.id}
                    className={`cat-option${selectedCat === cat.id ? ' selected' : ''}`}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => onSelect(cat.id)}
                >
                    <div className="cat-emoji">{cat.emoji}</div>
                    <div>{cat.label}</div>
                </div>
            ))}
        </div>
    );
}