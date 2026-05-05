import { useState } from 'react';
import { useSwipeToClose } from '../../hooks/useSwipeToClose.js';
import { getI18nValue } from '../../i18n/localization.js';
import { CONFIG } from '../../constants/config.js';

const MIN_WORDS     = 3;
const MAX_CHARS     = 500;
const RATE_LIMIT_MS = 60_000;

let _lastSubmitTime = 0;

function wordCount(text) {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Returns a stable anonymous ID for this browser.
 * Generated once via crypto.randomUUID() and persisted in localStorage.
 * Used as the rate-limit key for anonymous submissions so that
 * two different Google accounts behind the same NAT are tracked separately.
 */
function _getAnonId() {
    const KEY = 'spengo_anon_id';
    let id = localStorage.getItem(KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(KEY, id);
    }
    return id;
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

export function FeedbackModal({ profile, onClose }) {
    const sheetRef = useSwipeToClose(onClose);

    const [text,      setText]      = useState('');
    const [anonymous, setAnonymous] = useState(false);
    const [status,    setStatus]    = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
    const [errorMsg,  setErrorMsg]  = useState('');

    const email = profile?.email ?? '';

    const charCount = text.length;
    const words     = wordCount(text);
    const tooShort  = words < MIN_WORDS;
    const tooLong   = charCount > MAX_CHARS;
    const canSubmit = !tooShort && !tooLong && status !== 'loading' && status !== 'success';

    function handleOverlayClick(e) {
        if (e.target.classList.contains('modal-overlay')) onClose();
    }

    async function handleSubmit() {
        if (!canSubmit) return;

        const now = Date.now();
        if (now - _lastSubmitTime < RATE_LIMIT_MS) {
            const wait = Math.ceil((RATE_LIMIT_MS - (now - _lastSubmitTime)) / 1000);
            setErrorMsg(getI18nValue('feedback.rate_limit').replace('{s}', wait));
            setStatus('error');
            return;
        }

        setStatus('loading');
        setErrorMsg('');

        const payload = {
            text:   text.trim(),
            email:  anonymous ? 'anonym' : (email || 'anonym'),
            origin: window.location.origin,
            anonId: anonymous ? _getAnonId() : null,
        };

        try {
            const res  = await fetch(CONFIG.FEEDBACK_URL, {
                method:  'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body:    JSON.stringify(payload),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.status === 'error') {
                throw new Error(data.message || `HTTP ${res.status}`);
            }

            _lastSubmitTime = Date.now();
            setStatus('success');
        } catch (err) {
            console.error('[SpenGo] Feedback submit failed:', err);
            setErrorMsg(err.message || getI18nValue('feedback.error_generic'));
            setStatus('error');
        }
    }

    /* ── Success screen ── */
    if (status === 'success') {
        return (
            <div className="modal-overlay open" onClick={handleOverlayClick}>
                <div
                    className="modal-sheet feedback-sheet"
                    ref={sheetRef}
                    style={{ borderRadius: 'var(--r-lg)', margin: 'auto 16px 16px', textAlign: 'center' }}
                >
                    <div className="modal-handle" />
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
                        {getI18nValue('feedback.success_title')}
                    </div>
                    <p style={{ color: 'var(--color-muted)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
                        {getI18nValue('feedback.success_body')}
                    </p>
                    <button className="btn-submit" onClick={onClose}>
                        {getI18nValue('feedback.close')}
                    </button>
                </div>
            </div>
        );
    }

    /* ── Form ── */
    return (
        <div className="modal-overlay open" onClick={handleOverlayClick}>
            <div
                className="modal-sheet feedback-sheet"
                ref={sheetRef}
                style={{ borderRadius: 'var(--r-lg)', margin: 'auto 16px 16px', position: 'relative' }}
            >
                <div className="modal-handle" />

                <div className="modal-title">{getI18nValue('feedback.title')}</div>

                {/* Textarea */}
                <div className="form-group">
                    <label className="form-label">{getI18nValue('feedback.label_message')}</label>
                    <div style={{ position: 'relative' }}>
                        <textarea
                            className="form-input feedback-textarea"
                            placeholder={getI18nValue('feedback.placeholder')}
                            value={text}
                            onChange={e => { setText(e.target.value); if (status === 'error') setStatus('idle'); }}
                            rows={5}
                            maxLength={MAX_CHARS + 50}
                            style={{ resize: 'none', lineHeight: 1.6, paddingBottom: '28px' }}
                        />
                        <span style={{
                            position:      'absolute',
                            bottom:        '10px',
                            right:         '12px',
                            fontSize:      '11px',
                            color:         tooLong ? 'var(--color-danger)' : 'var(--color-muted)',
                            fontWeight:    600,
                            pointerEvents: 'none',
                        }}>
                            {charCount}/{MAX_CHARS}
                        </span>
                    </div>
                </div>

                {/* Email (hidden when anonymous) */}
                {!anonymous && (
                    <div className="form-group">
                        <label className="form-label">{getI18nValue('feedback.label_email')}</label>
                        <input
                            type="email"
                            className="form-input"
                            value={email}
                            readOnly
                            style={{ color: email ? 'var(--color-text)' : 'var(--color-muted)', cursor: 'default' }}
                        />

                        {/* ── Consent notice ── */}
                        <div style={{
                            display:      'flex',
                            gap:          '10px',
                            marginTop:    '10px',
                            alignItems:   'flex-start',
                            padding:      '10px 12px',
                            marginBottom: '16px',
                            borderRadius: 'var(--r-sm)',
                            background:   'var(--color-warning-soft)',
                            border:       '1px solid var(--color-warning-border)',
                        }}>
                            <InfoIcon color="var(--color-warning)" />

                            <p style={{
                                margin:      0,
                                fontSize:    '14px',
                                color:       'var(--color-warning)',
                                lineHeight:  1.55
                            }}>
                                {getI18nValue('feedback.email_notice')}
                            </p>
                        </div>
                    </div>
                )}

                {/* Anonymous checkbox */}
                <label className="feedback-anon-row" style={{
                    display:                 'inline-flex',
                    alignItems:              'center',
                    gap:                     '10px',
                    cursor:                  'pointer',
                    padding:                 '12px 0',
                    marginBottom:            '16px',
                    userSelect:              'none',
                    WebkitTapHighlightColor: 'transparent',
                }}>
                    <div style={{
                        width:          '20px',
                        height:         '20px',
                        borderRadius:   '6px',
                        border:         `2px solid ${anonymous ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        background:     anonymous ? 'var(--color-accent)' : 'transparent',
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: 'center',
                        flexShrink:     0,
                        transition:     'background .15s ease, border-color .15s ease',
                    }}>
                        {anonymous && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="var(--color-on-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        )}
                    </div>
                    <input
                        type="checkbox"
                        checked={anonymous}
                        onChange={e => setAnonymous(e.target.checked)}
                        style={{ display: 'none' }}
                    />
                    <span style={{ fontSize: '14px', color: 'var(--color-text)' }}>
                        {getI18nValue('feedback.anonymous')}
                    </span>
                </label>

                {/* Error */}
                {status === 'error' && errorMsg && (
                    <div className="auth-error-box" style={{ marginBottom: '12px' }}>
                        {errorMsg}
                    </div>
                )}

                <button className="btn-submit" onClick={handleSubmit} disabled={!canSubmit}>
                    {getI18nValue('feedback.send')}
                </button>

                {/* ── Full-modal loading overlay ── */}
                {status === 'loading' && (
                    <div className="modal-loading-overlay visible">
                        <div className="modal-spinner" />
                    </div>
                )}
            </div>
        </div>
    );
}