#!/usr/bin/env bash
#
# Operator-run recovery drill: prove a RETAINED, ENCRYPTED artifact can be
# turned back into a working MindForge database.
#
# scripts/backup-database.sh proves the dump restored at the moment it was
# taken, but it deliberately cannot decrypt anything afterwards. This script
# closes that loop and is the evidence the launch gate asks for. Run it from a
# trusted machine that holds the age identity -- never from CI.
#
# It never writes to production: the restore target is a throwaway container.
#
# Required environment:
#   BACKUP_AGE_IDENTITY   Path to the age private key file (age-keygen output).
#   BACKUP_S3_BUCKET      Bucket holding the artifacts.
#   BACKUP_S3_ENDPOINT    S3-compatible endpoint URL.
#   AWS_ACCESS_KEY_ID     Read-capable bucket credentials.
#   AWS_SECRET_ACCESS_KEY
#
# Optional environment:
#   BACKUP_S3_PREFIX      Key prefix (default: mindforge).
#   BACKUP_S3_REGION      Region (default: auto).
#   BACKUP_KEY            Restore this exact key instead of the newest artifact.
#   DRILL_PORT            Host port for the throwaway PostgreSQL (default: 55432).
#   DRILL_IMAGE           Container image (default: postgres:18-alpine). Must be the
#                         same major version as the source server or newer.
#   DRILL_KEEP            Set to 1 to leave the container running for inspection.

set -Eeuo pipefail

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >&2; }
fail() { log "ERROR: $*"; exit 1; }

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required but not installed. $2"
}
require_env() { [ -n "${!1:-}" ] || fail "$1 is required but not set."; }

require_command age "Install age (https://github.com/FiloSottile/age)."
require_command aws "Install the AWS CLI v2."
require_command docker "Install Docker; the drill restores into a throwaway container."
require_command pg_restore "Install the PostgreSQL client tools."
require_command psql "Install the PostgreSQL client tools."

require_env BACKUP_AGE_IDENTITY
require_env BACKUP_S3_BUCKET
require_env BACKUP_S3_ENDPOINT
require_env AWS_ACCESS_KEY_ID
require_env AWS_SECRET_ACCESS_KEY

[ -f "$BACKUP_AGE_IDENTITY" ] || fail "BACKUP_AGE_IDENTITY does not point at a file."

PREFIX="${BACKUP_S3_PREFIX:-mindforge}"
PORT="${DRILL_PORT:-55432}"
IMAGE="${DRILL_IMAGE:-postgres:18-alpine}"
export AWS_DEFAULT_REGION="${BACKUP_S3_REGION:-auto}"
export AWS_REQUEST_CHECKSUM_CALCULATION="${AWS_REQUEST_CHECKSUM_CALCULATION:-when_required}"
export AWS_RESPONSE_CHECKSUM_VALIDATION="${AWS_RESPONSE_CHECKSUM_VALIDATION:-when_required}"

