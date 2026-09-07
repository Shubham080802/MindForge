# MindForge

MindForge is a private, source-grounded AI study workspace built with Next.js,
NextAuth, Prisma, PostgreSQL, OpenAI, and Upstash Redis.

## Product capabilities

- Verified email/password accounts with optional Google and GitHub sign-in
- Private PDF, DOCX, text, Markdown, and image/OCR material ingestion
- Account-scoped sessions, contextual chat, search, source downloads, and deletion
- Summaries, concepts, flashcards, quizzes, study plans, translation, and speech
- JSON, Markdown, and PDF exports
- Profile preferences, theme control, account deletion, legal and support pages
- Distributed production rate limits, audit events, structured error delivery,
  readiness checks, and scheduled retention cleanup

## Requirements

- Node.js 20+
- Corepack and pnpm 10
- PostgreSQL 14+
- OpenAI API credentials
- SMTP credentials
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

## Release gate

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

For the authenticated staging flow, provide a disposable verified learner:

```bash
PLAYWRIGHT_BASE_URL=https://staging.example.com \
E2E_EMAIL=learner@example.com \
E2E_PASSWORD='staging-password' \
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

Uploaded source bytes are stored in PostgreSQL for the initial bounded-volume
release, with a 10 MB per-file and five-file per-batch limit. Use a managed,
encrypted database with point-in-time recovery and complete the documented
restore drill before handling real learner data.
