# Production deployment and rollback

## Release prerequisites

1. Use Node.js 20, pnpm 10, PostgreSQL 14+, HTTPS, and a deployment platform that preserves server-only environment variables.
2. Set every required value in `.env.example`. Production readiness intentionally returns HTTP 503 when database access or required configuration is missing.
3. Configure Upstash Redis for distributed rate limits and a support mailbox monitored by a human.
4. Use a managed PostgreSQL plan with encrypted storage, point-in-time recovery, automated backups, and tested restore access.

## Release

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm db:generate
corepack pnpm prisma migrate deploy
corepack pnpm test
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
```

Deploy the immutable build, then require `/api/health` to return HTTP 200 before shifting traffic. Run `PLAYWRIGHT_BASE_URL=https://staging.example.com E2E_EMAIL=... E2E_PASSWORD=... corepack pnpm test:e2e` with a disposable verified learner.

## Scheduled retention

Call `POST /api/internal/retention` daily with `Authorization: Bearer $CRON_SECRET`. Alert on any non-200 response.

## Rollback

Roll application traffic back to the previous immutable image. Prisma migrations in this repository are additive; do not automatically roll the database backward. If a data migration causes impact, stop writes, restore into a new database, validate record counts, then switch `DATABASE_URL` during an incident-controlled cutover.

## Backup drill

Quarterly, restore the latest managed backup into an isolated database. Run `prisma migrate status`, compare user/session/material counts, verify one owned material download, and record recovery-point and recovery-time results. Never test restores against production.
