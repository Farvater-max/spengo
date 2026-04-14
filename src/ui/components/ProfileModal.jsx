import { getI18nValue } from '../../i18n/localization.js';
import { useSwipeToClose } from '../../hooks/useSwipeToClose.js';
import { getIsOwner } from '../../services/storageService.js';

export function ProfileModal({
    profile,
    onOpenSheet,
    onShare,
    onSignOut,
    onClose,
    sharedUsers = [],
    isOwner     = getIsOwner(),
}) {
    if (!profile) return null;

    const sheetRef    = useSwipeToClose(onClose);
    const sharedCount = sharedUsers.length;

    function handleOverlayClick(e) {
        if (e.target.classList.contains('modal-overlay')) onClose();
    }

    return (
        <div className="modal-overlay open" id="modal-profile" onClick={handleOverlayClick}>
            <div className="modal-sheet" ref={sheetRef} style={{ borderRadius: 'var(--r-lg)', margin: 'auto 16px 16px' }}>
                <div className="modal-handle" />

                {/* Avatar */}
                <div className="profile-avatar-lg">
                    {profile.picture
                        ? <img src={profile.picture} alt="avatar" />
                        : <span>{profile.letter}</span>
                    }
                </div>

                <div className="profile-explain">
                    {getI18nValue('auth.featureOne')}
                </div>

                {/* Open sheet — available for all users */}
                <div className="profile-row" onClick={onOpenSheet}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                    </svg>
                    <span>{getI18nValue('profile.open_sheet')}</span>
                </div>

                {/* Share row — clickable for owner only */}
                <div
                    className="profile-row"
                    onClick={isOwner ? onShare : undefined}
                    style={{ cursor: isOwner ? 'pointer' : 'default' }}
                >
                    <ShareDotsIcon />
                    <span style={{ flex: 1 }}>{getI18nValue('profile.share')}</span>

                    {/* Owner: show owner badge when sheet is already shared */}
                    {isOwner && sharedCount > 0 && (
                        <>
                            <span style={{
                                fontSize:      '11px',
                                fontWeight:    600,
                                padding:       '3px 9px',
                                borderRadius:  '20px',
                                background:    '#c8f13515',
                                border:        '1px solid #c8f13340',
                                color:         'var(--accent)',
                                letterSpacing: '.2px',
                            }}>
                                {getI18nValue('share.role_owner')}
                            </span>
                            <svg
                                width="14" height="14" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round"
                                style={{ marginLeft: '6px' }}
                            >
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </>
                    )}

                    {/* Guest: always show writer badge */}
                    {!isOwner && (
                        <span style={{
                            fontSize:      '11px',
                            fontWeight:    600,
                            padding:       '3px 9px',
                            borderRadius:  '20px',
                            background:    '#c8f13515',
                            border:        '1px solid #c8f13340',
                            color:         'var(--accent)',
                            letterSpacing: '.2px',
                        }}>
                            {getI18nValue('share.role_writer')}
                        </span>
                    )}
                </div>

                {/* Sign out */}
                <div className="profile-row danger" onClick={onSignOut}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                    </svg>
                    <span>{getI18nValue('profile.sign_out')}</span>
                </div>

                <a
                    href="/privacy-policy/"
                    style={{ display: 'block', textAlign: 'center', color: '#6b6b7e', fontSize: '14px', textDecoration: 'none', padding: '4px' }}
                >
                    Privacy Policy &amp; Terms of use
                </a>
            </div>
        </div>
    );
}

function ShareDotsIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5"  r="3"/>
            <circle cx="6"  cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59"  y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51"  x2="8.59"  y2="10.49"/>
        </svg>
    );
}