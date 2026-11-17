# Infiniti web app

Infiniti's frontend is built with Next.js 16, React 19, Tailwind CSS, TypeScript, and Lucide icons.

**For complete setup from a fresh clone**—including Git, Docker/Compose, Node.js, the NestJS API, PostgreSQL, Redis, environment variables, testing, and contribution instructions—read the [repository README](../../README.md).

## Frontend quick start

Start the API and database from the repository root first, as described in the main README.

```bash
cd apps/web
npm ci
```

Create `.env.local`:

```dotenv
CRM_API_URL=http://127.0.0.1:3000
CRM_WEB_ORIGIN=http://localhost:3001
```

Then:

```bash
npm run dev -- -p 3001
```

Open <http://localhost:3001>. For local testing, this origin must match `CRM_WEB_ORIGIN`. No API URL or secret should be hardcoded into frontend source.

## Checks

```bash
npm run lint
npm run build
```

For infrastructure, E2E testing, optional Kind/Argo CD deployment, contribution instructions, and production limitations, see the [main README](../../README.md).
