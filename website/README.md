# Global Aviation Services Directory — Frontend

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · zod · Vitest.
Built from the Figma file "Global Aviation Website".

## Run

```bash
cp .env.example .env.local   # everything defaults to mock data — no keys needed
npm install
npm run dev -- -p 3100       # http://localhost:3100
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run e2e` | Playwright end-to-end suite against the running stack (API + website + admin); cleans up its test data |

The admin console is a separate app (`../admin-frontend`, port 3200). Service categories and Advertise-page packages are managed there and loaded from the API.

Mock mode demo account: `demo@globalaviation.test` / `Demo1234` · email/reset OTP: `123456`.

## Configuration (`.env.local`)

| Variable | Values | Effect |
| --- | --- | --- |
| `DATA_SOURCE` | `mock` \| `api` | Server-side data: in-repo mock data or `API_BASE_URL/api/v1/...` |
| `NEXT_PUBLIC_DATA_SOURCE` | `mock` \| `api` | Browser forms & auth: simulated locally or sent to `NEXT_PUBLIC_API_BASE_URL` |
| `WEATHER_PROVIDER` | `aviationweather` \| `checkwx` \| `mock` | METAR/TAF — aviationweather.gov is free, no key (default in `.env.local`) |
| `NOTAM_PROVIDER` | `faa-search` \| `faa` \| `mock` | NOTAMs — FAA NOTAM Search (public, no key); falls back to the official FAA API when `FAA_NOTAM_CLIENT_ID`/`_SECRET` are set |
| `AIRPORT_DATA_PROVIDER` | `openaip` \| `airportdb` \| `mock` | Runways, frequencies, elevation from OpenAIP (`OPENAIP_API_KEY`); skipped until the key is set |
| `NEXT_PUBLIC_OPENAIP_API_KEY` | key | Interactive maps use OpenStreetMap + Esri satellite (no key); this adds the OpenAIP aviation overlay |
| `INTERNAL_API_KEY` | secret | Same value as the API's; sent by server-side rendering so SSR traffic isn't rate-limited as one visitor |
| `NEXT_PUBLIC_ADMIN_URL` | URL | Admin console link for staff |

Secrets are only read server-side (`src/lib/config.ts`, `import "server-only"`); third-party calls run in Server Components and never reach the browser.

## Structure

```text
src/app/(site)/        public pages (header/footer layout)
src/app/(auth)/        login, signup, verify-email, forgot/reset-password (split-screen layout)
src/components/<area>/ page-specific components; ui/, ads/, layout/ are shared
src/lib/types.ts       domain types = future /api/v1 contract
src/lib/data/          server data access (mock ↔ backend switch)
src/lib/integrations/  weather, NOTAM, airportdb adapters (mock ↔ real)
src/lib/api/           browser API client + zod form schemas
src/lib/auth/          auth context (mock ↔ backend)
src/lib/mock/          demo data
```

## Routes

`/` · `/directory` · `/providers/[slug]` (`?tab=`) · `/charter-operators` (+ `/results`) · `/airports` · `/airports/[code]` (`?tab=`, `?service=`) ·
`/tools` · `/tools/{weather,notams,runway-diagram,satellite-map,nearby-airports,distance}` · `/news` · `/news/[slug]` · `/pricing` · `/advertise` · `/contact` ·
`/about` · `/request-demo` · `/data-licence` · `/faq` · `/legal/{privacy,terms,refund,cookies,gdpr}` · `/login` · `/signup` · `/verify-email` · `/forgot-password` · `/reset-password` · `/account` · `/search?q=`

## Backend endpoints the frontend expects (`/api/v1`)

Reads: `GET /categories`, `/advertising/formats`, `/providers`, `/providers/:slug`, `/providers/:slug/related`, `/airports`, `/airports/featured`, `/airports/:code`, `/airports/:icao/nearby`, `/news`, `/news/:slug`, `/faqs`, `/pricing/plans`, `/ads/serve?placement=`.
Writes: `POST /enquiries`, `/providers/:slug/reviews`, `/contact`, `/contact/email-otp`, `/contact/email-otp/verify`, `/demo-requests`, `/demo-requests/email-otp`, `/demo-requests/email-otp/verify`, `/data-licence/requests`, `/advertising/enquiries`, `/newsletter/subscriptions`.
Auth: `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/verify-email`, `/auth/resend-verification`, `/auth/forgot-password`, `/auth/reset-password`, `GET /auth/me`, `GET /auth/oauth/{google,linkedin}`.
Responses: `{ data: T }` on success, `{ error: { code, message, fieldErrors? } }` on failure; auth uses cookies (`credentials: "include"`).
