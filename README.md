# Infiniti — Multi-Tenant CRM & Cloud-Native DevOps Platform

**Build connections. Manage relationships. See the bigger picture.**

Infiniti is a modern customer relationship management (CRM) application built with **Next.js, NestJS, PostgreSQL, and Redis**. Teams can register an organization, securely sign in, manage contact records, and explore insights calculated from their own data. The interface features a dark, lime-accented dashboard with responsive contact management.

Alongside the working application, the repository demonstrates **Docker Compose, GitHub Actions, container security scanning, GHCR, Kubernetes, Argo CD GitOps, Terraform, observability, and local encrypted backup exercises**.

> **Start here:** A first-time user can run Infiniti locally with **Git + Docker/Compose + Node.js 24/npm + OpenSSL**. The full Kubernetes toolchain is *optional* and not needed to start or contribute to the web app.

### On this page

[Features](#what-you-can-do) · [Quick setup](#fastest-setup-linuxmacos) · [Prerequisites](#1-install-prerequisites) · [Fork and clone](#2-fork-or-clone-the-project) · [Local setup](#quick-start-run-infiniti-after-cloning) · [Development](#developer-setup-and-contribution-workflow) · [Troubleshooting](#troubleshooting) · [Advanced deployment](#optional-kubernetes--gitops--operations-setup)

## What you can do

- Create an organization and an account; log in with a short-lived authenticated session.
- Create, list, search, edit and delete contacts.
- View real-data contact counts, email/phone coverage, and profile completeness.
- Export your organization's contacts to CSV and set a compact table preference.
- Work in an organization-isolated workspace: contact access is enforced by the NestJS API.

**Not yet implemented:** API keys, webhooks, member/role administration, audit history, account profile editing, and advanced CRM modules. These are labeled *Coming soon* rather than exposed as nonfunctional controls.

## Architecture

### Application: what runs on a contributor's computer

```mermaid
flowchart LR
    browser["Browser"] --> frontend["Infiniti (Next.js)"]
    frontend --> backend["CRM API (NestJS)"]
    backend --> postgres[("PostgreSQL")]
    backend --> redis[("Redis")]
```

For the **quick start**, Docker Compose manages PostgreSQL, Redis, migrations, and the API. Next.js runs on the host for fast editing.

### Optional DevOps infrastructure

```mermaid
flowchart LR
    source["GitHub repository"] --> ci["GitHub Actions"]
    ci --> registry["GitHub Container Registry"]
    registry --> releases["Image release pull request"]
    releases --> gitops["Argo CD"]
    gitops --> cluster["Kind Kubernetes"]
    cluster --> telemetry["Prometheus / Grafana / Loki / Tempo"]
    cluster --> backup["Encrypted local PostgreSQL backup"]
```

The second diagram describes the **additional local platform workflow**, not a prerequisite for running the app.

## Repository map

```text
crm-platform/
├── apps/
│   ├── web/                 # Infiniti Next.js frontend, forms and API proxies
│   │   ├── src/             # React components and App Router pages
│   │   └── .env.example     # Copy to .env.local
│   └── api/                 # NestJS API, authentication, contacts, migrations
│       ├── src/
│       └── .env.example     # Copy to .env and set JWT_SECRET
├── docker-compose.yml       # Database, Redis, API and one-shot migrations
├── deploy/                  # Kubernetes, Helm, Argo CD and observability
├── infra/                   # Terraform and database initialization
├── scripts/                 # Setup helper, local operations and verification scripts
└── .github/workflows/       # CI, security checks and image releases
```

## Tech stack

| Layer | Technology |
| --- | --- |
| Web | Next.js 16, React 19, TypeScript, Tailwind CSS, Lucide |
| API | NestJS, TypeScript, JWT, Drizzle ORM |
| Data | PostgreSQL 17, Redis 8 |
| Local environment | Docker, Docker Compose, Node.js 24 |
| Deployment | Docker, Kubernetes (Kind), Helm, Kustomize, Argo CD, GHCR |
| CI and security | GitHub Actions, Trivy, secret scanning |
| Observability | Prometheus, Grafana, Alertmanager, Loki, Alloy, Tempo |
| Infrastructure/recovery | Terraform, encrypted PostgreSQL backups, local Floci S3 |

## Quick start: run Infiniti after cloning

This is the **recommended path for users and first-time contributors**. It runs the database, Redis, API, and migrations in Docker Compose; Next.js runs on your computer for hot reload.

### Fastest setup (Linux/macOS)

After you **fork/clone** the repository and install the tools below, this helper generates a unique local JWT secret, copies example environment files without overwriting existing ones, starts the Docker Compose services, and installs the frontend dependencies:

```bash
# Run from the repository root
bash scripts/setup-local.sh

# Start the Next.js development server
cd apps/web
npm run dev -- -p 3001
```

Open **http://localhost:3001**, create an organization and account, and start managing contacts.

This is optional: the manual, fully explained steps below perform the same setup. The bootstrap script uses **local development credentials**; it is not a production deployment tool.

### 1. Install prerequisites

| Required | Why | Check |
| --- | --- | --- |
| **Git** | Clone the repository | `git --version` |
| **Docker Engine or Docker Desktop** | Run PostgreSQL, Redis and API containers | `docker --version` |
| **Docker Compose v2** (with `docker compose`) | Start local services | `docker compose version` |
| **Node.js 24** and **npm** | Run the Next.js frontend and development scripts | `node --version && npm --version` |
| **OpenSSL** | Generate a strong local JWT secret | `openssl version` |

Docker must be started and usable by your account (`docker info`). Install these tools using the official instructions for your OS: [Git](https://git-scm.com/downloads), [Docker](https://docs.docker.com/get-docker/), and [Node.js](https://nodejs.org/). Linux users may need to configure Docker permissions or run Docker commands with appropriate privileges.

**Ports used:** `3000` (API), `3001` (web), `5434` (host-accessible PostgreSQL). Redis runs inside Compose. Check that these host ports are free.

### 2. Fork or clone the project

```bash
# For read-only exploration:
git clone https://github.com/Ayolannister/crm-platform.git
cd crm-platform
```

**Contributing from a fork:** Click **Fork** on GitHub, then clone **your fork** instead:

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/crm-platform.git
cd crm-platform
git remote add upstream https://github.com/Ayolannister/crm-platform.git
```

Replace `YOUR_GITHUB_USERNAME` with your GitHub handle; don't type the placeholder literally.

**Important:** The `main` branch is the default checkout. If a feature is under review in a pull request, it is **not automatically included** in the default branch. Switch to its branch intentionally to test it.

### 3. Configure the API secret (local development only)

```bash
cp apps/api/.env.example apps/api/.env
```

Open `apps/api/.env` and set **`JWT_SECRET`** to a unique random value. For example:

```bash
openssl rand -hex 32
```

Copy the resulting value into the `JWT_SECRET=` line. **Do not commit `.env` or publish the secret.**

The `docker-compose.yml` file supplies container-specific `DATABASE_URL`, `REDIS_URL` and `PORT` settings. The sample database credentials in Compose are **for disposable local development only**. Do not reuse them on publicly accessible systems.

### 4. Start the local API and database

From the repository root:

```bash
docker compose up --build -d
docker compose ps
```

Compose builds the NestJS API image, initializes PostgreSQL and its application role, runs database migrations, and starts the API and Redis. On the first run, downloading/building images can take a little while.

Check the API:

```bash
curl http://localhost:3000/health/live
```

If it is not healthy, inspect the logs:

```bash
docker compose logs --tail=100 api migrate postgres redis
```

If you previously created a PostgreSQL volume with a different password or initialization configuration, updating Compose credentials alone will **not** reinitialize that volume. See [Troubleshooting](#troubleshooting) before making destructive changes.

### 5. Install frontend dependencies and configure the API URL

In a **second terminal**, navigate to the clone (adjust the location if needed):

```bash
cd crm-platform/apps/web
npm ci
```

If your second terminal is already in the repository root, run `cd apps/web` instead. There is **no root-level npm install**; the frontend and API have separate package files.

Copy the checked-in, non-secret example:

```bash
cp .env.example .env.local
```

It sets:

```dotenv
CRM_API_URL=http://127.0.0.1:3000
CRM_WEB_ORIGIN=http://localhost:3001
```

Edit `.env.local` if you use another port or backend address. The example contains **no passwords or secrets**.

These are **development-only** values. The Next.js server uses `CRM_API_URL` to reach NestJS. The app's origin check expects `CRM_WEB_ORIGIN` to match the browser origin **exactly**, including protocol and port. Do not disable origin validation to bypass a configuration mismatch.

### 6. Start Infiniti and create your workspace

```bash
npm run dev -- -p 3001
```

Open **http://localhost:3001** and select **Create an account**. Enter an organization name and a unique lowercase slug (e.g. `example-workspace`), plus your email and password. You can then log in at **http://localhost:3001/login** and use **http://localhost:3001/dashboard** to manage contacts.

> Use **`localhost:3001`**, not `127.0.0.1:3001`, in your browser with the example origin setting. Authentication sessions expire; log in again when needed.

### 7. Stop the local environment

Stop Next.js with **Ctrl+C**, then run from the repository root:

```bash
docker compose down
```

This keeps your PostgreSQL data in its Docker volume. **Do not run `docker compose down -v` unless you intentionally want to delete the local database volume and its data.**

## API endpoints at a glance

The frontend talks to NestJS through Next.js server-side routes. You normally use the browser rather than calling these endpoints manually.

| Method | API path | Purpose |
| --- | --- | --- |
| `POST` | `/auth/signup` | Create a user and an organization |
| `POST` | `/auth/login` | Authenticate and receive a short-lived token |
| `GET` | `/contacts` | List **only** the signed-in organization's contacts |
| `POST` | `/contacts` | Create a contact |
| `PATCH` | `/contacts/:id` | Update one of your organization's contacts |
| `DELETE` | `/contacts/:id` | Delete one of your organization's contacts |
| `GET` | `/health/live` | API process liveness |
| `GET` | `/health/ready` | API database readiness |

For `/contacts` endpoints, supply an `Authorization: Bearer <token>` header. The browser frontend manages its HTTP-only session cookie through Next.js API routes. Tenant boundaries are enforced by NestJS; cross-tenant update/delete attempts do not succeed.

## Administration dashboards

Infiniti has two separate **API-enforced** administration areas:

| Area | URL | Access | MVP capabilities |
| --- | --- | --- | --- |
| Organization administration | `/admin/organization` | Current organization's `owner` or `admin` | View organization/contact/member counts, add an existing registered user, switch organization, and (owners only) change roles/remove non-owner members |
| Platform administration | `/admin/platform` | An existing account explicitly present in `platform_admins` | Read-only organization directory and aggregate organization, user and membership counts |

- Every new organization creator becomes its **owner** automatically.
- Organization admins can add existing accounts as `member` but cannot promote other users, remove users, or change ownership; owners manage other admins/members.
- Added users can switch to a different organization; their membership is revalidated on every authenticated API request, so revoking membership immediately blocks their existing token.
- Platform administrators are **not** created through public signup or frontend settings. They are granted manually by an authorized database administrator.
- Platform admins do **not** gain unrestricted customer contact access; per-organization contacts remain protected by PostgreSQL row-level security.
- No automated email invitations, account suspension, billing tools, cross-tenant contact viewing, or audit-log UI are implemented.

### Deploying the admin schema

The admin APIs require the additional database migration `apps/api/drizzle/0003_platform_admins.sql`. Run the API's normal, reviewed Drizzle migrations **before deploying the admin-enabled backend**; use the privileged migration connection and never the restricted `infiniti_app` runtime connection. On a fresh Docker Compose install, the `migrate` service applies migrations automatically.

For production Neon, obtain a **direct** migration connection string from Neon and execute the existing migration process in an authorized environment with `MIGRATION_DATABASE_URL` set. Do not put a migration-owner password in GitHub, Vercel frontend settings, shell history, or the README.

### Granting the first platform admin

1. Register **your own** Infiniti user account normally.
2. In Neon SQL Editor, connected as the database owner, look up the user UUID by the **exact email you registered** (do not send that email or any credential to contributors):

```sql
SELECT id, email FROM users WHERE email = 'YOUR_REGISTERED_EMAIL';
```

3. After verifying it is the intended account, grant the role:

```sql
INSERT INTO platform_admins (user_id)
SELECT id FROM users WHERE email = 'YOUR_REGISTERED_EMAIL'
ON CONFLICT (user_id) DO NOTHING;
```

4. Sign out and sign back in. Open `/admin/platform`. Ordinary users should receive HTTP 403 from the platform API.

To revoke a platform grant, a database administrator can delete that account's row from `platform_admins`; no public HTTP endpoint can assign or remove platform grants. The backend checks the grants table on each platform-admin request.

### Admin permission tests

Use a **disposable local environment**; the script creates two organizations and accounts:

```bash
bash scripts/test-crm-admin-e2e.sh
```

It verifies owner access, member restrictions, member promotion, cross-role restrictions, platform-admin denial for ordinary owners, organization switching and immediate token revocation on member removal. It removes its added membership, but the two test accounts and organizations remain.

## Developer setup and contribution workflow

The quick start above is enough to modify **`apps/web`** (frontend) while testing against the containerized API.

### Useful commands

From `apps/web`:

```bash
npm ci
npm run lint
npm run build
npm run dev -- -p 3001
```

From `apps/api`:

```bash
npm ci
npm run lint
npm test
npm run build
```

### Developing the backend locally (optional)

You can develop the NestJS API outside Docker while using Compose for the database and Redis:

1. From the repository root, start just the data services: `docker compose up -d postgres redis`.
2. Make sure `apps/api/.env` includes a strong `JWT_SECRET`, and set the **host-side** connection URLs (matching `apps/api/.env.example`):
   - `DATABASE_URL=postgres://crm_app:crm_app@localhost:5434/crm`
   - `MIGRATION_DATABASE_URL=postgres://crm:crm@localhost:5434/crm`
   - `REDIS_URL=redis://localhost:6379` **only if you separately publish Redis to the host** (Compose currently does not publish that port).
3. For a simpler workflow that does not require reconfiguring Redis networking, **keep the API running in Docker Compose** and rebuild after backend edits with `docker compose up --build -d api`.

The backend's `apps/api/package.json` also provides `npm run start:dev` and `npm run db:migrate`, but these require correctly configured local database/network settings. **Do not run migrations against a shared or production database.**

### Git workflow for contributions

```bash
git switch main
git pull --ff-only origin main
git switch -c feature/short-description
```

Make changes in the relevant app or infrastructure directory. Run lint, tests and builds for the code you changed. To submit:

```bash
git add <files-you-changed>
git diff --cached --check
git commit -m "feat: describe your change"
git push -u origin feature/short-description
```

Open a pull request against `main`. Contributors without write access should **fork the repository**, push to a branch on their fork, and open a PR from that branch instead. Include a summary, screenshots for UI work, and test results. Avoid unrelated refactors. Do not commit secrets, local environment files, database contents, or generated build folders.

### Run the end-to-end tenant-isolation test (advanced)

The provided script targets an **existing Kind cluster** named/configured with Kubernetes namespace `crm` and service `crm-api`; it does **not** test the Docker Compose API directly:

```bash
# Requires kubectl, curl, jq, OpenSSL, and a running crm-api service in Kind
bash scripts/test-crm-e2e.sh
```

It tests signup, login, unauthorized requests, CRUD, persistence and cross-organization access. It removes its test contacts on exit; **the two test organizations and users remain** in the target database. Run it only against a disposable local environment.

## Optional: Kubernetes / GitOps / operations setup

These tools are **not needed to use Infiniti locally**. Install them only if you are working on platform infrastructure:

| Tool | Purpose |
| --- | --- |
| **Kind** | Local Kubernetes cluster running in Docker |
| **kubectl** | Manage workloads and use port forwarding |
| **Helm** | Deploy the CRM API chart |
| **Kustomize** | Render frontend Kubernetes manifests (also supported by `kubectl -k`) |
| **Argo CD** (cluster installation and optional CLI) | GitOps synchronization |
| **Terraform** | Infrastructure provisioning and validation |
| **GitHub CLI (`gh`)** | Convenient PR, workflow and release operations |
| **Trivy** | Local container security scans |
| **Floci / age / backup tooling** | Local S3 emulation and encrypted backup/recovery exercises |

See `deploy/` for Kubernetes, Helm, Argo CD and observability manifests, `infra/` for infrastructure and database initialization, `.github/workflows/` for CI/CD, and `scripts/` for verification and operations tooling.

If the full local stack is **already deployed** in Kind, you can preview the frontend through:

```bash
kubectl -n crm port-forward svc/crm-web 3001:80
```

Alternatively, run Next.js from source with a port-forwarded backend:

```bash
kubectl -n crm port-forward svc/crm-api 8080:80
# in another terminal
cd apps/web
# Set CRM_API_URL=http://127.0.0.1:8080 and CRM_WEB_ORIGIN=http://localhost:3001 in .env.local
npm ci
npm run dev -- -p 3001
```

For Grafana in an existing cluster, a commonly used service name is `kps-grafana` in namespace `observability`; inspect the actual services with `kubectl get svc -n observability` before forwarding.

### CI/CD and GitOps

The API workflow builds, tests, scans and validates changes, then opens an image-digest release PR for the local environment. The frontend workflow (`.github/workflows/crm-web.yml`) builds and scans the Next.js image and, on configured merges to `main`, publishes to GHCR and opens a separate frontend release PR. Merging a release PR changes the desired image in Git; Argo CD can then synchronize it to Kind. Publishing and deployment are deliberately separate.

Kind must be able to pull GHCR images (public package or appropriate `imagePullSecrets`). Local `crm-web:crud-fix` images are development artifacts, not portable release references.

## Troubleshooting

| Symptom | Check / fix |
| --- | --- |
| `docker compose` command unavailable | Install Docker Compose **v2** and verify `docker compose version`. |
| Cannot connect to Docker daemon | Start Docker and verify `docker info` and your user permissions. |
| Port 3000 or 3001 already in use | Stop the conflicting process/port-forward, or adjust local ports and matching environment variables. |
| Frontend says backend unavailable | Verify `docker compose ps`, `curl http://localhost:3000/health/live`, and `CRM_API_URL`. |
| Login or contact changes return `403 Forbidden` | Check `CRM_WEB_ORIGIN=http://localhost:3001` and use exactly that origin in the browser. |
| Contacts API returns `Cannot PATCH /contacts/...` | The API image may be older than the source that implements edit/delete. Rebuild/redeploy API. |
| Docker build or migration fails | Run `docker compose logs --tail=100 api migrate postgres` and inspect the error before retrying. |
| Auth requests unexpectedly fail | Verify `JWT_SECRET` is configured and consistent for the API instance; try logging in again after restarting. |
| Old PostgreSQL credentials persist after changing Compose settings | Docker initialization scripts run only on a **new** data volume. Preserve/back up data; recreate only a disposable development volume intentionally. |
| Next.js warns about a parent `package-lock.json` | It is a Turbopack root-discovery warning; it is not necessarily a build failure. |
| `kubectl` or `argocd` cannot reach the cluster | These are only needed for the **optional Kubernetes path**, not the Docker Compose quick start. |

## Screenshots

UI and operational screenshots can be stored under `docs/screenshots/` when reviewed. Suggested screenshots: Infiniti dashboard, contact editor, Grafana dashboard, and Argo CD application health. **Use synthetic test contacts**, not real customer data.

## License

No license file is currently included. Being publicly visible on GitHub is **not** the same as granting an open-source license. Forking and submitting improvements on GitHub is possible, but rights to redistribute or use the code elsewhere depend on the repository owner's licensing decision.

## Scope and production limitations

This is a **local-first portfolio implementation**. Compose includes development-only database credentials; Kind and Floci emulate local infrastructure. Public hosting requires a reachable HTTPS API, production-ready secrets and database, correct trusted origin/cookie configuration, durable off-host backups, appropriate access controls and operational hardening. A Next.js frontend on Vercel cannot directly call Kubernetes's private `crm-api.crm.svc.cluster.local` address.
