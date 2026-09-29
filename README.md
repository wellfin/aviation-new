# Global Aviation Services Directory

| App | Folder | Port | Stack |
| --- | --- | --- | --- |
| Public website | `website/` | 3100 | Next.js 16, React 19, Tailwind v4 |
| Admin console | `admin-frontend/` | 3200 | Next.js 16 (separate app, staff only) |
| REST API | `backend/` | 4000 | Express 5, TypeScript, MongoDB (Mongoose), zod |

## Start everything (development)

```bash
# 1. API — uses MONGODB_URI from backend/.env (MongoDB Atlas, or `npm run db:start` for a local replica set)
cd backend && npm install && npm run seed && npm run dev

# 2. Website
cd website && npm install && npm run dev -- -p 3100

# 3. Admin console
cd admin-frontend && npm install && npm run dev -- -p 3200
```

Admin access: `ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run create-admin` in `backend/`, then sign in at http://localhost:3200/login.

In development, emails (verification codes, resets, notifications) are written to `backend/.mail-outbox/`.

## Configuration

- `backend/.env` — database, JWT secret, CORS origins (must list both frontends), SMTP, OAuth, Razorpay, `INTERNAL_API_KEY`. See `backend/.env.example`.
- `website/.env.local` — `DATA_SOURCE=api`, API URLs, third-party integrations (weather, NOTAM, airport data, maps), `INTERNAL_API_KEY` (same value as the API), `NEXT_PUBLIC_ADMIN_URL`. See `website/.env.example`.
- `admin-frontend/.env.local` — API URL and public site URL. See `admin-frontend/.env.example`.

## Tests

| Where | Command | What |
| --- | --- | --- |
| backend | `npm test` | 226 integration/unit tests (in-memory MongoDB replica set) |
| website | `npm test` | 50 unit tests |
| website | `npm run e2e` | 11 Playwright end-to-end tests against the running stack (cleans up after itself) |
| all | `npm run build`, `npx tsc --noEmit`, `npm run lint` | production build, types, lint |

See each folder's README for details.
