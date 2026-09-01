# Rapid Launch Opencode Skill Knowledge Base

## Purpose

This document is a detailed instruction manual for an AI coding agent working on the Rapid Launch platform. Give this document to Opencode before asking it to implement application features. It defines the architecture, frontend design standards, Next.js conventions, MongoDB patterns, AI-SDK conventions, security rules, testing expectations, and the way the agent must behave while coding.

This document is not a product requirements document or visual design system. The PRD defines **what** Rapid Launch must do. `DESIGN.md` defines **how the product looks and feels**. This document defines **how the coding agent must work** technically while setting up and implementing it.

---

# PART I — MASTER INSTRUCTION TO OPENCODE

Copy the following instruction into your Opencode agent after placing this document in the project root as `AGENTS.md`, `OPENCODE_RULES.md`, or another file that your agent automatically reads.

> You are the senior full-stack engineer responsible for the Rapid Launch platform. Read and follow the Rapid Launch PRD and this skill knowledge base before modifying code. Treat these documents as the source of truth.
>
> You must work incrementally. Do not implement an entire product in one uncontrolled change. Before coding, inspect the existing repository, identify the framework version, package manager, scripts, directory structure, and existing configuration. Never overwrite working project configuration without explaining why.
>
> The application is a full-stack Next.js application using the App Router, TypeScript, MongoDB, and Mongoose. Frontend pages, backend route handlers, server actions, database models, authentication, payment integrations, email services, Google Classroom integrations, validation, and tests must be organized cleanly and must not be mixed into one oversized file.
>
> Use server-side code for all secrets and external provider calls. Paystack secret keys, Google OAuth credentials, SMTP passwords, database credentials, and AI provider keys must never be exposed to the browser, included in client bundles, committed to Git, logged, or returned in API responses.
>
> Use MongoDB with Mongoose. Define schemas with timestamps, indexes, enums, validation, and appropriate references. Reuse one cached MongoDB connection during development and production. Never create a new database connection on every request.
>
> Use Zod to validate all external input, including request bodies, query parameters, form submissions, webhook payloads where practical, and environment variables. Never trust client-submitted prices, roles, order status, payment status, product IDs, or fulfillment status.
>
> For Paystack, initialize transactions on the server, store an internal order before redirecting the user, verify the transaction on the server, compare amount, currency, provider reference, and internal order metadata, validate webhook signatures, and make webhook processing idempotent. Never fulfill an order because the browser visited a callback URL.
>
> For Google SMTP, use a server-only mail service with typed templates, HTML and plain-text alternatives, retries, and delivery logs. For Google Classroom, use a server-only provider adapter with OAuth credentials stored as secrets, explicit course mapping, enrollment status tracking, and retryable failures.
>
> For AI features, use the project’s configured AI SDK or provider abstraction. All model calls must run on the server. Use structured outputs when the application needs predictable data. Validate model output before storing or acting on it. Treat AI output as untrusted content and never allow it to bypass authorization, payment verification, validation, or human approval.
>
> Build accessible, responsive interfaces according to `DESIGN.md`. `DESIGN.md` is the single source of truth for colors, typography, spacing, layout, components, imagery, responsive behavior, borders, radii, shadows, and motion. Do not invent competing visual decisions in code. The public site, customer dashboard, and admin panel must follow the specific patterns documented in `DESIGN.md`.
>
> Every feature must include: data model, server-side business logic, authorization, validation, loading state, empty state, error state, success state, tests, and documentation. Do not mark a feature complete until type checking, linting, relevant tests, and a manual browser verification have passed.
>
> If an assumption is genuinely blocking, ask one focused question. If it is not blocking, use the defaults in the PRD, document the assumption, and continue. Do not pause for cosmetic decisions that can be changed later.

---

# PART II — NEXT.JS FULL-STACK SKILL

## 1. Architecture Baseline

Use Next.js with the App Router and TypeScript. Keep the application in one repository with a clear division between browser code and server code.

Recommended structure:

