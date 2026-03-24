import { usePikaday } from '../../hooks/usePikaday.js';

const CalendarIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8"  y1="2" x2="8"  y2="6" />
        <line x1="3"  y1="10" x2="21" y2="10" />
    </svg>
);

const ChevronIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

/**
 * DatePicker
 *
 * A hidden readonly <input> serves as the Pikaday anchor (required by the lib).
 * The user only sees and interacts with the trigger button — no text entry possible.
 *
 * @param {{
 *   value:    string,              // YYYY-MM-DD
 *   onChange: (v: string) => void,
 *   minDate:  string,              // YYYY-MM-DD
 *   maxDate:  string,              // YYYY-MM-DD
 * }} props
 */
export function DatePicker({ value, onChange, minDate, maxDate }) {
    const { inputRef, open } = usePikaday({ value, onChange, minDate, maxDate });

    // DD/MM/YYYY — numeric only, no locale-dependent month names
    const label = value
        ? value.split('-').reverse().join('/')
        : '—';

    return (
        <div className="datepicker-wrapper">
            {/*
                Pikaday requires a real <input> as `field` to position the popup.
                readonly blocks any keyboard input. Visually hidden behind the button.
            */}
            <input
                ref={inputRef}
                id="datepicker-anchor"
                name="datepicker-anchor"
                type="text"
                readOnly
                tabIndex={-1}
                aria-hidden="true"
                className="datepicker-anchor"
            />

            <button
                type="button"
                className="datepicker-trigger"
                onClick={open}
            >
                <CalendarIcon />
                <span className="datepicker-trigger__label">{label}</span>
                <ChevronIcon />
            </button>
        </div>
    );
}