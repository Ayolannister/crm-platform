#!/usr/bin/env bash
    set -euo pipefail

    BASE_URL="${BASE_URL:-http://localhost:3000}"
    PASSWORD="correct-horse-battery"
    RUN_ID="$(date +%s)"
    BODY_FILE="$(mktemp)"

    fail() { echo "FAIL: $*" >&2; exit 1; }
    pass() { echo "PASS: $*"; }

    # request METHOD PATH [TOKEN] [JSON_BODY] -> prints HTTP status, body saved to $BODY_FILE
    request() {
      local method="$1" path="$2" token="${3:-}" body="${4:-}"
      local args=(-s -o "$BODY_FILE" -w '%{http_code}' -X "$method" "$BASE_URL$path"
                  -H 'Content-Type: application/json')
      if [[ -n "$token" ]]; then args+=(-H "Authorization: Bearer $token"); fi
      if [[ -n "$body" ]]; then args+=(-d "$body"); fi
      curl "${args[@]}"
    }

    expect() {
      local expected="$1" actual="$2" label="$3"
      [[ "$actual" == "$expected" ]] || fail "$label: expected $expected, got $actual. Body: $(cat "$BODY_FILE")"
      pass "$label"
    }

    signup() {
      local slug="$1" email="$2" code
      code=$(request POST /auth/signup "" \
        "{\"orgName\":\"$slug\",\"orgSlug\":\"$slug\",\"email\":\"$email\",\"password\":\"$PASSWORD\"}")
      [[ "$code" == "201" ]] || fail "signup $slug returned $code: $(cat "$BODY_FILE")"
      local token
      token=$(jq -r .accessToken "$BODY_FILE")
      [[ -n "$token" && "$token" != "null" ]] || fail "signup $slug returned no token"
      echo "$token"
    }

    echo "Waiting for API readiness at $BASE_URL ..."
    for i in $(seq 1 30); do
      if [[ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/health/ready")" == "200" ]]; then
        pass "API is ready"
        break
      fi
      if [[ "$i" == "30" ]]; then fail "API not ready after 60 seconds"; fi
      sleep 2
    done

    SLUG_A="smoke-a-$RUN_ID"
    SLUG_B="smoke-b-$RUN_ID"
    TOKEN_A=$(signup "$SLUG_A" "a-$RUN_ID@smoke.test")
    TOKEN_B=$(signup "$SLUG_B" "b-$RUN_ID@smoke.test")
    pass "two tenants signed up"

    expect 201 "$(request POST /contacts "$TOKEN_A" '{"firstName":"Alice"}')" "tenant A creates a contact"
    expect 201 "$(request POST /contacts "$TOKEN_B" '{"firstName":"Bob"}')" "tenant B creates a contact"

    expect 200 "$(request GET /contacts "$TOKEN_A")" "tenant A lists contacts"
    NAMES_A=$(jq -r '[.[].firstName] | join(",")' "$BODY_FILE")
    [[ "$NAMES_A" == "Alice" ]] || fail "tenant A should see only Alice, saw: $NAMES_A"
    pass "tenant A sees only its own data"

    expect 200 "$(request GET /contacts "$TOKEN_B")" "tenant B lists contacts"
    NAMES_B=$(jq -r '[.[].firstName] | join(",")' "$BODY_FILE")
    [[ "$NAMES_B" == "Bob" ]] || fail "tenant B should see only Bob, saw: $NAMES_B"
    pass "tenant B sees only its own data"

    expect 401 "$(request GET /contacts)" "request without token is rejected"
    expect 401 "$(request GET /contacts "${TOKEN_A}x")" "tampered token is rejected"
    expect 400 "$(request POST /contacts "$TOKEN_A" \
      '{"firstName":"Mallory","orgId":"00000000-0000-0000-0000-000000000000"}')" \
      "client-supplied orgId is rejected"
    expect 409 "$(request POST /auth/signup "" \
      "{\"orgName\":\"dup\",\"orgSlug\":\"$SLUG_A\",\"email\":\"a-$RUN_ID@smoke.test\",\"password\":\"$PASSWORD\"}")" \
      "duplicate signup is rejected"

    rm -f "$BODY_FILE"
    echo "All smoke tests passed"