```text
quicklaunch/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx
│   │   ├── about/page.tsx
│   │   ├── courses/page.tsx
│   │   ├── courses/[slug]/page.tsx
│   │   ├── books/page.tsx
│   │   ├── books/[slug]/page.tsx
│   │   ├── services/page.tsx
│   │   └── contact/page.tsx
│   ├── (account)/
│   │   ├── account/page.tsx
│   │   ├── account/orders/page.tsx
│   │   ├── account/courses/page.tsx
│   │   └── account/bookings/page.tsx
│   ├── admin/
│   │   ├── page.tsx
│   │   ├── products/page.tsx
│   │   ├── orders/page.tsx
│   │   ├── customers/page.tsx
│   │   ├── bookings/page.tsx
│   │   ├── leads/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── checkout/
│   │   ├── payments/paystack/
│   │   ├── webhooks/paystack/
│   │   ├── classroom/
│   │   ├── bookings/
│   │   ├── leads/
│   │   └── health/
│   ├── auth/
│   ├── checkout/[productId]/page.tsx
│   ├── payment/callback/page.tsx
│   ├── layout.tsx
│   ├── not-found.tsx
│   ├── error.tsx
│   └── loading.tsx
├── components/
│   ├── ui/
│   ├── marketing/
│   ├── catalog/
│   ├── checkout/
│   ├── account/
│   └── admin/
├── lib/
│   ├── db.ts
│   ├── env.ts
│   ├── auth.ts
│   ├── permissions.ts
│   ├── validation/
│   ├── providers/
│   │   ├── paystack.ts
│   │   ├── classroom.ts
│   │   ├── mail.ts
│   │   └── ai.ts
│   ├── services/
│   │   ├── order-service.ts
│   │   ├── fulfillment-service.ts
│   │   ├── booking-service.ts
│   │   └── lead-service.ts
│   └── utils.ts
├── models/
│   ├── User.ts
│   ├── Product.ts
│   ├── Order.ts
│   ├── Payment.ts
│   ├── Fulfillment.ts
│   ├── Booking.ts
│   ├── Lead.ts
│   ├── EmailEvent.ts
│   └── AuditLog.ts
├── types/
│   ├── product.ts
│   ├── order.ts
│   ├── payment.ts
│   └── integrations.ts
├── tests/
├── scripts/
├── public/
├── .env.example
├── package.json
└── README.md
```

Do not create a separate Express server unless there is a clearly documented requirement. Next.js Route Handlers are sufficient for standard API endpoints, webhooks, and server-side provider calls. Keep domain logic in service modules rather than placing all logic directly in route handlers.

## 2. Server and Client Boundaries

Default to React Server Components. Add `'use client'` only when a component requires browser state, event handlers, effects, browser APIs, or a client-only library. Do not make an entire page a Client Component merely because one form or button needs interactivity; isolate the interactive component.

Server-only modules must be protected from accidental client imports. Use `import 'server-only'` in modules that contain database access, secrets, provider clients, payment logic, mail logic, OAuth tokens, or AI credentials.

A route handler should perform the following sequence:

```text
Parse request → Authenticate → Authorize → Validate input → Execute domain service → Return safe response
```

A route handler must not trust a client-provided user ID, role, price, order status, or provider status. Derive identity from the authenticated session and derive money from the database.

## 3. Environment Configuration

Create a typed environment loader. Fail fast on the server when a required production variable is missing, but permit local development to run with explicitly documented placeholders where the provider is not being used.

```env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
MONGODB_URI=mongodb://127.0.0.1:27017/quicklaunch
MONGODB_DB_NAME=quicklaunch
AUTH_SECRET=replace_with_a_long_random_secret

PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxx
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxx
PAYSTACK_WEBHOOK_SECRET=use_paystack_secret_or_configured_secret

GOOGLE_CLIENT_ID=xxxxxxxx
GOOGLE_CLIENT_SECRET=xxxxxxxx
GOOGLE_REFRESH_TOKEN=xxxxxxxx
GOOGLE_CLASSROOM_OWNER_EMAIL=owner@example.com

GOOGLE_SMTP_HOST=smtp.gmail.com
GOOGLE_SMTP_PORT=465
GOOGLE_SMTP_USER=owner@example.com
GOOGLE_SMTP_PASSWORD=xxxxxxxx
MAIL_FROM_NAME=Rapid Launch
MAIL_FROM_EMAIL=owner@example.com

AI_PROVIDER_API_KEY=xxxxxxxx
AI_MODEL=provider-model-id
```

