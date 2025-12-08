# URL Shortner

A production-minded fullstack URL shortener built with:

- Backend: Node.js, Express, TypeScript, Prisma, PostgreSQL.
- Frontend: Next.js, React, TypeScript, Tailwind CSS.
- Runtime: Docker Compose with PostgreSQL.

The backend is the most complete part right now. It supports short-link creation, redirects, click analytics, admin-key protected analytics access, request validation, rate limiting, Docker runtime configuration, and Prisma migrations.

## Current Backend Features

- Create short links with optional custom codes.
- Redirect short links through `GET /:code`.
- Record click analytics asynchronously.
- Fetch protected analytics through `GET /api/links/:code/analytics`.
- Export protected click analytics as CSV through `GET /api/links/:code/analytics/export.csv`.
- Fetch public link metadata through `GET /api/links/:code`.
- Update safe link metadata through `PATCH /api/links/:code`.
- Fetch owner-only operational summary through `GET /api/links/:code/admin`.
- Fetch owner-only audit history through `GET /api/links/:code/audit`.
- Disable or reactivate links through `PATCH /api/links/:code/status`.
- Reject unsafe target URLs such as private network and localhost addresses.
- Block reserved short codes that would collide with platform routes.
- Validate environment variables at startup.
- Use PostgreSQL migrations through Prisma.
- Include request IDs in error responses for production debugging.
- Expose runtime version metadata through `GET /version`.
- Apply API and create-link rate limits.
- Send explicit production-minded security headers with Helmet.
- Mark API JSON responses as `no-store` to avoid accidental caching.
- Use bounded graceful shutdown for container-friendly deploys.
- Serve `robots.txt` to discourage indexing short-link paths.

## Backend Quickstart

Use Node 20:

```sh
nvm use 20
```

Install backend dependencies:

```sh
cd Backend
npm install
```

Create an environment file:

```sh
cp .env.example .env
```

Start PostgreSQL from the repo root:

```sh
docker compose up postgres
```

Run Prisma migrations:

```sh
cd Backend
npm run prisma:deploy
```

Start the backend:

```sh
npm run dev
```

## Docker Runtime

From the repo root:

```sh
docker compose up --build
```

The backend service waits for PostgreSQL, deploys Prisma migrations, and then starts the Node.js server. The frontend service starts the Next.js standalone server on port `3000`.

## Important API Routes

- `GET /health`: process health check.
- `GET /ready`: database readiness check with query latency.
- `GET /version`: service version and deployment metadata.
- `GET /robots.txt`: crawler policy.
- `POST /api/links`: create a short link.
- `GET /api/links/:code`: read public metadata for a short link.
- `PATCH /api/links/:code`: update title, description, tags, or expiration with an admin key.
- `PATCH /api/links/:code/status`: disable or reactivate a short link with an admin key.
- `GET /api/links/:code/analytics`: read admin-key protected analytics.
- `GET /api/links/:code/analytics/export.csv`: download click events as CSV with an admin key.
- `GET /api/links/:code/admin`: read admin-key protected summary.
- `GET /api/links/:code/audit`: read admin-key protected audit history.
- `GET /:code`: redirect to the original target URL.

## Documentation

Read [understanding.md](./understanding.md) for detailed explanations of the architecture, backend choices, database design, security rules, and API behavior.

The API contract is documented in [docs/openapi.yaml](./docs/openapi.yaml).

Manual request examples are available in [docs/api-examples.http](./docs/api-examples.http).

Backend operations guidance is available in [docs/backend-runbook.md](./docs/backend-runbook.md).

Backend stack rationale is recorded in [docs/decisions/001-backend-stack.md](./docs/decisions/001-backend-stack.md).

Frontend-specific notes are available in [Frontend/README.md](./Frontend/README.md).
