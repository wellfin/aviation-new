# Global Aviation Services Directory — API

Express 5 · TypeScript (strict, ESM) · MongoDB + Mongoose (replica set, transactions) · zod · Vitest + supertest.

## Run locally

```bash
cp .env.example .env            # then set JWT_ACCESS_SECRET (see comment in the file)
npm install
npm run db:start                # terminal 1: MongoDB single-node replica set on :27018 (data in .mongo-data/)
npm run seed                    # demo airports, providers, news, FAQs, ads, pricing (idempotent)
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='Str0ngPass' npm run create-admin
npm run dev                     # terminal 2: http://localhost:4000/api/v1 (health: /health)
```

In development emails (verification codes, password resets, notifications) are written to `.mail-outbox/` instead of being sent. Set `MAIL_TRANSPORT=smtp` + `SMTP_*` to send real email (required in production).

| Script | Purpose |
| --- | --- |
| `npm run dev` | API with reload |
| `npm run build` / `npm start` | Compile to `dist/` / run compiled |
| `npm test` | Integration + unit tests (in-memory replica set, uses the local `mongod` binary when present) |
| `npm run typecheck` / `npm run lint` | `tsc --noEmit` / ESLint |
| `npm run seed` | Demo data |
| `npm run create-admin` | Create/promote an administrator from `ADMIN_EMAIL` / `ADMIN_PASSWORD` |

## Architecture

```text
src/
  config/env.ts          validated configuration (fails fast; stricter rules in production)
  lib/                   http (validated handlers, envelopes), errors, db (transactions), crypto, pagination, logger
  middleware/            auth (JWT → user, permissions), security (rate limits, CSRF origin check), errors
  modules/<feature>/     model · schemas (zod) · service (business logic) · routes (thin)
  routes.ts              mounts every module under /api/v1
test/                    integration tests per module
```

- **Responses:** `{ data }` on success, `{ error: { code, message, fieldErrors? } }` on failure. Lists: `{ items, total, page, pageSize, totalPages }` (pageSize ≤ 100).
- **Validation:** every body/query/param is parsed by zod before reaching a service; unknown fields are dropped and documents are built from whitelisted fields only (also the NoSQL-injection defence).
- **Transactions:** multi-document writes (refresh-token rotation, password changes, review aggregates, billing activation, cascading deletes, FAQ reordering) run in MongoDB transactions.

## Auth & authorisation

- Passwords: Argon2id. Login lockout after `LOGIN_MAX_FAILED_ATTEMPTS`, generic credential errors, constant-time behaviour for unknown emails.
- Sessions: 15-minute JWT access token (`ga_at`, httpOnly, SameSite=Lax) + opaque rotating refresh token (`ga_rt`, httpOnly, path `/api/v1/auth`, stored as SHA-256). Reusing a rotated refresh token revokes the whole token family. Password change/reset, role change and suspension bump `tokenVersion`, invalidating access tokens immediately.
- Email verification & password reset via one-time codes (keyed-hash stored, attempt-limited, single-use). Google / LinkedIn OAuth (OIDC, state cookie, verified-email linking) when client ids are configured.
- Roles → permissions (`src/modules/rbac/permissions.ts`): **USER** (reviews, enquiries, favourites), **PROVIDER** (+ own listing, own enquiries, billing, uploads), **MANAGER** (moderation, content, leads, reports, read users), **ADMIN** (everything incl. users, ads, pricing, billing). Every route declares its permission; ownership is enforced in queries.

## Security

helmet · strict CORS allow-list with credentials · Origin check on state-changing requests (CSRF) · rate limits (global, auth, forms, uploads) · honeypot fields on public forms · upload type detection by magic bytes (PNG/JPEG/WebP/PDF only), size limits, path-traversal-safe serving with `nosniff` + sandbox CSP · webhook HMAC verification over the raw body + idempotency · secrets only from env · logs redact credentials, tokens, codes and cookies · CSV exports are formula-injection safe.