Only variables prefixed with `NEXT_PUBLIC_` may be exposed to the browser. Never place secret values in `NEXT_PUBLIC_` variables.

## 4. MongoDB and Mongoose Rules

Use one cached connection. The connection module must work with Next.js development hot reload and must not open an unbounded number of connections.

```ts
// lib/db.ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not configured');
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cache = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cache;

export async function connectToDatabase() {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
      bufferCommands: false,
    });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}
```

Use explicit schemas and indexes. Use `timestamps: true`. Normalize emails to lowercase. Use `select: false` for sensitive fields when appropriate. Do not store raw payment card information, OAuth access tokens, SMTP passwords, or AI provider secrets in MongoDB.

Use stable enums for statuses and centralize allowed transitions. For example, an order should not move from `FAILED` directly to `PAID` without a verified provider event or explicit, audited administrative reconciliation.

For duplicate prevention, add unique indexes where appropriate:

```ts
OrderSchema.index({ orderReference: 1 }, { unique: true });
PaymentSchema.index({ provider: 1, providerReference: 1 }, { unique: true, sparse: true });
ProductSchema.index({ slug: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });
PaymentEventSchema.index({ provider: 1, eventKey: 1 }, { unique: true });
```

Handle Mongoose model recompilation safely in development:

```ts
export const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
```

## 5. Authentication and Authorization

Implement secure authentication with a maintained library. Keep authentication separate from authorization. Authentication answers “who is this?” Authorization answers “what may this person do?”

The minimum role model is `customer` and `admin`. Add `staff` only if necessary. Every admin page and admin route must verify the user's role on the server.

Use helper functions such as:

```ts
export async function requireUser() {}
export async function requireAdmin() {}
export async function requireRole(roles: UserRole[]) {}
```

Never rely on a hidden button, frontend route guard, or client-side role field for security. The backend must reject unauthorized requests with a safe 401 or 403 response.

## 6. API and Service Conventions

Use consistent response shapes:

```ts
{ ok: true, data: result }
{ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Safe message', requestId } }
```

Use domain services for operations that involve multiple models or side effects. For example, `completeVerifiedPayment(orderId, providerData)` should own the state transition, fulfillment creation, audit record, and event dispatch. A webhook route should not duplicate this logic.

Never silently swallow provider errors. Store a safe operational error, log a request ID, and expose a customer-friendly message. Do not return raw provider payloads to customers.

## 7. Payments and Fulfillment Boundaries

Payment processing and fulfillment are separate concerns:

```text
Checkout → Pending Order → Paystack Payment → Verified Payment → Paid Order → Fulfillment Job → Fulfilled / Action Required
```

A successful payment must create or update fulfillment records, but fulfillment failures must not reverse a verified payment. If Google Classroom is unavailable, preserve the paid order and retry enrollment.

Use an idempotency key for every fulfillment operation. Before creating an enrollment, email, download grant, or booking confirmation, check whether the desired side effect has already been completed.

## 8. Testing Standards

Every new service must have unit tests for normal and failure states. Every provider adapter must be mockable. Do not make real Paystack charges, real emails, or real Classroom enrollments in automated tests.

Required test categories:

- Schema validation and indexes.
- Authorization and customer-data isolation.
- Checkout price tampering.
- Paystack signature validation.
- Amount and currency mismatch.
- Duplicate webhook delivery.
- Retryable provider failure.
- Classroom already-enrolled response.
- SMTP failure and retry.
- Admin-only operations.
- Customer dashboard access.

---

# PART III — FRONTEND DESIGN AND UX SKILL

## 1. DESIGN.md Is the Visual Source of Truth

The agent must read `DESIGN.md` before writing or modifying any frontend code. If `DESIGN.md` does not exist, do not invent a complete design system. Report that the file is missing and ask the owner to create or provide it. The agent may create only a temporary structural shell using neutral styles if explicitly instructed, but it must label that shell as temporary.

