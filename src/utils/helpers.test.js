import {
    formatDate,
    formatMoney,
    isInPeriod,
    getFilteredExpenses,
    parseAmount,
    sumAmounts,
    sortExpenses,
    uuid,
    todayStr,
    isGoogleEmail,
    isPermissionError,
    isAuthError,
    isSheetOwner,
    buildAccessUrl,
    validateShareTarget,
} from './helpers.js';

const fmt = d =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const todayISO = fmt(new Date());

describe('uuid', () => {
    test('given no input — when called — then returns a string', () => {
        expect(typeof uuid()).toBe('string');
    });

    test('given no input — when called — then matches UUID v4 format', () => {
        // given
        const v4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        // when
        const result = uuid();
        // then
        expect(result).toMatch(v4);
    });

    test('given two calls — when compared — then values are unique', () => {
        // when
        const first  = uuid();
        const second = uuid();
        // then
        expect(first).not.toBe(second);
    });
});

describe('todayStr', () => {
    test('given no input — when called — then returns YYYY-MM-DD format', () => {
        expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('given current date — when called — then matches local date', () => {
        // given
        const expected = fmt(new Date());
        // when
        const result = todayStr();
        // then
        expect(result).toBe(expected);
    });
});

describe('formatDate', () => {
    test('given empty string — when called — then returns empty string', () => {
        expect(formatDate('')).toBe('');
    });

    test('given null — when called — then returns empty string', () => {
        expect(formatDate(null)).toBe('');
    });

    test('given undefined — when called — then returns empty string', () => {
        expect(formatDate(undefined)).toBe('');
    });

    test('given valid date and lang "en" — when called — then returns English format', () => {
        // given
        const date = '2024-03-01';
        // when
        const result = formatDate(date, 'en');
        // then
        expect(result).toBe('1 Mar');
    });

    test('given valid date and lang "ru" — when called — then returns Russian format', () => {
        // given
        const date = '2024-03-01';
        // when
        const result = formatDate(date, 'ru');
        // then
        expect(result).toBe('1 мар.');
    });

    test('given valid date and lang "es" — when called — then returns Spanish format', () => {
        // given
        const date = '2024-03-01';
        // when
        const result = formatDate(date, 'es');
        // then
        expect(result).toBe('1 mar');
    });

    test('given valid date and lang "pl" — when called — then returns Polish format', () => {
        // given
        const date = '2024-03-01';
        // when
        const result = formatDate(date, 'pl');
        // then
        expect(result).toBe('1 mar');
    });

    test('given valid date and lang "cs" — when called — then returns Czech format', () => {
        // given
        const date = '2024-03-01';
        // when
        const result = formatDate(date, 'cs');
        // then
        expect(result).toBe('1 bře');
    });

    test('given valid date and unknown lang — when called — then falls back to English', () => {
        // given
        const date = '2024-03-01';
        // when
        const result = formatDate(date, 'xx');
        // then
        expect(result).toBe('1 Mar');
    });

    test('given invalid date string — when called — then returns empty string', () => {
        // given
        const date = 'not-a-date';
        // when
        const result = formatDate(date, 'en');
        // then
        expect(result).toBe('');
    });

    test('given year boundary date — when called — then formats correctly', () => {
        // given
        const date = '2024-01-01';
        // when
        const result = formatDate(date, 'en');
        // then
        expect(result).toBe('1 Jan');
    });
});

describe('formatMoney', () => {
    test('given integer amount — when called — then returns without decimals', () => {
        // given / when
        const result = formatMoney(100);
        // then
        expect(result).toBe('100');
    });

    test('given float amount — when called — then returns with 2 decimals', () => {
        // given / when
        const result = formatMoney(10.5);
        // then
        expect(result).toBe('10.50');
    });

    test('given zero — when called — then returns "0"', () => {
        expect(formatMoney(0)).toBe('0');
    });

    test('given NaN — when called — then returns "0"', () => {
        expect(formatMoney(NaN)).toBe('0');
    });

    test('given non-number string — when called — then returns "0"', () => {
        expect(formatMoney('abc')).toBe('0');
    });

    test('given negative amount — when called — then formats with minus sign', () => {
        // given / when
        const result = formatMoney(-50);
        // then
        expect(result).toBe('-50');
    });

    test('given large number — when called — then formats with thousand separator', () => {
        // given / when
        const result = formatMoney(1000000);
        // then
        expect(result).toBe('1,000,000');
    });

    test('given amount and ru-RU locale — when called — then uses Russian formatting', () => {
        // given
        const amount = 1000;
        // when
        const result = formatMoney(amount, 'ru-RU');
        // then — Russian locale uses space or non-breaking space as thousand separator
        expect(result).toMatch(/1.000/);
    });
});

describe('parseAmount', () => {
    test('given integer string — when called — then returns number', () => {
        expect(parseAmount('100')).toBe(100);
    });

    test('given float string with dot — when called — then returns float', () => {
        expect(parseAmount('10.5')).toBe(10.5);
    });

    test('given float string with comma — when called — then returns float', () => {
        expect(parseAmount('10,5')).toBe(10.5);
    });

    test('given numeric type input — when called — then parses correctly', () => {
        // given
        const amount = 42;
        // when
        const result = parseAmount(amount);
        // then
        expect(result).toBe(42);
    });

    test('given string with spaces — when called — then trims and parses', () => {
        expect(parseAmount('  15  ')).toBe(15);
    });

    test('given negative value — when called — then returns 0', () => {
        expect(parseAmount('-5')).toBe(0);
    });

    test('given zero — when called — then returns 0', () => {
        expect(parseAmount('0')).toBe(0);
    });

    test('given empty string — when called — then returns 0', () => {
        expect(parseAmount('')).toBe(0);
    });

    test('given non-numeric string — when called — then returns 0', () => {
        expect(parseAmount('abc')).toBe(0);
    });

    test('given value with more than 2 decimals — when called — then rounds to 2', () => {
        expect(parseAmount('10.999')).toBe(11.00);
    });

    test('given very large number — when called — then returns it correctly', () => {
        expect(parseAmount('999999.99')).toBe(999999.99);
    });
});

describe('sumAmounts', () => {
    test('given empty array — when called — then returns 0', () => {
        expect(sumAmounts([])).toBe(0);
    });

    test('given single expense — when called — then returns its amount', () => {
        // given
        const expenses = [{ amount: 42 }];
        // when
        const result = sumAmounts(expenses);
        // then
        expect(result).toBe(42);
    });

    test('given multiple expenses — when called — then returns correct sum', () => {
        // given
        const expenses = [{ amount: 10 }, { amount: 20 }, { amount: 30 }];
        // when
        const result = sumAmounts(expenses);
        // then
        expect(result).toBe(60);
    });

    test('given 0.1 and 0.2 — when summed — then returns 0.3 without float drift', () => {
        // given
        const expenses = [{ amount: 0.1 }, { amount: 0.2 }];
        // when
        const result = sumAmounts(expenses);
        // then
        expect(result).toBe(0.3);
    });

    test('given amounts with many decimals — when called — then rounds to 2 places', () => {
        // given
        const expenses = [{ amount: 1.005 }, { amount: 1.005 }];
        // when
        const result = sumAmounts(expenses);
        // then
        expect(result).toBe(2.01);
    });

    test('given all zero amounts — when called — then returns 0', () => {
        // given
        const expenses = [{ amount: 0 }, { amount: 0 }];
        // when
        const result = sumAmounts(expenses);
        // then
        expect(result).toBe(0);
    });
});

describe('isInPeriod', () => {
    const pastDate = '2000-01-01';

    test('given empty string — when called — then returns false', () => {
        expect(isInPeriod('', 'day')).toBe(false);
    });

    test('given null — when called — then returns false', () => {
        expect(isInPeriod(null, 'day')).toBe(false);
    });

    test('given today and period "day" — when called — then returns true', () => {
        expect(isInPeriod(todayISO, 'day')).toBe(true);
    });

    test('given past date and period "day" — when called — then returns false', () => {
        expect(isInPeriod(pastDate, 'day')).toBe(false);
    });

    test('given today and period "week" — when called — then returns true', () => {
        expect(isInPeriod(todayISO, 'week')).toBe(true);
    });

    test('given past date and period "week" — when called — then returns false', () => {
        expect(isInPeriod(pastDate, 'week')).toBe(false);
    });

    test('given today and period "month" — when called — then returns true', () => {
        expect(isInPeriod(todayISO, 'month')).toBe(true);
    });

    test('given past date and period "month" — when called — then returns false', () => {
        expect(isInPeriod(pastDate, 'month')).toBe(false);
    });

    test('given today and unknown period — when called — then returns false', () => {
        expect(isInPeriod(todayISO, 'year')).toBe(false);
    });
});

describe('getFilteredExpenses', () => {
    const expenses = [
        { id: '1', date: todayISO,     category: 'food',   amount: 100 },
        { id: '2', date: todayISO,     category: 'health', amount: 50  },
        { id: '3', date: todayISO,     category: 'food',   amount: 30  },
        { id: '4', date: '2000-01-01', category: 'food',   amount: 200 },
        { id: '5', date: '2000-01-01', category: 'health', amount: 80  },
    ];

    test('given expenses and filter "all" — when period is "day" — then returns only today items', () => {
        // given
        const state = { expenses, currentPeriod: 'day', currentCategoryFilter: 'all' };
        // when
        const result = getFilteredExpenses(state);
        // then
        expect(result).toHaveLength(3);
    });

    test('given expenses and filter "food" — when period is "day" — then returns only today food items', () => {
        // given
        const state = { expenses, currentPeriod: 'day', currentCategoryFilter: 'food' };
        // when
        const result = getFilteredExpenses(state);
        // then
        expect(result).toHaveLength(2);
        expect(result.every(e => e.category === 'food')).toBe(true);
    });

    test('given expenses and filter "health" — when period is "day" — then returns only today health item', () => {
        // given
        const state = { expenses, currentPeriod: 'day', currentCategoryFilter: 'health' };
        // when
        const result = getFilteredExpenses(state);
        // then
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('2');
    });

    test('given expenses and filter "transport" — when period is "day" — then returns empty array', () => {
        // given
        const state = { expenses, currentPeriod: 'day', currentCategoryFilter: 'transport' };
        // when
        const result = getFilteredExpenses(state);
        // then
        expect(result).toHaveLength(0);
    });

    test('given empty expenses — when called — then returns empty array', () => {
        // given
        const state = { expenses: [], currentPeriod: 'day', currentCategoryFilter: 'all' };
        // when
        const result = getFilteredExpenses(state);
        // then
        expect(result).toHaveLength(0);
    });

    test('given expenses and period "week" — when filter is "all" — then includes today items', () => {
        // given
        const state = { expenses, currentPeriod: 'week', currentCategoryFilter: 'all' };
        // when
        const result = getFilteredExpenses(state);
        // then
        expect(result.length).toBeGreaterThanOrEqual(3);
    });

    test('given expenses and period "month" — when filter is "all" — then includes today items', () => {
        // given
        const state = { expenses, currentPeriod: 'month', currentCategoryFilter: 'all' };
        // when
        const result = getFilteredExpenses(state);
        // then
        expect(result.length).toBeGreaterThanOrEqual(3);
    });

    test('given expenses — when called — then does not mutate original array', () => {
        // given
        const state = { expenses, currentPeriod: 'day', currentCategoryFilter: 'all' };
        const originalLength = expenses.length;
        // when
        getFilteredExpenses(state);
        // then
        expect(expenses).toHaveLength(originalLength);
    });
});

describe('sortExpenses', () => {
    const expenses = [
        { id: '1', date: '2024-03-01', amount: 50  },
        { id: '2', date: '2024-03-03', amount: 200 },
        { id: '3', date: '2024-03-02', amount: 10  },
    ];

    test('given field "date" and dir "desc" — when called — then newest first', () => {
        const result = sortExpenses(expenses, 'date', 'desc');
        expect(result.map(e => e.id)).toEqual(['2', '3', '1']);
    });

    test('given field "date" and dir "asc" — when called — then oldest first', () => {
        const result = sortExpenses(expenses, 'date', 'asc');
        expect(result.map(e => e.id)).toEqual(['1', '3', '2']);
    });

    test('given field "amount" and dir "desc" — when called — then largest first', () => {
        const result = sortExpenses(expenses, 'amount', 'desc');
        expect(result.map(e => e.id)).toEqual(['2', '1', '3']);
    });

    test('given field "amount" and dir "asc" — when called — then smallest first', () => {
        const result = sortExpenses(expenses, 'amount', 'asc');
        expect(result.map(e => e.id)).toEqual(['3', '1', '2']);
    });

    test('given same-date expenses — when sort is date desc — then latest inserted is first', () => {
        // given — all same date, id:3 was inserted last (highest index)
        const sameDay = [
            { id: '1', date: '2024-03-01', amount: 10 },
            { id: '2', date: '2024-03-01', amount: 50 },
            { id: '3', date: '2024-03-01', amount: 20 },
        ];
        // when
        const result = sortExpenses(sameDay, 'date', 'desc');
        // then — insertion order tiebreaker: id:3 first, id:2 second, id:1 last
        expect(result.map(e => e.id)).toEqual(['3', '2', '1']);
    });

    test('given empty array — when called — then returns empty array', () => {
        expect(sortExpenses([], 'date', 'desc')).toEqual([]);
    });

    test('given expenses — when called — then does not mutate original array', () => {
        const original = [...expenses];
        sortExpenses(expenses, 'amount', 'asc');
        expect(expenses).toEqual(original);
    });
});

describe('isGoogleEmail', () => {

    test('given gmail address — when called — then returns true', () => {
        expect(isGoogleEmail('user@gmail.com')).toBe(true);
    });

    test('given gmail address with dots in local — when called — then returns true', () => {
        expect(isGoogleEmail('first.last@gmail.com')).toBe(true);
    });

    test('given gmail address with plus alias — when called — then returns true', () => {
        expect(isGoogleEmail('user+tag@gmail.com')).toBe(true);
    });

    test('given Google Workspace custom domain — when called — then returns true', () => {
        expect(isGoogleEmail('employee@company.com')).toBe(true);
    });

    test('given Google Workspace subdomain — when called — then returns true', () => {
        expect(isGoogleEmail('user@mail.company.co.uk')).toBe(true);
    });

    test('given uppercase input — when called — then normalises and returns true', () => {
        expect(isGoogleEmail('User@Gmail.COM')).toBe(true);
    });

    test('given input with surrounding whitespace — when called — then trims and returns true', () => {
        expect(isGoogleEmail('  user@gmail.com  ')).toBe(true);
    });

    test('given outlook.com address — when called — then returns false', () => {
        expect(isGoogleEmail('user@outlook.com')).toBe(false);
    });

    test('given hotmail.com address — when called — then returns false', () => {
        expect(isGoogleEmail('user@hotmail.com')).toBe(false);
    });

    test('given yahoo.com address — when called — then returns false', () => {
        expect(isGoogleEmail('user@yahoo.com')).toBe(false);
    });

    test('given icloud.com address — when called — then returns false', () => {
        expect(isGoogleEmail('user@icloud.com')).toBe(false);
    });

    test('given protonmail.com address — when called — then returns false', () => {
        expect(isGoogleEmail('user@protonmail.com')).toBe(false);
    });

    test('given mail.ru address — when called — then returns false', () => {
        expect(isGoogleEmail('user@mail.ru')).toBe(false);
    });

    test('given yandex.ru address — when called — then returns false', () => {
        expect(isGoogleEmail('user@yandex.ru')).toBe(false);
    });

    test('given empty string — when called — then returns false', () => {
        expect(isGoogleEmail('')).toBe(false);
    });

    test('given null — when called — then returns false', () => {
        expect(isGoogleEmail(null)).toBe(false);
    });

    test('given undefined — when called — then returns false', () => {
        expect(isGoogleEmail(undefined)).toBe(false);
    });

    test('given string without @ — when called — then returns false', () => {
        expect(isGoogleEmail('notanemail')).toBe(false);
    });

    test('given string with @ at start — when called — then returns false', () => {
        expect(isGoogleEmail('@gmail.com')).toBe(false);
    });

    test('given string without domain — when called — then returns false', () => {
        expect(isGoogleEmail('user@')).toBe(false);
    });

    test('given local part with leading dot — when called — then returns false', () => {
        expect(isGoogleEmail('.user@gmail.com')).toBe(false);
    });

    test('given local part with trailing dot — when called — then returns false', () => {
        expect(isGoogleEmail('user.@gmail.com')).toBe(false);
    });

    test('given local part with consecutive dots — when called — then returns false', () => {
        expect(isGoogleEmail('us..er@gmail.com')).toBe(false);
    });

    test('given domain without TLD — when called — then returns false', () => {
        expect(isGoogleEmail('user@localhost')).toBe(false);
    });

    test('given domain with single-char TLD — when called — then returns false', () => {
        expect(isGoogleEmail('user@domain.x')).toBe(false);
    });

    test('given domain label starting with hyphen — when called — then returns false', () => {
        expect(isGoogleEmail('user@-domain.com')).toBe(false);
    });

    test('given domain label ending with hyphen — when called — then returns false', () => {
        expect(isGoogleEmail('user@domain-.com')).toBe(false);
    });

    test('given domain with double dot — when called — then returns false', () => {
        expect(isGoogleEmail('user@domain..com')).toBe(false);
    });

    test('given local part exceeding 64 chars — when called — then returns false', () => {
        const longLocal = 'a'.repeat(65);
        expect(isGoogleEmail(`${longLocal}@gmail.com`)).toBe(false);
    });

    test('given local part with invalid chars — when called — then returns false', () => {
        expect(isGoogleEmail('user name@gmail.com')).toBe(false);
    });
});

describe('isPermissionError', () => {
    test('given error with "403" in message — when called — then returns true', () => {
        expect(isPermissionError(new Error('Request failed with status 403'))).toBe(true);
    });

    test('given error with "404" in message — when called — then returns true', () => {
        expect(isPermissionError(new Error('404 Not Found'))).toBe(true);
    });

    test('given error with "not found" in message — when called — then returns true', () => {
        expect(isPermissionError(new Error('Spreadsheet not found'))).toBe(true);
    });

    test('given error with "401" in message — when called — then returns false', () => {
        expect(isPermissionError(new Error('401 Unauthorized'))).toBe(false);
    });

    test('given error with unrelated message — when called — then returns false', () => {
        expect(isPermissionError(new Error('Network timeout'))).toBe(false);
    });

    test('given error with no message — when called — then returns false', () => {
        expect(isPermissionError(new Error())).toBe(false);
    });

    test('given null — when called — then returns false', () => {
        expect(isPermissionError(null)).toBe(false);
    });
});

describe('isAuthError', () => {
    test('given error with "401" in message — when called — then returns true', () => {
        expect(isAuthError(new Error('401 Unauthorized'))).toBe(true);
    });

    test('given error with "403" in message — when called — then returns true', () => {
        expect(isAuthError(new Error('403 Forbidden'))).toBe(true);
    });

    test('given error with "404" in message — when called — then returns false', () => {
        expect(isAuthError(new Error('404 Not Found'))).toBe(false);
    });

    test('given error with unrelated message — when called — then returns false', () => {
        expect(isAuthError(new Error('Network timeout'))).toBe(false);
    });

    test('given error with no message — when called — then returns false', () => {
        expect(isAuthError(new Error())).toBe(false);
    });

    test('given null — when called — then returns false', () => {
        expect(isAuthError(null)).toBe(false);
    });
});

describe('isSheetOwner', () => {
    test('given guest mode — when called — then returns false regardless of emails', () => {
        // given
        const state = { isGuestMode: true };
        // when / then
        expect(isSheetOwner(state, 'owner@gmail.com', 'owner@gmail.com')).toBe(false);
    });

    test('given owner mode and matching emails — when called — then returns true', () => {
        // given
        const state = { isGuestMode: false };
        // when / then
        expect(isSheetOwner(state, 'owner@gmail.com', 'owner@gmail.com')).toBe(true);
    });

    test('given owner mode and matching emails with different case — when called — then returns true', () => {
        // given
        const state = { isGuestMode: false };
        // when / then
        expect(isSheetOwner(state, 'Owner@Gmail.com', 'owner@gmail.com')).toBe(true);
    });

    test('given owner mode and different emails — when called — then returns false', () => {
        // given
        const state = { isGuestMode: false };
        // when / then
        expect(isSheetOwner(state, 'owner@gmail.com', 'other@gmail.com')).toBe(false);
    });

    test('given owner mode and null ownerEmail — when called — then returns true', () => {
        // given — owner email unknown, assume ownership
        const state = { isGuestMode: false };
        // when / then
        expect(isSheetOwner(state, null, 'user@gmail.com')).toBe(true);
    });

    test('given owner mode and null myEmail — when called — then returns true', () => {
        // given — user not yet loaded, assume ownership
        const state = { isGuestMode: false };
        // when / then
        expect(isSheetOwner(state, 'owner@gmail.com', null)).toBe(true);
    });

    test('given owner mode and both emails null — when called — then returns true', () => {
        // given
        const state = { isGuestMode: false };
        // when / then
        expect(isSheetOwner(state, null, null)).toBe(true);
    });
});

describe('buildAccessUrl', () => {
    const location = { origin: 'https://app.example.com', pathname: '/index.html' };

    test('given sharedUsers with entries — when called — then returns url with id param', () => {
        // given
        const sharedUsers = [{ email: 'a@gmail.com' }];
        // when
        const result = buildAccessUrl('sheet-123', sharedUsers, location);
        // then
        expect(result).toBe('https://app.example.com/index.html?id=sheet-123');
    });

    test('given empty sharedUsers — when called — then returns null', () => {
        // given / when / then
        expect(buildAccessUrl('sheet-123', [], location)).toBeNull();
    });

    test('given different spreadsheetId — when called — then embeds correct id', () => {
        // given
        const sharedUsers = [{ email: 'a@gmail.com' }];
        // when
        const result = buildAccessUrl('abc-456', sharedUsers, location);
        // then
        expect(result).toContain('?id=abc-456');
    });
});

describe('validateShareTarget', () => {
    const sharedUsers = [
        { email: 'alice@gmail.com' },
        { email: 'bob@company.com' },
    ];
    const ownerEmail = 'owner@gmail.com';

    test('given valid new email — when called — then returns null', () => {
        // given / when / then
        expect(validateShareTarget('charlie@gmail.com', ownerEmail, sharedUsers)).toBeNull();
    });

    test('given non-Google email — when called — then returns invalid_email key', () => {
        // given / when / then
        expect(validateShareTarget('user@outlook.com', ownerEmail, sharedUsers))
            .toBe('share.invalid_email');
    });

    test('given malformed email — when called — then returns invalid_email key', () => {
        // given / when / then
        expect(validateShareTarget('notanemail', ownerEmail, sharedUsers))
            .toBe('share.invalid_email');
    });

    test('given owner email — when called — then returns already_owner key', () => {
        // given / when / then
        expect(validateShareTarget('owner@gmail.com', ownerEmail, sharedUsers))
            .toBe('share.already_owner');
    });

    test('given owner email with different case — when called — then returns already_owner key', () => {
        // given / when / then
        expect(validateShareTarget('  Owner@Gmail.com  ', ownerEmail, sharedUsers))
            .toBe('share.already_owner');
    });

    test('given already-shared email — when called — then returns already_shared key', () => {
        // given / when / then
        expect(validateShareTarget('alice@gmail.com', ownerEmail, sharedUsers))
            .toBe('share.already_shared');
    });

    test('given already-shared email with different case — when called — then returns already_shared key', () => {
        // given / when / then
        expect(validateShareTarget('Alice@Gmail.com', ownerEmail, sharedUsers))
            .toBe('share.already_shared');
    });

    test('given null ownerEmail and valid new email — when called — then returns null', () => {
        // given — owner email not yet known
        expect(validateShareTarget('charlie@gmail.com', null, sharedUsers)).toBeNull();
    });

    test('given empty sharedUsers and valid email — when called — then returns null', () => {
        // given / when / then
        expect(validateShareTarget('charlie@gmail.com', ownerEmail, [])).toBeNull();
    });
});