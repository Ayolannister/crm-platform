#!/usr/bin/env bash
set -euo pipefail

# ==========================================
# CRM PostgreSQL Encrypted S3 Backup
# ==========================================

export DOCKER_HOST="unix:///var/run/docker.sock"
export DOCKER_CONTEXT="default"

AWS_ENDPOINT="${AWS_ENDPOINT:-http://localhost:4566}"
AWS_REGION="us-east-1"
S3_BUCKET="${S3_BUCKET:-crm-platform-backups-dev}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

BACKUP_DIR="${BACKUP_DIR:-${HOME}/crm-backups/postgres}"
ENCRYPTED_DIR="${ENCRYPTED_DIR:-${HOME}/crm-backups/encrypted}"

RECIPIENT_FILE="${HOME}/.config/age/crm-backup-recipient.txt"

# Dummy credentials for local Floci only.
export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
export AWS_DEFAULT_REGION="$AWS_REGION"

umask 077

log() {
  echo "[INFO] $1"
}

pass() {
  echo "[PASS] $1"
}

fail() {
  echo "[FAIL] $1" >&2
  exit 1
}

# ==========================================
# 1. Validate requirements
# ==========================================

command -v age >/dev/null || fail "age is not installed"
command -v aws >/dev/null || fail "AWS CLI is not installed"

[[ -s "$RECIPIENT_FILE" ]] \
  || fail "age public recipient file not found"

RECIPIENT="$(cat "$RECIPIENT_FILE")"

[[ "$RECIPIENT" == age1* ]] \
  || fail "Invalid age recipient"

mkdir -p "$ENCRYPTED_DIR"
chmod 700 "$ENCRYPTED_DIR"

# ==========================================
# 2. Verify S3 bucket
# ==========================================

log "Checking Floci S3 bucket..."

aws --endpoint-url "$AWS_ENDPOINT" \
  s3api head-bucket \
  --bucket "$S3_BUCKET" \
  >/dev/null \
  || fail "S3 bucket is unavailable"

pass "Floci S3 bucket accessible"

# ==========================================
# 3. Create PostgreSQL backup
# ==========================================

log "Running PostgreSQL backup..."

BACKUP_LOG="$(mktemp)"
VERIFY_FILE=""

cleanup() {
  rm -f -- "$BACKUP_LOG"

  if [[ -n "$VERIFY_FILE" ]]; then
    rm -f -- "$VERIFY_FILE"
  fi
}

trap cleanup EXIT

if ! "$SCRIPT_DIR/backup-postgres.sh" > "$BACKUP_LOG" 2>&1; then
  cat "$BACKUP_LOG"
  fail "PostgreSQL backup failed"
fi

cat "$BACKUP_LOG"

BACKUP_FILE="$(
  sed -n 's/^Backup: //p' "$BACKUP_LOG" | tail -1
)"

[[ -n "$BACKUP_FILE" && -f "$BACKUP_FILE" ]] \
  || fail "Backup file could not be identified"

[[ "$BACKUP_FILE" == "$BACKUP_DIR/"* ]] \
  || fail "Backup file is outside expected directory"

pass "PostgreSQL backup completed"

# ==========================================
# 4. Verify original backup checksum
# ==========================================

log "Verifying PostgreSQL backup checksum..."

sha256sum -c "${BACKUP_FILE}.sha256" \
  || fail "Original backup checksum verification failed"

pass "Original checksum verified"

# ==========================================
# 5. Encrypt backup
# ==========================================

ENCRYPTED_FILE="${ENCRYPTED_DIR}/$(basename "$BACKUP_FILE").age"

log "Encrypting PostgreSQL backup..."

age -r "$RECIPIENT" \
  -o "$ENCRYPTED_FILE" \
  "$BACKUP_FILE" \
  || fail "Encryption failed"

[[ -s "$ENCRYPTED_FILE" ]] \
  || fail "Encrypted backup is empty"

pass "PostgreSQL backup encrypted"

# ==========================================
# 6. Generate encrypted checksum
# ==========================================

(
  cd "$ENCRYPTED_DIR"

  sha256sum "$(basename "$ENCRYPTED_FILE")" \
    > "$(basename "$ENCRYPTED_FILE").sha256"
)

(
  cd "$ENCRYPTED_DIR"

  sha256sum -c "$(basename "$ENCRYPTED_FILE").sha256"
) || fail "Encrypted backup checksum failed"

pass "Encrypted checksum verified"

# ==========================================
# 7. Upload encrypted backup to S3
# ==========================================

S3_KEY="postgres/$(basename "$ENCRYPTED_FILE")"

log "Uploading encrypted backup to Floci S3..."

aws --endpoint-url "$AWS_ENDPOINT" \
  s3 cp \
  "$ENCRYPTED_FILE" \
  "s3://${S3_BUCKET}/${S3_KEY}" \
  || fail "Encrypted S3 upload failed"

aws --endpoint-url "$AWS_ENDPOINT" \
  s3 cp \
  "${ENCRYPTED_FILE}.sha256" \
  "s3://${S3_BUCKET}/${S3_KEY}.sha256" \
  || fail "Checksum upload failed"

pass "Encrypted backup and checksum uploaded"

# ==========================================
# 8. Download and verify remote backup
# ==========================================

log "Verifying uploaded S3 backup..."

VERIFY_FILE="$(mktemp)"

aws --endpoint-url "$AWS_ENDPOINT" \
  s3 cp \
  "s3://${S3_BUCKET}/${S3_KEY}" \
  "$VERIFY_FILE" \
  >/dev/null \
  || fail "Could not retrieve uploaded backup"

cmp -s "$ENCRYPTED_FILE" "$VERIFY_FILE" \
  || fail "Uploaded backup does not match local encrypted backup"

pass "Uploaded S3 backup matches local file"

# ==========================================
# 9. Success summary
# ==========================================

echo
echo "=========================================="
echo " CRM ENCRYPTED S3 BACKUP COMPLETE"
echo "=========================================="
echo "Original:  $BACKUP_FILE"
echo "Encrypted: $ENCRYPTED_FILE"
echo "S3 Bucket: $S3_BUCKET"
echo "S3 Key:    $S3_KEY"
echo "Result:    SUCCESS"
echo "=========================================="
