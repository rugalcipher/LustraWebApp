# Lustra frontend — Vercel deployment

The frontend is a **Vite 6 + React 18 SPA**. There is no server rendering and no
serverless function: Vercel builds the app and serves the static `dist/` output,
with every unmatched path rewritten to `index.html` so React Router owns routing.

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Install command | `npm install` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | 20.x or 22.x |
| Root directory | `LustraWebApp` (if imported as part of the larger repo) |

`vercel.json` at the repo root pins all of the above, adds the SPA rewrite, sets
cache headers (immutable for hashed `/assets/*`, revalidated for `index.html`
and `manifest.json`) and a small set of security headers.

---

## 1. Environment variables

Set these in **Project → Settings → Environment Variables**. Names only are
listed here; see `.env.example` for the annotated version.

> Every `VITE_*` value is compiled into the public browser bundle. Never put an
> R2 secret, JWT signing key, database connection string or private bucket name
> in one.

### Preview

| Name | Value |
| --- | --- |
| `VITE_DATA_MODE` | `api` |
| `VITE_API_BASE_URL` | `https://<your-deployed-api-host>/api/v1` — **you must supply this** |
| `VITE_SIGNALR_BASE_URL` | `https://<your-deployed-api-host>` (optional; defaults to the API origin) |
| `VITE_APP_ENV` | `uat` |
| `VITE_ENABLE_DEV_ROLE_SWITCHER` | `false` |
| `VITE_ENABLE_QUERY_DEVTOOLS` | `false` |

### Production

| Name | Value |
| --- | --- |
| `VITE_DATA_MODE` | `api` |
| `VITE_API_BASE_URL` | `https://api.lustra.vip/api/v1` |
| `VITE_SIGNALR_BASE_URL` | `https://api.lustra.vip` |
| `VITE_APP_ENV` | `production` |
| `VITE_ENABLE_DEV_ROLE_SWITCHER` | `false` |
| `VITE_ENABLE_QUERY_DEVTOOLS` | `false` |

Behaviour worth knowing:

* `VITE_DATA_MODE=api` **requires** `VITE_API_BASE_URL`; the app throws a clear
  configuration error at startup instead of guessing.
* A production build refuses to run in `mock` mode — it renders a
  "Configuration error" screen. There is no silent api→mock fallback.
* The dev RoleSwitcher is force-disabled in any production build regardless of
  the flag, and never granted real permissions by the API.
* The API base URL must be **https**. A page served over https cannot call an
  http API — the browser blocks it as mixed content.

---

## 2. Deploy via the Vercel dashboard

1. **Add New… → Project**, import the Git repository.
2. If this app lives inside a larger repo, set **Root Directory** to
   `LustraWebApp` (or wherever `package.json` lives).
3. Confirm the framework is detected as **Vite** (install/build/output come from
   `vercel.json` and should already be correct).
4. Add the environment variables above for **Preview** and **Production**.
5. **Deploy.** The preview URL looks like
   `https://<project>-<hash>-<team>.vercel.app`.
6. Add that origin to the API's CORS allow-list (see §4) before expecting any
   API call to succeed from the phone.

## 3. Deploy via the Vercel CLI

```bash
npm i -g vercel          # or use npx vercel

vercel login
vercel link              # writes .vercel/ locally — git-ignored on purpose

# Verify the production build locally without deploying:
vercel build

# Create a PREVIEW deployment (safe; this is what to use for phone testing):
vercel deploy

# Production deploy — only with explicit authorisation:
# vercel deploy --prod
```

`.vercel/` holds the linked project/org ids and is git-ignored. `.vercelignore`
keeps the large image masters in `assets/` and local test artefacts out of the
upload.

---

## 4. Backend connectivity (read this before testing on a phone)

The deployed frontend runs on `https://*.vercel.app`, so it can only reach an
API that is **publicly reachable over https** and that allows that origin via
CORS. `localhost` on your PC is not reachable from your phone through Vercel.

The API's CORS policy is configuration-driven (`Cors` section in
`LustraPlatform/src/Lustra.API`):

```jsonc
"Cors": {
  "AllowedOrigins": ["https://lustra.vip", "https://www.lustra.vip"],
  // Ephemeral preview hosts — set via environment, keep project-specific:
  "AllowedOriginPatterns": ["https://lustra-webapp-*.vercel.app"]
}
```

Environment-variable form (double underscore):

```
Cors__AllowedOrigins__0=https://lustra.vip
Cors__AllowedOrigins__1=https://www.lustra.vip
Cors__AllowedOriginPatterns__0=https://lustra-webapp-*.vercel.app
```

Rules enforced by the implementation:

* Never `AllowAnyOrigin()`; credentialed responses always echo the caller's
  exact origin.
* A pattern's `*` cannot cross `/`, so it can't widen past the host.
* Patterns must stay project-specific — a bare `https://*.vercel.app` would let
  **any** Vercel app make credentialed calls to the API.
* With no origins configured at all, cross-origin access is denied (safe default).

### Options while the API is not deployed

1. **Deploy the API** to a public https host (recommended) and point
   `VITE_API_BASE_URL` at it.
2. **Temporary secure tunnel** (e.g. `cloudflared tunnel --url https://localhost:7266`),
   then set `VITE_API_BASE_URL` to the tunnel URL and add that exact origin to
   `Cors__AllowedOrigins__*`. Treat the tunnel as short-lived and remove the
   origin afterwards.
3. Until either exists, the Vercel preview is only useful for **UI/layout**
   review. Mock data is deliberately unavailable in production builds — the app
   will show a configuration error rather than pretending to have a backend.

---

## 5. PWA / mobile notes

* `manifest.json`, `favicon.ico`, `apple-touch-icon.png` and the 192/512 any +
  maskable icons are all local files in `public/` and resolve from the
  deployment root.
* `theme-color` is `#0B0B0D`; the viewport uses `viewport-fit=cover` and the
  layout honours `env(safe-area-inset-*)`.
* **No service worker is registered.** Do not add offline caching here: VIP and
  other authenticated media must never be precached or stored in a public cache.

## 6. Images

Marketing artwork masters live in `assets/other/` and hero masters in
`assets/home/`. Regenerate the shipped derivatives after replacing any master:

```bash
python scripts/gen-marketing-images.py
```

Marketing derivatives are imported through Vite (`src/assets/marketing/`), so
production filenames are content-hashed and a replaced image can never be served
from a stale browser or CDN cache. Hero slides are served from `public/home/`
with a short max-age.
