import * as AuthService from '../services/authService.js';
import { navigate, openModal, handleOverlayClick } from './navigation.js';
import { openAddModal, openGoogleSheet, changeLang, setPeriod } from './actions.js';
import { submitExpense } from '../controllers/expenseController.js';

export function bindEvents() {
    on('btn-google', 'click', () => AuthService.signIn());
    on('main-lang-ru', 'click', () => changeLang('ru'));
    on('main-lang-en', 'click', () => changeLang('en'));
    on('main-lang-es', 'click', () => changeLang('es'));
    on('avatar-btn',          'click', () => openModal('modal-profile'));
    on('profile-open-sheet',  'click', openGoogleSheet);
    on('profile-sign-out',    'click', () => AuthService.signOut());
    on('period-day',   'click', e => setPeriod('day',   e.currentTarget));
    on('period-week',  'click', e => setPeriod('week',  e.currentTarget));
    on('period-month', 'click', e => setPeriod('month', e.currentTarget));
    on('nav-home',  'click', () => navigate('main'));
    on('nav-stats', 'click', () => navigate('stats'));
    on('fab',            'click', openAddModal);
    on('btn-add-submit', 'click', submitExpense);
    on('modal-add',     'click', e => handleOverlayClick(e, 'modal-add'));
    on('modal-profile', 'click', e => handleOverlayClick(e, 'modal-profile'));
}

function on(id, event, handler) {
    document.getElementById(id).addEventListener(event, handler);
}