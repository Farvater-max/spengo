import { getI18nValue } from '../../i18n/localization.js';



/**
 * @param {{
 *   onAvatarClick: () => void,
 *   profile: { letter: string, picture: string|null } | null,
 * }} props
 */
export function MainHeader({ onAvatarClick, profile }) {
    return (
        <div className="main-header">
            <div className="header-logo">
                {getI18nValue('auth.logo')}
            </div>
            <div className="header-avatar" onClick={onAvatarClick}>
                {profile?.picture
                    ? <img src={profile.picture} alt="avatar" />
                    : <span>{profile?.letter || '?'}</span>
                }
            </div>
        </div>
    );
}