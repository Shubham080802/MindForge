#!/usr/bin/env bash
#
# Encrypted off-site logical backup for the MindForge PostgreSQL database.
#
# The Supabase Free plan provides no recoverable managed backups, so this is
# the retained-artifact half of the launch recovery requirement.
#
# Design notes that matter:
#
#   * The dump is proven restorable BEFORE it is kept. A backup that has never
#     been restored is a hope, not a control.
#   * Encryption uses an age recipient (public key). Whatever runs this can
#     write backups but cannot read them back; the identity file that decrypts
#     lives only with the operator. A compromised CI runner cannot exfiltrate
#     learner data from the backup store.
#   * The destination is any S3-compatible bucket, so Cloudflare R2, Backblaze
#     B2, Wasabi, MinIO, and S3 all work without changing this script.
#
# Required environment:
#   BACKUP_DATABASE_URL   Direct (session-pooler, port 5432) PostgreSQL URL.
#                         pg_dump cannot run through a transaction pooler.
#   BACKUP_AGE_RECIPIENT  age public key, e.g. age1ql3z...
#   BACKUP_S3_BUCKET      Destination bucket name.
#   BACKUP_S3_ENDPOINT    S3-compatible endpoint URL.
#   AWS_ACCESS_KEY_ID     Bucket credentials, write + list + delete scoped.
#   AWS_SECRET_ACCESS_KEY
#
# Optional environment:
#   BACKUP_S3_PREFIX      Key prefix (default: mindforge).
#   BACKUP_S3_REGION      Region (default: auto, which R2 expects).
#   BACKUP_RETENTION_DAYS Prune artifacts older than this (default: 30).
#   BACKUP_VERIFY_URL     PostgreSQL URL of a THROWAWAY database used to prove
#                         the dump restores. Skipped with a loud warning when
#                         unset. The database is dropped and recreated.
#   BACKUP_RECEIPT_PATH   Where to write the JSON receipt (default: stdout only).

set -Eeuo pipefail

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >&2; }
fail() { log "ERROR: $*"; exit 1; }

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required but not installed. $2"
}

require_env() {
  [ -n "${!1:-}" ] || fail "$1 is required but not set."
}

require_command pg_dump "Install the PostgreSQL client tools (postgresql-client / brew install libpq)."
require_command age "Install age (https://github.com/FiloSottile/age)."
require_command aws "Install the AWS CLI v2; it speaks to any S3-compatible endpoint."

require_env BACKUP_DATABASE_URL
require_env BACKUP_AGE_RECIPIENT
require_env BACKUP_S3_BUCKET
require_env BACKUP_S3_ENDPOINT
require_env AWS_ACCESS_KEY_ID
require_env AWS_SECRET_ACCESS_KEY

PREFIX="${BACKUP_S3_PREFIX:-mindforge}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
export AWS_DEFAULT_REGION="${BACKUP_S3_REGION:-auto}"
# R2 rejects the streaming checksum trailers newer AWS CLI versions send.
export AWS_REQUEST_CHECKSUM_CALCULATION="${AWS_REQUEST_CHECKSUM_CALCULATION:-when_required}"
export AWS_RESPONSE_CHECKSUM_VALIDATION="${AWS_RESPONSE_CHECKSUM_VALIDATION:-when_required}"

case "$RETENTION_DAYS" in
  ''|*[!0-9]*) fail "BACKUP_RETENTION_DAYS must be a whole number of days." ;;
esac
[ "$RETENTION_DAYS" -ge 7 ] || fail "BACKUP_RETENTION_DAYS must be at least 7."

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
ARCHIVE="$WORKDIR/mindforge-$STAMP.dump"
ENCRYPTED="$ARCHIVE.age"
KEY="$PREFIX/$(date -u +%Y/%m)/mindforge-$STAMP.dump.age"

s3() { aws s3 --endpoint-url "$BACKUP_S3_ENDPOINT" "$@"; }
s3api() { aws s3api --endpoint-url "$BACKUP_S3_ENDPOINT" "$@"; }

