# Rapid Launch

Product strategy, AI learning, and MVP execution platform. A service-commerce and
learning-access platform that sells consulting sessions, crash courses, MVP-building
engagements, and digital books — with verified Paystack payments, Google Classroom
course delivery, Google SMTP transactional email, and an owner back office.

## Status

Catalog slice (public site) and the order + payment core are implemented. The
project shell, design tokens, MongoDB connection, typed environment loader,
provider interface contracts, models, seed data, public catalog/detail/checkout
routes, Paystack-order service logic, API/webhook routes, and unit tests are in
place.

**Implemented:** public landing, `/courses`, `/books`, product detail pages,
checkout with a server-side price snapshot (creates a pending `Order`),
Paystack initialization and server-side verification, `/payment/callback` result
page, signature-validated idempotent `/api/webhooks/paystack`, fulfillment
records created on verified payment, seeding, and Vitest unit tests.

**Not yet implemented:** Google Classroom enrollment (fulfillment is recorded
as pending), Google SMTP, authentication, admin/back-office, bookings, MVP
inquiry flow, and AI features. Test-mode Paystack keys are required for a live
end-to-end checkout; without a `PAYSTACK_SECRET_KEY` the form reports the
provider as not configured.

## Tech stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript (strict)
- **Styling:** Tailwind CSS v4; visual system defined in `DESIGN.md`
- **Database:** MongoDB with Mongoose 9 (single cached connection)
- **Validation:** Zod 4
- **Forms:** react-hook-form + @hookform/resolvers
- **Auth (planned):** next-auth v4
- **Integrations (planned):** Paystack, Google SMTP (nodemailer), Google Classroom (googleapis)
- **Icons:** lucide-react

> Architecture, coding standards, and integration rules: see `AGENTS.md`.
> Product behavior contract: see `PRODUCT_REQUIREMENTS.md` (PRD).
> Visual design system: see `DESIGN.md` (single source of truth for all UI).

## Requirements

- Node.js 20+ (developed on 24)
- npm
- MongoDB running locally (`mongodb://127.0.0.1:27017`) or a hosted instance

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Set `MONGODB_URI` (e.g. `mongodb://127.0.0.1:27017/quicklaunch`). At minimum
   `MONGODB_URI` is required to run the app; provider keys can be added later as
   each integration is implemented.

4. Run the development server:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `MONGODB_DB_NAME` | No | Database name (default `quicklaunch`) |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | No | MongoDB server-selection timeout in ms (default `5000`) |
| `NEXTAUTH_SECRET` / `AUTH_SECRET` | Yes (prod) | Long random string for sessions |
| `NEXT_PUBLIC_APP_URL` | No | Canonical app URL |
| `PAYSTACK_PUBLIC_KEY` | Provider | Paystack public key |
| `PAYSTACK_SECRET_KEY` | Provider | Paystack secret key (server only) |
| `PAYSTACK_WEBHOOK_SECRET` | Provider | Paystack webhook signature secret |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` | Provider | Google Classroom OAuth credentials |
| `GOOGLE_CLASSROOM_OWNER_EMAIL` | Provider | Owner account that manages Classroom courses |
| `GOOGLE_SMTP_HOST` / `GOOGLE_SMTP_PORT` / `GOOGLE_SMTP_USER` / `GOOGLE_SMTP_PASSWORD` | Provider | Google SMTP mailbox (app password) |
| `MAIL_FROM_NAME` / `MAIL_FROM_EMAIL` | Provider | Sender identity for transactional email |
| `AI_PROVIDER_API_KEY` / `AI_MODEL` | Optional | Reserved for a future AI feature slice |

Only `NEXT_PUBLIC_` variables are exposed to the browser. Never place secret
values in `NEXT_PUBLIC_` variables. Copy real values into `.env.local` only.

## Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `npm run dev` | Start the development server |
| `build` | `npm run build` | Production build |
| `start` | `npm start` | Start the production server |
| `lint` | `npm run lint` | ESLint |
| `typecheck` | `npm run typecheck` | TypeScript type checking only |
| `test` | `npm run test` | Run Vitest unit tests |
| `seed` | `npm run seed` | Upsert catalog sample data via `tsx` (reads `.env.local` if present) |

### Seed data

`npm run seed` connects to `MONGODB_URI` and upserts sample products by slug:
draft + published books and courses, a published consultation, and a published
quote-based MVP build engagement. It is idempotent and safe to re-run.

## Database

- Connection: `lib/db.ts` (single cached Mongoose connection). Server-only;
  importing it from a client component throws.
- Environment loading: `lib/env.ts` (Zod-validated, fail-fast in production).
- Models: `models/Product.ts`, `models/Order.ts`, `models/Payment.ts`,
  `models/PaymentEvent.ts`, `models/Fulfillment.ts` (unique references,
  statuses, indexes; still re-importable from `tsx`/tests — the server-only
  boundary lives in the service layer).
- Domain logic: `lib/services/catalog-service.ts` and
  `lib/services/order-service.ts` (server-only; the order service owns the
  checkout→verify→settle→fulfill pipeline and idempotent webhook processing).
- Validation: `lib/validation/product.ts`, `lib/validation/order.ts`,
  `lib/validation/payment.ts` (Zod; prices/statuses are never trusted from the
  client).
- API: `app/api/checkout/session`, `app/api/payments/paystack/initialize`,
  `app/api/payments/paystack/verify/[reference]`,
  `app/api/webhooks/paystack` (see `lib/api.ts` for consistent response shapes).
- Seed: `scripts/seed.ts` (`npm run seed`).

## Provider integration setup (when implemented)

### Paystack

The server-side adapter (`lib/providers/paystack.ts`) and payment pipeline are
implemented. To test end-to-end:

1. Create an account at https://paystack.com and copy your test public and secret keys.
2. Set `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET`.
3. Configure the webhook URL at the Paystack dashboard to
   `https://<your-domain>/api/webhooks/paystack`.
