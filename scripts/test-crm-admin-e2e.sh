#!/usr/bin/env bash
# Tests organization admin and platform-admin denial against a DISPOSABLE local API.
# Leaves two test accounts/orgs; cleans added membership on exit.
set -Eeuo pipefail
for bin in curl jq openssl; do command -v "$bin" >/dev/null || { echo "Missing: $bin" >&2; exit 1; }; done

API_URL="${API_URL:-http://127.0.0.1:3000}"
if [[ "$API_URL" != http://127.0.0.1:* && "$API_URL" != http://localhost:* && "${ALLOW_REMOTE_ADMIN_E2E:-}" != "yes" ]]; then
  echo "Refusing to create test accounts on a remote service; use a disposable local API." >&2
  exit 1
fi
API_URL="${API_URL%/}"
work="$(mktemp -d)"
owner_token='' member_id='' added=false
cleanup() {
  if [[ "$added" == true && -n "$owner_token" && -n "$member_id" ]]; then
    curl -fsS -X DELETE -H "Authorization: Bearer $owner_token" "$API_URL/admin/organization/members/$member_id" >/dev/null || true
  fi
  rm -rf "$work"
}
trap cleanup EXIT

api() {
  local method=$1 path=$2 outfile=$3 token=${4:-} body=${5:-}
  local args=(-sS --max-time 20 -o "$outfile" -w '%{http_code}' -X "$method")
  [[ -z "$token" ]] || args+=(-H "Authorization: Bearer $token")
  [[ -z "$body" ]] || args+=(-H 'Content-Type: application/json' -d "$body")
  curl "${args[@]}" "$API_URL$path"
}
expect() {
  local got=$1 want=$2 name=$3
  if [[ "$got" != "$want" ]]; then
    echo "FAIL: $name expected $want got $got" >&2
    exit 1
  fi
  echo "PASS: $name"
}

curl -fsS --max-time 10 "$API_URL/health/ready" > /dev/null
id="$(openssl rand -hex 5)"
secret="$(openssl rand -base64 32)"
for label in owner member; do
  email="infiniti-admin-e2e-$label-$id@example.com"
  payload="$(jq -nc --arg org "$label" --arg slug "inf-admin-$label-$id" --arg email "$email" --arg password "$secret" '{orgName:($org+" admin test"),orgSlug:$slug,email:$email,password:$password}')"
  status="$(api POST /auth/signup "$work/$label.json" "" "$payload")"
  expect "$status" 201 "Signup $label"
done
owner_token="$(jq -er .accessToken "$work/owner.json")"
member_token="$(jq -er .accessToken "$work/member.json")"
member_id="$(jq -er '.sub // empty' "$work/member.json" 2>/dev/null || true)"
member_email="infiniti-admin-e2e-member-$id@example.com"
status="$(api GET /admin/organization "$work/org.json" "$owner_token")"
expect "$status" 200 'Owner organization dashboard'
owner_org="$(jq -er '.organization.id' "$work/org.json")"
status="$(api GET /admin/platform "$work/platform.json" "$owner_token")"
expect "$status" 403 'Ordinary organization owner cannot access platform admin'
status="$(api POST /admin/organization/members "$work/add.json" "$owner_token" "$(jq -nc --arg email "$member_email" '{email:$email,role:"member"}')")"
expect "$status" 201 "Owner adds existing member"
added=true
status="$(api GET /auth/organizations "$work/orgs.json" "$member_token")"
expect "$status" 200 "Member lists organizations"
jq -e --arg id "$owner_org" 'any(.[]; .id == $id)' "$work/orgs.json" > /dev/null
status="$(api POST /auth/switch "$work/switch.json" "$member_token" "$(jq -nc --arg id "$owner_org" '{orgId:$id}')")"
expect "$status" 200 "Member switches organization"
switched_token="$(jq -er .accessToken "$work/switch.json")"
status="$(api GET /admin/organization "$work/forbidden.json" "$switched_token")"
expect "$status" 403 "Member cannot administer organization"
status="$(api GET /admin/organization "$work/org.json" "$owner_token")"
expect "$status" 200 "Owner sees added member"
member_id="$(jq -er --arg email "$member_email" '.members[] | select(.email==$email) | .userId' "$work/org.json")"
status="$(api PATCH "/admin/organization/members/$member_id" "$work/role.json" "$owner_token" '{"role":"admin"}')"
expect "$status" 200 "Owner promotes admin"
status="$(api GET /admin/organization "$work/admin.json" "$switched_token")"
expect "$status" 200 "Promoted admin can view organization"
status="$(api PATCH "/admin/organization/members/$member_id" "$work/denied.json" "$switched_token" '{"role":"member"}')"
expect "$status" 403 "Admin cannot change roles"
status="$(api DELETE "/admin/organization/members/$member_id" "$work/remove.json" "$owner_token")"
expect "$status" 200 "Owner removes member"
added=false
status="$(api GET /contacts "$work/revoked.json" "$switched_token")"
expect "$status" 401 "Revoked member token denied immediately"
echo "PASS: Admin permissions and membership revocation. Test users and organizations remain."
