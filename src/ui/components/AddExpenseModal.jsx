import { useState } from 'react';
import { CategorySelectGrid } from './CategorySelectGrid.jsx';
import { getI18nValue } from '../../i18n/localization.js';
import { parseAmount } from '../../utils/helpers.js';
import { useSwipeToClose } from '../../hooks/useSwipeToClose.js';

export function AddExpenseModal({ initialCat = 'food', onSubmit, onClose, loading }) {
    const [amount,   setAmount]   = useState('');
    const [category, setCategory] = useState(initialCat);
    const [comment,  setComment]  = useState('');

    const sheetRef = useSwipeToClose(onClose);
    const parsedAmount = parseAmount(amount);

    function handleSubmit() {
        if (!parsedAmount) return;
        onSubmit({ amount: parsedAmount, category, comment });
    }

    function handleOverlayClick(e) {
        if (e.target.classList.contains('modal-overlay')) onClose();
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