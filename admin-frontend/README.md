# Global Aviation — Admin console

Separate Next.js 16 app for staff (ADMIN / MANAGER). All data comes from the API (`/api/v1/admin/*`); every action is authorised by the API — the UI only hides what a role can't use.

```bash
cp .env.example .env.local   # API URL + public site URL
npm install
npm run dev -- -p 3200       # http://localhost:3200 → /admin
```

The API must allow this origin: add `http://localhost:3200` (or your admin domain) to `CORS_ORIGINS` in `backend/.env`.

## Sections

| Area | Route | Permission |
| --- | --- | --- |
| Dashboard (KPIs, charts) | `/admin` | reports:read |
| Providers (moderation queue, full editor, approve/reject/suspend) | `/admin/providers` | providers:manage |
| Services (service categories catalogue) | `/admin/services` | providers:manage |
| Airports | `/admin/airports` | airports:manage |
| Reviews moderation | `/admin/reviews` | reviews:moderate |
| Enquiries | `/admin/enquiries` | enquiries:read:any |
| News, FAQs | `/admin/news`, `/admin/faqs` | content:manage |
| Ad campaigns, Ad packages (Advertise page) | `/admin/ads`, `/admin/ad-formats` | ads:manage |
| Pricing plans (incl. Razorpay plan ids) | `/admin/pricing` | pricing:manage |
| Leads, Newsletter (CSV export) | `/admin/leads`, `/admin/newsletter` | leads:read |
| Billing (subscriptions, payments) | `/admin/billing` | billing:read:any |
| Users (roles, suspend, delete) | `/admin/users` | users:read / users:manage |

## Structure

`src/app/(console)/admin/**` pages · `src/components/admin/**` screens (+ `ui.tsx` table/filter kit, `AdminShell.tsx` guard & navigation, `nav.ts`) · `src/lib/**` API client (cookie session, auto-refresh), auth context, hooks.

Checks: `npx tsc --noEmit`, `npm run lint`, `npm run build`.
