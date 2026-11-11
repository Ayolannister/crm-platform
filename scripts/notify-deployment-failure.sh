#!/usr/bin/env bash

set -euo pipefail

SERVICE="${1:-crm-deployment-verify.service}"

MESSAGE="CRM deployment verification failed: $SERVICE"

echo "[ALERT] $MESSAGE"

# Send desktop notification when a compatible notification service is available.
if command -v notify-send >/dev/null 2>&1; then
  notify-send \
    --urgency=critical \
    "CRM Deployment Alert" \
    "$MESSAGE" || true
fi
