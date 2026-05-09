import { useEffect, useRef } from 'react';
import { getI18nValue } from '../../i18n/localization.js';
import { buildCarouselMonths } from '../statistics/statistics-utils.js';

let _scrollToActive = null;

export function centerCarousel() {
    _scrollToActive?.('auto');
}

/** @deprecated kept so existing renderer.jsx import doesn't break */
export function resetCarousel() {}

const MONTH_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * @param {{
 *   selectedYear:    number,
 *   selectedMonth:   number,
 *   onMonthChange:   (year: number, month: number) => void,
 *   onAvatarClick:   () => void,
 *   profile:         { letter: string, picture: string|null } | null,
 * }} props
 */
export function StatsHeader({
    selectedYear,
    selectedMonth,
    onMonthChange,
    onAvatarClick,
    profile,
}) {
    const now      = new Date();
    const curYear  = now.getFullYear();
    const curMonth = now.getMonth();

    const months    = buildCarouselMonths(12, 12);
    const activeRef = useRef(null);

    // Register the scroll function so centerCarousel() can call it imperatively.
    // Updated on every render so activeRef always points to the right element.
    useEffect(() => {
        _scrollToActive = (behavior = 'smooth') => {
            activeRef.current?.scrollIntoView({
                behavior,
                block:  'nearest',
                inline: 'center',
            });
        };
        return () => { _scrollToActive = null; };
    });

    // Smooth scroll whenever the selected month changes (user tapped a pill).
    useEffect(() => {
        _scrollToActive?.('smooth');
    }, [selectedYear, selectedMonth]);

    return (
        <div className="stats-header">
            {/* ── Top row: logo + avatar ── */}
            <div className="stats-header__top">
                <div className="header-logo">{getI18nValue('auth.logo')}</div>
                <div className="header-avatar" onClick={onAvatarClick}>
                    {profile?.picture
                        ? <img src={profile.picture} alt="avatar" />
                        : <span>{profile?.letter || '?'}</span>
                    }
                </div>
            </div>

            {/* ── Month carousel ── */}
            <div className="stats-carousel">
                {months.map(({ year, month }) => {
                    const isActive  = year === selectedYear && month === selectedMonth;
                    const isCurrent = year === curYear && month === curMonth;

                    return (
                        <button
                            key={`${year}-${month}`}
                            ref={isActive ? activeRef : null}
                            className={[
                                'stats-carousel__item',
                                isActive  ? 'active'  : '',
                                isCurrent ? 'current' : '',
                            ].filter(Boolean).join(' ')}
                            onClick={() => onMonthChange(year, month)}
                        >
                            <span className="stats-carousel__year">{year}</span>
                            <span className="stats-carousel__pill">
                                <span className="stats-carousel__month">{MONTH_SHORT[month]}</span>
                                {isCurrent && !isActive && (
                                    <span className="stats-carousel__dot" />
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}