The agent must not override, reinterpret, or silently replace the rules in `DESIGN.md`. When a requirement conflicts with `DESIGN.md`, stop and report the conflict before implementing. If a component is not specified, follow the nearest documented pattern and record the assumption.

`DESIGN.md` is authoritative for:

| Visual area | Required source |
|---|---|
| Brand | Personality, visual principles, tone, and prohibited patterns |
| Colors | Backgrounds, text, accents, semantic states, gradients, and contrast |
| Typography | Font families, weights, sizes, line heights, and hierarchy |
| Layout | Containers, grids, breakpoints, spacing, and alignment |
| Components | Buttons, inputs, cards, navigation, tables, modals, alerts, and badges |
| Imagery | Image style, aspect ratios, iconography, and asset rules |
| Motion | Animation principles, durations, easing, and reduced-motion behavior |
| Responsive UI | Mobile, tablet, and desktop adaptations |

Before implementing any UI feature, the agent must state which `DESIGN.md` rules it is applying. Reuse design tokens and existing components instead of adding one-off values.

## 2. Product Experience Principles

Rapid Launch is a premium product strategy, AI learning, and execution platform. The interface must communicate clarity, competence, momentum, and trust, but the exact visual expression must come from `DESIGN.md`. Do not invent generic SaaS visuals, random gradients, excessive rounded cards, crowded dashboards, or unstructured color systems that are not approved by the design file.

Before implementing visual components, confirm that `DESIGN.md` provides:

| Token group | Required decisions |
|---|---|
| Brand colors | Primary, secondary, accent, background, text, muted text, success, warning, error |
| Typography | Display face, body face, scale, line height, letter spacing |
| Spacing | Base unit and spacing scale |
| Shape | Border radius rules, dividers, image treatment |
| Motion | Duration, easing, reduced-motion behavior |
| Layout | Content width, grid, mobile breakpoints, navigation behavior |

Put tokens in a global stylesheet or theme configuration. Do not scatter arbitrary color values across components.

## 2. Public Site Principles

The landing page should make the business understandable within one screenful. It should answer:

1. Who is this for?
2. What problem is solved?
3. What kind of help is available?
4. What should the visitor do next?

Use a strong opening statement, supporting proof, audience-specific sections, featured learning products, consulting/MVP pathway, content links, and a focused final CTA.

The public site should use a custom navigation suitable for a professional service and learning business. Do not use an admin sidebar for the public website.

Product detail pages must show title, audience, outcome, price, format, duration, syllabus or scope, fulfillment method, FAQs, and one primary CTA. Explain what happens after purchase, especially for Google Classroom courses.

## 3. Admin Design Principles

Use a persistent sidebar or compact responsive navigation for the admin area. The dashboard should prioritize operational information:

- Revenue and successful orders.
- Pending and failed payments.
- Fulfillment issues.
- New leads.
- Upcoming bookings.
- Products requiring configuration.

Use tables for dense operational data. Use filters, search, pagination, bulk actions, and clear status labels. Avoid putting every metric into a decorative card. A metric is useful only when it helps the owner decide what to do.

Every admin mutation needs visible feedback. Use confirmation dialogs for destructive actions, clear success toasts, and error messages that explain how to recover.

## 4. Customer Experience Principles

The customer dashboard should answer “what do I have access to and what should I do next?” Use an overview with the next action, course access state, orders, bookings, profile, and support.

For paid courses, make the difference between `Paid`, `Enrollment pending`, `Action required`, and `Available in Google Classroom` obvious. Do not show a dead link when enrollment has failed.

For a pending booking, show the current state and what the customer should expect next. For an MVP inquiry, show that the message was received and provide the inquiry reference.

## 5. Component Standards

Build reusable components for:

- Buttons with clear variants and disabled/loading states.
- Form fields with labels, help text, errors, and success states.
- Status badges with text and accessible color contrast.
- Empty states with a useful next action.
- Tables with mobile fallback behavior.
- Modal and drawer patterns.
- Confirmation dialogs.
- Toasts and inline alerts.
- Product cards.
- Course access panels.
- Checkout summary.
- Admin filters.