# ---------------------------------------------------------------- dump -----
log "Dumping the public schema."
started_at=$(date +%s)
pg_dump --format=custom --no-owner --no-privileges --schema=public \
  --file="$ARCHIVE" "$BACKUP_DATABASE_URL" \
  || fail "pg_dump failed. Confirm BACKUP_DATABASE_URL is the direct port-5432 URL, not the transaction pooler."
dump_seconds=$(( $(date +%s) - started_at ))

archive_bytes=$(wc -c <"$ARCHIVE" | tr -d ' ')
[ "$archive_bytes" -gt 0 ] || fail "pg_dump produced an empty archive."
log "Dumped $archive_bytes bytes in ${dump_seconds}s."

# ------------------------------------------------------------- verify -----
# Restoring before keeping is the whole point: it converts "a backup exists"
# into "a backup restores", which is what the launch gate actually requires.
restored_tables="skipped"
if [ -n "${BACKUP_VERIFY_URL:-}" ]; then
  require_command psql "Install the PostgreSQL client tools to use BACKUP_VERIFY_URL."
  require_command pg_restore "Install the PostgreSQL client tools to use BACKUP_VERIFY_URL."

  # A dump taken by a newer pg_dump cannot be restored into an older server:
  # it emits GUCs the old server rejects. Catching that here turns a cryptic
  # mid-restore error into an actionable one.
  source_major=$(psql "$BACKUP_DATABASE_URL" -tAc 'SHOW server_version_num' | tr -d ' ')
  verify_major=$(psql "$BACKUP_VERIFY_URL" -tAc 'SHOW server_version_num' | tr -d ' ')
  if [ "$(( verify_major / 10000 ))" -lt "$(( source_major / 10000 ))" ]; then
    fail "The verification database is PostgreSQL $(( verify_major / 10000 )) but the source is $(( source_major / 10000 )). The restore target must be the same major version or newer."
  fi

  dump_major=$(pg_dump --version | sed -E 's/[^0-9]*([0-9]+).*/\1/')
  if [ "$dump_major" -lt "$(( source_major / 10000 ))" ]; then
    fail "pg_dump is version $dump_major but the source server is $(( source_major / 10000 )). Use client tools at least as new as the server."
  fi
  if [ "$dump_major" -gt "$(( verify_major / 10000 ))" ]; then
    fail "pg_dump is version $dump_major but the verification database is $(( verify_major / 10000 )). Dumps from a newer client cannot restore into an older server; align the versions."
  fi

  log "Restoring the archive into the throwaway verification database (source PostgreSQL $(( source_major / 10000 )), pg_dump $dump_major)."
  # pg_dump --schema=public emits CREATE SCHEMA public on modern servers but
  # not on older ones, and a fresh database already has that schema. Read the
  # archive's own table of contents rather than guessing.
  psql "$BACKUP_VERIFY_URL" -v ON_ERROR_STOP=1 -q -c 'DROP SCHEMA IF EXISTS public CASCADE;' \
    || fail "Could not reset the verification database. BACKUP_VERIFY_URL must point at a throwaway database."
  if ! pg_restore --list "$ARCHIVE" | grep -q 'SCHEMA - public'; then
    psql "$BACKUP_VERIFY_URL" -v ON_ERROR_STOP=1 -q -c 'CREATE SCHEMA public;' \
      || fail "Could not reset the verification database. BACKUP_VERIFY_URL must point at a throwaway database."
  fi

  pg_restore --no-owner --no-privileges --exit-on-error \
    --dbname="$BACKUP_VERIFY_URL" "$ARCHIVE" \
    || fail "The dump did not restore cleanly. This backup is NOT usable; failing loudly rather than storing it."

  restored_tables=$(psql "$BACKUP_VERIFY_URL" -tAc \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")
  [ "${restored_tables:-0}" -gt 0 ] || fail "The restored schema contains no tables."

  source_tables=$(psql "$BACKUP_DATABASE_URL" -tAc \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")
  [ "$restored_tables" = "$source_tables" ] \
    || fail "Restored $restored_tables tables but the source has $source_tables. Refusing to store an incomplete backup."

  log "Verified: $restored_tables tables restored, matching the source."
else
  log "WARNING: BACKUP_VERIFY_URL is not set. Storing an archive that was never restored."
fi

# ------------------------------------------------------------ encrypt -----
log "Encrypting to the age recipient."
age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" --output "$ENCRYPTED" "$ARCHIVE" \
  || fail "age encryption failed. Confirm BACKUP_AGE_RECIPIENT is a public key (age1...)."

encrypted_bytes=$(wc -c <"$ENCRYPTED" | tr -d ' ')
[ "$encrypted_bytes" -gt 0 ] || fail "Encryption produced an empty file."

# An age file must not begin with a PostgreSQL custom-format header.
head -c 5 "$ENCRYPTED" | grep -q '^age-' \
  || fail "The encrypted artifact is not in age format. Refusing to upload possible plaintext."
head -c 5 "$ENCRYPTED" | grep -q '^PGDMP' \
  && fail "The artifact still looks like a plaintext dump. Refusing to upload."

checksum=$(shasum -a 256 "$ENCRYPTED" | awk '{print $1}')
rm -f "$ARCHIVE"

# ------------------------------------------------------------- upload -----
log "Uploading s3://$BACKUP_S3_BUCKET/$KEY"
s3 cp "$ENCRYPTED" "s3://$BACKUP_S3_BUCKET/$KEY" --only-show-errors \
  || fail "Upload failed."

remote_bytes=$(s3api head-object --bucket "$BACKUP_S3_BUCKET" --key "$KEY" \
  --query ContentLength --output text) || fail "Could not read back the uploaded object."
[ "$remote_bytes" = "$encrypted_bytes" ] \
  || fail "Uploaded $encrypted_bytes bytes but the store reports $remote_bytes."

log "Stored $encrypted_bytes bytes; size confirmed at the destination."

# -------------------------------------------------------------- prune -----
# S3 reports LastModified as 2026-09-10T02:03:19.634000+00:00. BSD date needs
# the fractional seconds and offset removed and must be told the input is UTC;
# GNU date reads the original string directly. Getting this wrong silently
# skews the retention window by the local UTC offset.
epoch_of() {
  local trimmed="${1%%.*}"
  trimmed="${trimmed%%+*}"
  TZ=UTC date -j -f '%Y-%m-%dT%H:%M:%S' "$trimmed" +%s 2>/dev/null \
    || date -u -d "$1" +%s 2>/dev/null \
    || echo 0
}

cutoff_epoch=$(( $(date -u +%s) - RETENTION_DAYS * 86400 ))
pruned=0
while read -r object_key object_date; do
  [ -n "$object_key" ] || continue
  object_epoch=$(epoch_of "$object_date")
  if [ "$object_epoch" -gt 0 ] && [ "$object_epoch" -lt "$cutoff_epoch" ]; then
    s3api delete-object --bucket "$BACKUP_S3_BUCKET" --key "$object_key" >/dev/null
    pruned=$(( pruned + 1 ))
    log "Pruned $object_key"
  fi
done < <(s3api list-objects-v2 --bucket "$BACKUP_S3_BUCKET" --prefix "$PREFIX/" \
  --query 'Contents[].[Key,LastModified]' --output text 2>/dev/null || true)

# `length(Contents)` raises on an empty listing; the || [] default keeps the
# receipt valid when every artifact has just been pruned.
retained=$(s3api list-objects-v2 --bucket "$BACKUP_S3_BUCKET" --prefix "$PREFIX/" \
  --query 'length(Contents || `[]`)' --output text 2>/dev/null || echo 0)
case "$retained" in ''|*[!0-9]*) retained=0 ;; esac

# ------------------------------------------------------------ receipt -----
receipt=$(cat <<JSON
{
  "status": "ok",
  "key": "$KEY",
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "dumpSeconds": $dump_seconds,
  "plaintextBytes": $archive_bytes,
  "encryptedBytes": $encrypted_bytes,
  "sha256": "$checksum",
  "restoredTables": "$restored_tables",
  "prunedArtifacts": $pruned,
  "retainedArtifacts": $retained,
  "retentionDays": $RETENTION_DAYS
}
JSON
)

[ -n "${BACKUP_RECEIPT_PATH:-}" ] && printf '%s\n' "$receipt" >"$BACKUP_RECEIPT_PATH"
printf '%s\n' "$receipt"
log "Backup complete."
