# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EdgeProof is a SaaS platform that verifies the cryptographic authenticity of Axis Communications' signed video files and produces court-ready Certificates of Authenticity. The canonical build plan is in `EDGEPROOF_BUILD_PLAN.md`. The Next.js application lives in the `edgeproof/` subdirectory. The V3 Edge Agent architecture and updated roadmap are in `EdgeProof Nexus Update/EdgeProof_Technical_Specification_v2_NexusUpdate.docx`.

## Architecture

Three-tier split-hosting:

- **Frontend + API (Vercel):** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- **Verification Worker (Railway/Fly.io):** Python FastAPI Docker container wrapping Axis's `libsigned-video-framework` (C library + GStreamer)
- **Database + Auth + Storage (Supabase):** PostgreSQL 15+ with RLS, Supabase Auth, S3-compatible storage

Video processing is CPU-intensive (10-60s per file), so it runs on a dedicated Docker worker. The frontend polls `GET /api/verify/{id}` every 2 seconds until a terminal status is reached (MVP; Supabase Realtime planned later).

### Verification Data Flow

1. `useVerification` hook calls `POST /api/upload` to get presigned URL + create `verifications` row
2. File uploaded directly to Supabase Storage via presigned URL
3. Client-side SHA-256 hash computed, then `POST /api/verify` dispatches to worker
4. Worker processes video, POSTs result to `POST /api/webhooks/worker` callback
5. Webhook handler writes all results to the `verifications` row and generates a `public_token`
6. Frontend polls `GET /api/verify/{id}` until status is terminal (`authentic`/`tampered`/`unsigned`/`inconclusive`/`error`)

### Dev Mock System

When `VERIFICATION_WORKER_URL` is not set, the verify route automatically uses `edgeproof/src/lib/verification/dev-mock.ts` which simulates worker callbacks with mock data. The mock scenario is filename-based:
- Files containing "tamper" → tampered result
- Files containing "unsigned" → unsigned result
- Everything else → authentic result

The mock POSTs to the webhook endpoint after a 2-second delay, simulating async worker behavior.

### Supabase Client Pattern

Two server-side Supabase clients in `edgeproof/src/lib/supabase/server.ts`:
- `createClient()` — uses anon key with cookie-based auth, respects RLS. Use for user-scoped operations.
- `createServiceClient()` — uses service role key, bypasses RLS. Use for system operations (webhook handlers, admin writes, cross-user queries).

Browser client in `edgeproof/src/lib/supabase/client.ts` uses anon key with cookie auth.

### Auth & Route Protection

Middleware (`src/middleware.ts` → `src/lib/supabase/middleware.ts`) handles:
- Session refresh on every request (required for server components)
- Redirects unauthenticated users from dashboard routes (`/dashboard`, `/verify`, `/verifications`, `/certificates`, `/settings`, `/billing`, `/team`, `/api-keys`) to `/login`
- Redirects authenticated users away from `/login` and `/signup` to `/dashboard`
- Exception: `/verify/{id}` public verification pages are accessible without auth

Auth actions (sign in/up/out) are server actions in `src/lib/auth/actions.ts`.

Route groups: `(auth)` for login/signup, `(dashboard)` for authenticated pages with sidebar layout.

## V3 Roadmap (Nexus Update)

V3 introduces an on-camera ACAP Edge Agent (ARTPEC-8/9, written in C) that performs real-time signed video verification and publishes heartbeat events via the Axis Nexus API. **V3 does not affect V1/V2 cloud architecture** — the existing build plan and all CLAUDE.md instructions remain unchanged.

### V3 Components

- **Edge Agent (ACAP, C):** Runs on-camera, verifies signed video GOPs in real-time, publishes status to Nexus
- **Nexus-to-MQTT Bridge:** Translates Nexus topic events into the EdgeProof cloud pipeline
- **Live Verification Dashboard:** Real-time monitoring UI for continuous camera integrity

### Nexus Topic Schema

Topic: `edgeproof.signed_video_status.v1`

Key fields: `camera_serial`, `gop_hash`, `signing_status`, `timestamp`, `firmware_version`, `attestation_status`, `error_code`

The cloud worker's event JSON is being pre-aligned to match this schema (Q2 2026) so V3 migration requires zero refactoring of the verification data model.

### Timeline & Dependencies

- **Phase 3:** Q4 2026 – Q1 2027, gated on AXIS OS 13 GA (Sept 2026)
- **Key dependency:** ACAP signing becomes mandatory in OS 13; IP ownership via Alpha Vision TIP membership status must be resolved before Phase 3 engineering begins

