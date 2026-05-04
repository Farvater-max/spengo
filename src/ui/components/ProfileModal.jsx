// ─── PATCH для ProfileModal.jsx ──────────────────────────────────────────────
//
// Добавь prop `onFeedback` в деструктуризацию ProfileModal:
//
//   export function ProfileModal({
//       profile,
//       onOpenSheet,
//       onShare,
//       onSignOut,
//       onClose,
//       onFeedback,          // ← НОВЫЙ PROP
//       sharedUsers   = [],
//       ...
//   })
//
// Добавь эту строку ПЕРЕД блоком "Sign out" (ищи комментарий {/* Sign out */}):
//
//   {/* Feedback */}
//   <div className="profile-row" onClick={onFeedback}>
//       <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
//            stroke="currentColor" strokeWidth="1.8"
//            strokeLinecap="round" strokeLinejoin="round">
//           <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
//       </svg>
//       <span>{getI18nValue('feedback.menu_label')}</span>
//   </div>
//
// ─────────────────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════
//  Полный обновлённый ProfileModal.jsx (вставь вместо оригинала)
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { getI18nValue } from '../../i18n/localization.js';
import { useSwipeToClose } from '../../hooks/useSwipeToClose.js';

const LANGS = ['en', 'ru', 'es', 'pl', 'cs'];
const LANG_FLAGS  = { en: '🇬🇧', ru: '🇷🇺', es: '🇪🇸', pl: '🇵🇱', cs: '🇨🇿' };
const LANG_LABELS = { en: 'EN', ru: 'RU', es: 'ES', pl: 'PL',  cs: 'CZ' };

export function ProfileModal({
    profile,
    onOpenSheet,
    onShare,
    onSignOut,
    onClose,
    onFeedback,           // ← NEW
    sharedUsers   = [],
    isOwner       = true,
    currentTheme  = 'dark',
    onThemeToggle,
    currentLang   = 'en',
    onLangChange,
}) {
    if (!profile) return null;

    const sheetRef    = useSwipeToClose(onClose);
    const sharedCount = sharedUsers.length;
    const isLight     = currentTheme === 'light';

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

                {/* Open sheet */}
                <div className="profile-row" onClick={onOpenSheet}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                    </svg>
                    <span>{getI18nValue('profile.open_sheet')}</span>
                </div>

                {/* Share */}
                <div className="profile-row" onClick={isOwner ? onShare : undefined}
                     style={{ cursor: isOwner ? 'pointer' : 'default' }}>
                    <ShareDotsIcon />
                    <span style={{ flex: 1 }}>{getI18nValue('profile.share')}</span>

                    {isOwner && sharedCount > 0 && (
                        <>
                            <span style={{
                                fontSize:      '11px',
                                fontWeight:    600,
                                padding:       '3px 9px',
                                borderRadius:  '20px',
                                background:    'var(--color-accent-soft)',
                                border:        '1px solid var(--color-accent-border)',
                                color:         'var(--color-accent)',
                                letterSpacing: '.2px',
                            }}>
                                {getI18nValue('share.role_owner')}
                            </span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                 stroke="currentColor" strokeWidth="2"
                                 strokeLinecap="round" strokeLinejoin="round"
                                 style={{ marginLeft: '6px' }}>
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </>
                    )}

                    {!isOwner && (
                        <span style={{
                            fontSize:      '11px',
                            fontWeight:    600,
                            padding:       '3px 9px',
                            borderRadius:  '20px',
                            background:    'var(--color-accent-soft)',
                            border:        '1px solid var(--color-accent-border)',
                            color:         'var(--color-accent)',
                            letterSpacing: '.2px',
                        }}>
                            {getI18nValue('share.role_writer')}
                        </span>
                    )}
                </div>

                {/* ── Language ──────────────────────────────────────── */}
                <div className="profile-row" style={{ cursor: 'default' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="2" y1="12" x2="22" y2="12"/>
                        <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
                    </svg>
                    <span style={{ flex: 1 }}>{getI18nValue('profile.language')}</span>
                    <LangDropdown current={currentLang} onChange={onLangChange} />
                </div>

                {/* ── Theme toggle ─────────────────────────────────── */}
                <div className="profile-row" onClick={onThemeToggle} style={{ cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                    <ThemeIcon isLight={isLight} />
                    <span style={{ flex: 1 }}>
                        {isLight ? getI18nValue('profile.dark_theme') : getI18nValue('profile.light_theme')}
                    </span>
                    <ThemeToggleSwitch isLight={isLight} />
                </div>

                {/* ── Feedback ─────────────────────────────────────── */}
                <div className="profile-row" onClick={onFeedback}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="1.8"
                         strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                    <span>{getI18nValue('feedback.menu_label')}</span>
                </div>

                {/* Sign out */}
                <div className="profile-row danger" onClick={onSignOut}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                    </svg>
                    <span>{getI18nValue('profile.sign_out')}</span>
                </div>

                <a href="/privacy-policy/" style={{
                    display: 'block', textAlign: 'center',
                    color: 'var(--color-muted)', fontSize: '14px',
                    textDecoration: 'none', padding: '4px',
                }}>
                    Privacy Policy &amp; Terms of use
                </a>
            </div>
        </div>
    );
}

// ─── Theme icon (sun / moon) ──────────────────────────

function ThemeIcon({ isLight }) {
    return isLight ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/>
        </svg>
    ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1"  x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1"  y1="12" x2="3"  y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
    );
}

function ThemeToggleSwitch({ isLight }) {
    return (
        <div style={{
            width:        '40px',
            height:       '22px',
            borderRadius: '11px',
            background:   isLight ? 'var(--color-accent)' : 'var(--color-surface2)',
            border:       `1px solid ${isLight ? 'var(--color-accent)' : 'var(--color-border)'}`,
            position:     'relative',
            flexShrink:    0,
            transition:   'background .2s ease, border-color .2s ease',
        }}>
            <div style={{
                position:   'absolute',
                top:        '2px',
                left:        isLight ? '20px' : '2px',
                width:      '16px',
                height:     '16px',
                borderRadius: '50%',
                background: isLight ? 'var(--color-on-accent)' : 'var(--color-muted)',
                transition: 'left .2s ease, background .2s ease',
            }} />
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

function LangDropdown({ current, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handler = e => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        document.addEventListener('touchstart', handler);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('touchstart', handler);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const handler = e => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open]);

    function select(lang) {
        setOpen(false);
        if (lang !== current) onChange?.(lang);
    }

    return (
        <div className="lang-dropdown" ref={ref}>
            <button
                className="lang-dropdown__trigger"
                onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className="lang-dropdown__flag">{LANG_FLAGS[current]}</span> {LANG_LABELS[current]}
                <span className={`lang-dropdown__arrow${open ? ' open' : ''}`}>▾</span>
            </button>

            {open && (
                <ul className="lang-dropdown__menu" role="listbox" style={{ bottom: 'auto', top: 'calc(100% + 4px)' }}>
                    {LANGS.map(lang => (
                        <li
                            key={lang}
                            role="option"
                            aria-selected={lang === current}
                            className={`lang-dropdown__option${lang === current ? ' active' : ''}`}
                            onMouseDown={e => { e.preventDefault(); select(lang); }}
                        >
                            <span className="lang-dropdown__flag">{LANG_FLAGS[lang]}</span> {LANG_LABELS[lang]}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}