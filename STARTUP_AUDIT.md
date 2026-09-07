# MindForge launch audit

Audited: 2026-09-06. The product had two incompatible implementations: a
NextAuth + Prisma workspace and a Supabase + demo dashboard. The active launch
path is now the NextAuth + Prisma workspace (`/` → sign-in → `/workspace`).

The implementation followed Matt Pocock's implementation, TDD, and parallel
code-review workflows. Kun Chen's no-mistakes discipline supplied the public-
seam testing, full validation gate, and push-safety checks; its pull-request
step was intentionally omitted because this delivery was explicitly requested
on `main` without a PR.

## Fixed in this hardening pass

- Removed dangerous OAuth account linking and hide OAuth providers until their
  credentials are configured.
- Made registration verified: OTPs and password-reset tokens are hashed at rest;
  reset links are emailed rather than written to application logs.
- Enforced stronger, shared password and request validation.
- Added same-origin checks to core browser mutations.
- Added direct material ownership, stored source bytes, authorized downloads,
  stable original filenames, and ownership checks when attaching uploads to a
  session. This closes the previous cross-account material-attachment flaw.
- Removed duplicate user prompts from the chat history sent to the model.
- Disabled plaintext BYOK storage until a KMS/envelope-encryption design exists.
- Added a database-backed readiness endpoint at `/api/health` and baseline
  browser security headers.
- Updated the theme package to a React 19-compatible release and supplied a
  complete environment template.

## Launch blockers to resolve before taking payment or handling real learner data

1. **One back end only.** Retire the remaining Supabase/demo routes and the
   `/dashboard` prototype after any demo users are migrated. Do not set
   `NEXT_PUBLIC_DEMO_MODE=false` as a substitute for this cleanup: those legacy
   routes use a separate identity system.
2. **Apply schema safely.** The included Prisma migration is a baseline for a
   new database. For an existing database, first migrate each material's owner
   from its session or quarantine unattached rows; never invent ownership.
3. **Durable object storage.** Database BLOB storage is a coherent MVP with the
   current 10 MB limit, but move source files to private object storage before
   high-volume usage. Keep the `userId` authorization seam at download time.
4. **Abuse controls.** Configure a distributed rate limiter and an edge WAF for
   sign-up, reset, upload, AI, and text-to-speech endpoints. In-memory limits
   are not adequate in serverless production.
5. **Operational controls.** Add error monitoring, structured audit logs,
   database backups/restore drills, uptime checks against `/api/health`, and
   a data-retention/deletion policy. Verify SMTP, OAuth redirect URLs, and all
   production environment variables in a staging deploy.
6. **Product truth.** Replace landing-page claims (voice languages, pricing,
   user counts, sharing) with only capabilities that are metered, supported,
   and documented. Add a real privacy policy, terms, support contact, and
   incident-response process before public launch.

## Verification gate

Run `pnpm install --frozen-lockfile`, `pnpm db:generate`, `pnpm typecheck`,
`pnpm lint`, `pnpm build`, and an authenticated Playwright flow against a
staging database. Test the unhappy paths: rejected uploads, cross-account
material URLs, expired/used OTPs, expired reset links, deleted accounts, and a
database outage returning HTTP 503 from `/api/health`.
