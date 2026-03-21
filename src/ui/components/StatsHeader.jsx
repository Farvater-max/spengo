import { getI18nValue } from '../../i18n/localization.js';

const PERIODS = ['week', 'month', 'year'];

/**
 * @param {{
 *   currentPeriod: string,
 *   onPeriodChange: (period: string) => void,
 *   onAvatarClick: () => void,
 *   profile: { letter: string, picture: string|null } | null,
 * }} props
 */
export function StatsHeader({ currentPeriod, onPeriodChange, onAvatarClick, profile }) {
    return (
        <div className="main-header">
            <div className="header-logo">
                {getI18nValue('auth.logo')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="period-toggle">
                    {PERIODS.map(p => (
                        <button
                            key={p}
                            className={`period-btn${currentPeriod === p ? ' active' : ''}`}
                            onClick={() => onPeriodChange(p)}
                        >
                            {getI18nValue(`chart.period.${p}`)}
                        </button>
                    ))}
                </div>
                <div className="header-avatar" onClick={onAvatarClick}>
                    {profile?.picture
                        ? <img src={profile.picture} alt="avatar" />
                        : <span>{profile?.letter || '?'}</span>
                    }
                </div>
            </div>
        </div>
    );
}