4. Checkout flow: `POST /api/checkout/session` snapshots the server-side price
   into a pending `Order` → `POST /api/payments/paystack/initialize` creates a
   `Payment` and returns a Paystack authorization URL → the customer returns via
   `/payment/callback?reference=…`, where the server verifies the transaction.
   Webhooks validate `x-paystack-signature` (HMAC SHA512), deduplicate via a
   unique `PaymentEvent` key, and settle only when amount + currency match the
   order snapshot. Fulfillment records are created but Google Classroom / SMTP
   delivery is not yet automated.

### Google Classroom

1. Create a Google Cloud project, enable the Classroom API, and configure an OAuth
   client for the owner account.
2. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`,
   `GOOGLE_CLASSROOM_OWNER_EMAIL`.
3. Course products map to their Classroom course IDs. Customers provide the Google
   email to enroll; checkouts do not assume the checkout email equals the Google email.

### Google SMTP

1. Use a dedicated Gmail mailbox. Enable 2-Step Verification and create an app password
   (16-digit passcode) at https://myaccount.google.com/apppasswords.
2. Set `GOOGLE_SMTP_USER`, `GOOGLE_SMTP_PASSWORD`, `MAIL_FROM_NAME`, `MAIL_FROM_EMAIL`.
3. Credentials are server-only secrets; they must never be committed or sent to the browser.

## What is automated vs. owner action

Nothing is implemented yet beyond the foundation. When features arrive, the running
assumption (see PRD §22) is: payments, enrollment attempts, and emails are automated;
owner action is required for manual operations such as correcting a customer's Google
Classroom email, confirming a consultation slot in manual mode, and handling
action-required fulfillments.

## Troubleshooting

- **`Invalid server environment configuration: MONGODB_URI ...`** — create
  `.env.local` from `.env.example` and set `MONGODB_URI`.
- **Type errors after installing new packages** — run `npm run typecheck`.
- **Dependency conflict messages** — the project pins `nodemailer@9` while
  `next-auth@4` declares an optional peer of `nodemailer@^7`. Installs are
  configured to proceed via `.npmrc` (`legacy-peer-deps=true`).

## Production launch checklist

- [ ] Set all provider environment variables in the hosting secret manager.
- [ ] Run migrations/seed on a clean database (once implemented).
- [ ] Configure the Paystack webhook URL and verify signature checks.
- [ ] Connect the Google OAuth client with a production refresh token.
- [ ] Verify the SMTP mailbox and sender identity.
- [ ] Run the full test suite plus an end-to-end test in Paystack test mode and a
      controlled Classroom test course before switching to live keys.