export const CONFIG = {
    CLIENT_ID:         import.meta.env.VITE_CLIENT_ID,
    API_KEY:           import.meta.env.VITE_API_KEY,
    SHEET_NAME:        'spends',
    SPREADSHEET_TITLE: 'SpenGo',
    SCOPES: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',    SHEETS_BASE: 'https://sheets.googleapis.com/v4/spreadsheets',
    DRIVE_SEARCH_BASE: 'https://www.googleapis.com/drive/v3/files',
    REVOKE_URL: 'https://oauth2.googleapis.com/revoke',
};