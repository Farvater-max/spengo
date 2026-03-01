export class AppState {
    constructor() {
        /** @type {{ accessToken: string|null, userProfile: object|null, status: 'unknown'|'restoring'|'ready'|'unauthenticated' }} */
        this.auth = {
            accessToken:  null,
            userProfile:  null,
            status:       'unknown',
        };

        /** @type {{ spreadsheetId: string|null, expenses: Array }} */
        this.data = {
            spreadsheetId: null,
            expenses:      [],
        };

        /** @type {{ currentScreen: string, currentPeriod: string, categoryFilter: string, selectedCat: string|null }} */
        this.ui = {
            currentScreen:  'auth',
            currentPeriod:  'day',
            categoryFilter: 'all',
            selectedCat:    null,
        };
    }

    get accessToken()    { return this.auth.accessToken; }
    set accessToken(v)   { this.auth.accessToken = v; }

    get userProfile()    { return this.auth.userProfile; }
    set userProfile(v)   { this.auth.userProfile = v; }

    /** @returns {'unknown'|'restoring'|'ready'|'unauthenticated'} */
    get authStatus()     { return this.auth.status; }
    set authStatus(v)    { this.auth.status = v; }

    get spreadsheetId()  { return this.data.spreadsheetId; }
    set spreadsheetId(v) { this.data.spreadsheetId = v; }

    get expenses()       { return this.data.expenses; }
    set expenses(v)      { this.data.expenses = v; }

    get currentScreen()  { return this.ui.currentScreen; }
    set currentScreen(v) { this.ui.currentScreen = v; }

    get currentPeriod()  { return this.ui.currentPeriod; }
    set currentPeriod(v) { this.ui.currentPeriod = v; }

    get currentCategoryFilter()  { return this.ui.categoryFilter; }
    set currentCategoryFilter(v) { this.ui.categoryFilter = v; }

    get selectedCat()    { return this.ui.selectedCat; }
    set selectedCat(v)   { this.ui.selectedCat = v; }

    reset() {
        this.auth = { accessToken: null, userProfile: null, status: 'unauthenticated' };
        this.data = { spreadsheetId: null, expenses: [] };
        // ui state is reset deliberately by the caller (onSignOut)
    }
}

export const STATE = new AppState();