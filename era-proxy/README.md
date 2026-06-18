# Era Financial Proxy

A minimal Express server that bridges your Claude artifact dashboard to the
Era Context MCP server. The artifact can't call Era directly (auth + CORS),
so this proxy holds your credentials server-side and exposes a simple REST
endpoint the artifact can reach.

---

## Architecture

```
Claude artifact (browser)
  └─ fetch /api/financial-data
        └─ Era Financial Proxy  (Railway / Render — YOUR server)
              └─ Era Context MCP  (context.era.app — authenticated)
```

---

## 1 · Get your Era API key

1. Go to **https://era.app** → Settings → Developer → API Keys
2. Create a new key with at minimum these scopes:
   - `mcp:accounts:read`
   - `mcp:transactions:read`
3. Copy the key — you won't see it again.

---

## 2 · Deploy to Railway (recommended, free tier available)

### One-click via GitHub

1. Push this folder to a new GitHub repo:
   ```bash
   cd era-proxy
   git init
   git add .
   git commit -m "initial"
   gh repo create era-financial-proxy --public --source=. --push
   ```

2. Go to **https://railway.app** → New Project → Deploy from GitHub repo → select your repo

3. In Railway dashboard → your service → **Variables**, add:
   ```
   ERA_API_KEY   = your_era_api_key_here
   ERA_BASE_URL  = https://context.era.app
   ```
   Railway sets `PORT` automatically.

4. Click **Deploy**. After ~60 seconds you'll have a URL like:
   ```
   https://era-financial-proxy-production.up.railway.app
   ```

5. Test it:
   ```bash
   curl https://era-financial-proxy-production.up.railway.app/health
   # → {"status":"ok","timestamp":"..."}

   curl https://era-financial-proxy-production.up.railway.app/api/financial-data
   # → {"ok":true,"fetchedAt":"...","accounts":{...},...}
   ```

---

## 2b · Deploy to Render (alternative, also free)

1. Go to **https://render.com** → New → Web Service → connect your GitHub repo
2. Set:
   - **Build command:** `npm install`
   - **Start command:** `node server.js`
3. Under **Environment**, add `ERA_API_KEY` and `ERA_BASE_URL`
4. Deploy. Your URL will be `https://era-financial-proxy.onrender.com`

> ⚠️  Render free tier spins down after 15 min of inactivity (cold start ~30s).
> Railway free tier stays warm. For a dashboard you refresh frequently, Railway
> is the better choice.

---

## 3 · Wire the dashboard

Open `financial-dashboard.jsx` and find this line near the top:

```js
const PROXY_URL = "";
```

Replace it with your deployed URL:

```js
const PROXY_URL = "https://era-financial-proxy-production.up.railway.app";
```

Re-upload or paste the updated file into your Claude conversation. The
dashboard will now auto-fetch on load and go live when you hit the ⟳ button.

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check |
| GET | `/api/financial-data` | Accounts + current month transactions + recurring (parallel fetch) |
| GET | `/api/accounts` | Balances only (fast) |
| GET | `/api/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD` | Transactions for a date range |

---

## Local dev

```bash
cp .env.example .env
# edit .env and add your ERA_API_KEY

npm install
npm run dev
# → Era proxy running on port 3001

curl http://localhost:3001/health
curl http://localhost:3001/api/financial-data
```

---

## Security notes

- Your Era API key never touches the browser — it lives only in Railway/Render env vars.
- CORS is locked to `*.claude.ai` and `localhost`. Edit the `cors()` config in
  `server.js` if you need other origins.
- The proxy is read-only — it only calls Era's read tools. No writes.
- Consider adding a simple bearer token header check if you want to prevent
  anyone else from calling your proxy URL.
