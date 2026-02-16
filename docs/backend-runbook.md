# Backend Runbook

This runbook is for operating the URL Shortner backend in development, staging, and production-like environments.

## Service Overview

- Runtime: Node.js 20.
- HTTP framework: Express.
- Database: PostgreSQL.
- ORM and migrations: Prisma.
- Default local port: `5000`.
- Main process entrypoint: `dist/src/server.js`.

## Required Environment

Set these values before starting the backend:

- `NODE_ENV`: `development`, `test`, or `production`.
- `APP_VERSION`: release version shown by `/version`.
- `GIT_SHA`: commit SHA shown by `/version`.
- `PORT`: HTTP port.
- `API_BASE_URL`: public backend base URL used to generate short links.
- `WEB_BASE_URL`: public frontend base URL used for analytics links.
- `DATABASE_URL`: PostgreSQL connection string.
- `CORS_ORIGINS`: allowed frontend origins.
- `IP_HASH_SALT`: random deployment secret for IP hashing.
- `SHUTDOWN_TIMEOUT_MS`: maximum graceful shutdown wait time.

## Deployment Steps

1. Build the backend image or compile the backend with `npm run build`.
2. Ensure PostgreSQL is reachable.
3. Run `npx prisma migrate deploy`.
4. Start `node dist/src/server.js`.
5. Check `GET /health`.
6. Check `GET /ready`.
7. Check `GET /version` and confirm the expected release.

## Migration Policy

Use Prisma migrations as the source of truth. Do not manually edit production tables unless an incident requires it and the change is documented afterward.

Recommended production flow:

1. Apply migrations as a release job.
2. Start new backend instances.
3. Verify `/ready`.
4. Roll back application containers if readiness fails.

## Logs

The backend uses Pino structured logs. Logs should be collected by the hosting platform and searchable by:

- request ID;
- route;
- status code;
- link ID when present;
- error code.

Sensitive headers such as authorization and admin keys are redacted.

## Incident Checks

If redirects are failing:

- confirm `/health` works;
- confirm `/ready` works;
- check PostgreSQL availability;
- inspect errors by request ID;
- verify the link is not `DISABLED` or `EXPIRED`.

If analytics are missing:

- confirm click insert errors are not appearing in logs;
- verify the click event table has new rows;
- check if ad blockers or bot traffic patterns are affecting requests;
- confirm the admin key is valid.

If create-link requests are failing:

- check rate-limit responses;
- check target URL validation errors;
- check reserved-code conflicts;
- check PostgreSQL unique conflicts for custom codes.

## Backup and Recovery

Back up PostgreSQL regularly. The most important tables are:

- `Link`;
- `ClickEvent`;
- `LinkAuditEvent`.

For disaster recovery, restore PostgreSQL first, then start the backend and verify `/ready`.

## Security Reminders

- Use a strong unique `IP_HASH_SALT` per environment.
- Do not log admin keys.
- Keep `CORS_ORIGINS` narrow.
- Run behind HTTPS in production.
- Rotate database credentials using the hosting platform's secret process.
