import { useEffect, useRef } from 'react';
import { getI18nValue } from '../../i18n/localization.js';
import { buildCarouselMonths } from '../statistics/statistics-utils.js';

// Module-level flag — survives React re-renders since createRoot reuses the
// same component instance. Must be explicitly reset each time the user
// navigates TO the stats screen so the first render always snaps instantly.
let _carouselReady = false;

export function resetCarousel() {
    _carouselReady = false;
}

const MONTH_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Generates a flat list of { year, month } entries spanning
 * `pastMonths` before and `futureMonths` after the current month.
 */

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
    const trackRef  = useRef(null);
    const activeRef = useRef(null);

    useEffect(() => {
        const el    = activeRef.current;
        const track = trackRef.current;
        if (!el || !track) return;

        const target = el.offsetLeft - track.offsetWidth / 2 + el.offsetWidth / 2;

        if (!_carouselReady) {
            // First render after navigation — jump instantly, no animation
            track.scrollLeft = target;
            _carouselReady = true;
        } else {
            track.scrollTo({ left: target, behavior: 'smooth' });
        }
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
            <div className="stats-carousel" ref={trackRef}>
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