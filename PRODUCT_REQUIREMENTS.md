# Product Requirements Document

## Rapid Launch Product, Consulting, Learning, and Digital Commerce Platform

**Document status:** Build-ready specification  
**Prepared for:** Product owner / founder  
**Prepared by:** Manus AI  
**Primary implementation audience:** Opencode or another AI coding agent  
**Version:** 1.0  
**Date:** 30 August 2026

---

## 1. Executive Summary

Build a professional web platform for a product-management and AI-product-building consultancy whose promise is to act as the bridge between a founder's idea and correct execution. The platform must sell and manage four related product lines: paid one-on-one consulting sessions, self-paced crash courses, custom MVP-building engagements, and books or other digital products.

The working brand promise is **“Quick launch.”** The platform should make it easy for a founder or product manager to understand the available offer, choose the appropriate level of help, pay securely, receive confirmation, access purchased learning content through Google Classroom, schedule a consulting session, and contact the business. The owner must have a secure back office for managing products, prices, bookings, customers, payments, courses, books, content, integrations, and business reporting.

This document is intentionally written as an engineering contract. The coding agent must not invent major business rules, replace the specified integrations with mock behavior, or mark a payment as successful based only on a browser redirect. Where a requirement is marked **MUST**, it is required for the first production release. Where a requirement is marked **SHOULD**, it should be implemented unless the implementation would materially delay launch. Where a requirement is marked **MAY**, it is an extensibility option and may be deferred.

> **Core product outcome:** A qualified visitor can discover an offer, pay through Paystack, and immediately receive the correct next step—Google Classroom enrollment for a course, a scheduling flow for a consulting session, or an onboarding workflow for an MVP-building engagement—while the owner can monitor and operate the entire business from one back office.

---

## 2. Product Context and Positioning

The business serves two primary audiences. The first is a **founder** who has an idea and needs clarity, product strategy, prioritization, market direction, technical planning, or an MVP built quickly without immediately hiring a full engineering team. The second is a **product manager** who wants to become more effective by learning how to use AI tools in their workflow, build software with AI, and move from product thinking to tangible execution.

The platform is not merely an online store. It is a service-commerce and learning-access platform. A user may purchase a single low-touch digital product, book a high-touch consulting session, or enter a longer-term engagement. The information architecture must therefore distinguish between **catalog products**, **orders and payments**, **appointments**, **course access**, and **service leads**.

| Audience | Main problem | Primary solution | Desired conversion |
|---|---|---|---|
| Founder with an idea | Unclear roadmap, wrong priorities, expensive or slow execution | Consultation, product strategy, or MVP-building service | Book a session or submit an MVP inquiry |
| Product manager | Difficulty choosing and applying AI tools | AI workflow and AI product-building courses or consultation | Buy a course or book a session |
| Existing learner/customer | Needs reliable access and follow-up | Account area, course access, receipts, reminders, support | Complete purchase and continue engagement |
| Owner/administrator | Needs one source of truth for operations | Back office with products, payments, bookings, enrollments, and reporting | Operate without manual spreadsheet reconciliation |

---

## 3. Goals and Non-Goals

### 3.1 Goals

The first release must establish a trustworthy commercial foundation. It must present the owner's expertise and offers clearly, accept payments in the configured Paystack currency, automatically grant the correct fulfillment after verified payment, use Google SMTP for transactional email, integrate with Google Classroom for course delivery, support appointment requests or scheduling, and provide a complete owner back office.

The first release must also create clean data boundaries. A payment, an order, an enrollment, a booking, and a lead are different objects and must not be collapsed into one generic status field. The system must preserve an audit trail so the owner can determine what happened when a customer reports a payment or access problem.

### 3.2 Non-goals for the first release

The platform will not build a proprietary video streaming LMS. Google Classroom remains the learning management system. The platform will not initially implement a multi-instructor marketplace, affiliate program, subscription billing, complex tax automation, native mobile applications, real-time chat, or a full project-management system for delivering custom MVPs. The architecture should allow these capabilities later without requiring a rewrite.

---

## 4. Assumptions and Decisions to Preserve

The following assumptions are required to make the product buildable. The owner can change them later from the admin configuration where the requirement permits it.

