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
- Fetch public link metadata through `GET /api/links/:code`.
- Reject unsafe target URLs such as private network and localhost addresses.
- Validate environment variables at startup.
- Use PostgreSQL migrations through Prisma.
- Include request IDs in error responses for production debugging.
- Apply API and create-link rate limits.

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

The backend service waits for PostgreSQL, deploys Prisma migrations, and then starts the Node.js server.

## Important API Routes

- `GET /health`: process health check.
- `GET /ready`: database readiness check.
- `POST /api/links`: create a short link.
- `GET /api/links/:code`: read public metadata for a short link.
- `GET /api/links/:code/analytics`: read admin-key protected analytics.
- `GET /:code`: redirect to the original target URL.

## Documentation

Read [understanding.md](./understanding.md) for detailed explanations of the architecture, backend choices, database design, security rules, and API behavior.
