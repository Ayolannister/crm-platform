#!/usr/bin/env bash
set -Eeuo pipefail
# Disposable E2E tests: creates two test organizations/users, cleans up test contacts.
# Test organizations and users intentionally remain; no existing records are modified.
for bin in kubectl jq curl openssl; do command -v "$bin" >/dev/null || { echo "Missing: $bin" >&2; exit 1; }; done
WORK=$(mktemp -d)
PF_PID=''
A_TOKEN='' B_TOKEN='' A_ID='' B_ID=''
BASE="http://127.0.0.1:18080"
cleanup() {
  if [[ -n "$A_ID" && -n "$A_TOKEN" ]]; then curl -sS --max-time 4 -o /dev/null -X DELETE -H "Authorization: Bearer $A_TOKEN" "$BASE/contacts/$A_ID" || true; fi
  if [[ -n "$B_ID" && -n "$B_TOKEN" ]]; then curl -sS --max-time 4 -o /dev/null -X DELETE -H "Authorization: Bearer $B_TOKEN" "$BASE/contacts/$B_ID" || true; fi
  [[ -z "$PF_PID" ]] || kill "$PF_PID" 2>/dev/null || true
  rm -rf "$WORK"
}
trap cleanup EXIT
kubectl -n crm port-forward svc/crm-api 18080:80 >"$WORK/portforward.log" 2>&1 &
PF_PID=$!
for _ in $(seq 1 30); do curl -sf --max-time 2 "$BASE/health/live" >/dev/null && break; sleep 1; done
curl -sf "$BASE/health/live" >/dev/null || { cat "$WORK/portforward.log"; exit 1; }

api() { # method path output-file token-or-empty [json-body]
  local method=$1 path=$2 file=$3 token=$4 body=${5:-}
  local args=(-sS --max-time 15 -o "$file" -w '%{http_code}' -X "$method")
  [[ -z "$token" ]] || args+=(-H "Authorization: Bearer $token")
  [[ -z "$body" ]] || args+=(-H 'Content-Type: application/json' --data "$body")
  curl "${args[@]}" "$BASE$path"
}
expect() { # status expected status description [body-path]
  local got=$1 expected=$2 label=$3 file=${4:-}
  if [[ "$got" != "$expected" ]]; then
    echo "FAIL $label: expected $expected, got $got" >&2
    [[ -z "$file" ]] || jq '{message,statusCode}' "$file" 2>/dev/null || true
    exit 1
  fi
  echo "PASS $label ($got)"
}
N=$(openssl rand -hex 6)
PASSWORD=$(openssl rand -base64 32)
for org in a b; do
  email="crm-e2e-$org-$N@example.com"
  body=$(jq -nc --arg name "CRM E2E $org $N" --arg slug "crm-e2e-$org-$N" --arg email "$email" --arg password "$PASSWORD" '{orgName:$name,orgSlug:$slug,email:$email,password:$password}')
  status=$(api POST /auth/signup "$WORK/$org.json" '' "$body")
  expect "$status" 201 "Signup tenant $org" "$WORK/$org.json"
  token=$(jq -er '.accessToken' "$WORK/$org.json")
  if [[ "$org" == a ]]; then A_TOKEN=$token; else B_TOKEN=$token; fi
  login_body=$(jq -nc --arg email "$email" --arg password "$PASSWORD" '{email:$email,password:$password}')
  status=$(api POST /auth/login "$WORK/login.json" '' "$login_body")
  expect "$status" 200 "Login tenant $org" "$WORK/login.json"
done
status=$(api GET /contacts "$WORK/anon.json" '')
expect "$status" 401 'Reject unauthenticated contacts' "$WORK/anon.json"
A_BODY=$(jq -nc --arg email "a-$N@example.com" '{firstName:"TenantA",lastName:"E2E",email:$email,phone:"08012345678"}')
B_BODY=$(jq -nc --arg email "b-$N@example.com" '{firstName:"TenantB",lastName:"E2E",email:$email}')
status=$(api POST /contacts "$WORK/a-contact.json" "$A_TOKEN" "$A_BODY")
expect "$status" 201 'Create tenant A contact' "$WORK/a-contact.json"
A_ID=$(jq -er '.id' "$WORK/a-contact.json")
status=$(api POST /contacts "$WORK/b-contact.json" "$B_TOKEN" "$B_BODY")
expect "$status" 201 'Create tenant B contact' "$WORK/b-contact.json"
B_ID=$(jq -er '.id' "$WORK/b-contact.json")
status=$(api GET /contacts "$WORK/a-list.json" "$A_TOKEN")
expect "$status" 200 'List tenant A contacts' "$WORK/a-list.json"
jq -e --arg aid "$A_ID" --arg bid "$B_ID" 'any(.[]; .id == $aid) and (all(.[]; .id != $bid))' "$WORK/a-list.json" >/dev/null || { echo 'FAIL tenant A isolation'; exit 1; }
echo 'PASS tenant A cannot list B contact'
status=$(api GET /contacts "$WORK/b-list.json" "$B_TOKEN")
expect "$status" 200 'List tenant B contacts' "$WORK/b-list.json"
jq -e --arg aid "$A_ID" --arg bid "$B_ID" 'any(.[]; .id == $bid) and (all(.[]; .id != $aid))' "$WORK/b-list.json" >/dev/null || { echo 'FAIL tenant B isolation'; exit 1; }
echo 'PASS tenant B cannot list A contact'
status=$(api PATCH "/contacts/$A_ID" "$WORK/foreign-patch.json" "$B_TOKEN" '{"firstName":"CrossTenantChange"}')
[[ "$status" == 403 || "$status" == 404 ]] || { echo "FAIL cross-tenant PATCH accepted/status $status"; exit 1; }
echo "PASS reject cross-tenant PATCH ($status)"
status=$(api DELETE "/contacts/$A_ID" "$WORK/foreign-delete.json" "$B_TOKEN")
[[ "$status" == 403 || "$status" == 404 ]] || { echo "FAIL cross-tenant DELETE accepted/status $status"; exit 1; }
echo "PASS reject cross-tenant DELETE ($status)"
status=$(api PATCH "/contacts/$A_ID" "$WORK/edited.json" "$A_TOKEN" '{"firstName":"EditedE2E"}')
expect "$status" 200 'Edit own contact' "$WORK/edited.json"
status=$(api GET /contacts "$WORK/verified.json" "$A_TOKEN")
expect "$status" 200 'Verify edit persisted' "$WORK/verified.json"
jq -e --arg id "$A_ID" 'any(.[]; .id == $id and .firstName == "EditedE2E")' "$WORK/verified.json" >/dev/null || { echo 'FAIL edit did not persist'; exit 1; }
echo 'PASS edit persisted'
status=$(api DELETE "/contacts/$A_ID" "$WORK/deleted.json" "$A_TOKEN")
[[ "$status" == 200 || "$status" == 204 ]] || { echo "FAIL delete own contact status=$status"; exit 1; }
A_ID=''
echo 'PASS delete own contact'
status=$(api GET /contacts "$WORK/after-delete.json" "$A_TOKEN")
expect "$status" 200 'List after delete' "$WORK/after-delete.json"
jq -e --arg email "a-$N@example.com" 'all(.[]; .email != $email)' "$WORK/after-delete.json" >/dev/null || { echo 'FAIL contact still present'; exit 1; }
echo 'PASS deletion persisted'
echo 'PASS CRM API E2E + tenant isolation. Test contacts cleaned on exit; two test orgs/users remain.'
