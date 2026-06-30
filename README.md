# A.T.A – AI Trading Alerts
### PWA Source Code

---

## Project Structure

```
ATA-PWA/
├── index.html        → Main HTML structure (UI layout)
├── style.css         → All styling (dark theme, animations)
├── app.js            → All JavaScript logic (market sim, AI calls, charts)
├── manifest.json     → PWA configuration (icon, name, theme)
├── sw.js             → Service Worker (offline support, caching)
└── icons/
    ├── icon-192.png  → App icon (small)
    ├── icon-512.png  → App icon (large)
    └── icon.svg      → Source SVG icon
```

---

## Tech Stack

- **Vanilla HTML/CSS/JS** – no framework, no build step needed
- **PWA** – installable on iOS and Android via browser
- **Claude AI (Anthropic API)** – powers the market analysis text
- **Canvas API** – renders the candlestick charts

---

## How It Works

1. `app.js` simulates price movements every 3 seconds for 7 assets
2. When a price moves ±2–5%, an alert is triggered
3. The alert calls the Anthropic API (`claude-sonnet-4-20250514`) for AI analysis
4. The analysis is displayed in the detail view

---

## Next Steps to Implement

- [ ] Replace simulated prices with real market data (Yahoo Finance / Alpha Vantage API)
- [ ] Add real SEC insider trading data (OpenInsider API)
- [ ] Add backend server (Node.js/Express) to handle CORS for market APIs
- [ ] Add user authentication (sign up / login)
- [ ] Add real push notifications via Web Push API + backend
- [ ] Add watchlist persistence (localStorage or database)
- [ ] Add Anthropic API key management (move to backend for security)

---

## Running Locally

No build step needed. Just open `index.html` in a browser.
For PWA features (service worker), use a local server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

---

## API Key

The app currently uses the Anthropic API via the Claude.ai interface.
For standalone deployment, add your own API key in `app.js`:

```js
headers: {
  'Content-Type': 'application/json',
  'x-api-key': 'YOUR_ANTHROPIC_API_KEY',  // add this
  'anthropic-version': '2023-06-01'
}
```

---

## Contact / Vision

App concept by the founder – AI-powered trading alert PWA.
Goal: Help users stop watching charts all day.
