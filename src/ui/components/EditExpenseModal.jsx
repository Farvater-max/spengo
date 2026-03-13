import { useState, useEffect } from 'react';
import { CategorySelectGrid } from './CategorySelectGrid.jsx';
import { getI18nValue } from '../../i18n/localization.js';
import { parseAmount } from '../../utils/helpers.js';

/**
 * @param {{
 *   expense: { id: string, amount: number, category: string, comment: string }|null,
 *   onUpdate: (id: string, amount: number, category: string, comment: string) => void,
 *   onDelete: (id: string) => void,
 *   onClose: () => void,
 *   loading: boolean
 * }} props
 */
export function EditExpenseModal({ expense, onUpdate, onDelete, onClose, loading }) {
    const [amount,   setAmount]   = useState('');
    const [category, setCategory] = useState('food');
    const [comment,  setComment]  = useState('');

    // populate fields when expense changes
    useEffect(() => {
        if (!expense) return;
        setAmount(String(expense.amount));
        setCategory(expense.category);
        setComment(expense.comment || '');
    }, [expense?.id]);

    if (!expense) return null;

    const isDirty =
        parseAmount(amount) !== expense.amount ||
        category !== expense.category ||
        comment  !== (expense.comment || '');

    function handleUpdate() {
        const parsed = parseAmount(amount);
        if (!parsed) return;
        onUpdate(expense.id, parsed, category, comment);
    }

    function handleOverlayClick(e) {
        if (e.target.classList.contains('modal-overlay')) onClose();
    }

    return (
        <div className="modal-overlay open" id="modal-edit" onClick={handleOverlayClick}>
            <div className="modal-sheet">
                <div className="modal-handle" />
                <div className="modal-edit-header">
                    <div className="modal-title">{getI18nValue('modal.edit.title')}</div>
                </div>

                <div className="form-group">
                    <label className="form-label">{getI18nValue('label.amount')}</label>
                    <div className="amount-wrapper">
                        <input
                            className="form-input"
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            maxLength={9}
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">{getI18nValue('label.category')}</label>
                    <CategorySelectGrid selectedCat={category} onSelect={setCategory} />
                </div>

                <div className="form-group">
                    <label className="form-label">{getI18nValue('label.comment')}</label>
                    <input
                        className="form-input"
                        type="text"
                        maxLength={120}
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                    />
                </div>

                <div className="edit-modal-actions">
                    <button
                        className="btn-submit btn-edit-delete"
                        onClick={() => onDelete(expense.id)}
                        disabled={loading}
                    >
                        {getI18nValue('btn.delete')}
                    </button>
                    <button
                        className="btn-submit btn-edit-update"
                        onClick={handleUpdate}
                        disabled={!isDirty || !parseAmount(amount) || loading}
                    >
                        {getI18nValue('btn.update')}
                    </button>
                </div>

                {loading && (
                    <div className="modal-loading-overlay visible">
                        <div className="modal-spinner" />
                    </div>
                )}
            </div>
        </div>
    );
}