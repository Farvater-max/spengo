import { STATE } from '../../state.js';
import { setText } from '../utils/helpers.js';
import { renderStatistics } from './renderer.js';

/**
 * @param {'auth'|'setup'|'main'|'stats'} name
 */
export function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${name}`).classList.add('active');
    STATE.currentScreen = name;

    const fabVisible = name === 'main' || name === 'stats';
    document.getElementById('fab').classList.toggle('hidden', !fabVisible);
}

/**
 * @param {'main'|'stats'} name
 */
export function navigate(name) {
    showScreen(name);
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(name === 'main' ? 'nav-home' : `nav-${name}`).classList.add('active');
    if (name === 'stats') renderStatistics();
}

export function openModal(id)  {
    const overlay = document.getElementById(id);
    overlay.classList.add('open');
    _attachSwipeToClose(overlay);
}
export function closeModal(id) { document.getElementById(id).classList.remove('open'); }

export function handleOverlayClick(e, id) {
    if (e.target.classList.contains('modal-overlay')) closeModal(id);
}

/**
 * @param {boolean} enabled
 */
export function setNavEnabled(enabled) {
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('disabled', !enabled);
    });
}

function _attachSwipeToClose(overlay) {
    const sheet = overlay.querySelector('.modal-sheet');
    if (!sheet || sheet._swipeAttached) return;
    sheet._swipeAttached = true;

    let startY    = 0;
    let currentY  = 0;
    let lastY     = 0;
    let velocity  = 0;
    let rafId     = null;

    const SPRING  = 'transform .38s cubic-bezier(.2,.8,.4,1)';
    const DISMISS = 'transform .32s cubic-bezier(.4,0,1,1)';

    sheet.addEventListener('touchstart', e => {
        startY   = e.touches[0].clientY;
        lastY    = startY;
        currentY = 0;
        velocity = 0;
        cancelAnimationFrame(rafId);
        sheet.style.transition = 'none';
    }, { passive: true });

    sheet.addEventListener('touchmove', e => {
        const y  = e.touches[0].clientY;
        velocity = y - lastY;
        lastY    = y;

        const dy = y - startY;
        if (dy < 0) return;

        currentY = dy;

        // const rubber = Math.pow(dy, 0.78);
        // rafId = requestAnimationFrame(() => {
        //     sheet.style.transform = `translateY(${rubber}px)`;
        // });
        rafId = requestAnimationFrame(() => {
            sheet.style.transform = `translateY(${currentY}px)`;
        });
    }, { passive: true });

    sheet.addEventListener('touchend', () => {
        cancelAnimationFrame(rafId);

        const shouldDismiss = currentY > 120 || velocity > 10;

        if (shouldDismiss) {
            sheet.style.transition = DISMISS;
            sheet.style.transform  = 'translateY(105%)';
            setTimeout(() => {
                closeModal(overlay.id);
                sheet.style.transition = '';
                sheet.style.transform  = '';
            }, 320);
        } else {
            sheet.style.transition = SPRING;
            sheet.style.transform  = 'translateY(0)';
        }

        currentY = 0;
        velocity = 0;
    }, { passive: true });
}

/**
 * @param {string} message
 */
export function showAuthError(message) {
    const el = document.getElementById('auth-error');
    if (el) { el.textContent = message; el.style.display = 'block'; }
    console.error('[SpenGo auth]', message);
}

/**
 * @param {string} title
 * @param {string} sub
 */
export function setSetupText(title, sub) {
    setText('setup-title', title);
    setText('setup-sub',   sub);
}