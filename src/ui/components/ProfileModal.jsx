import { getI18nValue } from '../../i18n/localization.js';
import { useSwipeToClose } from '../../hooks/useSwipeToClose.js';

export function ProfileModal({ profile, onOpenSheet, onSignOut, onClose }) {
    if (!profile) return null;

    const sheetRef = useSwipeToClose(onClose);

    function handleOverlayClick(e) {
        if (e.target.classList.contains('modal-overlay')) onClose();
    }

    return (
        <div className="modal-overlay open" id="modal-profile" onClick={handleOverlayClick}>
            <div className="modal-sheet" ref={sheetRef} style={{ borderRadius: 'var(--r-lg)', margin: 'auto 16px 16px' }}>
                <div className="modal-handle" />

                <div className="profile-avatar-lg">
                    {profile.picture
                        ? <img src={profile.picture} alt="avatar" />
                        : <span>{profile.letter}</span>
                    }
                </div>

                <div className="profile-explain">
                    {getI18nValue('auth.featureOne')}
                </div>

                <div className="profile-row" onClick={onOpenSheet}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                    </svg>
                    <span>{getI18nValue('profile.open_sheet')}</span>
                </div>

                <div className="profile-row danger" onClick={onSignOut}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                    </svg>
                    <span>{getI18nValue('profile.sign_out')}</span>
                </div>

                <a
                    href="/privacy-policy/"
                    style={{ display:'block', textAlign:'center', color:'#6b6b7e', fontSize:'14px', textDecoration:'none', padding:'4px' }}
                >
                    Privacy Policy &amp; Terms of use
                </a>
            </div>
        </div>
    );
}