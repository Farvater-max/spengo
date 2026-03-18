import { STATE } from '../../state.js';
import { renderStatistics, renderBottomNav, renderSetupScreen, setAuthError } from './renderer.jsx';

export function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    const authRoot  = document.getElementById('screen-auth-root');
    const setupRoot = document.getElementById('screen-setup-root');

    if (authRoot)  authRoot.style.display  = name === 'auth'  ? 'flex' : 'none';
    if (setupRoot) setupRoot.style.display = name === 'setup' ? 'flex' : 'none';

    // expand #app to full width only while auth landing is visible
    document.getElementById('app')?.classList.toggle('auth-active', name === 'auth');

    if (name !== 'auth' && name !== 'setup') {
        const el = document.getElementById(`screen-${name}`);
        if (el) el.classList.add('active');
    }

    STATE.currentScreen = name;

    const navVisible = name === 'main' || name === 'stats';
    const navRoot = document.getElementById('bottom-nav-root');
    if (navRoot) navRoot.style.display = navVisible ? '' : 'none';

    renderBottomNav();
}

export function navigate(name) {
    showScreen(name);
    if (name === 'stats') renderStatistics();
}

export function openModal(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.add('open');
    _attachSwipeToClose(overlay);
}

export function closeModal(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.remove('open');
}

export function handleOverlayClick(e, id) {
    if (e.target.classList.contains('modal-overlay')) closeModal(id);
}

export function setSetupText(title, sub) {
    renderSetupScreen({ title, sub });
}

export function showAuthError(message) {
    setAuthError(message);
    console.error('[SpenGo auth]', message);
}

function _attachSwipeToClose(overlay) {
    const sheet = overlay.querySelector('.modal-sheet');
    if (!sheet || sheet._swipeAttached) return;
    sheet._swipeAttached = true;

    let startY = 0, currentY = 0, lastY = 0, velocity = 0, rafId = null;
    const SPRING  = 'transform .38s cubic-bezier(.2,.8,.4,1)';
    const DISMISS = 'transform .32s cubic-bezier(.4,0,1,1)';

    sheet.addEventListener('touchstart', e => {
        startY = e.touches[0].clientY; lastY = startY;
        currentY = 0; velocity = 0;
        cancelAnimationFrame(rafId);
        sheet.style.transition = 'none';
    }, { passive: true });

    sheet.addEventListener('touchmove', e => {
        const y = e.touches[0].clientY;
        velocity = y - lastY; lastY = y;
        const dy = y - startY;
        if (dy < 0) return;
        currentY = dy;
        rafId = requestAnimationFrame(() => { sheet.style.transform = `translateY(${currentY}px)`; });
    }, { passive: true });

    sheet.addEventListener('touchend', () => {
        cancelAnimationFrame(rafId);
        if (currentY > 120 || velocity > 10) {
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
        currentY = 0; velocity = 0;
    }, { passive: true });
}