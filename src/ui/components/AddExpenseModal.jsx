import { useState } from 'react';
import { CategorySelectGrid } from './CategorySelectGrid.jsx';
import { DatePicker }         from './DatePicker.jsx';
import { getI18nValue }       from '../../i18n/localization.js';
import { parseAmount, todayStr } from '../../utils/helpers.js';
import { useSwipeToClose }    from '../../hooks/useSwipeToClose.js';

function getMonthStart() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

export function AddExpenseModal({ initialCat = 'food', onSubmit, onClose }) {
    const [amount,   setAmount]   = useState('');
    const [category, setCategory] = useState(initialCat);
    const [comment,  setComment]  = useState('');
    const [date,     setDate]     = useState(todayStr());
    const [loading,  setLoading]  = useState(false);

    const sheetRef     = useSwipeToClose(onClose);
    const parsedAmount = parseAmount(amount);

    async function handleSubmit() {
        if (!parsedAmount) return;
        setLoading(true);
        await onSubmit({ amount: parsedAmount, category, comment, date });
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
        <div className="modal-overlay open" id="modal-add" onClick={handleOverlayClick}>
            <div className="modal-sheet" ref={sheetRef}>
                <div className="modal-handle" />
                <div className="modal-title">{getI18nValue('modal.add.title')}</div>

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
                            autoFocus
                            // delay for iOS
                            onFocus={e => {
                                setTimeout(() => {
                                    e.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
                                }, 350);
                            }}
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
                        placeholder={getI18nValue('placeholder.comment')}
                        type="text"
                        maxLength={120}
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                    />
                </div>

                <button
                    className="btn-submit"
                    onClick={handleSubmit}
                    disabled={!parsedAmount || loading}
                >
                    {getI18nValue('btn.add')}
                </button>

                {loading && (
                    <div className="modal-loading-overlay visible">
                        <div className="modal-spinner" />
                    </div>
                )}
            </div>
        </div>
    );
}