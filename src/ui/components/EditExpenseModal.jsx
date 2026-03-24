import { useState, useEffect } from 'react';
import { CategorySelectGrid } from './CategorySelectGrid.jsx';
import { DatePicker }         from './DatePicker.jsx';
import { getI18nValue }       from '../../i18n/localization.js';
import { parseAmount, todayStr } from '../../utils/helpers.js';
import { useSwipeToClose }    from '../../hooks/useSwipeToClose.js';

function getMonthStart() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

export function EditExpenseModal({ expense, onUpdate, onDelete, onClose }) {
    const [amount,   setAmount]   = useState('');
    const [category, setCategory] = useState('food');
    const [comment,  setComment]  = useState('');
    const [date,     setDate]     = useState(todayStr());
    const [loading,  setLoading]  = useState(false);

    const sheetRef = useSwipeToClose(onClose);

    useEffect(() => {
        if (!expense) return;
        setAmount(String(expense.amount));
        setCategory(expense.category);
        setComment(expense.comment || '');
        setDate(expense.date || todayStr());
        setLoading(false);
    }, [expense?.id]);

    if (!expense) return null;

    const parsedAmount = parseAmount(amount);

    const isDirty =
        parsedAmount !== expense.amount          ||
        category     !== expense.category        ||
        comment      !== (expense.comment || '') ||
        date         !== expense.date;

    async function handleUpdate() {
        if (!parsedAmount) return;
        setLoading(true);
        await onUpdate(expense.id, parsedAmount, category, comment, date);
        setLoading(false);
    }

    async function handleDelete() {
        setLoading(true);
        await onDelete(expense.id);
        setLoading(false);
    }

    function handleOverlayClick(e) {
        const isOverlay = e.target.classList.contains('modal-overlay');
        const isCalendar = e.target.closest('.flatpickr-calendar');

        if (isOverlay && !isCalendar) {
            onClose();
        }
    }

    return (
        <div className="modal-overlay open" id="modal-edit" onClick={handleOverlayClick}>
            <div className="modal-sheet" ref={sheetRef}>
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
                    <label className="form-label">{getI18nValue('label.date')}</label>
                    <DatePicker
                        value={date}
                        onChange={setDate}
                        minDate={getMonthStart()}
                        maxDate={todayStr()}
                    />
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
                        onClick={handleDelete}
                        disabled={loading}
                    >
                        {getI18nValue('btn.delete')}
                    </button>
                    <button
                        className="btn-submit btn-edit-update"
                        onClick={handleUpdate}
                        disabled={!isDirty || !parsedAmount || loading}
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