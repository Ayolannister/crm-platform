#!/usr/bin/env bash

set -euo pipefail

CONTEXT="floci-crm-dev"
NAMESPACE="crm"
DEPLOYMENT="crm-api"
ARGOCD_APP="crm-api-aws-dev"
EXPECTED_IMAGE="ghcr.io/ayolannister/crm-api@sha256:205e9bdb3be4657d0af4f3feacb27d2310307efe7f44331b6c407c1ca53600f8"

# Use a dedicated local port for verification.
LOCAL_PORT=13000

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

cleanup() {
  if [[ -n "${PF_PID:-}" ]]; then
    kill "$PF_PID" 2>/dev/null || true
    wait "$PF_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT

# --------------------------------------
# 1. Kubernetes connectivity
# --------------------------------------

log "Checking Kubernetes connectivity..."

kubectl --context "$CONTEXT" \
  get namespace "$NAMESPACE" >/dev/null \
  || fail "Cannot access Kubernetes namespace"

pass "Kubernetes is accessible"

# --------------------------------------
# 2. Argo CD synchronization
# --------------------------------------

log "Checking Argo CD sync status..."

SYNC_STATUS=$(kubectl --context "$CONTEXT" \
  get application "$ARGOCD_APP" \
  -n argocd \
  -o jsonpath='{.status.sync.status}')

[[ "$SYNC_STATUS" == "Synced" ]] \
  || fail "Argo CD is not synchronized: $SYNC_STATUS"

pass "Argo CD is synchronized"

# --------------------------------------
# 3. Argo CD application health
# --------------------------------------

log "Checking Argo CD health..."

HEALTH_STATUS=$(kubectl --context "$CONTEXT" \
  get application "$ARGOCD_APP" \
  -n argocd \
  -o jsonpath='{.status.health.status}')

[[ "$HEALTH_STATUS" == "Healthy" ]] \
  || fail "Argo CD application unhealthy: $HEALTH_STATUS"

pass "Argo CD application is healthy"

# --------------------------------------
# 4. Kubernetes rollout
# --------------------------------------

log "Checking deployment rollout..."

kubectl --context "$CONTEXT" \
  rollout status "deployment/$DEPLOYMENT" \
  -n "$NAMESPACE" \
  --timeout=180s \
  || fail "Kubernetes rollout failed"

pass "Deployment rollout successful"

# --------------------------------------
# 5. Desired image verification
# --------------------------------------

log "Verifying deployed image..."

ACTUAL_IMAGE=$(kubectl --context "$CONTEXT" \
  get deployment "$DEPLOYMENT" \
  -n "$NAMESPACE" \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="api")].image}')

[[ "$ACTUAL_IMAGE" == "$EXPECTED_IMAGE" ]] \
  || fail "Unexpected deployment image: $ACTUAL_IMAGE"

pass "Deployment references expected image"

# --------------------------------------
# 6. Running image verification
# --------------------------------------

log "Verifying running container image..."

POD=$(kubectl --context "$CONTEXT" \
  get pods -n "$NAMESPACE" \
  -l 'app.kubernetes.io/component=api,app.kubernetes.io/instance=crm-api,app.kubernetes.io/name=crm-api' \
  --field-selector=status.phase=Running \
  -o jsonpath='{.items[0].metadata.name}')

[[ -n "$POD" ]] || fail "No running CRM API pod found"

RUNNING_IMAGE=$(kubectl --context "$CONTEXT" \
  get pod "$POD" \
  -n "$NAMESPACE" \
  -o jsonpath='{.status.containerStatuses[?(@.name=="api")].imageID}')

[[ "$RUNNING_IMAGE" == "$EXPECTED_IMAGE" ]] \
  || fail "Running image does not match expected digest: $RUNNING_IMAGE"

pass "Running container uses expected image digest"

# --------------------------------------
# 7. Application health endpoints
# --------------------------------------

log "Starting temporary port-forward..."

kubectl --context "$CONTEXT" \
  port-forward -n "$NAMESPACE" \
  "deployment/$DEPLOYMENT" \
  "${LOCAL_PORT}:3000" \
  >/tmp/crm-verify-portforward.log 2>&1 &

PF_PID=$!
log "Checking liveness and readiness..."

LIVE_OK=false
READY_OK=false

for attempt in {1..15}; do

  # Stop early if port-forward has crashed.
  if ! kill -0 "$PF_PID" 2>/dev/null; then
    cat /tmp/crm-verify-portforward.log >&2
    fail "Port-forward process exited unexpectedly"
  fi

  # -s: silent progress
  # -S omitted: suppress expected retry errors
  # -f: fail on HTTP 4xx/5xx
  if curl -fs --max-time 3 \
    "http://127.0.0.1:${LOCAL_PORT}/health/live" \
    >/dev/null; then
    LIVE_OK=true
  fi

  if curl -fs --max-time 3 \
    "http://127.0.0.1:${LOCAL_PORT}/health/ready" \
    >/dev/null; then
    READY_OK=true
  fi

  if [[ "$LIVE_OK" == "true" && "$READY_OK" == "true" ]]; then
    break
  fi

  sleep 2
done

if [[ "$LIVE_OK" != "true" || "$READY_OK" != "true" ]]; then
  echo "Port-forward logs:" >&2
  cat /tmp/crm-verify-portforward.log >&2
  fail "Application health verification failed"
fi

pass "Liveness endpoint returned HTTP 2xx"
pass "Readiness endpoint returned HTTP 2xx"

[[ "$LIVE_OK" == "true" ]] \
  || fail "Liveness endpoint failed"

pass "Liveness endpoint returned HTTP 2xx"

[[ "$READY_OK" == "true" ]] \
  || fail "Readiness endpoint failed"

pass "Readiness endpoint returned HTTP 2xx"

echo
echo "======================================"
echo " CRM API DEPLOYMENT VERIFIED"
echo "======================================"
echo "Cluster: $CONTEXT"
echo "Namespace: $NAMESPACE"
echo "Deployment: $DEPLOYMENT"
echo "Pod: $POD"
echo "Image: $ACTUAL_IMAGE"
echo "Argo CD: Synced / Healthy"
echo "Result: SUCCESS"
echo "======================================"