| Area | Decision |
|---|---|
| Brand/product name | Use a configurable working name such as **Rapid Launch** until the owner provides the final name. Do not hard-code the name across the codebase. |
| Currency | Make currency configurable, with NGN as the initial default unless the owner specifies another Paystack-supported currency. Store all monetary values as integer minor units; never use floating-point arithmetic for money. |
| Payment processor | Paystack. Payment initialization and verification are server-side responsibilities. |
| Email provider | Google SMTP using a dedicated business mailbox. Credentials must be stored as secrets, never in source control or client-side code. |
| LMS | Google Classroom. Course products map to configured Google Classroom course IDs. |
| Scheduling | Use a configurable external scheduling URL in the MVP, or implement an internal request-and-confirm flow. Do not promise a calendar integration unless it is explicitly configured. |
| Course delivery | On verified payment, the system grants enrollment fulfillment and attempts to add the user's Google account to the mapped Classroom course. If the account cannot be enrolled automatically, the user receives a clear pending-access state and the owner receives an operational alert. |
| Digital books | A book can be represented as a physical, downloadable, or external-purchase product. The product record must include fulfillment type so the implementation does not assume every book is a file download. |
| MVP service | The owner sells an outcome-oriented service. The initial release captures an inquiry, payment if configured, discovery information, and status; it does not attempt to automate software delivery. |
| Access model | A customer account is created or linked using email. Passwordless email sign-in or a secure email-verification flow is preferred. If password authentication is used, passwords must be hashed with a modern password-hashing algorithm. |

---

## 5. User Roles and Permissions

The application must implement role-based access control. Authorization must be checked on the server for every protected operation; hiding an admin link in the UI is not authorization.

| Role | Permissions |
|---|---|
| Visitor | View public pages, catalog items, public content, social links, and contact information. Start checkout, session booking, or inquiry flows. |
| Customer/Learner | View and update their profile, view orders and payment statuses, access purchased course links, view booking statuses, download available receipts or digital assets, and submit support requests. |
| Administrator/Owner | Full access to catalog, pricing, orders, payments, customers, bookings, leads, courses, books, integrations, email templates, site content, reports, audit logs, and system settings. |
| Operations staff, optional | Access configurable operational areas such as orders, bookings, leads, and customers, but not secrets, integrations, or destructive settings unless explicitly granted. |

The first release may ship with only Visitor, Customer, and Administrator roles, but the database and authorization layer should use a role enum or permission table rather than a hard-coded `isAdmin` boolean alone.

---

## 6. Information Architecture and Public Pages

The public site must be responsive, accessible, fast, and structured around conversion without feeling like a generic template. The visual design system will be specified separately; this PRD defines content behavior and component requirements, not final colors or typography.

| Route | Purpose | Required content and actions |
|---|---|---|
| `/` | Main landing page | Brand promise, audience split, services, featured courses, featured books, credibility, YouTube content, social links, and primary calls to action. |
| `/about` | Founder and positioning | Biography, product-management experience, philosophy, and why Rapid Launch exists. |
| `/services` | High-touch offers | Consulting sessions and MVP-building service with outcomes, process, FAQs, and CTAs. |
| `/services/consulting` | Consulting detail | Session types, duration, price, preparation expectations, booking CTA. |
| `/services/mvp-build` | MVP-building detail | Who it is for, deliverables, exclusions, process, source-code handover promise, inquiry form, and optional deposit CTA. |
| `/courses` | Course catalog | Search/filter, course cards, price, duration, audience, outcomes, and purchase CTA. |
| `/courses/:slug` | Course detail | Course description, learning outcomes, modules or syllabus, duration, price, preview content, Google Classroom fulfillment notice, and purchase CTA. |
| `/books` | Book catalog | Book cards, format, price, description, and purchase CTA. |
| `/books/:slug` | Book detail | Description, author information, format, delivery method, price, preview, and purchase CTA. |
| `/resources` | Content hub | Articles, videos, selected YouTube content, and lead-generation CTAs. |
| `/contact` | Contact and support | Contact form, support email, social links, and expected response time. |
| `/checkout/:productId` | Checkout preparation | Product summary, customer details, terms consent, amount, and Paystack payment action. |
| `/payment/callback` | Payment return state | Never independently grant access. Show “confirming payment” and resolve status from the server. |
| `/login`, `/signup`, `/verify-email` | Account access | Secure account creation and login. |
| `/account` | Customer dashboard | Orders, course access, bookings, profile, and support. |
| `/privacy`, `/terms`, `/refund-policy` | Legal information | Configurable legal pages linked in checkout and site footer. |

Every product detail page must include one clear primary CTA. Secondary CTAs may link to a consultation for visitors who need a tailored recommendation.

---

## 7. Catalog and Product Model

The catalog must support at least these product types: `COURSE`, `BOOK`, `CONSULTATION`, and `MVP_SERVICE`. The owner must be able to create, edit, publish, unpublish, archive, reorder, feature, and duplicate products from the back office.

Each product must contain a stable internal ID, slug, title, short description, full description, product type, status, thumbnail, gallery or supporting media, price, currency, tax display configuration, featured flag, sort order, SEO title, SEO description, and creation/update timestamps.

Product-specific fields are as follows:

| Product type | Required fields | Fulfillment |
|---|---|---|
| Course | Instructor, duration, level, audience, outcomes, syllabus/modules, preview media, Google Classroom course ID, enrollment mode, access instructions | Create or queue a Classroom student enrollment after verified payment; show Classroom link in account and email. |
| Book | Author, ISBN or identifier if applicable, format, description, preview, inventory mode if physical, delivery mode, asset URL if digital | Send download link, purchase instructions, or fulfillment notice depending on `deliveryMode`. |
| Consultation | Session type, duration, price, booking mode, preparation instructions, reschedule policy, scheduling URL or availability configuration | Create a booking request or redirect to configured scheduler; send confirmation and reminders. |
| MVP service | Service package, scope summary, expected deliverables, starting price or quote mode, lead questions, optional deposit amount | Create an MVP lead and optionally an order/deposit payment; never mark the full service as delivered automatically. |

