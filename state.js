export class AppState {
    constructor() {
        /** @type {{ accessToken: string|null, userProfile: object|null }} */
        this.auth = {
            accessToken:  null,
            userProfile:  null,
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

    get accessToken()   { return this.auth.accessToken; }
    set accessToken(v)  { this.auth.accessToken = v; }

    get userProfile()   { return this.auth.userProfile; }
    set userProfile(v)  { this.auth.userProfile = v; }

    get spreadsheetId() { return this.data.spreadsheetId; }
    set spreadsheetId(v){ this.data.spreadsheetId = v; }

    get expenses()      { return this.data.expenses; }
    set expenses(v)     { this.data.expenses = v; }

    get currentScreen() { return this.ui.currentScreen; }
    set currentScreen(v){ this.ui.currentScreen = v; }

    get currentPeriod() { return this.ui.currentPeriod; }
    set currentPeriod(v){ this.ui.currentPeriod = v; }

    get currentCategoryFilter() { return this.ui.categoryFilter; }
    set currentCategoryFilter(v){ this.ui.categoryFilter = v; }

    get selectedCat()   { return this.ui.selectedCat; }
    set selectedCat(v)  { this.ui.selectedCat = v; }

    reset() {
        this.auth = { accessToken: null, userProfile: null };
        this.data = { spreadsheetId: null, expenses: [] };
    }
}

export const STATE = new AppState();