Do not create a one-off visual pattern for every page. Extract a shared component when the same interaction appears twice.

## 6. Accessibility Rules

Use semantic HTML. Every form control must have a visible or programmatically associated label. Keyboard users must be able to access every action. Focus states must be visible. Do not use color as the only status signal. Use sufficient contrast. Buttons must describe their action, such as “Retry enrollment” rather than “Continue”.

Use proper heading hierarchy. Do not skip from `h1` to `h4` for visual reasons. Provide alternative text for meaningful images. Mark decorative images as decorative. Ensure dialogs trap focus and restore focus when closed.

## 7. Responsive Rules

Design mobile first. Test at approximately 320px, 375px, 768px, 1024px, and 1440px widths. On mobile:

- Navigation must collapse cleanly.
- Tables must become scrollable or transform into readable list rows.
- Checkout must remain easy to complete.
- Buttons must remain reachable and large enough to use.
- Long headings must wrap without clipping.
- Admin sidebars must become a drawer or top navigation.

Do not solve responsive issues by hiding important content.

## 8. Loading, Empty, and Error States

Every data-driven page must handle four states:

| State | Expected behavior |
|---|---|
| Loading | Show a stable skeleton or progress indicator that preserves layout. |
| Empty | Explain why the area is empty and provide the next action. |
| Error | Explain what failed, provide retry where appropriate, and avoid technical leakage. |
| Success | Confirm the action and show the resulting state. |

Never leave a blank white page while data loads. Never show a successful toast if the server operation failed.

## 9. Motion

Use motion only to clarify state changes and hierarchy. Keep common transitions short. Respect `prefers-reduced-motion`. Do not animate critical payment or authentication actions in a way that delays use. Avoid decorative animation that harms readability or performance.

---

# PART IV — AI-SDK AND AI FEATURE SKILL

## 1. AI Feature Architecture

AI functionality must be optional, observable, and isolated from core payment and authorization logic. Use a provider adapter such as:

```ts
export interface AIService {
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
  generateStructured<T>(input: StructuredInput<T>): Promise<T>;
}
```

Do not call an AI provider directly from a React Client Component. The client should call a server route or server action that authenticates the user, authorizes access, validates input, invokes the model, validates the response, and returns a safe result.

## 2. Appropriate Rapid Launch AI Features

Potential AI features include:

- Product idea clarification assistant.
- PRD draft assistant.
- Acceptance criteria assistant.
- MVP scope review assistant.
- AI tool recommendation assistant.
- Course discovery assistant.
- Founder inquiry classification for admin review.
- Content repurposing assistant for the owner's internal workflow.

Do not allow the AI to autonomously approve payments, grant course access, issue refunds, change product prices, change user roles, enroll students without a verified order, or send customer-facing commitments without an explicit business rule and authorization.

## 3. Prompt Layering

Every AI request should have distinct layers:

1. **System instruction:** The assistant's role, safety boundaries, output rules, and domain context.
2. **Application context:** Product configuration, user role, allowed capabilities, and relevant records.
3. **User input:** The question or text supplied by the user.
4. **Output schema:** The exact shape required when structured output is used.

Never concatenate untrusted user content into a system instruction without clear delimiters. Treat retrieved documents and user-provided text as data, not instructions.

## 4. Structured Output

Use structured output whenever the result is used by application code. Example:

```ts
const result = await generateStructured({
  system: 'You classify product inquiries. Return only the requested JSON.',
  input: leadMessage,
  schema: z.object({
    category: z.enum(['consultation', 'mvp_service', 'course', 'book', 'support', 'other']),
    urgency: z.enum(['low', 'medium', 'high']),
    summary: z.string().max(500),
    suggestedNextAction: z.string().max(300),
  }),
});
```

Validate the result again with Zod before storing it. If parsing fails, do not guess. Log a safe failure and return a retryable error.

## 5. Streaming

Use streaming only when the user benefits from seeing a long response progressively, such as an assistant conversation. Do not use streaming for simple classification, metadata extraction, or a short recommendation.