The catalog editor must validate that a published course has a Classroom mapping, a published paid product has a positive price and currency, a published book has a fulfillment mode, and a published consultation has a booking method. The owner must be able to save drafts with incomplete fields.

---

## 8. Core Customer Journeys

### 8.1 Course purchase and classroom enrollment

1. A visitor opens a course detail page and selects **Buy course**.
2. The system creates a pending checkout session tied to the product, customer email, price snapshot, and unique internal reference.
3. The server initializes a Paystack transaction using the snapshot amount, configured currency, customer email, callback URL, and metadata containing the internal order ID and product ID.
4. The user completes payment on Paystack.
5. Paystack returns the user to the callback URL and separately sends a webhook. The callback is informational only. The server verifies the transaction using Paystack and processes the webhook idempotently.
6. Once verified as successful and the amount/currency/product reference match the order, the order becomes `PAID`.
7. The system creates a course enrollment fulfillment record with status `PENDING` and attempts Google Classroom enrollment.
8. If enrollment succeeds, the fulfillment becomes `FULFILLED`, the customer receives the Classroom course link, and the account dashboard shows the course as available.
9. If enrollment cannot be completed because the customer has not supplied a valid Google account or the Google authorization is unavailable, the fulfillment becomes `ACTION_REQUIRED` or `RETRY_PENDING`. The customer sees exact next steps and the owner sees the issue in the back office.
10. Duplicate webhook deliveries or repeated callback visits must not create duplicate orders, charges, enrollments, or emails.

### 8.2 One-on-one consultation booking

The preferred MVP flow is to display a consultation product with a **Book a session** CTA. The customer enters name, email, timezone, preferred date or scheduling preference, company/stage, objectives, and any preparation notes. If an external scheduler is configured, the platform creates a lead or booking-intent record and opens the scheduler. If an internal request flow is configured, the owner confirms a time manually from the back office. Payment may occur before booking confirmation or after owner approval, but this must be a product-level setting and must not be ambiguous to the customer.

For a paid-first session, create a pending order, complete Paystack verification, then create a `PAID_PENDING_SCHEDULE` booking. For a schedule-first session, create a booking request and only create an order when the owner or customer initiates payment. The customer must receive a clear status such as `Awaiting scheduling`, `Confirmed`, `Reschedule requested`, or `Cancelled`.

### 8.3 MVP-building service inquiry

The MVP service page must qualify leads before asking for a commitment. The inquiry form must collect founder name, email, company/project name, problem statement, target customer, desired launch timeline, current product stage, requested platform, existing assets, expected budget range, and whether the founder needs product strategy, technical planning, implementation, or all three.

On submission, create an MVP lead with a unique reference and status `NEW`. Send an acknowledgement email to the founder and an internal notification to the owner. The owner can add notes, change status, assign a follow-up date, and send a payment link or create a service proposal. If a deposit product is configured, the lead may be converted into an order without copying data manually.

### 8.4 Book purchase

A visitor selects a book, reviews its format and delivery method, enters an email, and pays through Paystack. After verified payment, fulfill according to the configured mode. For a digital asset, generate a protected, expiring download URL or authenticated download endpoint. For a physical book, collect delivery details only when needed and create a fulfillment record. For an external store such as a “Shoe Shelf” link, make the CTA an external purchase link and clearly state that checkout occurs elsewhere; do not record a successful sale unless a payment is processed by this platform.

### 8.5 YouTube and social content

The platform must support configurable links to the owner's YouTube channel, LinkedIn, Instagram, and Shoe Shelf or book-store destination. The owner should be able to feature selected YouTube videos by storing their URLs, titles, thumbnails, and display order. The first release may embed videos using YouTube URLs; it does not need to synchronize the YouTube API unless separately configured.

---

## 9. Payments: Paystack Integration Requirements

Paystack integration must be implemented server-side. Paystack's official payment flow requires transaction initialization, payment completion, and verification; the secret key must never be exposed in frontend code.[1] The system must also verify both the final transaction status and the amount before delivering value.[1]

The platform must support the following endpoints or equivalent server actions:

