# Backup and recovery

MindForge stores learner accounts, sessions, messages, audit events, and the
uploaded source bytes themselves in PostgreSQL. Losing that database loses the
product. This document is the operating procedure for not losing it.

## Why this exists

Supabase includes managed daily backups and point-in-time recovery on Pro and
above. The project currently runs on the **Free** plan, which provides no
recoverable managed backups and no restore-to-new-project. Until that changes,
the retained artifact produced by `.github/workflows/backup.yml` is the only
thing standing between an incident and total data loss.

Two paths satisfy the launch gate. They are not mutually exclusive, and running
both is the stronger position:

| Path | Cost | What it gives you | What it does not |
| --- | --- | --- | --- |
| Supabase Pro | Paid monthly | Daily managed backups, 7-day PITR, restore to a new project, no scripts to own | Backups live inside the same account. Losing or compromising that account loses them too. |
| This pipeline | Free tier of an object store | Encrypted copies held outside Supabase, under a key Supabase and CI cannot read | Coarser granularity: you recover to the last daily artifact, not to a point in time. |

## How the pipeline works

`.github/workflows/backup.yml` runs daily at 02:30 UTC and on demand.

1. **Dump.** `pg_dump --format=custom --schema=public` against the Supabase
   *session pooler* on port 5432. The transaction pooler on 6543 cannot serve
   `pg_dump`.
2. **Verify before keeping.** The dump is restored into a throwaway PostgreSQL
   service container of the same major version, and the restored table count is
   compared with the source. A dump that does not restore never reaches the
   bucket — the run fails loudly instead.
3. **Encrypt.** `age` encrypts to a **public** recipient key. The private
   identity is never present in CI, so a compromised runner or a leaked bucket
   credential cannot read learner data out of the backups.
4. **Upload.** Any S3-compatible bucket. The uploaded size is read back and
   compared before the run is called a success.
5. **Prune.** Artifacts older than `BACKUP_RETENTION_DAYS` (default 30) are
   deleted.
6. **Alert.** A failed run emails the on-call address through Resend. A backup
   that fails silently is worse than no backup, because it is trusted.

The run summary publishes a receipt: artifact key, byte counts, SHA-256, tables
restored, and how many artifacts were pruned and retained. It contains no
secret and no learner data.

## One-time setup

### 1. Generate the age key pair

Run this on a trusted machine, not in CI:

```bash
age-keygen -o mindforge-backup-identity.txt
```

It prints the **public** key (`age1...`) and writes the **private** identity to
the file.

- The public key goes into the `BACKUP_AGE_RECIPIENT` repository secret.
- The private identity file goes into a password manager or another durable
  secret store, plus one offline copy. **If this file is lost, every backup
  becomes permanently unreadable.** Nothing else can recover them.
- Never commit it, and never add it to GitHub Actions secrets.

### 2. Create the off-site bucket

Cloudflare R2 and Backblaze B2 both have a free tier well above the current
database size. Create a private bucket and an API token scoped to that bucket
with object read, write, list, and delete.

Record the S3 endpoint URL. For R2 it looks like
`https://<account-id>.r2.cloudflarestorage.com` and the region is `auto`.

### 3. Add the repository secrets

| Secret | Value |
| --- | --- |
| `BACKUP_DATABASE_URL` | Supabase **session pooler** URL, port 5432 |
| `BACKUP_AGE_RECIPIENT` | The `age1...` public key |
| `BACKUP_S3_BUCKET` | Bucket name |
| `BACKUP_S3_ENDPOINT` | S3-compatible endpoint URL |
| `BACKUP_S3_ACCESS_KEY_ID` | Bucket access key |
| `BACKUP_S3_SECRET_ACCESS_KEY` | Bucket secret key |
| `RESEND_API_KEY` | Existing alerting key |
| `ALERT_EMAIL_TO` | Existing on-call address |

Optional repository variables: `SUPABASE_PG_MAJOR` (default `17`),
`BACKUP_RETENTION_DAYS` (default `30`), `BACKUP_S3_REGION` (default `auto`).

> `SUPABASE_PG_MAJOR` must match the Supabase project's PostgreSQL major
> version. A dump taken by a newer `pg_dump` cannot be restored into an older
> server; the script checks this and fails with a specific message rather than
> letting the mismatch surface mid-restore.

### 4. Run it once by hand

Trigger **Database backup** from the Actions tab and confirm the receipt in the
run summary.

## Quarterly recovery drill

Backups are only real once they have been restored from storage by someone
holding the key. Run this from a trusted machine with Docker:

```bash
BACKUP_AGE_IDENTITY=/path/to/mindforge-backup-identity.txt \
BACKUP_S3_BUCKET=... BACKUP_S3_ENDPOINT=... \
AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... \
./scripts/restore-drill.sh
```

It selects the newest artifact (or `BACKUP_KEY=...` for a specific one),
decrypts it, restores into a throwaway container, checks that no migration is
unfinished or rolled back, and prints row counts per table.

Record the result — date, artifact key, restore duration, row counts — in an
`ops/OPERATIONAL_EVIDENCE_<date>.md` entry. Investigate any drop in row counts
that a deletion does not explain.

## Recovering production

1. **Stop writes.** Put the application into maintenance or remove the
   deployment's database credentials. Restoring under live traffic produces a
   database that disagrees with itself.
2. **Choose the artifact.** Prefer the newest that predates the incident.
   Everything written after it is lost; state that plainly in the incident
   record rather than discovering it later.
3. **Restore into a new database, never over the live one**, so the damaged
   database remains available for forensics:
   ```bash
   age --decrypt --identity mindforge-backup-identity.txt \
       --output restore.dump artifact.age
   pg_restore --no-owner --no-privileges --exit-on-error \
       --dbname "$NEW_DATABASE_URL" restore.dump
   ```
4. **Verify** table counts and `_prisma_migrations` before pointing traffic at
   it, then run `pnpm prisma migrate deploy` in case the schema has moved on
   since the artifact was taken.
5. **Repoint** `DATABASE_URL` and `DIRECT_URL`, redeploy, and confirm
   `GET /api/health` returns HTTP 200.
6. **Replay deletion obligations.** A learner who deleted their account after
   the artifact was taken will reappear in the restored data. Re-apply those
   deletions before serving traffic; `ops/DATA_RETENTION.md` states this
   commitment publicly and the Privacy Policy depends on it.

## Known limitations

- Recovery granularity is one day. Up to 24 hours of writes can be lost. Only
  Supabase PITR closes that gap.
- Uploaded source bytes live in PostgreSQL, so artifact size grows with usage.
  Moving them to object storage is already on the launch list; revisit the
  retention window and the bucket's free tier before volume increases.
- The drill restores into a container, not into Supabase. A full
  production-cutover rehearsal remains unperformed.
- Losing the age identity makes every retained artifact unrecoverable. Treat it
  with the same care as the database itself.
