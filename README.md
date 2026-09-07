# MindForge

MindForge is a private AI study workspace. Learners create a session, upload
source material, chat with a tutor, generate study aids, listen to responses,
and export their work.

The supported launch path is **Next.js + NextAuth + Prisma + PostgreSQL**.
Each source file has a direct owner, is stored privately, and is downloadable
only by that owner. See [STARTUP_AUDIT.md](STARTUP_AUDIT.md) for the product and
operations audit.

## Requirements

- Node.js 20 or newer
- Corepack (for pnpm 10)
- PostgreSQL 14 or newer
- An OpenAI API key for AI, voice, and study-tool routes
- SMTP credentials for verified registration and password reset

## Local setup

```bash
corepack pnpm install --frozen-lockfile
cp .env.example .env.local
corepack pnpm db:generate
corepack pnpm prisma migrate dev
corepack pnpm dev
```

Open `http://localhost:3000`. Verify readiness with
`http://localhost:3000/api/health`; it returns `200` only when PostgreSQL is
available.

OAuth is optional. Google and GitHub sign-in are displayed only after both
credentials for the provider are configured.

## Deployment

1. Provision a managed PostgreSQL database with backups and point
   `DATABASE_URL` at it.
2. Set every core, OpenAI, and SMTP value in `.env.example` in your deployment
   environment. Generate a unique `NEXTAUTH_SECRET` and set `NEXTAUTH_URL` to
   the public HTTPS origin.
3. From the release artifact, run `corepack pnpm prisma migrate deploy`.
4. Build and start the app with `corepack pnpm build` and `corepack pnpm start`.
5. Monitor `/api/health`, configure an edge WAF/rate limiter, and complete the
   release gate below before inviting users.

Source files are stored as PostgreSQL BLOBs in the MVP so they remain private
and downloadable without a separate storage dependency. Keep the 10 MB upload
limit; move files to private object storage before high-volume usage.

## Quality gate

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
```

Run authenticated end-to-end tests against a staging database with disposable
SMTP credentials. Cover sign-up/OTP, reset links, uploads, cross-account
material access, AI failures, account deletion, and health-check failure.

## Current product boundary

`/dashboard`, `/api/subjects`, `/api/conversations`, and the Supabase code are
a legacy demo prototype. They use a separate identity/data model and are not
part of the supported launch path. Do not enable the legacy demo mode in a
production deployment; retire it after any demo migration is complete.