| Endpoint/action | Behavior |
|---|---|
| `POST /api/checkout/session` | Validate product availability, snapshot price/currency, create a pending order, and return an internal checkout reference. |
| `POST /api/payments/paystack/initialize` | Initialize Paystack transaction from the server and return only safe checkout data such as authorization URL or access code. |
| `GET /api/payments/paystack/verify/:reference` | Verify the transaction server-side, compare status, amount, currency, reference, and order metadata, then invoke idempotent fulfillment. |
| `POST /api/webhooks/paystack` | Receive Paystack events, validate `x-paystack-signature` using HMAC SHA512, acknowledge quickly, and enqueue or execute idempotent processing. Paystack documents `charge.success` as the successful-charge event and recommends webhooks for reliable delivery.[2] |
| `GET /payment/callback` | Accept the Paystack reference, show a confirming state, and call the server verification flow. Never trust query parameters as proof of payment. |
| `POST /api/admin/refunds` | Optional first-release operation. Create a refund request record and call Paystack only after explicit owner confirmation. |

### Payment rules

The system must generate a unique order reference that is not guessable and must store the Paystack reference returned by initialization. The price used for payment must come from the server-side order snapshot, not from a client-submitted amount. Amounts must be sent in Paystack's required minor denomination.[1]

A payment may only move to `PAID` when the server confirms a successful transaction and the verified amount and currency equal the order snapshot. A transaction with a mismatched amount, currency, reference, product, or customer must be marked `SUSPICIOUS` and must not trigger fulfillment. The owner must be alerted.

The webhook handler must be idempotent. Store the provider event ID or a deterministic event hash, the raw payload, signature-validation result, receipt timestamp, processing status, and processing error. Return HTTP 200 promptly after the event is authenticated and persisted; long-running fulfillment should be handled asynchronously or by a retryable job. Paystack documents that failed webhook acknowledgements can be retried for an extended period, so the handler must not perform fragile long-running work before acknowledging.[2]

### Payment states

`CREATED`, `INITIALIZATION_FAILED`, `PENDING`, `ABANDONED`, `PAID`, `FAILED`, `CANCELLED`, `REFUND_PENDING`, `REFUNDED`, `PARTIALLY_REFUNDED`, and `SUSPICIOUS`.

### Payment admin requirements

The owner must be able to filter payments by date, status, product, customer, Paystack reference, order reference, and currency; view payment and webhook history; manually retry fulfillment; mark an operational issue as resolved; and export a CSV. Manual marking of a payment as paid must be disabled by default or require a prominent reason and audit-log entry. It must never silently bypass the payment-provider record.

---

## 10. Google Classroom Integration Requirements

Use the Google Classroom API to manage the configured courses and student roster. The official API exposes course resources and student enrollment methods, including `courses.students.create`, and is intended to manage classes, rosters, and invitations.[3]

### Integration model

The owner must connect the platform to a Google account or Google Workspace account that has permission to manage the target Classroom courses. Store encrypted OAuth refresh credentials or another approved server-side credential mechanism. Never ask customers for the owner's Google credentials. The owner must select or enter the Classroom course ID for each course product.

The customer must provide the Google account email they want enrolled. The UI must explain that the email should be the account used to access Google Classroom. The application must not assume that a customer's checkout email is their Google account unless the customer explicitly confirms it.

### Enrollment behavior

After a verified course payment, create an enrollment record with the local user ID, product ID, Google email, Classroom course ID, status, attempt count, provider student ID if returned, provider response metadata, and timestamps. Call the Classroom API to add the customer as a student. If the API reports that the student is already enrolled, treat the desired state as fulfilled rather than failing. If Google requires an invitation or the request is forbidden, store the exact provider error category and show a human-readable action to the customer.

The owner must be able to retry enrollment, update the student's Google email, revoke local access where appropriate, and view the Classroom course mapping. A course must not be published for sale without a valid Classroom course ID unless its fulfillment mode is explicitly set to `MANUAL`.

### Course access display

The customer dashboard must show course title, purchase date, access status, Classroom link, Google email used, and the next action. The confirmation email must include the same information. The system should not copy or mirror course videos, assignments, grades, or student submissions in the first release; Google Classroom remains the source of truth for learning delivery.

### Google Classroom failure states

Use at least `PENDING`, `FULFILLED`, `ACTION_REQUIRED`, `RETRY_PENDING`, `FAILED`, and `REVOKED`. A failed enrollment must not invalidate a successful payment. It creates an operational fulfillment issue that can be retried and audited.

---

## 11. Email: Google SMTP Requirements

Use a dedicated Google mailbox for transactional email. If the implementation uses SMTP credentials, Google documents that app passwords are 16-digit passcodes available only when 2-Step Verification is enabled.[4] The owner must configure the mailbox and credentials outside the application source code. Prefer a secure OAuth-capable SMTP approach where supported by the chosen mail library; if an app password is used, document the setup and store it only as a secret.

The email service must provide a single abstraction such as `sendTransactionalEmail(templateKey, recipient, variables)`. It must support HTML and plain-text alternatives, a consistent sender name, reply-to configuration, retry behavior, delivery logging without storing unnecessary message contents, and an admin test-email action.

Required templates:

| Template | Recipient | Trigger |
|---|---|---|
| Welcome or email verification | Customer | Account created or email verification requested |
| Payment initiated | Customer | Checkout initialized, optional |
| Payment successful | Customer | Verified successful payment |
| Payment failed or abandoned | Customer | Payment failure or configurable recovery event |
| Course access fulfilled | Customer | Google Classroom enrollment succeeded |
| Course access action required | Customer | Enrollment needs a different Google email or manual action |
| Booking request received | Customer | Consultation request submitted |
| Booking confirmed | Customer | Owner confirms appointment |
| Booking reminder | Customer | Configurable period before session |
| MVP inquiry received | Founder | MVP inquiry submitted |
| New lead notification | Owner | New MVP inquiry or important contact submission |
| Fulfillment failure alert | Owner | Payment succeeded but fulfillment failed |
| Refund processed | Customer | Refund status becomes processed |
| Support acknowledgement | Customer | Support/contact form submitted |

Every email must include the brand name, relevant reference number, support contact, and a safe link back to the platform. Do not place secrets or full payment credentials in email. The owner must be able to edit subject and body templates with variable validation, or at minimum edit the sender identity and key text from the back office.

---

## 12. Scheduling and Booking Requirements

Implement scheduling as an abstraction with two modes:

1. **External scheduler mode:** The owner configures a booking URL. The platform records a booking intent and opens the URL. The owner can later paste or enter the confirmed meeting link and time.
2. **Manual confirmation mode:** The customer submits preferred times and the owner confirms a slot from the back office.

The booking model must contain product ID, customer ID, timezone, requested date/time, confirmed date/time, meeting URL, preparation notes, owner notes, status, cancellation reason, reschedule history, and reminder timestamps.

Statuses must include `REQUESTED`, `PAYMENT_PENDING`, `PAID_PENDING_SCHEDULE`, `CONFIRMED`, `RESCHEDULE_REQUESTED`, `COMPLETED`, `CANCELLED`, and `NO_SHOW`. The system must display times in the customer's timezone while storing timestamps in UTC. Reminders must be sent only for confirmed bookings and must not be duplicated.

---

## 13. Customer Account and Dashboard

The customer dashboard is the customer's private source of truth. It must include:

| Section | Requirements |
|---|---|
| Overview | Recent order, fulfillment alerts, upcoming session, and recommended next action. |
| My courses | Purchased courses, Classroom enrollment state, access links, and Google account email. |
| My orders | Order reference, items, amount, payment state, date, and receipt/download link where available. |
| My bookings | Requested and confirmed sessions, meeting links, timezone, reschedule/cancellation actions, and preparation notes. |
| My profile | Name, email, phone optional, country, timezone, Google Classroom email, and communication preferences. |
| Support | Contact form that automatically includes the relevant order, booking, or enrollment reference. |

Customers must not see another customer's records. Account deletion or data-export requests should be supported operationally even if the first release processes them through the owner rather than fully automating them.

---

## 14. Back Office / Admin Console

The back office is a first-class part of the product, not an afterthought. It must be accessible only to authorized staff and should use a separate navigation shell from the public site.

### 14.1 Dashboard

Show gross sales, successful orders, pending payments, failed payments, course enrollments pending action, upcoming sessions, new MVP leads, top products, and sales by date range. Include a date-range selector and a clear statement of whether amounts are gross, net of refunds, or provider-reported.

### 14.2 Product management

The owner must be able to create and manage courses, books, consultations, and MVP service packages. The editor must support draft/published/archived state, pricing, images, copy, SEO metadata, fulfillment settings, Classroom mapping, external links, preview, and publish validation. Include a product activity history.

### 14.3 Course management

Manage course title, syllabus, learning outcomes, duration, price, Classroom course ID, enrollment instructions, featured status, and access email copy. Display enrollment counts, fulfilled enrollments, action-required enrollments, and failed enrollments. Provide retry enrollment and bulk export.

### 14.4 Book management

Manage book title, description, author, price, format, cover image, preview, delivery mode, file or external URL, inventory fields if physical, and fulfillment instructions. Digital files must not be exposed through an unguessable permanent public URL unless the owner explicitly chooses that mode.

### 14.5 Order and payment management

Provide searchable order and payment tables with detail pages. The detail page must show customer, line-item price snapshot, payment references, Paystack status, webhook events, fulfillment records, email events, refunds, and audit history. Provide retry actions with confirmation and reason capture.

### 14.6 Booking management

Provide calendar/list views, filters by status and product, customer details, internal notes, meeting link, confirmation/reschedule/cancellation actions, and reminder controls.

### 14.7 Lead and MVP pipeline

Provide a lightweight CRM pipeline with statuses `NEW`, `CONTACTED`, `DISCOVERY_BOOKED`, `PROPOSAL_SENT`, `WON`, `IN_PROGRESS`, `COMPLETED`, `LOST`, and `ON_HOLD`. Each lead must have activity notes, next follow-up date, source, budget range, requested scope, and linked customer/order if converted.

### 14.8 Customer management

