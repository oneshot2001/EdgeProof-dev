# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EdgeProof is a cloud-based SaaS platform that verifies the cryptographic authenticity of Axis Communications' signed video files. Users upload signed video and receive court-ready Certificates of Authenticity. The canonical build plan is in `EDGEPROOF_BUILD_PLAN.md`.

## Architecture

Three-tier split-hosting architecture:

- **Frontend + API (Vercel):** Next.js 14+ App Router with TypeScript, Tailwind CSS, shadcn/ui
- **Verification Worker (Railway/Fly.io):** Python FastAPI Docker container wrapping Axis's `libsigned-video-framework` (C library + GStreamer)
- **Database + Auth + Storage (Supabase):** PostgreSQL 15+ with RLS, Supabase Auth, S3-compatible storage

Video processing is CPU-intensive (10-60 seconds per file), which is why it runs on a dedicated Docker worker rather than Vercel serverless. The frontend polls `/api/verify/{id}` every 2 seconds for status updates (MVP; Supabase Realtime planned for later).

### Key Data Flow

1. User uploads video → presigned URL → Supabase Storage
2. Frontend calls `POST /api/verify` → Next.js API route dispatches to worker
3. Worker runs libsigned-video-framework, returns JSON result via callback webhook
4. Frontend polls until status resolves → displays verdict + offers Certificate PDF download

### Project Structure

- `src/app/` — Next.js App Router (pages, API routes, layouts)
- `src/components/` — React components (shadcn/ui primitives in `ui/`, feature components in `upload/`, `verification/`, `certificate/`, etc.)
- `src/lib/` — Shared libraries (Supabase clients, Stripe integration, worker HTTP client, PDF generation)
- `src/hooks/` — React hooks (`useVerification`, `useSubscription`, `useUsage`)
- `src/types/` — TypeScript type definitions
- `worker/` — Python FastAPI verification worker (Docker-containerized)
- `worker/certs/` — Axis PKI certificates (embedded in Docker image)
- `supabase/migrations/` — Database migrations (6 files: users, teams, verifications, audit_log, api_keys, RLS policies)

## Development Commands

```bash
# Frontend
npm install
npm run dev              # Next.js dev server on localhost:3000
npm run build            # Production build
npm run lint             # ESLint
npm run type-check       # TypeScript strict mode check

# Worker
docker-compose up        # Worker on localhost:8000

# Database
supabase start           # Local Supabase stack
supabase db push         # Apply migrations
supabase gen types typescript --local > src/types/database.ts  # Regenerate DB types

# Testing
npm test                 # Unit tests (Jest/Vitest)
npm run e2e              # Playwright E2E tests
cd worker && pytest      # Worker tests
```

## Environment Variables

See `.env.example` for the full list. Key groups:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` — Stripe
- `VERIFICATION_WORKER_URL`, `VERIFICATION_WORKER_API_KEY` — Worker connection
- `NEXT_PUBLIC_APP_URL` — App base URL

## Coding Conventions

- TypeScript strict mode everywhere
- Prefer Next.js server components; use client components only when needed
- Validate all API inputs with Zod
- Use Supabase generated types (`supabase gen types`) — don't manually define DB types
- Never store raw API keys — SHA-256 hash them, store the hash, display only the `ep_live_` prefix

## Verification Worker Contract

The worker exposes `POST /verify` (multipart/form-data with `file` and optional `callback_url`, auth via `Bearer` token). It returns a JSON object with: `status` (authentic/tampered/unsigned/inconclusive/error), `device`, `certificate_chain`, `attestation`, `integrity` (GOP/frame counts), `temporal` (timestamps, gaps), and `video_metadata`. See the full contract in `EDGEPROOF_BUILD_PLAN.md` § Step 2.2.

## Signed Video Technical Details

- **Signing UUID:** `5369676e-6564-2056-6964-656f2e2e2e30`
- **Embedding:** SEI NALU "user data unregistered" (H.264/H.265) or OBU Metadata "user private" (AV1)
- **Signing chain:** Frame hashes → GOP hash → signed with device's TPM-bound video signing key → attestation key proves hardware origin
- **GOP linking:** First I-frame hash of next GOP is included in current signature (prevents undetectable cuts)
- **PKI:** IEEE 802.1AR (IDevID), Axis Root CAs (RSA + ECC, valid until 2060), 6 intermediate CAs
- **Source repos:** `github.com/AxisCommunications/signed-video-framework` and `signed-video-framework-examples`

## Pricing Tiers

- **Free:** 3 verifications/month, 2GB max file
- **Pro ($99/mo):** 100 verifications/month, 10GB max file, branded certificate
- **Enterprise ($499/mo):** Unlimited, 50GB max file, white-label certificate, API access, team management, audit trails
- **Pay-per-use ($5-10):** Metered billing via Stripe

These tiers affect file size limits, verification quotas, certificate branding, and feature gating throughout the app.

## Certificate PDF

The Certificate of Authenticity is the core deliverable. It must look authoritative enough for court use. Generated server-side with `@react-pdf/renderer`. Sections: header with QR code, verdict badge, device origin, integrity report, temporal data, chain of custody (Enterprise), methodology & legal footer. The PDF includes its own SHA-256 hash; the QR code links to a public verification page at `/verify/{public_token}` for anti-tampering.
