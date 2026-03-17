import { STATE } from '../../state.js';
import { getFilteredExpenses, sumAmounts } from '../utils/helpers.js';
import { LANG, setLang, getI18nValue } from '../i18n/localization.js';
import { openEditModal, openAddModal } from '../controllers/expenseController.js';
import { renderChart } from './statistics/statistics-chart.js';
import { renderDonutChart } from './statistics/statistics-donut.js';
import { getPeriod, setPeriod } from './statistics/statistics-state.js';
import * as AuthService from '../services/authService.js';
import { createRoot } from 'react-dom/client';
import { ExpenseList }        from './components/ExpenseList.jsx';
import { CategoryFilter }     from './components/CategoryFilter.jsx';
import { CategorySelectGrid } from './components/CategorySelectGrid.jsx';
import { SummaryCard }        from './components/SummaryCard.jsx';
import { AddExpenseModal }    from './components/AddExpenseModal.jsx';
import { EditExpenseModal }   from './components/EditExpenseModal.jsx';
import { ProfileModal }       from './components/ProfileModal.jsx';
import { MainHeader }         from './components/MainHeader.jsx';
import { StatsHeader }        from './components/StatsHeader.jsx';
import { BottomNav }          from './components/BottomNav.jsx';
import { AuthScreen }         from './components/AuthScreen.jsx';
import { SetupScreen }        from './components/SetupScreen.jsx';
import { StatsScreen }        from './components/StatsScreen.jsx';

// ─── Nav state ────────────────────────────────────────

let _navEnabled = false;

export function setNavEnabled(enabled) {
    _navEnabled = enabled;
    renderBottomNav();
}

// ─── renderUI ─────────────────────────────────────────

export function renderUI() {
    renderMainHeader();
    renderSummary();
    renderCategoryFilter();
    renderSectionTitle();
    renderExpenseList();
    renderStatistics();
    renderBottomNav();
}

// ─── AuthScreen ───────────────────────────────────────

let _authRoot  = null;
let _authState = { loading: false, error: null };

export function renderAuthScreen({ loading = false, error = null } = {}) {
    _authState = { loading, error };
    const container = document.getElementById('screen-auth-root');
    if (!container) return;
    if (!_authRoot) _authRoot = createRoot(container);

    _authRoot.render(
        <AuthScreen
            onSignIn={AuthService.signIn}
            loading={loading}
            error={error}
        />
    );
}

export function setAuthError(message) {
    renderAuthScreen({ ..._authState, error: message, loading: false });
}

export function setAuthLoading(loading) {
    renderAuthScreen({ ..._authState, loading });
}

// ─── SetupScreen ──────────────────────────────────────

let _setupRoot = null;

export function renderSetupScreen({ title = '', sub = '' } = {}) {
    const container = document.getElementById('screen-setup-root');
    if (!container) return;
    if (!_setupRoot) _setupRoot = createRoot(container);

    _setupRoot.render(<SetupScreen title={title} sub={sub} />);
}

// ─── StatsScreen (mounted once — canvases must stay stable) ──

let _statsScreenMounted = false;

export function mountStatsScreen() {
    if (_statsScreenMounted) return;
    const container = document.getElementById('stats-screen-root');
    if (!container) return;

    createRoot(container).render(<StatsScreen />);
    _statsScreenMounted = true;
}

// ─── BottomNav ────────────────────────────────────────

let _bottomNavRoot = null;

export function renderBottomNav() {
    const container = document.getElementById('bottom-nav-root');
    if (!container) return;
    if (!_bottomNavRoot) _bottomNavRoot = createRoot(container);

    _bottomNavRoot.render(
        <BottomNav
            currentScreen={STATE.currentScreen}
            enabled={_navEnabled}
            onHome={() => window.dispatchEvent(new CustomEvent('spengo:navigate', { detail: { name: 'main' } }))}
            onStats={() => window.dispatchEvent(new CustomEvent('spengo:navigate', { detail: { name: 'stats' } }))}
            onAdd={openAddModal}
        />
    );
}

// ─── MainHeader ───────────────────────────────────────

let _mainHeaderRoot = null;

export function renderMainHeader() {
    const container = document.getElementById('main-header-root');
    if (!container) return;
    if (!_mainHeaderRoot) _mainHeaderRoot = createRoot(container);

    _mainHeaderRoot.render(
        <MainHeader
            currentLang={LANG}
            onLangChange={lang => {
                setLang(lang, STATE, () => {
                    renderUI();
                    renderStatsHeader();
                    renderCategorySelectGrid();
                    renderCategoryEditGrid();
                });
                renderMainHeader();
            }}
            onAvatarClick={() => renderProfileModal({ open: true })}
            profile={STATE.userProfile}
        />
    );
}

// ─── StatsHeader ──────────────────────────────────────

let _statsHeaderRoot = null;

export function renderStatsHeader() {
    const container = document.getElementById('stats-header-root');
    if (!container) return;
    if (!_statsHeaderRoot) _statsHeaderRoot = createRoot(container);

    _statsHeaderRoot.render(
        <StatsHeader
            currentPeriod={getPeriod()}
            onPeriodChange={period => { setPeriod(period); renderStatsHeader(); }}
            onAvatarClick={() => renderProfileModal({ open: true })}
            profile={STATE.userProfile}
        />
    );
}