Search by name, email, Google email, order reference, or phone. View profile, consent state, orders, courses, enrollments, bookings, leads, email history, and support requests. Allow non-destructive corrections such as updating a Classroom email with an audit entry.

### 14.9 Content and links

Manage homepage featured items, YouTube links, LinkedIn, Instagram, Shoe Shelf/external book link, FAQs, testimonials, and legal-page content. Use a simple editor and preview mode.

### 14.10 Settings and integrations

Manage business identity, currency, timezone, Paystack test/live mode, callback URL, webhook health, Google Classroom connection, SMTP connection, sender identity, scheduling URL, social links, refund policy, and notification recipients. Secrets must be masked and never returned to the browser after saving.

### 14.11 Audit log

Record sign-in events, role changes, product changes, price changes, publication changes, payment overrides, refund actions, enrollment retries, booking changes, integration changes, and customer-data exports. Each entry must include actor, action, entity, entity ID, timestamp, IP or request metadata where legally appropriate, and before/after summary.

---

## 15. Data Model

Use a relational database. Names may change to fit the chosen framework, but the following entities and relationships are required.

| Entity | Important fields |
|---|---|
| `users` | id, role, name, email, normalizedEmail, passwordHash or auth provider ID, emailVerifiedAt, status, createdAt, updatedAt |
| `customer_profiles` | userId, phone, country, timezone, googleClassroomEmail, communicationPreferences |
| `products` | id, type, slug, title, descriptions, status, priceMinor, currency, fulfillmentMode, metadata JSON, publishedAt |
| `course_details` | productId, instructor, durationMinutes, level, outcomes, syllabus JSON, classroomCourseId, classroomAccessInstructions |
| `book_details` | productId, author, format, deliveryMode, assetKey, externalUrl, inventoryMode, stockQuantity |
| `consultation_details` | productId, durationMinutes, bookingMode, schedulerUrl, preparationInstructions, cancellationPolicy |
| `mvp_service_details` | productId, scope, deliverables, quoteMode, startingPriceMinor, inquirySchema JSON |
| `orders` | id, orderReference, userId nullable, customerEmail, status, subtotalMinor, discountMinor, totalMinor, currency, metadata, paidAt |
| `order_items` | id, orderId, productId, titleSnapshot, typeSnapshot, unitPriceMinor, quantity, metadata |
| `payments` | id, orderId, provider, providerReference, initializationPayload JSON, verificationPayload JSON, status, amountMinor, currency, paidAt |
| `payment_events` | id, provider, eventKey, eventType, signatureValid, payload JSON, receivedAt, processedAt, processingStatus, errorMessage |
| `fulfillments` | id, orderId, orderItemId, type, status, attempts, lastError, fulfilledAt, metadata JSON |
| `classroom_enrollments` | id, fulfillmentId, productId, classroomCourseId, googleEmail, providerStudentId, status, attempts, lastError, enrolledAt |
| `bookings` | id, productId, orderId nullable, userId nullable, customerEmail, timezone, requestedAt, confirmedAt, meetingUrl, status, notes |
| `mvp_leads` | id, userId nullable, name, email, projectName, problem, targetCustomer, stage, timeline, budgetRange, scope, status, nextFollowUpAt |
| `email_events` | id, templateKey, recipient, relatedEntityType, relatedEntityId, status, providerMessageId nullable, sentAt, errorMessage |
| `content_links` | id, type, title, url, thumbnailUrl, description, displayOrder, published |
| `settings` | key, encryptedValue or value, type, updatedBy, updatedAt |
| `audit_logs` | id, actorUserId, action, entityType, entityId, summary, beforeJson, afterJson, createdAt |
| `support_requests` | id, userId nullable, email, subject, message, relatedEntityType, relatedEntityId, status, assignedTo |

Add indexes on normalized email, slug, order reference, provider reference, product status/type, payment status, booking status, lead status, and event idempotency keys. Use foreign keys and unique constraints for provider references and relevant one-to-one mappings.

---

## 16. API and Application Architecture

Use a modular application architecture with clear separation between presentation, domain services, persistence, and provider adapters. The payment, email, and Classroom integrations must be behind interfaces so test doubles can be used in automated tests without coupling business logic to SDK implementation details.

Recommended modules are `auth`, `catalog`, `checkout`, `payments`, `fulfillment`, `classroom`, `email`, `bookings`, `leads`, `customers`, `admin`, `content`, `settings`, and `audit`.

All server endpoints must validate input with a schema validator. Return consistent error objects containing a safe error code, user-facing message, and optional request ID. Do not expose stack traces, provider secrets, raw OAuth tokens, or sensitive provider payloads to ordinary customers.

Required API groups include:

