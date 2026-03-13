import * as AuthService from '../services/authService.js';
import { navigate, openModal, handleOverlayClick } from './navigation.js';
import { openGoogleSheet, changeLang, setPeriod } from './actions.js';
import { openAddModal } from '../controllers/expenseController.js';

export function bindEvents() {
    on('btn-google',         'click', () => AuthService.signIn());
    on('main-lang-ru',       'click', () => changeLang('ru'));
    on('main-lang-en',       'click', () => changeLang('en'));
    on('main-lang-es',       'click', () => changeLang('es'));
    on('avatar-btn',         'click', () => openModal('modal-profile'));
    on('stats-avatar-btn',   'click', () => openModal('modal-profile'));
    on('profile-open-sheet', 'click', openGoogleSheet);
    on('profile-sign-out',   'click', () => AuthService.signOut());
    on('nav-home',           'click', () => navigate('main'));
    on('nav-stats',          'click', () => navigate('stats'));
    on('fab',                'click', openAddModal);

    // modal-profile остался в HTML — оставляем его обработчик
    on('modal-profile', 'click', e => handleOverlayClick(e, 'modal-profile'));
}

function on(id, event, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
}