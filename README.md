# SpenGo

> Personal expense tracker — powered by Google Sheets, no servers involved.

<a href="https://webspengo.vercel.app">
  <img src="https://webspengo.vercel.app/ogimage.png" width="750" alt="SpenGo Preview">
</a>

---

## What is SpenGo?

SpenGo is a lightweight mobile-first web app for tracking personal expenses. All data is stored directly in your own Google Spreadsheet — there are no backend servers, no databases, and no third-party data storage of any kind.

---

## Features

- **Google Sheets as a database** — your expenses live in your own Google Drive, you own the data
- **Three periods** — track spending by day, week, or month at a glance
- **Categories** — Food, Transport, Housing, Health, Entertainment, Sport, Clothes, School, Other
- **Visual analytics** — monthly breakdown by category with bar charts
- **Multilingual** — English, Russian, Spanish
- **Offline-friendly** — recent expenses cached locally in the browser
- **No ads, no tracking, no servers**

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS (ES Modules) |
| Build tool | Vite |
| Auth | Google Identity Services (OAuth 2.0) |
| Storage | Google Sheets API v4 |
| Fonts | Unbounded + Manrope (Google Fonts) |
| Hosting | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Google Cloud project with **Google Sheets API** and **Google Drive API** enabled
- OAuth 2.0 credentials (Web application type)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/farvater-max/spengo.git
cd spengo

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local
```

Fill in your credentials in `.env.local`:

```env
VITE_CLIENT_ID=your_google_oauth_client_id
VITE_API_KEY=your_google_api_key
```

```bash
# 4. Run locally
npm run dev

# 5. Build for production
npm run build
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_CLIENT_ID` | Google OAuth 2.0 Client ID |
| `VITE_API_KEY` | Google API Key (for Sheets & Drive) |

> Never commit `.env.local` to version control — it's listed in `.gitignore`.

---

## Project Structure

```
├── public/
│   ├── favicon.svg
│   ├── main.png
│   ├── localization.json
│   └── privacy-policy.html
├── src/
│   ├── controllers/
│   ├── services/
│   ├── ui/
│   ├── i18n/
│   └── constants/
├── app.js
├── config.js
├── index.html
├── styles.css
├── vite.config.js
└── vercel.json
```

---

## Deployment

The app is deployed on Vercel. Each push to `main` triggers an automatic redeploy.

Required environment variables must be set in **Vercel Dashboard → Settings → Environment Variables**.

---

## Privacy

SpenGo does not collect, store, or share any personal data. See the full [Privacy Policy](https://webspengo.vercel.app/privacy-policy/).

---

## License

Copyright (c) 2026 SpenGo. All Rights Reserved — see [LICENSE](./LICENSE) for details.
