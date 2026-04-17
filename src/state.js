export class AppState {
    constructor() {
        /** @type {{ accessToken: string|null, userProfile: object|null, status: 'unknown'|'restoring'|'ready'|'unauthenticated' }} */
        this.auth = {
            accessToken:  null,
            userProfile:  null,
            status:       'unknown',
        };

        /** @type {{ spreadsheetId: string|null, expenses: Array, guestSheetId: string|null, isGuestMode: boolean }} */
        this.data = {
            spreadsheetId: null,
            expenses:      [],
            guestSheetId:  null,
            isGuestMode:   false,
        };

        /** @type {{ currentScreen: string, currentPeriod: string, categoryFilter: string, selectedCat: string|null }} */
        this.ui = {
            currentScreen:  'auth',
            currentPeriod:  'week',
            categoryFilter: 'all',
            selectedCat:    null,
        };

        /** @type {Object<string, Array<Function>>} */
        this._subscribers = {};
    }

    // ---------------------------------------------------------------------------
    // Pub/sub
    // ---------------------------------------------------------------------------

    /**
     * Registers a callback to run whenever the given state key changes.
     * Returns an unsubscribe function — call it to remove the listener.
     *
     * @param {string} key
     * @param {Function} fn
     * @returns {Function} unsubscribe
     */
    subscribe(key, fn) {
        if (!this._subscribers[key]) this._subscribers[key] = [];
        this._subscribers[key].push(fn);
        return () => {
            this._subscribers[key] = this._subscribers[key].filter(f => f !== fn);
        };
    }

    /**
     * Calls all subscribers registered for the given key.
     * Private — only called by setters.
     *
     * @param {string} key
     */
    _notify(key) {
        (this._subscribers[key] ?? []).forEach(fn => fn());
    }

    get accessToken()    { return this.auth.accessToken; }
    set accessToken(v)   { this.auth.accessToken = v; }

    get userProfile()    { return this.auth.userProfile; }
    set userProfile(v)   { this.auth.userProfile = v; this._notify('userProfile'); }

    /** @returns {'unknown'|'restoring'|'ready'|'unauthenticated'} */
    get authStatus()     { return this.auth.status; }
    set authStatus(v)    { this.auth.status = v; }

    get spreadsheetId()  { return this.data.spreadsheetId; }
    set spreadsheetId(v) { this.data.spreadsheetId = v; }

    get guestSheetId()   { return this.data.guestSheetId; }
    set guestSheetId(v)  { this.data.guestSheetId = v; }

    get isGuestMode()    { return this.data.isGuestMode; }
    set isGuestMode(v)   { this.data.isGuestMode = v; }

    get expenses()       { return this.data.expenses; }
    set expenses(v)      { this.data.expenses = v; this._notify('expenses'); }

    get currentScreen()  { return this.ui.currentScreen; }
    set currentScreen(v) { this.ui.currentScreen = v; this._notify('currentScreen'); }

    get currentPeriod()  { return this.ui.currentPeriod; }
    set currentPeriod(v) { this.ui.currentPeriod = v; this._notify('currentPeriod'); }

    get currentCategoryFilter()  { return this.ui.categoryFilter; }
    set currentCategoryFilter(v) { this.ui.categoryFilter = v; this._notify('currentCategoryFilter'); }

    get selectedCat()    { return this.ui.selectedCat; }
    set selectedCat(v)   { this.ui.selectedCat = v; this._notify('selectedCat'); }

    reset() {
        this.auth = { accessToken: null, userProfile: null, status: 'unauthenticated' };
        this.data = { spreadsheetId: null, expenses: [], guestSheetId: null, isGuestMode: false };
        // ui state is reset deliberately by the caller (onSignOut)
    }
}

export const STATE = new AppState();