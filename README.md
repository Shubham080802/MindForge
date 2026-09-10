# MindForge

MindForge is a private, source-grounded AI study workspace built with Next.js,
Clerk, Prisma, PostgreSQL, Google Gemini, and Upstash Redis.

## Product capabilities

- Clerk-managed verified accounts and configurable social sign-in
- Private PDF, DOCX, text, Markdown, and image/OCR material ingestion
- Account-scoped sessions, professor–student tutoring, search, source downloads, and deletion
- Student-controlled multilingual explanations and matching browser speech voices
- Summaries, concepts, flashcards, quizzes, study plans, and translation
- JSON, Markdown, and PDF exports. PDF uses a Latin font: scientific symbols
  are transliterated, and a session written in a non-Latin script is refused
  with a pointer to Markdown or JSON, which preserve every character.
- Profile preferences, theme control, account deletion, legal and support pages
- Distributed production rate limits, audit events, structured error delivery,
  readiness checks, and scheduled retention cleanup

## Requirements

- Node.js 20+
- Corepack and pnpm 10
- PostgreSQL 14+
- Clerk application credentials
- Google AI Studio API credentials
- Upstash Redis credentials for production abuse protection

## Local development

```bash
corepack pnpm install --frozen-lockfile
cp .env.example .env.local
corepack pnpm db:generate
corepack pnpm prisma migrate dev
corepack pnpm dev
```

Open `http://localhost:3000`. In development, rate limiting uses an in-process
adapter when Upstash is not configured. Production fails closed when distributed
abuse protection is missing.
In production, `TRUSTED_PROXY_HEADER` must name a client-IP header that your
edge overwrites so callers cannot choose their own rate-limit identity.

For Supabase on Vercel, set `DATABASE_URL` to the transaction-pooler URL on
port 6543 with `pgbouncer=true&connection_limit=1`, and set `DIRECT_URL` to the
session-pooler URL on port 5432. Prisma uses `DIRECT_URL` for migrations while
serverless requests use the bounded transaction pool.

## Release gate

For a guided, resumable Vercel production setup, run:

```bash
./scripts/launch-wizard.sh
```

The wizard links the existing project, captures secrets in the ignored `.env`,
guides a non-Prisma managed Postgres connection, Clerk and Redis setup, applies
migrations, deploys, runs staging E2E, and records local operational owners.
Read the deployment runbook before launching.

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm audit:prod
corepack pnpm db:generate
corepack pnpm prisma migrate deploy
corepack pnpm test
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
corepack pnpm test:e2e:public
```

For the authenticated staging flow, provide an existing disposable Clerk test
learner and the Clerk development-instance keys:

```bash
PLAYWRIGHT_BASE_URL=https://staging.example.com \
E2E_EMAIL=learner+clerk_test@example.com \
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... \
CLERK_SECRET_KEY=sk_test_... \
corepack pnpm test:e2e:staging
```

`GET /api/health` is public and returns HTTP 200 only when PostgreSQL and the
production runtime configuration are ready. Vercel schedules the daily
retention request from `vercel.json`; other schedulers may call
`POST /api/internal/retention` with `Authorization: Bearer $CRON_SECRET`.

## Operations

- [Product and launch audit](STARTUP_AUDIT.md)
- [Deployment and rollback](ops/DEPLOYMENT.md)
- [Incident response](ops/INCIDENT_RESPONSE.md)
- [Data retention](ops/DATA_RETENTION.md)
- [Backup and recovery](ops/BACKUP_RECOVERY.md)
- [Operational readiness evidence](ops/OPERATIONAL_EVIDENCE_2026-09-09.md)

Uploaded source bytes are stored in PostgreSQL for the initial bounded-volume
release, with a 10 MB per-file and five-file per-batch limit. Use a managed,
encrypted database with point-in-time recovery and complete the documented
restore drill before handling real learner data.