When streaming, handle client disconnects, upstream errors, cancellation, partial output, and final persistence. Never save incomplete AI output as a finalized business record without a completion marker.

## 6. Model and Cost Controls

Do not hard-code a model unnecessarily. Make the model configurable through a server-side environment variable or admin setting. Add maximum input length, maximum output length, timeout, retry limit, and rate limit.

Track an AI request record containing feature name, user ID where appropriate, model identifier, latency, status, token usage if available, and error category. Do not store sensitive prompts or outputs unless the product requirement explicitly needs them.

## 7. AI Safety and Human Review

AI outputs are suggestions. Add human review for any action that affects customers, money, access, legal commitments, or published content. Clearly label AI-generated drafts in the admin interface.

The AI must not reveal private customer data across accounts. Restrict retrieval to records the current user is authorized to access. Do not give an AI tool unrestricted database access. Expose narrowly scoped server functions with explicit input validation and authorization.

## 8. AI Testing

Test AI integrations with deterministic fixtures and mocked provider responses. Test malformed JSON, refusal or uncertainty, provider timeout, rate limit, prompt-injection-like content, oversized input, and unauthorized access. Do not make automated tests dependent on a live model response.

---

# PART V — QUICKLAUNCH INTEGRATION RULES

## Paystack

The payment adapter must have explicit functions for `initializeTransaction`, `verifyTransaction`, `validateWebhookSignature`, and `mapProviderStatus`. The internal order reference is the source of truth for the application. The client may receive a checkout URL or access code, but never the secret key.

The webhook route must preserve the raw request body if required for signature validation. Validate the signature before processing. Persist an idempotency key. A duplicate event must return a safe success response without repeating fulfillment.

## Google SMTP

The mail adapter must have `sendEmail`, `sendTemplateEmail`, and `sendTestEmail`. Email jobs should be retryable. Use a dedicated sender identity. Keep templates versioned or keyed. Never send raw internal error details to customers.

## Google Classroom

The Classroom adapter must have `listConfiguredCourses`, `getCourse`, `enrollStudent`, and `checkEnrollment`. Map each course product to a configured Classroom course ID. Store enrollment attempts and provider errors. Treat “already enrolled” as a successful desired state. Provide an admin retry action.

## MongoDB

MongoDB is the only primary database for the application unless the owner explicitly changes the architecture. Do not introduce PostgreSQL, Drizzle, Prisma, or a second ORM without asking first. Mongoose is the default ODM.

## Authentication

Use one authentication solution consistently. Do not combine multiple session libraries casually. Store session identifiers securely. Use server-side role checks on every protected route.

---

# PART VI — AGENT WORKING PROTOCOL

## Before Each Feature

The agent must first state:

- What files it inspected.
- Which user journey the feature supports.
- Which models and routes are involved.
- What authorization is required.
- What external side effects exist.
- What tests will be added.

## During Implementation

The agent must make small, coherent changes. Keep secrets server-side. Reuse existing components. Avoid duplicate utilities. Keep names consistent with the domain model. Do not change unrelated files.

## After Each Feature

The agent must run:

```bash
npm run lint
npm run typecheck
npm test
```

If a script does not exist, add the correct script or document the equivalent command. The agent must report failures honestly. It must not claim a feature is complete when tests are skipped or a provider integration is only mocked.

## Completion Report Format

For every completed task, respond with:

```text
Implemented:
- ...

Files changed:
- ...

Database changes:
- ...

Environment variables:
- ...

Tests run:
- ...

Known limitations:
- ...

Recommended next step:
- ...
```

---

# PART VII — INSTALLATION AND USE IN OPENCODE

## Recommended Method

1. Create or open the Rapid Launch project.
2. Save this document in the project root as `AGENTS.md` or `OPENCODE_RULES.md`.
3. Save the product requirements document in the project root as `PRODUCT_REQUIREMENTS.md`.
4. Tell Opencode to read both documents before changing code.
5. Ask Opencode to inspect the repository and report the current setup without implementing features.
6. Only after reviewing that report, ask Opencode to install packages or create setup files.
7. Build features one vertical slice at a time.

## Initial Opencode Command

