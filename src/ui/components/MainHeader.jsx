import { useState, useEffect, useRef } from 'react';
import { getI18nValue } from '../../i18n/localization.js';

const LANGS = ['en', 'ru', 'es', 'pl', 'cs'];

const LANG_FLAGS  = { en: '🇬🇧', ru: '🇷🇺', es: '🇪🇸', pl: '🇵🇱', cs: '🇨🇿' };
const LANG_LABELS = { en: 'EN', ru: 'RU', es: 'ES', pl: 'PL',  cs: 'CZ' };

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
                <LangDropdown current={currentLang} onChange={onLangChange} />
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

// ─── LangDropdown ─────────────────────────────────────

/**
 * Fully custom language dropdown — consistent appearance across iOS/Android/Desktop.
 * Closes on outside click, Escape key, and after selection.
 *
 * @param {{ current: string, onChange: (lang: string) => void }} props
 */
function LangDropdown({ current, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    // Close on outside click
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

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = e => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open]);

    function select(lang) {
        setOpen(false);
        if (lang !== current) onChange(lang);
    }

    return (
        <div className="lang-dropdown" ref={ref}>
            <button
                className="lang-dropdown__trigger"
                onClick={() => setOpen(v => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className="lang-dropdown__flag">{LANG_FLAGS[current]}</span> {LANG_LABELS[current]}
                <span className={`lang-dropdown__arrow${open ? ' open' : ''}`}>▾</span>
            </button>

            {open && (
                <ul className="lang-dropdown__menu" role="listbox">
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