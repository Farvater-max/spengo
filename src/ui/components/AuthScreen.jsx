import { useState, useEffect } from 'react';
import { getI18nValue } from '../../i18n/localization.js';

/**
 * @param {{
 *   onSignIn: () => void,
 *   loading: boolean,
 *   error: string|null,
 * }} props
 */
export function AuthScreen({ onSignIn, loading, error }) {
    const [clicked, setClicked] = useState(false);

    // сбрасываем clicked если пришла ошибка — разблокируем кнопку
    useEffect(() => {
        if (error) setClicked(false);
    }, [error]);

    function handleSignIn() {
        setClicked(true);
        onSignIn();
    }

    const isDisabled = loading || clicked;

    return (
        <div className="auth-screen-inner">
            <h1 className="auth-logo">{getI18nValue('auth.logo')}</h1>
            <h2 className="auth-tagline">{getI18nValue('auth.tagline')}</h2>

            <div className="auth-showcase">
                <img src="/main.webp" alt="SpenGo expenses" className="main-image" fetchPriority="high" />
            </div>

            <div className="section">
                <h2>Overview</h2>
                <p>SpenGo is a personal expense tracker that stores all your data directly in your own Google Spreadsheet. We do not operate any servers, databases, or backend infrastructure that handles your personal or financial information.</p>
            </div>

            <div className="auth-card">
                <button
                    className="btn-google"
                    onClick={handleSignIn}
                    disabled={isDisabled}
                >
                    <svg width="20" height="20" viewBox="0 0 48 48">
                        <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.4 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
                        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.4 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                        <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.2l-6.3-5.4C29.5 35.2 26.9 36 24 36c-5.3 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
                        <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.2 5.4l6.3 5.4C37 38.2 44 33 44 24c0-1.3-.1-2.6-.4-3.9z"/>
                    </svg>
                    <span>
                        {isDisabled
                            ? getI18nValue('btn.saving')
                            : getI18nValue('auth.btn')
                        }
                    </span>
                </button>

                {error && (
                    <div className="auth-error-box">{error}</div>
                )}
            </div>

            <a
                href="/privacy-policy/"
                style={{ display: 'block', textAlign: 'center', color: '#6b6b7e', fontSize: '14px', textDecoration: 'none', padding: '4px' }}
            >
                Privacy Policy &amp; Terms of use
            </a>
        </div>
    );
}