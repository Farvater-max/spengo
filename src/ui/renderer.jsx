import { STATE } from '../state.js';
import { getFilteredExpenses, sumAmounts } from '../utils/helpers.js';
import { LANG, setLang, getI18nValue } from '../i18n/localization.js';
import { openEditModal, openAddModal } from '../controllers/expenseController.js';
import { openShareModal } from '../controllers/sharingController.js';
import { renderChart } from './statistics/statistics-chart.js';
import { renderDonutChart } from './statistics/statistics-donut.js';
import { getPeriod, setPeriod } from './statistics/statistics-state.js';
import * as AuthService from '../services/authService.js';
import * as Storage from '../services/storageService.js';
import {
    selectCategory,
    selectPeriod,
    selectAddCategory,
    selectEditCategory,
} from '../controllers/uiController.js';
import { createRoot } from 'react-dom/client';
import { ExpenseList }        from './components/ExpenseList.jsx';
import { CategoryFilter }     from './components/CategoryFilter.jsx';
import { CategorySelectGrid } from './components/CategorySelectGrid.jsx';
import { SummaryCard }        from './components/SummaryCard.jsx';
import { AddExpenseModal }    from './components/AddExpenseModal.jsx';
import { EditExpenseModal }   from './components/EditExpenseModal.jsx';
import { ProfileModal }       from './components/ProfileModal.jsx';
import { ShareModal }         from './components/ShareModal.jsx';
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


// ─── Sort state ───────────────────────────────────────

let _sortField = 'date';
let _sortDir   = 'desc';

// ─── renderUI ─────────────────────────────────────────

export function renderUI() {
    renderMainHeader();
    renderSummary();
    renderCategoryFilter();
    renderSectionHeader();
    renderExpenseList();
    renderStatistics();
    renderBottomNav();
}

// ─── AuthScreen ───────────────────────────────────────

let _authRoot  = null;
let _authState = { loading: false, error: null };
let _authKey   = 0;

export function renderAuthScreen({ loading = false, error = null, resetKey = false } = {}) {
    _authState = { loading, error };
    if (resetKey) _authKey++;
    const container = document.getElementById('screen-auth-root');
    if (!container) return;
    if (!_authRoot) _authRoot = createRoot(container);

    _authRoot.render(
        <AuthScreen
            key={_authKey}
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
                    renderSectionHeader();
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
            onPeriodChange={selectPeriod}
        />
    );
}

// ─── SectionHeader (title + sort controls) ────────────

let _sectionHeaderRoot = null;

export function renderSectionHeader() {
    const container = document.getElementById('section-header-root');
    if (!container) return;
    if (!_sectionHeaderRoot) _sectionHeaderRoot = createRoot(container);

    function handleDirToggle() {
        _sortDir = _sortDir === 'desc' ? 'asc' : 'desc';
        renderSectionHeader();
        renderExpenseList();
    }

    function handleFieldCycle() {
        _sortField = _sortField === 'date' ? 'amount' : 'date';
        _sortDir   = 'desc';
        renderSectionHeader();
        renderExpenseList();
    }

    const fieldLabel = _sortField === 'date'
        ? (getI18nValue('sort.date'))
        : (getI18nValue('sort.amount'));

    _sectionHeaderRoot.render(
        <div className="section-header">
            <span className="section-title">{getI18nValue('section.expenses')}</span>
            <div className="sort-controls">
                <button className="sort-dir-btn" onClick={handleDirToggle} title="Toggle sort direction">
                    <SortLinesIcon dir={_sortDir} />
                </button>
                <button className="sort-field-pill" onClick={handleFieldCycle}>
                    {fieldLabel}
                    <span className="sort-field-chevron">&#9662;</span>
                </button>
            </div>
        </div>
    );
}

function SortLinesIcon({ dir }) {
    const isDesc = dir === 'desc';
    const lines = isDesc
        ? [{ x2: 13 }, { x2: 9 }, { x2: 5 }]
        : [{ x2: 5  }, { x2: 9 }, { x2: 13 }];
    return (
        <svg width="16" height="14" viewBox="0 0 16 14" fill="none"
             xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <line x1="1" y1="1.5"  x2={lines[0].x2} y2="1.5"  stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <line x1="1" y1="7"    x2={lines[1].x2} y2="7"    stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <line x1="1" y1="12.5" x2={lines[2].x2} y2="12.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
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
            sortField={_sortField}
            sortDir={_sortDir}
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
            onSelect={selectCategory}
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
            onSelect={selectAddCategory}
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
            onSelect={selectEditCategory}
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

    // Determine ownership: compare current user's email to the cached owner email.
    // On first open before any sharing API call, ownerEmail is null → we treat
    // the current user as owner (safe default: they see the Share button and
    // no "shared by" banner). The real value arrives after openShareModal fires.
    const ownerEmail  = Storage.getSheetOwnerEmail();
    const myEmail     = STATE.userProfile?.email ?? null;
    const isOwner     = !ownerEmail || !myEmail || ownerEmail.toLowerCase() === myEmail.toLowerCase();
    const sharedUsers = Storage.getSharedUsers();

    _profileModalRoot.render(
        <ProfileModal
            profile={STATE.userProfile}
            sharedUsers={sharedUsers}
            ownerEmail={ownerEmail}
            isOwner={isOwner}
            onOpenSheet={() => {
                if (STATE.spreadsheetId) {
                    window.open(`https://docs.google.com/spreadsheets/d/${STATE.spreadsheetId}`, '_blank');
                }
                renderProfileModal({ open: false });
            }}
            onShare={() => {
                renderProfileModal({ open: false });
                openShareModal();
            }}
            onSignOut={() => {
                renderProfileModal({ open: false });
                renderAuthScreen({ resetKey: true });
                AuthService.signOut();
            }}
            onClose={() => renderProfileModal({ open: false })}
        />
    );
}

// ─── ShareModal ───────────────────────────────────────

let _shareModalRoot = null;

export function renderShareModal({
    open        = false,
    sharedUsers = [],
    loading     = false,
    onShare,
    onRemove,
    onClose,
}) {
    const container = document.getElementById('modal-share-root');
    if (!container) return;
    if (!_shareModalRoot) _shareModalRoot = createRoot(container);

    if (!open) { _shareModalRoot.render(null); return; }

    _shareModalRoot.render(
        <ShareModal
            sharedUsers={sharedUsers}
            loading={loading}
            onShare={onShare}
            onRemove={onRemove}
            onClose={onClose}
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

// ─── Reactive bindings ────────────────────────────────
//
// Wire STATE changes to renders once, at app startup (called from app.js).
// After this point any code can mutate STATE directly — the right renders
// fire automatically, with no manual render() calls needed at the call site.

export function initReactiveBindings() {
    STATE.subscribe('expenses', () => {
        renderExpenseList();
        renderCategoryFilter();
        renderSummary();
    });

    STATE.subscribe('currentPeriod', () => {
        renderSummary();
        renderExpenseList();
    });

    STATE.subscribe('currentCategoryFilter', () => {
        renderCategoryFilter();
        renderExpenseList();
        renderSummary();
    });

    // Render bottom nav and section title whenever the active screen changes.
    // Section title is static but lives on the main screen — it must be mounted
    // at least once after navigation, since renderUI() no longer runs on data load.
    STATE.subscribe('currentScreen', () => {
        renderBottomNav();
        renderSectionHeader();
    });

    STATE.subscribe('selectedCat', () => {
        renderCategorySelectGrid();
        renderCategoryEditGrid();
    });

    STATE.subscribe('userProfile', () => {
        renderMainHeader();
        renderStatsHeader();
    });
}