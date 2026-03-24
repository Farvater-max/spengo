import { useEffect, useRef } from 'react';
import Pikaday from 'pikaday';
import 'pikaday/css/pikaday.css';

// ─── Helpers ──────────────────────────────────────────────────

const toDate = str => str ? new Date(str + 'T00:00:00') : null;

const toStr = d => {
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
};

// ─── Hook ─────────────────────────────────────────────────────

/**
 * Attaches Pikaday to a hidden readonly <input> (inputRef).
 * The input is visually hidden — the user sees only the trigger button.
 * readonly on the input prevents any manual keyboard entry.
 *
 * @param {{
 *   value:    string,              // YYYY-MM-DD
 *   onChange: (v: string) => void,
 *   minDate:  string,              // YYYY-MM-DD
 *   maxDate:  string,              // YYYY-MM-DD
 * }}
 * @returns {{
 *   inputRef: React.RefObject,   // attach to a hidden readonly <input>
 *   open:     () => void,        // call from trigger button onClick
 * }}
 */
export function usePikaday({ value, onChange, minDate, maxDate }) {
    const inputRef   = useRef(null);
    const pikadayRef = useRef(null);

    useEffect(() => {
        if (!inputRef.current) return;

        pikadayRef.current = new Pikaday({
            field:          inputRef.current,
            defaultDate:    toDate(value),
            setDefaultDate: true,
            minDate:        toDate(minDate),
            maxDate:        toDate(maxDate),
            keyboardInput:  false,
            showMonthDropdown: false,
            showYearDropdown:  false,
            onSelect(date) {
                onChange(toStr(date));
            },
        });

        return () => {
            pikadayRef.current?.destroy();
            pikadayRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!pikadayRef.current) return;
        if (minDate) pikadayRef.current.setMinDate(toDate(minDate));
        if (maxDate) pikadayRef.current.setMaxDate(toDate(maxDate));
    }, [minDate, maxDate]);

    useEffect(() => {
        if (!pikadayRef.current || !value) return;
        pikadayRef.current.setDate(toDate(value), true);
    }, [value]);

    const open = () => pikadayRef.current?.show();

    return { inputRef, open };
}