| Group | Minimum operations |
|---|---|
| Auth | Register/login or passwordless sign-in, verify email, logout, current user, reset access. |
| Catalog | List/search products, get product by slug, related products, public content links. |
| Checkout | Create checkout session, initialize payment, retrieve order status. |
| Paystack | Verify transaction, receive webhook, payment history for admin. |
| Classroom | Admin connection test, course mapping test, enrollment attempt, enrollment retry, customer Google email update. |
| Bookings | Create request, list own bookings, admin confirm/reschedule/cancel. |
| Leads | Submit MVP inquiry, admin list/update/notes/convert. |
| Customer | Profile, order history, course access, support request. |
| Admin | Dashboard metrics, CRUD catalog, customers, orders, payments, bookings, leads, content, settings, audit log. |

Use background jobs or a durable retry mechanism for email delivery, Classroom enrollment retries, and post-payment fulfillment. A successful payment response must not be lost because an email or Classroom call temporarily failed.

---

## 17. Security, Privacy, and Reliability

The application must use HTTPS in all non-local environments, secure and HttpOnly cookies where cookie sessions are used, CSRF protection for cookie-authenticated mutations, rate limiting for login, checkout initialization, contact forms, and webhooks, and server-side authorization checks.

Secrets must be provided through environment variables or the hosting provider's secret manager. Required secret names should be documented in `.env.example` without real values, for example `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `GOOGLE_SMTP_HOST`, `GOOGLE_SMTP_PORT`, `GOOGLE_SMTP_USER`, `GOOGLE_SMTP_PASSWORD_OR_APP_PASSWORD`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, and `GOOGLE_OAUTH_REFRESH_TOKEN` where applicable.

The Paystack webhook must validate the provider signature before processing. The implementation may additionally use IP restrictions where supported, but signature validation is mandatory for the application logic.[2] Payment fulfillment must be idempotent. File downloads must be authorized. Admin actions must be audited. Personally identifiable information must be collected only when necessary, and the privacy policy must explain customer, payment, email, and Classroom data flows.

The system must degrade gracefully. If Paystack is unavailable, show a retryable checkout error and do not create duplicate orders. If SMTP is unavailable, persist an email event as failed and retry it. If Classroom is unavailable, preserve the paid order and place fulfillment in a retryable state. If the owner disconnects an integration, existing records must remain readable.

---

## 18. Observability and Operations

Provide structured application logs with request ID, route, user ID where available, provider, entity reference, duration, and outcome. Never log secrets, complete access tokens, payment card information, or full sensitive payloads.

Create an integration health page showing last successful Paystack verification, last webhook receipt, SMTP test status, Classroom token status, last enrollment attempt, and current queue/retry counts. Add an admin-visible operational issue list for failed payments, suspicious payments, failed emails, failed enrollments, and failed digital fulfillment.

Implement retry with exponential backoff and a maximum attempt count for transient provider errors. Permanent errors such as invalid Google email or missing course mapping must be marked as action-required rather than retried indefinitely. Provide a manual retry button and a reason in the audit log.

---

## 19. Acceptance Criteria

### 19.1 Public experience

A visitor can browse published products by type, open a detail page, see a correct price and fulfillment explanation, and initiate the relevant action. Draft and archived products are not publicly accessible. All public forms validate required fields and show actionable errors.

### 19.2 Payment acceptance

A customer can initiate checkout for a published paid product. The server creates the order and Paystack transaction using the server-side price. The frontend never receives or stores the Paystack secret key. A successful callback alone does not fulfill the order. A verified successful transaction with matching amount, currency, and reference changes the order to `PAID`; a mismatched transaction never fulfills it.

### 19.3 Idempotency

Delivering the same valid Paystack webhook more than once results in one paid order, one fulfillment record per line item, at most one successful Classroom enrollment outcome, and no duplicate success emails. Replaying the callback produces the current order state without creating a second payment or order.

### 19.4 Classroom enrollment

A paid course purchase creates an enrollment attempt against the configured Classroom course. A successful enrollment appears in the customer dashboard and is communicated by email. An invalid or missing Google email produces a visible action-required state and an admin issue, not a silent failure.

### 19.5 Email

The owner can send a test email from the back office. Payment, fulfillment, booking, and lead events create email events. A temporary SMTP failure is logged and retryable. Email content contains no secret credentials or full payment details.

### 19.6 Back office

An administrator can create a course with price and Classroom course ID, publish it, view a customer purchase, inspect the Paystack reference and webhook event, retry a failed enrollment, create or edit a book with a delivery mode, manage a consultation product, and move an MVP lead through its pipeline. Every destructive or exceptional admin action is confirmed and audited.

### 19.7 Security

A non-admin cannot access admin routes or APIs. A customer cannot access another customer's order, enrollment, booking, download, or personal data. Webhook requests without a valid signature are rejected or ignored without fulfillment. Secrets are absent from client bundles and repository files.

### 19.8 Responsive and accessibility behavior

The public site and customer dashboard work on mobile, tablet, and desktop widths. Forms have labels, keyboard navigation works, focus states are visible, color is not the only status indicator, errors are announced accessibly, and primary buttons have unambiguous labels.

---

## 20. Testing Requirements

The coding agent must implement automated tests before declaring the build complete.

