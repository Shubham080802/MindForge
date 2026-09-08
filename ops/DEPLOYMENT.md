# Production deployment and rollback

## Release prerequisites

1. Use Node.js 20, pnpm 10, PostgreSQL 14+, HTTPS, and a deployment platform that preserves server-only environment variables.
2. Set every required value in `.env.example`, including the Clerk production-instance keys. Production readiness intentionally returns HTTP 503 when database access or required configuration is missing.
3. Configure Upstash Redis for distributed rate limits. Set `TRUSTED_PROXY_HEADER` to a client-IP header that your edge overwrites rather than passes through, and monitor the support mailbox.
4. Use a non-Prisma managed PostgreSQL plan with encrypted storage, point-in-time recovery, automated backups, and tested restore access.
5. In Clerk, require verified primary email addresses, restrict authorized parties to the production origin, configure the intended sign-in methods, and verify the production domain/DNS records.

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

Deploy the immutable build, then require `/api/health` to return HTTP 200 before shifting traffic. Run `PLAYWRIGHT_BASE_URL=https://staging.example.com E2E_EMAIL=learner+clerk_test@example.com NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... CLERK_SECRET_KEY=sk_test_... corepack pnpm test:e2e:staging` with a disposable verified Clerk learner.

## Scheduled retention

The production Vercel deployment registers the daily `GET /api/internal/retention` schedule from `vercel.json`; Vercel supplies `Authorization: Bearer $CRON_SECRET`. Alert on any non-200 response. Other schedulers may call `POST` with the same authorization header.

## Authentication rollback

The `clerkId` migration is additive. A release can be rolled back without
dropping the column or legacy authentication tables, but users created only in
Clerk will not be able to use a legacy credential flow. Treat identity-provider
rollback as an incident migration, not a routine application rollback.

## Rollback

Roll application traffic back to the previous immutable image. Prisma migrations in this repository are additive; do not automatically roll the database backward. If a data migration causes impact, stop writes, restore into a new database, validate record counts, then switch `DATABASE_URL` during an incident-controlled cutover.

## Backup drill

Quarterly, restore the latest managed backup into an isolated database. Run `prisma migrate status`, compare user/session/material counts, verify one owned material download, and record recovery-point and recovery-time results. Never test restores against production.
