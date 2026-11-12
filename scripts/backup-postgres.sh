#!/usr/bin/env bash
set -euo pipefail

# ======================================
# CRM PostgreSQL Automated Backup
# ======================================

# Use Docker Engine rather than Docker Desktop.
export DOCKER_HOST="unix:///var/run/docker.sock"
export DOCKER_CONTEXT="default"

# Configuration
BACKUP_DIR="${BACKUP_DIR:-${HOME}/crm-backups/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
RETENTION_DRY_RUN="${RETENTION_DRY_RUN:-true}"

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

# ======================================
# 1. Validate configuration
# ======================================

[[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] \
  || fail "RETENTION_DAYS must be a positive integer"

(( RETENTION_DAYS > 0 )) \
  || fail "RETENTION_DAYS must be greater than zero"

[[ "$RETENTION_DRY_RUN" == "true" || "$RETENTION_DRY_RUN" == "false" ]] \
  || fail "RETENTION_DRY_RUN must be true or false"

# ======================================
# 2. Discover PostgreSQL container
# ======================================

log "Discovering Floci PostgreSQL container..."

if ! DB_CONTAINERS=$(docker ps \
  --filter "name=floci-rds-db-" \
  --filter "status=running" \
  --format '{{.Names}}'); then
  fail "Docker container discovery failed"
fi

[[ -n "$DB_CONTAINERS" ]] \
  || fail "No running Floci PostgreSQL container found"

mapfile -t CONTAINERS <<< "$DB_CONTAINERS"

[[ "${#CONTAINERS[@]}" -eq 1 ]] \
  || fail "Multiple Floci PostgreSQL containers found"

DB_CONTAINER="${CONTAINERS[0]}"

log "PostgreSQL container: $DB_CONTAINER"

# ======================================
# 3. Prepare backup directory
# ======================================

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/crm-${TIMESTAMP}.dump"
TEMP_FILE="${BACKUP_FILE}.partial"

cleanup() {
  rm -f -- "$TEMP_FILE"
}

trap cleanup EXIT

# ======================================
# 4. Check PostgreSQL availability
# ======================================

log "Checking PostgreSQL container..."

docker inspect \
  --format '{{.State.Running}}' \
  "$DB_CONTAINER" | grep -qx true \
  || fail "PostgreSQL container is not running"

pass "PostgreSQL container is running"

# Confirm this container hosts the expected CRM database.
log "Checking CRM database identity..."

docker exec "$DB_CONTAINER" sh -c '
  test "${POSTGRES_DB:-}" = "crm"
' || fail "Container does not identify the expected CRM database"

pass "Expected CRM database identified"

# ======================================
# 5. Create PostgreSQL backup
# ======================================

log "Creating PostgreSQL backup..."

if ! docker exec "$DB_CONTAINER" sh -c '
  export PGPASSWORD="${POSTGRES_PASSWORD:-}"

  exec pg_dump \
    -h 127.0.0.1 \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --format=custom \
    --no-owner \
    --no-acl
' > "$TEMP_FILE"; then
  fail "PostgreSQL backup failed"
fi

[[ -s "$TEMP_FILE" ]] \
  || fail "Backup file is empty"

pass "PostgreSQL backup created"

# ======================================
# 6. Validate backup archive
# ======================================

log "Validating backup archive..."

docker exec -i "$DB_CONTAINER" \
  pg_restore --list < "$TEMP_FILE" \
  >/dev/null \
  || fail "Backup archive validation failed"

pass "Backup archive is readable"

# ======================================
# 7. Finalize backup
# ======================================

[[ ! -e "$BACKUP_FILE" ]] \
  || fail "Backup destination already exists"

mv -- "$TEMP_FILE" "$BACKUP_FILE"

sha256sum "$BACKUP_FILE" > "${BACKUP_FILE}.sha256"

sha256sum -c "${BACKUP_FILE}.sha256" \
  || fail "Backup checksum verification failed"

pass "Backup checksum verified"

# ======================================
# 8. Backup retention
# ======================================

apply_retention() {

  log "Checking backup retention policy..."

  local -a backups=()
  local backup
  local checksum
  local filename
  local expired=0
  local retained=0
  local i

  # Find backup archives ordered newest first.
  mapfile -d '' backups < <(
    find "$BACKUP_DIR" \
      -maxdepth 1 \
      -type f \
      -name 'crm-*.dump' \
      -printf '%T@ %p\0' |
      sort -z -nr |
      cut -z -d ' ' -f 2-
  )

  log "Found ${#backups[@]} backup archives"

  for i in "${!backups[@]}"; do

    backup="${backups[$i]}"
    filename="${backup##*/}"
    checksum="${backup}.sha256"

    # Only consider backups matching our filename format.
    if [[ ! "$filename" =~ ^crm-[0-9]{8}-[0-9]{6}\.dump$ ]]; then
      ((retained+=1))
      continue
    fi

    # Always preserve at least the two newest backups.
    if (( i < 2 )); then
      ((retained+=1))
      continue
    fi

    # Keep backups within the retention period.
    if [[ -z "$(find "$backup" -mtime +"$((RETENTION_DAYS - 1))" -print)" ]]; then
      ((retained+=1))
      continue
    fi

    # Do not delete backups without regular checksum files.
    if [[ ! -f "$checksum" || -L "$checksum" ]]; then
      log "Skipping backup without a regular checksum: $filename"
      ((retained+=1))
      continue
    fi

    # Verify the backup before considering deletion.
    if ! (
      cd "$BACKUP_DIR"
      sha256sum -c -- "${filename}.sha256" >/dev/null 2>&1
    ); then
      log "Skipping backup with invalid checksum: $filename"
      ((retained+=1))
      continue
    fi

    # Preview or perform deletion.
    if [[ "$RETENTION_DRY_RUN" == "true" ]]; then

      log "[DRY RUN] Would delete: $filename"

    else

      rm -- "$backup" "$checksum"
      log "Deleted expired backup: $filename"

    fi

    ((expired+=1))

  done

  log "Retention summary: retained=$retained expired candidates=$expired"
}

apply_retention

# ======================================
# 9. Backup summary
# ======================================

echo
echo "======================================"
echo " CRM POSTGRESQL BACKUP COMPLETE"
echo "======================================"
echo "Container: $DB_CONTAINER"
echo "Backup: $BACKUP_FILE"
echo "Retention: $RETENTION_DAYS days"
echo "Dry run: $RETENTION_DRY_RUN"
echo "Result: SUCCESS"
echo "======================================"