Rate limits have separate budgets: global (per IP; bypassed by the website's server when it sends `INTERNAL_API_KEY`), credentials (login/register/verify/reset), session refresh, one-time codes/OAuth, and public forms.

Redis is intentionally not used: sessions are stateless JWTs + DB-backed refresh tokens, and brute-force limits that must hold across instances (login lockout, OTP attempts) live in MongoDB. The in-memory rate limiter is per instance — add a shared store only when running several API instances.

## Endpoints (`/api/v1`)

| Area | Public | Signed-in | Admin (permission) |
| --- | --- | --- | --- |
| Auth | `POST /auth/register`, `/auth/verify-email`, `/auth/resend-verification`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`, `GET /auth/oauth/:provider(/callback)` | `GET/PATCH /auth/me`, `POST /auth/change-password` | `GET/PATCH/DELETE /admin/users[/:id]` (users:read / users:manage) |
| Services | `GET /categories` | | `/admin/categories` CRUD + `PUT /order` (providers:manage) |
| Airports | `GET /airports`, `/airports/featured`, `/airports/distance`, `/airports/:code`, `/airports/:code/nearby` | | `/admin/airports` CRUD (airports:manage) |
| Providers | `GET /providers`, `/providers/:slug`, `/providers/:slug/related`, `/providers/:slug/reviews` | `/me/listing` (GET/POST/PATCH, `POST /submit`), `/me/favorites` | `/admin/providers` CRUD + approve/reject/suspend/unpublish (providers:manage) |
| Reviews | | `POST /providers/:slug/reviews`, `GET/DELETE /me/reviews` | `/admin/reviews` + approve/reject (reviews:moderate) |
| Enquiries | `POST /providers/:slug/enquiries`, `POST /enquiries` | `/me/enquiries` (providers) | `/admin/enquiries` (enquiries:read:any) |
| Content | `GET /news`, `/news/:slug`, `/faqs`, `/pricing/plans`, `/ads/serve`, `/ads/:id/click` | | `/admin/news`, `/admin/faqs` (content:manage), `/admin/ads` (ads:manage), `/admin/pricing/plans` (pricing:manage) |
| Advertise packages | `GET /advertising/formats` | | `/admin/ad-formats` CRUD + `PUT /order` (ads:manage) |
| Leads | `POST /contact` (+ `/email-otp`, `/email-otp/verify`), `/demo-requests` (+ OTP), `/data-licence/requests`, `/advertising/enquiries`, `/newsletter/subscriptions`, `GET /newsletter/confirm`, `/newsletter/unsubscribe` | | `/admin/leads` (+ notes, CSV), `/admin/newsletter/subscribers` (+ CSV) (leads:read / leads:manage) |
| Files | `GET /files/*key` | `POST /uploads`, `DELETE /uploads/:id`, `GET /me/uploads` | |
| Billing | `POST /billing/webhooks/razorpay` (signed) | `POST /billing/subscriptions`, `/subscriptions/verify`, `GET /billing/subscription`, `POST /billing/subscription/cancel`, `GET /billing/payments` | `/admin/billing/subscriptions`, `/admin/billing/payments` (billing:read:any) |
| Reports | | | `GET /admin/reports/overview`, `/admin/reports/timeseries` (reports:read) |

## Razorpay setup

1. Create Plans in the Razorpay dashboard (monthly/yearly for Pro and Ultra Pro) and enter their ids in **Admin → Pricing plans**.
2. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
3. Add a webhook to `{PUBLIC_API_URL}/api/v1/billing/webhooks/razorpay` for `subscription.*` and `payment.failed` events.

Payments endpoints return `503 Payments are not configured` until the keys are set.

## Production checklist

`NODE_ENV=production`, strong `JWT_ACCESS_SECRET` (48+ chars), `MAIL_TRANSPORT=smtp`, HTTPS (cookies become `Secure`), `CORS_ORIGINS`/`FRONTEND_URL`/`PUBLIC_API_URL` set to real domains, `COOKIE_DOMAIN` if API and site share a parent domain, `TRUST_PROXY` behind a load balancer, MongoDB replica set with backups, object storage for uploads (swap the `Storage` implementation in `modules/uploads/storage.ts`) when running more than one instance.
