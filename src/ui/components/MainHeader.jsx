import { getI18nValue } from '../../i18n/localization.js';

const LANGS = ['ru', 'en', 'es'];

/**
 * @param {{
 *   currentLang: string,
 *   onLangChange: (lang: string) => void,
 *   onAvatarClick: () => void,
 *   profile: { letter: string, picture: string|null } | null,
 * }} props
 */
export function MainHeader({ currentLang, onLangChange, onAvatarClick, profile }) {
    return (
        <div className="main-header">
            <div className="header-logo">
                {getI18nValue('auth.logo')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="lang-toggle">
                    {LANGS.map(lang => (
                        <button
                            key={lang}
                            className={`lang-btn${currentLang === lang ? ' active' : ''}`}
                            onClick={() => onLangChange(lang)}
                        >
                            {lang.toUpperCase()}
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