Paste this prompt first:

> Read `AGENTS.md` and `PRODUCT_REQUIREMENTS.md` completely. Do not implement application features yet. Inspect the repository and report: the current Next.js version, package manager, TypeScript configuration, Tailwind configuration, App Router status, existing authentication, existing database setup, current scripts, and any conflicting dependencies. Then propose the smallest safe setup plan for a full-stack Next.js App Router application using MongoDB and Mongoose. Do not install packages or modify files until I approve the plan.

## Package Installation Prompt

After reviewing the agent's report, paste:

> Now perform only the project foundation setup. Do not build Rapid Launch business features, pages, payment flows, admin screens, course enrollment, or AI features yet. Install and configure only the packages required for the foundation:
>
> ```bash
> npm install mongoose zod nodemailer googleapis lucide-react clsx tailwind-merge react-hook-form @hookform/resolvers
> npm install next-auth
> npm install -D @types/nodemailer
> ```
>
> Use the repository's existing package manager instead of changing from npm to pnpm or yarn. If the project already contains an equivalent package, do not install a duplicate. Do not install an AI provider SDK yet unless the project specifically requires it; first create a provider abstraction so the AI SDK can be added deliberately later.
>
> Create or update only the following foundation files: `.env.example`, `lib/env.ts`, `lib/db.ts`, `lib/providers/paystack.ts`, `lib/providers/mail.ts`, `lib/providers/classroom.ts`, and `README.md`. Add placeholder interfaces and connection/configuration boilerplate, but do not create business routes or feature UI. Make sure server-only code cannot be imported into client components. Run formatting, linting, type checking, and the existing tests. Report every file changed and every command executed.

## AI-SDK Installation Prompt

Install the AI SDK only when you are ready to build an AI feature. Paste:

> Before installing an AI SDK, inspect the current package.json and identify the exact AI provider and SDK version that this project will use. Do not install multiple competing AI SDKs. Add the smallest provider package required and create a server-only adapter at `lib/providers/ai.ts`. Add an environment variable placeholder in `.env.example`, a typed configuration loader, timeout and input-length limits, and a mocked test adapter. Do not expose the API key to the browser. Do not build an AI feature yet. After installation, run type checking and tests and report the exact package versions.

## Frontend Design Installation Prompt

Use this before building visual features:

> Read `AGENTS.md`, `PRODUCT_REQUIREMENTS.md`, and `DESIGN.md`. Treat `DESIGN.md` as the only source of truth for the UI. Before writing page-level UI, inspect the existing Tailwind, global CSS, font, and component configuration. Summarize the design tokens, typography, spacing, layout rules, public navigation, admin navigation, responsive behavior, component rules, and accessibility requirements found in `DESIGN.md`. Do not invent a new design direction and do not build the whole site yet. Implement only the global design tokens and one representative shell after I approve the implementation plan. If `DESIGN.md` is missing or incomplete, stop and report exactly what is missing.

## First Feature Prompt

After setup is approved, use:

> Implement only the public product catalog vertical slice. Read the PRD and skill knowledge base first. Create the MongoDB Product model, seed data for draft and published products, public catalog route, product detail route, server-side validation, loading/empty/error states, responsive components, and tests. Do not implement Paystack, Google Classroom, SMTP, admin management, or AI functionality yet. Report files changed, scripts run, and known limitations.

---

# PART VIII — IMPORTANT CORRECTION TO AVOID

Do not tell Opencode to use Drizzle with MongoDB. Drizzle is not the default choice for this MongoDB architecture. For this project, use MongoDB with Mongoose unless you intentionally decide to change databases and revise the PRD.

Do not tell Opencode that the requested skills are literally installed as software packages. **Frontend design, Next.js architecture, and AI-SDK integration are knowledge and workflow instructions.** Packages such as `next`, `mongoose`, `zod`, `nodemailer`, `googleapis`, and the chosen AI SDK are installed dependencies; the skill documents are agent instructions.

Do not install every possible library at the beginning. Start with the project foundation, verify the environment, and add provider SDKs when their feature slice is ready. This keeps dependency conflicts and unnecessary attack surface under control.
