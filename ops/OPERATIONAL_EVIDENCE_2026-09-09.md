# Operational readiness evidence — 2026-09-09

This record separates controls that were actually exercised from controls that
remain unavailable or require a human confirmation. No credential values or
learner content are included.

## Supabase recovery

- Source project: `lhdstoqeyubdnhoaaiok` (`us-east-1`)
- Plan observed in the Supabase dashboard: Free
- Managed backup state: unavailable; the dashboard states that the Free plan
  does not include project backups
- Managed-backup/PITR RPO and RTO: **not proven**

Supabase documents automatic daily backups for Pro, Team, and Enterprise and
recommends regular logical exports for Free projects. Restore-to-new-project is
also a paid-plan feature. See [Database Backups](https://supabase.com/docs/guides/platform/backups)
and [Restore to a new project](https://supabase.com/docs/guides/platform/clone-project).

### Isolated logical recovery drill

At `2026-09-09T09:46:30Z`, a custom-format `pg_dump` of the application-owned
`public` schema was read through a temporary least-privilege login and restored
into a new local PostgreSQL 17 container. The source database was never a
restore target and received no data writes.

| Measurement | Result |
| --- | ---: |
| Dump duration | 9,703 ms |
| Restore duration | 335 ms |
| End-to-end elapsed time | 12 seconds |
| Logical archive size | 12,555,151 bytes |
| Restored public tables | 10 |
| Applied migration records | 5 |
| Failed/rolled-back migrations | 0 |
| Aggregate source/restore counts | Exact match |

Verified counts were one user, zero accounts, three sessions, 24 messages,
four speech-audio cache records, three materials, nine audit events, and five
migration records. The temporary archive and local container were deleted after
verification. The temporary database login and its grants were removed.

This proves the current application schema and data can be recovered from a
logical dump into an isolated PostgreSQL target. It does **not** prove Supabase
managed-backup restoration, PITR, automated off-site backup retention, or a
production cutover. The project does not use Supabase Auth or Storage; Clerk
owns identity and uploaded source bytes are currently held in the dumped public
schema.

The existing `postgres` membership in the custom `mindforge_app` owner role
remains a hardening follow-up. Supabase records `supabase_admin` as its grantor,
so the SQL Editor's `postgres` session cannot revoke that grant. It creates no
additional login, but it should be removed through a Supabase-supported admin
path or the custom ownership model should be retired.

## Human alert delivery

- Production deployment: `dpl_8eT6itj5WCdQgABs5JF3csmAV9Ck`
- Canonical URL health: HTTP 200; database and configuration both `ok`
- Alert-test authentication: unauthenticated POST returned HTTP 401
- Authenticated correlation ID: `eedd97d3-e5b8-45b4-8064-44b560512388`
- Structured production event: present in Vercel runtime logs with
  `action=operations.alert_test` and `test=true`
- Webhook transport result: HTTP 503, `not-configured`
- Human receipt: **not proven**

The Vercel environment inventory contains monitoring variable names, but the
webhook URL resolves as empty in the running function. The new protected test
endpoint correctly exposes that condition without returning a URL, token, or
remote response body. It must be rerun after a real monitored destination is
chosen, and the on-call human must confirm the same correlation ID in that
destination. Vercel's configurable anomaly alerts require Pro with
Observability Plus; see [Vercel Alerts](https://vercel.com/docs/alerts).

## Exit criteria

1. Choose a human-facing webhook destination and install its non-empty URL and
   optional bearer token in Vercel Production.
2. Redeploy, invoke `POST /api/internal/alert-test` with `CRON_SECRET`, record a
   2xx delivery receipt, and have the on-call owner confirm the correlation ID.
3. Before public launch, either upgrade Supabase and restore a managed backup to
   a new project, or automate encrypted off-site logical backups with retention
   and rerun this drill from one of those retained artifacts.
