# Infiniti — Cloud-Native, Multi-Tenant CRM

**Infiniti** is a full-stack customer relationship management app built with **Next.js** and **NestJS**. Register an organization, sign in, manage and search contacts, and view insights drawn from your organization's real contact data.

This repository also demonstrates Docker-based local development, Kubernetes deployment, GitHub Actions CI/CD, GitOps with Argo CD, observability, infrastructure as code, and local database backup/recovery.

> **New here?** You only need **Git, Docker with Docker Compose, and Node.js 24/npm** to run the application locally. **You do not need Kubernetes, Terraform, Argo CD, Helm, or cloud accounts** for the quick start.

## What you can do

- Create an organization and an account; log in with a short-lived authenticated session.
- Create, list, search, edit and delete contacts.
- View real-data contact counts, email/phone coverage, and profile completeness.
- Export your organization's contacts to CSV and set a compact table preference.
- Work in an organization-isolated workspace: contact access is enforced by the NestJS API.

**Not yet implemented:** API keys, webhooks, member/role administration, audit history, account profile editing, and advanced CRM modules. These are labeled *Coming soon* rather than exposed as nonfunctional controls.

## Architecture

```mermaid
flowchart LR
  Browser[Browser] --> Web[Next.js / Infiniti]
  Web --> API[NestJS CRM API]
  API --> PG[(PostgreSQL)]
  API --> Redis[(Redis)]
  GitHub[GitHub Actions] --> GHCR[GHCR images]
  GHCR --> Argo[Argo CD / Helm / Kustomize]
  Argo --> K8s[Kind Kubernetes]
  K8s --> Web
  K8s --> API
  API --> Prom[Prometheus]
  Prom --> Grafana[Grafana]
  API --> Alloy[Grafana Alloy]
  Alloy --> Loki[Loki]
  Alloy --> Tempo[Tempo]
  PG --> Backup[Encrypted backup]
  Backup --> Floci[Local S3 emulator: Floci]
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

### 2. Clone the project

```bash
git clone https://github.com/Ayolannister/crm-platform.git
cd crm-platform
```

To work on a feature branch that has **not yet been merged** into `main`, check out that branch explicitly. Releases and ongoing changes are tracked through GitHub pull requests.

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

In a **second terminal**:

```bash
cd crm-platform/apps/web
npm ci
```

If your second terminal is already in the repository root, use `cd apps/web` instead.

Create `apps/web/.env.local` with:

```dotenv
CRM_API_URL=http://127.0.0.1:3000
CRM_WEB_ORIGIN=http://localhost:3001
```

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

UI and operational screenshots can be stored under `docs/screenshots/` when reviewed. Avoid exposing credentials or personal customer contact data.

## Scope and production limitations

This is a **local-first portfolio implementation**. Compose includes development-only database credentials; Kind and Floci emulate local infrastructure. Public hosting requires a reachable HTTPS API, production-ready secrets and database, correct trusted origin/cookie configuration, durable off-host backups, appropriate access controls and operational hardening. A Next.js frontend on Vercel cannot directly call Kubernetes's private `crm-api.crm.svc.cluster.local` address.
