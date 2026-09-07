# MindForge product and launch audit

Audited: 2026-09-07. Scope: product truth, user journeys, security, data,
reliability, operations, testability, and deployment readiness.

## Executive assessment

MindForge now has one supported application and identity model: Next.js +
NextAuth + Prisma + PostgreSQL. The conflicting Supabase demo, routes, hooks,
storage model, migration, dashboard, and dependencies were removed. The main
learner journey—account, upload, session, contextual chat, study tools, speech,
search, export, and deletion—is represented in the production stack.

| Area | Status | Evidence |
| --- | --- | --- |
| Product truth | Ready | Public copy now describes only implemented capabilities; fake pricing, usage, collaboration, research, and local-processing claims were removed. |
| Authentication | Ready | Verified registration, expiring single-use token digests, optional OAuth, same-origin mutations, and account-scoped queries. |
| Data ownership | Ready for bounded-volume launch | Direct material ownership, private downloads, transactional attachment, cascading deletion, 10 MB file limit. |
| Abuse protection | Ready when configured | Upstash distributed limits cover auth requests/attempts, uploads, AI, speech, and exports; production fails closed without Redis. |
| Reliability | Ready when configured | Public database/config readiness, structured request-error events, optional monitoring webhook, audit-event persistence. |
| Operations | Ready for operator sign-off | CI, additive migration, deployment/rollback, backup drill, incident response, and scheduled retention procedures are included. |
| Legal/support | Ready for owner review | Privacy, Terms, Security, and Support surfaces are live; the operator must replace the example support address and approve the text. |
| Automated checks | Ready for public gate | Behavioral unit tests, required public browser smoke tests, production dependency audit, typecheck, lint, and production build. The authenticated staging gate is deliberately separate and fails when credentials are absent. |

## Findings resolved

1. Removed the second Supabase identity/data application and all demo-only routes.
2. Protected `/library` and `/settings`; made `/api/health` genuinely public and machine-readable.
3. Added distributed abuse limits behind one deep rate-limit module with production and development adapters.
4. Added persisted audit events, structured request-error reporting, and an optional monitoring-webhook adapter.
5. Added scheduled expiry cleanup and documented retention, deletion, backup restore, rollback, and incident procedures.
6. Replaced unsupported product claims and dead links with working feature, legal, security, and support pages.
7. Removed the misleading plaintext BYOK settings interface; server-owned OpenAI credentials remain the supported model.
8. Added profile loading, functional theme selection, real sidebar identity, and post-deletion sign-out.
9. Replaced demo E2E tests with production-path public and authenticated staging journeys.
10. Removed a tracked local cookie jar and OS metadata files.

## Deployment sign-off still required

Code readiness cannot provision or legally approve external systems. Before
opening production traffic, the operator must:

1. Provision PostgreSQL with encryption, automated backups, and point-in-time recovery; apply migrations and complete a restore drill.
2. Configure OpenAI, SMTP, Upstash Redis, HTTPS `NEXTAUTH_URL`, a proxy-overwritten client-IP header, independent strong secrets, OAuth redirects if used, the support mailbox, and the monitoring destination.
3. Configure the GitHub `staging` environment with `STAGING_BASE_URL`, `E2E_EMAIL`, and `E2E_PASSWORD`, then run the explicit authenticated workflow-dispatch gate. It fails rather than skips when any value is absent.
4. Configure the daily retention request and uptime alert against `/api/health`.
5. Have the business owner or counsel approve Privacy and Terms and define named incident/on-call ownership.
6. Keep the database-backed file store within the documented bounded-volume envelope; move source bytes to private object storage before raising upload limits or serving high volume.

## Audit method

The pass used Matt Pocock-style implementation, TDD, deep-module design, and
two-axis review. Kun Chen’s no-mistakes rules supplied behavioral-test quality,
documentation, validation, and push-safety requirements. Its AXI executable is
not installed on this host, and its PR publication step conflicts with the
explicit direct-to-`main`, no-PR delivery instruction, so those phases are run
manually and reported transparently.
