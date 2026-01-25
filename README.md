# 🚭 SmokeLess — v8 (AI Coach)

This build adds an **AI Coach** tab that can help you handle cravings with coping strategies, reframes, and micro‑goals. It also keeps all v7 features (savings goal bar, movable cards, timer, charts, exports, PWA).

## Run (offline features)
- Quick: open `index.html`.
- Recommended (PWA): `python -m http.server 5500` → open `http://localhost:5500/` → **Install app**.

## Enable the AI Coach (requires internet)
The web app talks to a **local Node server** that proxies to your AI provider so your API key remains private.

### Option A — Azure OpenAI (recommended)
1. Create an Azure OpenAI resource and a Chat Completions deployment.
2. In this folder:
   ```bash
   cp .env.example .env
   # edit .env with your endpoint, key, and deployment
   npm install
   npm start
   ```
3. Open **http://localhost:8787/** → Use the **Coach** tab.

### Option B — OpenAI
```bash
cp .env.example .env
# set PROVIDER=openai, OPENAI_API_KEY, OPENAI_MODEL
npm install
npm start
```
Open **http://localhost:8787/** and chat in **Coach**.

### What context is shared?
Only if you tick **“Share plan & recent stats”** the app sends: your triggers list, baseline & quit date (if any), last 7‑day totals, the last 5 entries (type/trigger only), timer minutes, and total savings. Otherwise only your question is sent. Your data stays local unless you choose to share.

## Notes
- Service worker **does not cache** `/api/*` calls.
- If the AI server is offline, the Coach **falls back to built‑in tips**.
