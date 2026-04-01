import { useState, useEffect } from 'react';
import { getI18nValue } from '../../i18n/localization.js';

export function AuthScreen({ onSignIn, loading, error }) {
    const [clicked, setClicked] = useState(false);

    useEffect(() => {
        if (error) setClicked(false);
    }, [error]);

    function handleSignIn() {
        setClicked(true);
        onSignIn();
    }

    const isDisabled = loading || clicked;

    return (
        <div className="auth-layout">

            {/* ── LEFT PANEL — expense tracking ── */}
            <div className="auth-panel auth-panel--left">
                <div className="auth-panel-inner">
                    <div className="auth-panel-badge">Track expenses</div>

                    <div className="auth-panel-screenshot">
                        <img src="/home.webp" alt="SpenGo home screen" />
                    </div>

                    <div className="auth-feature-block">
                        <h3 className="auth-feature-title"><span className="auth-feature-icon">⚡</span>Add in seconds</h3>
                        <p className="auth-feature-desc">
                            Tap +, enter the amount, pick a category — done. Logging an expense
                            takes under 5 seconds, so you'll actually stick with it.{' '}
                            <a href="/features/#add-in-seconds" className="auth-feature-link">Learn more →</a>
                        </p>
                    </div>

                    <div className="auth-feature-block">
                        <h3 className="auth-feature-title"><span className="auth-feature-icon">✏️</span>Edit or delete anytime</h3>
                        <p className="auth-feature-desc">
                            Made a mistake? Tap the pencil icon on any entry to correct the amount,
                            change the category, date or remove it entirely.{' '}
                            <a href="/features/#edit-delete" className="auth-feature-link">Learn more →</a>
                        </p>
                    </div>

                    <div className="auth-feature-block">
                        <h3 className="auth-feature-title"><span className="auth-feature-icon">🗂️</span>Filter by category</h3>
                        <p className="auth-feature-desc">
                            Food, Transport, Housing, Entertainment and more. Filter and sorting the list in one
                            tap to see only what you're interested in.{' '}
                            <a href="/features/#filter-category" className="auth-feature-link">Learn more →</a>
                        </p>
                    </div>
                </div>
            </div>

            {/* ── CENTER PANEL — sign-in ── */}
            <div className="auth-panel auth-panel--center">
                <div className="auth-panel-inner auth-panel-inner--center">

                    <h1 className="visually-hidden">SpenGo</h1>

                    <h1 className="auth-logo">{getI18nValue('auth.logo')}</h1>
                    <p className="auth-tagline">{getI18nValue('auth.tagline')}</p>

                    <div className="auth-showcase">
                        <img src="/main.webp" alt="SpenGo expense tracker" className="main-image" fetchPriority="high" />
                    </div>

                    <div className="auth-feature-block">
                        <h3 className="auth-feature-title"><span className="auth-feature-icon">🔐</span>Your Expenses. Your Google Sheet</h3>
                        <p className="auth-feature-desc">
                            SpenGo is a fast, mobile-first expense tracker.
                            Your data stays in Google Sheets — no servers, no databases, no third-party storage.{' '}
                            <a href="/features/#your-sheet" className="auth-feature-link">Learn more →</a>
                        </p>
                    </div>

                    <div className="auth-feature-block">
                        <h3 className="auth-feature-title"><span className="auth-feature-icon">🔗</span>Share with a partner</h3>
                        <p className="auth-feature-desc">
                            Invite one other Google account to view and edit your sheet together —
                            perfect for couples or housemates tracking a shared budget.{' '}
                            <a href="/features/#share-partner" className="auth-feature-link">Learn more →</a>
                        </p>
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
                        style={{ display: 'block', textAlign: 'center', color: '#6b6b7e', fontSize: '13px', textDecoration: 'none', padding: '4px' }}
                    >
                        Privacy Policy &amp; Terms of use
                    </a>
                </div>
            </div>

            {/* ── RIGHT PANEL — statistics ── */}
            <div className="auth-panel auth-panel--right">
                <div className="auth-panel-inner">
                    <div className="auth-panel-badge">Statistics insights</div>

                    <div className="auth-panel-screenshot">
                        <img src="/stats.webp" alt="SpenGo statistics screen" />
                    </div>

                    <div className="auth-feature-block">
                        <h3 className="auth-feature-title"><span className="auth-feature-icon">📊</span>Bar chart by period</h3>
                        <p className="auth-feature-desc">
                            See your daily spending laid out as a bar chart for the current week,
                            month, or year — spot patterns and outliers at a glance.{' '}
                            <a href="/features/#bar-chart" className="auth-feature-link">Learn more →</a>
                        </p>
                    </div>

                    <div className="auth-feature-block">
                        <h3 className="auth-feature-title"><span className="auth-feature-icon">🍩</span>Category breakdown</h3>
                        <p className="auth-feature-desc">
                            A donut chart shows exactly how your budget splits across categories,
                            with percentage labels so nothing stays hidden.{' '}
                            <a href="/features/#donut-chart" className="auth-feature-link">Learn more →</a>
                        </p>
                    </div>

                    <div className="auth-feature-block">
                        <h3 className="auth-feature-title"><span className="auth-feature-icon">📅</span>Week · Month · Year</h3>
                        <p className="auth-feature-desc">
                            Switch between time frames in one tap. Track short-term habits or
                            review your annual spending — the choice is yours.{' '}
                            <a href="/features/#time-frames" className="auth-feature-link">Learn more →</a>
                        </p>
                    </div>
                </div>
            </div>

        </div>
    );
}