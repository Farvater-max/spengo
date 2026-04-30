import { STATE } from '../state.js';
import { getFilteredExpenses, sumAmounts } from '../utils/helpers.js';
import { LANG, setLang, getI18nValue } from '../i18n/localization.js';
import { openEditModal, openAddModal } from '../controllers/expenseController.js';
import { openShareModal } from '../controllers/sharingController.js';
import { openProfileModal } from '../controllers/authController.js';
import { renderChart } from './statistics/statistics-chart.js';
import { renderDonutChart } from './statistics/statistics-donut.js';
import { getPeriod, setPeriod } from './statistics/statistics-state.js';
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
import { getTheme, toggleTheme, onThemeChange } from './theme.js';
import {
    nextSortDir,
    nextSortField,
    getSortFieldLabel,
    getSortLines,
    buildNavEvent,
} from '../utils/renderer.utils.js';


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
let _authState = { loading: false, error: null, onSignIn: null };
let _authKey   = 0;

export function renderAuthScreen({ loading = false, error = null, onSignIn = null, resetKey = false } = {}) {
    _authState = { loading, error, onSignIn };
    if (resetKey) _authKey++;
    const container = document.getElementById('screen-auth-root');
    if (!container) return;
    if (!_authRoot) _authRoot = createRoot(container);

    _authRoot.render(
        <AuthScreen
            key={_authKey}
            onSignIn={onSignIn}
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
            onHome={() => window.dispatchEvent(buildNavEvent('main'))}
            onStats={() => window.dispatchEvent(buildNavEvent('stats'))}
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
            onAvatarClick={openProfileModal}
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
            onAvatarClick={openProfileModal}
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
            onPeriodChange={period => { STATE.currentPeriod = period; }}
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
        _sortDir = nextSortDir(_sortDir);
        renderSectionHeader();
        renderExpenseList();
    }

    function handleFieldCycle() {
        _sortField = nextSortField(_sortField);
        _sortDir   = 'desc';
        renderSectionHeader();
        renderExpenseList();
    }

    const fieldLabel = getSortFieldLabel(_sortField, getI18nValue);

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
    const lines = getSortLines(dir);
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
            onSelect={catId => { STATE.currentCategoryFilter = catId; }}
        />
    );
}

// ─── CategorySelectGrid (add form) ────────────────────

let _catSelectRoot = null;

export function renderCategorySelectGrid() {
    const container = document.getElementById('cat-select-grid');
    if (!container) return;
    if (!_catSelectRoot) _catSelectRoot = createRoot(container);

    _catSelectRoot.render(
        <CategorySelectGrid
            selectedCat={STATE.selectedCat}
            onSelect={catId => { STATE.selectedCat = catId; }}
        />
    );
}

// ─── CategoryEditGrid (edit form) ─────────────────────

let _catEditRoot = null;

export function renderCategoryEditGrid() {
    const container = document.getElementById('cat-edit-grid');
    if (!container) return;
    if (!_catEditRoot) _catEditRoot = createRoot(container);

    _catEditRoot.render(
        <CategorySelectGrid
            selectedCat={STATE.selectedCat}
            onSelect={catId => { STATE.selectedCat = catId; }}
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
//
// Renders with whatever data the caller provides.
// Ownership logic lives in authController.openProfileModal — not here.

let _profileModalRoot = null;

export function renderProfileModal({
    open          = false,
    profile       = null,
    sharedUsers   = [],
    ownerEmail    = null,
    isOwner       = true,
    spreadsheetId = null,
    onSignOut,
} = {}) {
    const container = document.getElementById('modal-profile-root');
    if (!container) return;
    if (!_profileModalRoot) _profileModalRoot = createRoot(container);

    if (!open) { _profileModalRoot.render(null); return; }

    _profileModalRoot.render(
        <ProfileModal
            profile={profile}
            sharedUsers={sharedUsers}
            ownerEmail={ownerEmail}
            isOwner={isOwner}
            currentTheme={getTheme()}
            onThemeToggle={() => { toggleTheme(); renderProfileModal({ open, profile, sharedUsers, ownerEmail, isOwner, spreadsheetId, onSignOut }); }}
            onOpenSheet={() => {
                if (spreadsheetId) {
                    window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`, '_blank');
                }
                renderProfileModal({ open: false });
            }}
            onShare={() => {
                renderProfileModal({ open: false });
                openShareModal();
            }}
            onSignOut={onSignOut}
            onClose={() => renderProfileModal({ open: false })}
        />
    );
}

// ─── ShareModal ───────────────────────────────────────

let _shareModalRoot = null;

export function renderShareModal({
    open        = false,
    sharedUsers = [],
    accessUrl   = null,
    loading     = false,
    onShare,
    onRemove,
    onClose,
} = {}) {
    const container = document.getElementById('modal-share-root');
    if (!container) return;
    if (!_shareModalRoot) _shareModalRoot = createRoot(container);

    if (!open) { _shareModalRoot.render(null); return; }

    _shareModalRoot.render(
        <ShareModal
            sharedUsers={sharedUsers}
            accessUrl={accessUrl}
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

    // Re-render charts and profile modal when theme changes
    onThemeChange(() => {
        renderChart();
        renderDonutChart(getPeriod());
    });
}