## Development Commands

All commands run from the `edgeproof/` subdirectory:

```bash
npm run dev          # Next.js dev server on localhost:3000
npm run build        # Production build
npm run lint         # ESLint (flat config, eslint.config.mjs)

docker-compose up    # Worker on localhost:8000 (optional — mock system works without it)

supabase start       # Local Supabase stack
supabase db push     # Apply migrations from supabase/migrations/
supabase gen types typescript --local > src/types/database.ts  # Regenerate DB types after schema changes

npm test             # Vitest unit tests (172 tests across 9 files)
npm run test:watch   # Vitest in watch mode
npm run test:coverage # Vitest with V8 coverage
npm run e2e          # Playwright E2E tests (requires dev server)
npm run e2e:ui       # Playwright with interactive UI
```

### Test Structure

- **Unit tests (Vitest):** `src/**/__tests__/*.test.ts` — constants, dev-mock, mock-data, worker-client, PDF certificate builder, Stripe client/products/webhooks, API validation schemas
- **E2E tests (Playwright):** `e2e/*.spec.ts` — auth flows, verification flows, certificate flows. Config in `playwright.config.ts`.
- **Worker tests (Python):** `worker/tests/` — callback handling, response structure, format validation

## Environment Variables

See `edgeproof/.env.example` for the full list. Key groups:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` — Stripe
- `VERIFICATION_WORKER_URL`, `VERIFICATION_WORKER_API_KEY` — Worker connection (omit both for dev mock mode)
- `NEXT_PUBLIC_APP_URL` — App base URL

## Coding Conventions

- TypeScript strict mode
- Prefer server components; use `"use client"` only when needed (hooks, event handlers, browser APIs)
- Validate all API inputs with Zod schemas at the top of route handlers
- Use Supabase generated types from `src/types/database.ts` — don't manually define DB types
- API keys: SHA-256 hash stored in DB, only `ep_live_` prefix displayed to users
- Path alias: `@/` maps to `src/`
- Tailwind v4 with `@theme inline` in `globals.css` (no tailwind.config.ts) and OKLCh color system
- shadcn/ui components in `src/components/ui/`, added via `npx shadcn@latest add <component>`
- Toast notifications via `sonner` (not shadcn toast)

## Database Schema

Seven migrations in `edgeproof/supabase/migrations/`:
1. `users` — extends `auth.users` with profile, subscription tier, monthly verification counter (auto-resets via trigger)
2. `teams` — Enterprise team management with white-label config (JSONB)
3. `verifications` — core business object: file metadata, device info, cert chain, integrity counts, temporal data, worker response (JSONB), public token
4. `audit_log` — chain of custody tracking (uploaded/verified/viewed/downloaded actions)
5. `api_keys` — Enterprise API keys (hashed, prefixed, with permissions JSONB)
6. `rls_policies` — RLS on all tables: users see own data + team members, verifications scoped to user/team
7. `add_stripe_subscription_id` — adds `stripe_subscription_id` column + index to `users` table

Key enums: `user_role`, `subscription_tier`, `verification_status`, `audit_action`.

Auto-creates user profile on Supabase Auth signup via `handle_new_user()` trigger.

**V3 note:** The `verifications` table will gain a `source` column to distinguish cloud-uploaded vs. edge-agent-originated verifications.

## Verification Worker Contract

`POST /verify` — multipart/form-data with `file`, optional `callback_url` and `verification_id`, auth via `Bearer` token.

Returns JSON with: `status` (authentic/tampered/unsigned/inconclusive/error), `device`, `certificate_chain`, `attestation`, `integrity` (GOP/frame counts, chain intact boolean), `temporal` (timestamps, gaps), `video_metadata`, `errors[]`.

Full contract with example response in `EDGEPROOF_BUILD_PLAN.md` § Step 2.2.

## Signed Video Technical Context

- **Signing UUID:** `5369676e-6564-2056-6964-656f2e2e2e30` (identifies signed video SEI NALUs)
- **Embedding:** SEI NALU "user data unregistered" (H.264/H.265) or OBU Metadata (AV1)
- **Chain:** Frame hashes → GOP hash → signed with TPM-bound video signing key → attestation key proves hardware origin
- **GOP linking:** First I-frame hash of next GOP included in current signature (prevents undetectable cuts)
- **PKI:** IEEE 802.1AR (IDevID), Axis Root CAs (RSA + ECC, valid until 2060), 6 intermediate CAs
- **Source:** `github.com/AxisCommunications/signed-video-framework` and `signed-video-framework-examples`

## Pricing Tiers

Tiers affect file size limits, verification quotas, certificate branding, and feature gating. Defined in `edgeproof/src/lib/constants.ts` as `TIER_LIMITS`:

- **Free:** 3/month, 2GB max, basic certificate
- **Pro ($99/mo):** 100/month, 10GB max, branded certificate, batch upload (10)
- **Enterprise ($499/mo):** Unlimited, 50GB max, white-label certificate, API access, team management, chain of custody, SSO

## Certificate PDF

Core deliverable — must look authoritative for court use. Generated server-side with `@react-pdf/renderer` in `src/components/certificate/CertificatePDF.tsx`. Generation logic in `src/lib/pdf/certificate.ts` (`generateCertificatePdf()`, `computePdfHash()`, `buildCertificateData()`).

PDF sections: Header with QR code, Verdict badge, Device Origin, Integrity Analysis (with progress bar), Temporal Analysis, Chain of Custody (Enterprise), Methodology & Legal Footer with self-hash.

API: `GET /api/certificates/[id]/pdf` generates and returns the PDF. Stores certificate hash in DB and logs `downloaded_pdf` audit event.

In-browser preview: `src/components/certificate/CertificatePreview.tsx` mirrors the PDF layout.

Note: `@react-pdf/renderer` `Image` component does not support `alt` prop — file-level eslint-disable for `jsx-a11y/alt-text` is set in `CertificatePDF.tsx`.

## Stripe Billing Integration

Fully wired Stripe integration with checkout, portal, and webhook handling.

### Billing API Routes
- `POST /api/billing/checkout` — creates Stripe Checkout session (Zod-validated)
- `GET /api/billing/subscription` — returns full billing state (tier, limits, usage, reset date, subscription details)
- `POST /api/billing/portal` — creates Stripe Customer Portal session for self-service management

### Webhook Handlers (`src/lib/stripe/webhooks.ts`)
- `checkout.session.completed` — stores subscription ID, resets monthly counter
- `customer.subscription.updated` — detects cancel-at-period-end (no premature downgrade), resets counter on tier change
- `customer.subscription.deleted` — downgrades to free + resets counter
- `invoice.payment_succeeded` — resets monthly verification counter on billing cycle renewal
- `invoice.payment_failed` — auto-downgrades to free after 3 failed payment attempts

### Quota Enforcement (`src/lib/stripe/quota.ts`)
- `checkVerificationQuota(userId)` — server-side quota check (respects monthly reset)
- `checkFileSizeLimit(userId, bytes)` — tier-aware file size validation

### Billing UI
- `src/app/(dashboard)/billing/page.tsx` — current plan display, usage meter, upgrade/downgrade flows, cancellation warning banner
- `src/components/billing/PricingCards.tsx` — "Your Plan" badge on current tier, upgrade via Checkout, plan changes via Portal
- `src/components/billing/UsageMeter.tsx` — "Resets in N days" countdown, color-coded progress bar (amber at 80%, red at limit)
- Hooks: `useSubscription` and `useUsage` both have `refresh()` methods

### Billing Types
- `src/types/billing.ts` — `BillingSubscriptionResponse`, `SubscriptionDetails`, `BillingLimits`, `BillingUsage`

## Landing Page

Marketing/conversion page at `src/app/page.tsx`. Server component (no client JS). Dark mode forced for legal tech aesthetic. Emerald brand color.

Sections: Sticky nav, Hero ("Is Your Video Evidence Defensible?"), Problem/Solution contrast, How It Works (3-step), Four Attorney Questions, Features Grid (6 cards), Social Proof (placeholder testimonials), Pricing (constants-driven from `TIER_LIMITS`), Final CTA.

Custom CSS utilities in `globals.css`: `landing-grid-bg`, `hero-glow`, `step-connector`, `pricing-highlight`.

## Public Verification Page

Server component at `src/app/verify/[id]/page.tsx` — QR code destination from Certificate PDFs. No auth required.

Looks up verification by `public_token` (falls back to `id`) using `createServiceClient()` to bypass RLS. Dynamic OpenGraph metadata, `robots: noindex` for privacy.

Three states: not found (error card), in progress (spinner), completed (full report). Reuses `VerdictBadge`, `DeviceInfo`, `IntegrityReport`, `TemporalReport` components. Includes file summary, verification metadata, "About This Verification" explainer, CTA to signup, and legal disclaimer.


<claude-mem-context>

</claude-mem-context>