WORKDIR="$(mktemp -d)"
CONTAINER="mindforge-restore-drill-$$"
cleanup() {
  rm -rf "$WORKDIR"
  if [ "${DRILL_KEEP:-0}" = "1" ]; then
    log "DRILL_KEEP=1; leaving container $CONTAINER on port $PORT."
  else
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

s3api() { aws s3api --endpoint-url "$BACKUP_S3_ENDPOINT" "$@"; }

# ------------------------------------------------------------- select -----
if [ -n "${BACKUP_KEY:-}" ]; then
  KEY="$BACKUP_KEY"
else
  log "Selecting the newest artifact under $PREFIX/."
  KEY=$(s3api list-objects-v2 --bucket "$BACKUP_S3_BUCKET" --prefix "$PREFIX/" \
    --query 'sort_by(Contents,&LastModified)[-1].Key' --output text 2>/dev/null || echo "")
fi
[ -n "$KEY" ] && [ "$KEY" != "None" ] || fail "No backup artifact found under $PREFIX/ in $BACKUP_S3_BUCKET."
log "Restoring from $KEY"

ENCRYPTED="$WORKDIR/artifact.age"
ARCHIVE="$WORKDIR/artifact.dump"

started_at=$(date +%s)
aws s3 --endpoint-url "$BACKUP_S3_ENDPOINT" cp "s3://$BACKUP_S3_BUCKET/$KEY" "$ENCRYPTED" --only-show-errors \
  || fail "Could not download $KEY."
download_seconds=$(( $(date +%s) - started_at ))

# ------------------------------------------------------------ decrypt -----
log "Decrypting with the operator identity."
age --decrypt --identity "$BACKUP_AGE_IDENTITY" --output "$ARCHIVE" "$ENCRYPTED" \
  || fail "Decryption failed. This artifact cannot be recovered with the supplied identity."

head -c 5 "$ARCHIVE" | grep -q '^PGDMP' \
  || fail "Decrypted output is not a PostgreSQL custom-format dump."
plaintext_bytes=$(wc -c <"$ARCHIVE" | tr -d ' ')
log "Decrypted $plaintext_bytes bytes."

# ------------------------------------------------------------ restore -----
log "Starting the throwaway PostgreSQL container."
docker run -d --rm --name "$CONTAINER" \
  -e POSTGRES_PASSWORD=drill -e POSTGRES_USER=drill -e POSTGRES_DB=drill \
  -p "$PORT:5432" "$IMAGE" >/dev/null || fail "Could not start $IMAGE."

TARGET="postgresql://drill:drill@127.0.0.1:$PORT/drill"
for _ in $(seq 1 60); do
  psql "$TARGET" -c 'SELECT 1' >/dev/null 2>&1 && break
  sleep 1
done
psql "$TARGET" -c 'SELECT 1' >/dev/null 2>&1 || fail "The throwaway database never became ready."

# pg_dump --schema=public emits CREATE SCHEMA public on modern servers but not
# on older ones, and a fresh database already has that schema. Read the
# archive's own table of contents rather than guessing.
psql "$TARGET" -v ON_ERROR_STOP=1 -q -c 'DROP SCHEMA IF EXISTS public CASCADE;' \
  || fail "Could not prepare the throwaway database for restore."
if ! pg_restore --list "$ARCHIVE" | grep -q 'SCHEMA - public'; then
  psql "$TARGET" -v ON_ERROR_STOP=1 -q -c 'CREATE SCHEMA public;' \
    || fail "Could not prepare the throwaway database for restore."
fi

restore_started=$(date +%s)
pg_restore --no-owner --no-privileges --exit-on-error --dbname="$TARGET" "$ARCHIVE" \
  || fail "pg_restore failed. THIS ARTIFACT IS NOT RECOVERABLE."
restore_seconds=$(( $(date +%s) - restore_started ))

# ------------------------------------------------------------- verify -----
tables=$(psql "$TARGET" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" | tr -d ' ')
[ "${tables:-0}" -gt 0 ] || fail "The restored database has no tables."

migrations=$(psql "$TARGET" -tAc \
  "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL;" 2>/dev/null | tr -d ' ' || echo 0)
failed_migrations=$(psql "$TARGET" -tAc \
  "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL;" 2>/dev/null | tr -d ' ' || echo 0)
[ "${failed_migrations:-0}" = "0" ] || fail "$failed_migrations migrations are unfinished or rolled back in the restored database."

log ""
log "Row counts in the restored database:"
psql "$TARGET" -c "
  SELECT 'User' AS entity, count(*) FROM \"User\"
  UNION ALL SELECT 'Session', count(*) FROM \"Session\"
  UNION ALL SELECT 'Message', count(*) FROM \"Message\"
  UNION ALL SELECT 'Material', count(*) FROM \"Material\"
  UNION ALL SELECT 'SpeechAudio', count(*) FROM \"SpeechAudio\"
  UNION ALL SELECT 'AuditEvent', count(*) FROM \"AuditEvent\"
  ORDER BY 1;" >&2 || fail "Could not read application tables from the restored database."

cat <<JSON
{
  "status": "restored",
  "key": "$KEY",
  "drilledAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "downloadSeconds": $download_seconds,
  "restoreSeconds": $restore_seconds,
  "plaintextBytes": $plaintext_bytes,
  "restoredTables": $tables,
  "appliedMigrations": $migrations,
  "failedMigrations": $failed_migrations
}
JSON

log "Recovery drill passed. Record the result in ops/."
