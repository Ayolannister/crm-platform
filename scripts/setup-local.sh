#!/usr/bin/env bash
# First-run setup for the self-contained Infiniti Docker Compose development stack.
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

for binary in docker node npm openssl; do
  if ! command -v "$binary" >/dev/null 2>&1; then
    printf 'Missing required tool: %s\nSee README.md for installation instructions.\n' "$binary" >&2
    exit 1
  fi
done

docker compose version >/dev/null
docker info >/dev/null 2>&1 || {
  echo 'Docker daemon unavailable. Start Docker and check your user permissions.' >&2
  exit 1
}

if [[ ! -f apps/api/.env ]]; then
  secret="$(openssl rand -hex 32)"
  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" == 'JWT_SECRET=' ]]; then
      printf 'JWT_SECRET=%s\n' "$secret"
    else
      printf '%s\n' "$line"
    fi
  done < apps/api/.env.example > apps/api/.env
  chmod 600 apps/api/.env
  echo 'Generated a unique API JWT secret in apps/api/.env (not printed).'
else
  echo 'Using existing apps/api/.env without overwriting it.'
fi

if ! grep -Eq '^JWT_SECRET=.{32,}$' apps/api/.env; then
  echo 'Missing/short JWT_SECRET in apps/api/.env. Set a unique value of at least 32 characters.' >&2
  exit 1
fi

if [[ ! -f apps/web/.env.local ]]; then
  cp apps/web/.env.example apps/web/.env.local
  echo 'Created apps/web/.env.local.'
else
  echo 'Using existing apps/web/.env.local without overwriting it.'
fi

echo 'Starting the database, migrations, Redis, and API through Docker Compose...'
docker compose up --build -d

echo 'Installing Next.js dependencies...'
npm --prefix apps/web ci

printf '\nInfiniti local dependencies are installed.\n'
printf 'Check the API: http://localhost:3000/health/live\n'
printf 'Start the web app: cd apps/web && npm run dev -- -p 3001\n'
printf 'Then open: http://localhost:3001\n'
printf '\nTo see API logs: docker compose logs --tail=100 api migrate postgres redis\n'