// ─── SummaryCard ──────────────────────────────────────

let _summaryRoot = null;

export function renderSummary() {
    const container = document.getElementById('summary-card-root');
    if (!container) return;
    if (!_summaryRoot) _summaryRoot = createRoot(container);

    _summaryRoot.render(
        <SummaryCard
            total={sumAmounts(getFilteredExpenses(STATE))}
            currentPeriod={STATE.currentPeriod}
            onPeriodChange={period => {
                STATE.currentPeriod = period;
                renderSummary();
                renderExpenseList();
            }}
        />
    );
}

// ─── SectionTitle ─────────────────────────────────────

let _sectionTitleRoot = null;

export function renderSectionTitle() {
    const container = document.getElementById('section-title-root');
    if (!container) return;
    if (!_sectionTitleRoot) _sectionTitleRoot = createRoot(container);

    _sectionTitleRoot.render(
        <div className="section-title">
            {getI18nValue('section.expenses')}
        </div>
    );
}

// ─── ExpenseList ──────────────────────────────────────

let _expenseListRoot = null;

export function renderExpenseList() {
    const container = document.getElementById('expense-list');
    if (!container) return;
    if (!_expenseListRoot) _expenseListRoot = createRoot(container);

    _expenseListRoot.render(
        <ExpenseList
            expenses={STATE.expenses}
            currentPeriod={STATE.currentPeriod}
            currentCategoryFilter={STATE.currentCategoryFilter}
            onEdit={openEditModal}
        />
    );
}

// ─── CategoryFilter ───────────────────────────────────

let _categoryFilterRoot = null;

export function renderCategoryFilter() {
    const container = document.getElementById('cat-filter-row');
    if (!container) return;
    if (!_categoryFilterRoot) _categoryFilterRoot = createRoot(container);

    _categoryFilterRoot.render(
        <CategoryFilter
            expenses={STATE.expenses}
            activeCat={STATE.currentCategoryFilter}
            onSelect={catId => {
                STATE.currentCategoryFilter = catId;
                renderCategoryFilter();
                renderExpenseList();
                renderSummary();
            }}
        />
    );
}

// ─── CategorySelectGrid ───────────────────────────────

let _catSelectRoot = null;

export function renderCategorySelectGrid() {
    const container = document.getElementById('cat-select-grid');
    if (!container) return;
    if (!_catSelectRoot) _catSelectRoot = createRoot(container);

    _catSelectRoot.render(
        <CategorySelectGrid
            selectedCat={STATE.selectedCat}
            onSelect={catId => { STATE.selectedCat = catId; renderCategorySelectGrid(); }}
        />
    );
}

// ─── CategoryEditGrid ─────────────────────────────────

let _catEditRoot = null;

export function renderCategoryEditGrid() {
    const container = document.getElementById('cat-edit-grid');
    if (!container) return;
    if (!_catEditRoot) _catEditRoot = createRoot(container);

    _catEditRoot.render(
        <CategorySelectGrid
            selectedCat={STATE.selectedCat}
            onSelect={catId => { STATE.selectedCat = catId; renderCategoryEditGrid(); }}
        />
    );
}

// ─── AddExpenseModal ──────────────────────────────────

let _addModalRoot = null;

export function renderAddModal({ open = false, loading = false, onSubmit, onClose }) {
    const container = document.getElementById('modal-add-root');
    if (!container) return;
    if (!_addModalRoot) _addModalRoot = createRoot(container);

    if (!open) { _addModalRoot.render(null); return; }

    _addModalRoot.render(
        <AddExpenseModal
            initialCat={STATE.selectedCat || 'food'}
            loading={loading}
            onSubmit={onSubmit}
            onClose={onClose}
        />
    );
}

// ─── EditExpenseModal ─────────────────────────────────

let _editModalRoot = null;

export function renderEditModal({ expense = null, loading = false, onUpdate, onDelete, onClose }) {
    const container = document.getElementById('modal-edit-root');
    if (!container) return;
    if (!_editModalRoot) _editModalRoot = createRoot(container);

    _editModalRoot.render(
        <EditExpenseModal
            expense={expense}
            loading={loading}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onClose={onClose}
        />
    );
}

// ─── ProfileModal ─────────────────────────────────────

let _profileModalRoot = null;

export function renderProfileModal({ open = false }) {
    const container = document.getElementById('modal-profile-root');
    if (!container) return;
    if (!_profileModalRoot) _profileModalRoot = createRoot(container);

    if (!open) { _profileModalRoot.render(null); return; }

    _profileModalRoot.render(
        <ProfileModal
            profile={STATE.userProfile}
            onOpenSheet={() => {
                if (STATE.spreadsheetId) {
                    window.open(`https://docs.google.com/spreadsheets/d/${STATE.spreadsheetId}`, '_blank');
                }
                renderProfileModal({ open: false });
            }}
            onSignOut={() => {
                renderProfileModal({ open: false });
                AuthService.signOut();
            }}
            onClose={() => renderProfileModal({ open: false })}
        />
    );
}

// ─── Statistics ───────────────────────────────────────

export function renderStatistics() {
    renderStatsHeader();
    renderChart();
    renderDonutChart(getPeriod());
}

// ─── Avatar ───────────────────────────────────────────

export function updateAvatarUI() {
    renderMainHeader();
    renderStatsHeader();
}