| Test category | Required coverage |
|---|---|
| Unit tests | Price calculations, order state transitions, product validation, webhook signature verification, idempotency key generation, booking timezone conversion, email-template variable validation. |
| Integration tests | Paystack initialize/verify adapter with mocked provider, webhook persistence and replay, SMTP adapter, Classroom enrollment adapter, database constraints. |
| End-to-end tests | Browse course → checkout → simulated successful webhook → paid order → enrollment fulfillment; book purchase fulfillment; consultation request; MVP inquiry; admin product creation; customer isolation. |
| Failure tests | Amount mismatch, invalid signature, duplicate webhook, provider timeout, SMTP failure, Classroom forbidden response, missing course mapping, expired download, unauthorized admin request. |
| Security checks | Secret scanning, dependency audit, authorization tests, rate-limit tests, CSRF tests if applicable, safe error-response tests. |

The repository must include a seed script that creates an administrator, representative products in draft and published states, a test course mapping, sample customer, sample order, and sample lead without using real credentials.

---

## 21. Delivery Plan

### Phase 1: Foundation

Set up the application shell, database, authentication, role authorization, environment configuration, public navigation, legal pages, and initial admin access.

### Phase 2: Catalog and public conversion

Implement product schemas, catalog listing/detail pages, admin product CRUD, publishing validation, content links, homepage sections, and responsive forms.

### Phase 3: Payment and order system

Implement order creation, Paystack server adapter, callback page, signature-validated webhook, verification, idempotent state transitions, payment history, and admin payment views.

### Phase 4: Fulfillment and communication

Implement email service, templates, course fulfillment records, Google Classroom OAuth/configuration, enrollment attempts/retries, book fulfillment, customer dashboard, and operational issue handling.

### Phase 5: Bookings and MVP pipeline

Implement consultation booking modes, reminders, booking administration, MVP inquiry form, lead pipeline, notes, follow-ups, and optional deposit conversion.

### Phase 6: Hardening and launch

Complete automated tests, accessibility checks, security review, error states, backups, seed data, admin documentation, integration health checks, and production configuration. Run a full test-mode payment and Classroom enrollment before switching to live credentials.

---

## 22. Definition of Done

The build is complete only when the application can be deployed with documented environment variables, migrations run successfully on a clean database, an administrator can configure Paystack, Google SMTP, and Google Classroom, and the end-to-end test journey passes in sandbox/test mode.

The final implementation must include a README with local setup, database setup, seed instructions, test commands, deployment instructions, Paystack webhook configuration, Google Cloud OAuth setup for Classroom, Google SMTP setup, troubleshooting steps, and a production launch checklist. The README must explicitly state which features are fully automated and which require owner action, such as correcting a customer's Google Classroom email or confirming a consultation time.

The code must not contain hard-coded product prices, course IDs, secrets, administrator emails, or external URLs that the owner is expected to change. These values must be configurable through the database, admin settings, environment variables, or content management fields.

---

## 23. Suggested Opencode Build Prompt

Use the following prompt as the implementation instruction after selecting the preferred technology stack:

> Build the application described in `/product_requirements_document.md` as a production-quality, responsive web application. Treat the PRD as the source of truth. Implement the public marketing/catalog site, customer authentication and dashboard, administrator back office, relational data model, Paystack payment flow, Google SMTP transactional email, Google Classroom course enrollment, consultation booking workflow, book fulfillment, MVP lead pipeline, audit logs, integration health checks, and automated tests.
>
> Do not use mock payment success in production logic. Initialize Paystack transactions only on the server, verify status and amount server-side, validate Paystack webhook signatures, and make webhook and fulfillment processing idempotent. Never expose provider secret keys, OAuth refresh tokens, SMTP passwords, or private downloads to the browser. Use provider adapters and environment-based configuration.
>
> Create database migrations, seed data, schema validation, role-based authorization, error handling, retryable background jobs, structured logs, and a complete README. Before implementation, inspect the PRD, list any genuinely blocking assumptions, and otherwise proceed with the explicit defaults. Do not pause for cosmetic design decisions; use a clean professional design system with accessible responsive components, because the visual design system will be refined separately.
>
> Build in vertical slices and verify each slice: catalog, product administration, checkout, verified payment, fulfillment, email, Classroom enrollment, customer dashboard, bookings, MVP leads, and reporting. For every external integration, provide a configuration screen, connection test, clear failure state, and safe retry path. Finish by running migrations, tests, linting, type checking, and an end-to-end test using Paystack test mode and a controlled Classroom test course.

---

## References

[1]: https://paystack.com/docs/payments/accept-payments/ "Paystack: Accept Payments"

[2]: https://paystack.com/docs/payments/webhooks/ "Paystack: Webhooks"

[3]: https://developers.google.com/workspace/classroom/reference/rest "Google Classroom API: REST Reference"

[4]: https://support.google.com/mail/answer/185833?hl=en "Google Help: Sign in with app passwords"
