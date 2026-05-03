import { useEffect, useRef } from 'react';

/**
 * Onboarding popover that points at the avatar icon.
 * Appears once after the first spreadsheet creation (owner only).
 * All styles live in styles.css §22.
 *
 * @param {{
 *   anchorRect: DOMRect,
 *   onDismiss: () => void,
 * }} props
 */
export function AvatarOnboardingPopover({ anchorRect, onDismiss }) {
    const popoverRef = useRef(null);

    // ── Dismiss on any click outside the popover (capture phase) ──────────
    useEffect(() => {
        function handleCapture(e) {
            if (popoverRef.current && popoverRef.current.contains(e.target)) {
                return;
            }
            onDismiss();
        }

        // Delay so the mount event itself doesn't instantly dismiss the popover.
        const timerId = setTimeout(() => {
            document.addEventListener('click', handleCapture, { capture: true });
        }, 200);

        return () => {
            clearTimeout(timerId);
            document.removeEventListener('click', handleCapture, { capture: true });
        };
    }, [onDismiss]);

    // ── Accent ring on avatar while popover is open ────────────────────────
    useEffect(() => {
        const avatarEl = document.querySelector('.header-avatar');
        if (!avatarEl) return;
        avatarEl.classList.add('ob-avatar-ring');
        return () => avatarEl.classList.remove('ob-avatar-ring');
    }, []);

    // ── Positioning ────────────────────────────────────────────────────────
    const POPOVER_WIDTH = 256;
    const GAP           = 4;

    const top   = anchorRect.bottom + GAP;
    const right = window.innerWidth - anchorRect.right;

    // Arrow: horizontally centered on the avatar icon
    const avatarCenterX = anchorRect.left + anchorRect.width / 2;
    const popoverLeft   = window.innerWidth - right - POPOVER_WIDTH;
    const arrowPct      = Math.min(90, Math.max(10,
        ((avatarCenterX - popoverLeft) / POPOVER_WIDTH) * 100
    ));

    return (
        <div
            ref={popoverRef}
            className="ob-popover"
            style={{
                top,
                right,
                '--ob-arrow-pct': `${arrowPct}%`,
            }}
            role="dialog"
            aria-modal="false"
            aria-label="Onboarding tip"
        >
            <div className="ob-row">
                <span className="ob-title">⚙️ Settings &amp; profile</span>
            </div>

            <p className="ob-body">
                Tap your avatar anytime to manage your account, switch theme, change language, or share with a partner.
            </p>

            <button className="ob-confirm" onClick={onDismiss}>
                Got it!
            </button>
        </div>
    );
}