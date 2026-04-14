import { useState, useRef } from 'react';
import { getI18nValue } from '../../i18n/localization.js';
import { useSwipeToClose } from '../../hooks/useSwipeToClose.js';
import { isGoogleEmail } from '../../utils/helpers.js';

export function ShareModal({
    sharedUsers = [],
    loading     = false,
    shareUrl    = null,
    onShare,
    onRemove,
    onClose,
}) {
    const [inputValue, setInputValue] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [btnHover,   setBtnHover]   = useState(false);
    const [copied,     setCopied]     = useState(false);
    const inputRef = useRef(null);
    const sheetRef = useSwipeToClose(onClose);

    const isAlreadyShared = sharedUsers.length > 0;
    const isLoading       = loading || submitting;
    // Input is only shown when there are no shared users yet (one-partner limit)
    const showInput       = !isAlreadyShared;
    const canSubmit       = showInput && isGoogleEmail(inputValue) && !isLoading;

    function handleOverlayClick(e) {
        if (e.target.classList.contains('modal-overlay')) onClose();
    }

    async function handleSubmit() {
        if (!canSubmit) return;
        setSubmitting(true);
        try {
            await onShare(inputValue);
            setInputValue('');
        } finally {
            setSubmitting(false);
        }
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter') handleSubmit();
    }

    async function handleCopy() {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
        } catch {
            const el = document.createElement('textarea');
            el.value = shareUrl;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const btnBase = {
        width:          '100%',
        padding:        '17px',
        background:     canSubmit ? 'var(--accent)' : 'var(--surface2)',
        color:          canSubmit ? '#0d0d0f'        : 'var(--muted)',
        fontFamily:     'var(--font-body)',
        fontSize:       '16px',
        fontWeight:     700,
        border:         canSubmit ? 'none' : '1.5px solid var(--border)',
        borderRadius:   'var(--r-md)',
        cursor:         canSubmit ? 'pointer' : 'not-allowed',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            '8px',
        transition:     'transform .15s, box-shadow .15s, opacity .15s',
        transform:      btnHover && canSubmit ? 'translateY(-1px)' : 'none',
        boxShadow:      btnHover && canSubmit ? '0 8px 32px #c8f13540' : 'none',
        opacity:        isLoading ? 0.6 : 1,
    };

    return (
        <div className="modal-overlay open" id="modal-share" onClick={handleOverlayClick}>
            <div
                className="modal-sheet"
                ref={sheetRef}
                style={{ borderRadius: 'var(--r-lg)', margin: 'auto 16px 16px' }}
            >
                <div className="modal-handle" />

                {/* ── SECTION LABEL ──────────────────────────────────── */}
                <p style={{
                    fontSize:      '14px',
                    fontWeight:    600,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    color:         'var(--muted)',
                    margin:        '0 0 12px',
                }}>
                    {getI18nValue('share.people_with_access')}
                </p>

                {/* ── SHARED USER ROWS ───────────────────────────────── */}
                {isAlreadyShared && (
                    <>
                        {sharedUsers.map(user => (
                            <SharedUserRow
                                key={user.permissionId}
                                user={user}
                                onRemove={onRemove}
                                disabled={isLoading}
                            />
                        ))}

                        <div style={{
                            display:      'flex',
                            gap:          '8px',
                            alignItems:   'flex-start',
                            padding:      '10px 12px',
                            margin:       '14px 0 0',
                            borderRadius: 'var(--r-sm)',
                            background:   '#7b61ff12',
                            border:       '1px solid #7b61ff35',
                        }}>
                            <InfoIcon color="var(--accent2)" />
                            <p style={{ margin: 0, fontSize: '14px', color: 'var(--accent2)', lineHeight: 1.55 }}>
                                {getI18nValue('share.revoke_hint')}
                            </p>
                        </div>
                    </>
                )}

                {/* ── EMAIL INPUT + SHARE BUTTON (only before first share) ── */}
                {showInput && (
                    <div style={{ marginTop: '0' }}>
                        <input
                            ref={inputRef}
                            type="email"
                            className="form-input"
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={getI18nValue('share.email_placeholder')}
                            disabled={isLoading}
                            style={{ marginBottom: '12px', opacity: isLoading ? 0.6 : 1 }}
                        />

                        <div style={{
                            display:      'flex',
                            gap:          '8px',
                            alignItems:   'flex-start',
                            padding:      '10px 12px',
                            marginBottom: '16px',
                            borderRadius: 'var(--r-sm)',
                            background:   'rgba(255, 180, 0, 0.08)',
                            border:       '1px solid rgba(255, 180, 0, 0.25)',
                        }}>
                            <InfoIcon color="#ffb400" />
                            <p style={{ margin: 0, fontSize: '14px', color: '#e6b85c', lineHeight: 1.55 }}>
                                {getI18nValue('share.warning')}
                            </p>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            style={btnBase}
                            onMouseEnter={() => setBtnHover(true)}
                            onMouseLeave={() => setBtnHover(false)}
                        >
                            {isLoading ? (
                                <SpinnerIcon />
                            ) : (
                                <>
                                    <ShareIcon />
                                    {getI18nValue('share.btn_share')}
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* ── SHARE LINK BLOCK ───────────────────────────────── */}
                {shareUrl && isAlreadyShared && (
                    <div style={{ marginTop: '24px' }}>
                        <p style={{
                            fontSize:      '14px',
                            fontWeight:    600,
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                            color:         'var(--muted)',
                            margin:        '0 0 8px',
                        }}>
                            {getI18nValue('share.link_label') ?? 'Share link'}
                        </p>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{
                                flex:          1,
                                padding:       '11px 14px',
                                borderRadius:  'var(--r-md)',
                                background:    'var(--surface2)',
                                border:        '1.5px solid var(--border)',
                                fontSize:      '13px',
                                color:         'var(--muted)',
                                overflow:      'hidden',
                                textOverflow:  'ellipsis',
                                whiteSpace:    'nowrap',
                                userSelect:    'all',
                                fontFamily:    'var(--font-mono, monospace)',
                                letterSpacing: '0.01em',
                            }}>
                                {shareUrl}
                            </div>

                            <button
                                onClick={handleCopy}
                                title={copied
                                    ? (getI18nValue('share.copied') ?? 'Copied!')
                                    : (getI18nValue('share.copy')   ?? 'Copy link')
                                }
                                style={{
                                    flexShrink:     0,
                                    width:          '44px',
                                    height:         '44px',
                                    borderRadius:   'var(--r-md)',
                                    border:         copied
                                        ? '1.5px solid var(--accent)'
                                        : '1.5px solid var(--border)',
                                    background:     copied ? '#c8f13518' : 'var(--surface2)',
                                    color:          copied ? 'var(--accent)' : 'var(--muted)',
                                    cursor:         'pointer',
                                    display:        'flex',
                                    alignItems:     'center',
                                    justifyContent: 'center',
                                    transition:     'color .2s, border-color .2s, background .2s',
                                }}
                            >
                                {copied ? <CheckIcon /> : <CopyIcon />}
                            </button>
                        </div>

                        <p style={{
                            marginTop:  '8px',
                            fontSize:   '12px',
                            color:      'var(--muted)',
                            lineHeight: 1.5,
                        }}>
                            {getI18nValue('share.link_hint') ?? 'Send this link to your partner. They will need to sign in with Google to access the spreadsheet.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// SharedUserRow
// ---------------------------------------------------------------------------

function SharedUserRow({ user, onRemove, disabled }) {
    const label      = user.displayName || user.email;
    const initLetter = (label[0] ?? '?').toUpperCase();

    return (
        <div style={{
            display:    'flex',
            alignItems: 'center',
            gap:        '12px',
            padding:    '14px 0',
            borderTop:  '1px solid var(--border)',
        }}>
            <div style={{
                width:          '42px',
                height:         '42px',
                borderRadius:   '50%',
                background:     'var(--surface2)',
                border:         '1px solid var(--border)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                fontSize:       '17px',
                fontWeight:     600,
                color:          'var(--muted)',
                flexShrink:     0,
                fontFamily:     'var(--font-display)',
            }}>
                {initLetter}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                    margin:       0,
                    fontSize:     '14px',
                    fontWeight:   500,
                    color:        'var(--text)',
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace:   'nowrap',
                }}>
                    {label}
                </p>
                <p style={{
                    margin:       '2px 0 0',
                    fontSize:     '12px',
                    color:        'var(--muted)',
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace:   'nowrap',
                }}>
                    {user.isPending
                        ? `${user.email} · ${getI18nValue('share.pending')}`
                        : user.displayName ? user.email : ''
                    }
                </p>
            </div>

            <span style={{
                fontSize:      '11px',
                fontWeight:    600,
                padding:       '4px 10px',
                borderRadius:  '20px',
                background:    '#c8f13515',
                border:        '1px solid #c8f13340',
                color:         'var(--accent)',
                flexShrink:    0,
                letterSpacing: '.2px',
            }}>
                {getI18nValue('share.role_' + user.role) || user.role}
            </span>

            <button
                onClick={() => !disabled && onRemove(user.permissionId)}
                disabled={disabled}
                title={getI18nValue('share.remove_access')}
                style={{
                    width:          '32px',
                    height:         '32px',
                    borderRadius:   '50%',
                    border:         '1px solid var(--border)',
                    background:     'var(--surface2)',
                    cursor:         disabled ? 'default' : 'pointer',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    color:          'var(--muted)',
                    flexShrink:     0,
                    opacity:        disabled ? 0.4 : 1,
                    transition:     'color .15s, border-color .15s',
                }}
                onMouseEnter={e => {
                    if (!disabled) {
                        e.currentTarget.style.color       = 'var(--danger)';
                        e.currentTarget.style.borderColor = 'var(--danger)';
                    }
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.color       = 'var(--muted)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                }}
            >
                <RemoveIcon />
            </button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function InfoIcon({ color }) {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
             stroke={color} strokeWidth="2" strokeLinecap="round"
             style={{ flexShrink: 0, marginTop: '1px' }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8"  x2="12"   y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
    );
}

function ShareIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5"  r="3"/>
            <circle cx="6"  cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59"  y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51"  x2="8.59"  y2="10.49"/>
        </svg>
    );
}

function SpinnerIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2" strokeLinecap="round"
             style={{ animation: 'spin 0.8s linear infinite' }}>
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
            <path d="M12 2a10 10 0 0 1 10 10"/>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </svg>
    );
}

function RemoveIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6"  x2="6"  y2="18"/>
            <line x1="6"  y1="6"  x2="18" y2="18"/>
        </svg>
    );
}

function CopyIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
        </svg>
    );
}