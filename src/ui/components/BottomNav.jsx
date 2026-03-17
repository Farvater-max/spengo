import { getI18nValue } from '../../i18n/localization.js';

/**
 * @param {{
 *   currentScreen: string,
 *   enabled: boolean,
 *   onHome: () => void,
 *   onStats: () => void,
 *   onAdd: () => void,
 * }} props
 */
export function BottomNav({ currentScreen, enabled, onHome, onStats, onAdd }) {
    return (
        <nav className="bottom-nav">
            <div
                className={`nav-item${currentScreen === 'main' ? ' active' : ''}${!enabled ? ' disabled' : ''}`}
                onClick={enabled ? onHome : undefined}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 12L12 3l9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"/>
                </svg>
                <span>{getI18nValue('nav.home')}</span>
            </div>

            <button className="fab" onClick={enabled ? onAdd : undefined}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
            </button>

            <div
                className={`nav-item${currentScreen === 'stats' ? ' active' : ''}${!enabled ? ' disabled' : ''}`}
                onClick={enabled ? onStats : undefined}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="12" width="4" height="9" rx="1"/>
                    <rect x="10" y="7" width="4" height="14" rx="1"/>
                    <rect x="17" y="3" width="4" height="18" rx="1"/>
                </svg>
                <span>{getI18nValue('nav.stats')}</span>
            </div>
        </nav>
    );
}