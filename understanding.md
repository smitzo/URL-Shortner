# URL Shortner - Deep Technical Understanding

This document explains the project in engineering-detail. The goal is not only to describe what each file does, but also why each decision exists, how the pieces work together, and what tradeoffs were accepted.

## 1. Product Goal

The application is a production-minded URL shortener. A user can submit a long URL, receive a short URL, share that short URL, and later inspect analytics such as total clicks, recent click events, browser/device breakdowns, referrers, and daily click trends.

The project is intentionally split into a backend and frontend:

- `Backend`: Node.js, Express, TypeScript, Prisma, PostgreSQL.
- `Frontend`: Next.js, React, TypeScript, Tailwind CSS.
- `docker-compose.yml`: local production-like runtime with PostgreSQL and the backend container.

This split keeps the API independently deployable, testable, and scalable. URL redirects are latency-sensitive, so the backend owns redirect behavior directly instead of routing redirects through the Next.js frontend.

## 2. Why Node.js and Express for the Backend

Node.js is a strong fit for a URL shortener because the workload is mostly I/O-bound: receive HTTP request, query PostgreSQL, insert click analytics, and redirect. Node handles this style of concurrency efficiently with its event loop.

Express was chosen because it is small, predictable, and widely understood in production teams. A framework like NestJS would add a formal architecture layer, but for this project Express plus clear module boundaries gives enough structure without heavy ceremony.

The backend is written in TypeScript because production APIs benefit from compile-time contracts. Types catch mismatched request shapes, service return values, and accidental `undefined` usage before deployment.

## 3. Why PostgreSQL and Prisma

PostgreSQL is used because URL and analytics data are relational:

- a `Link` has many `ClickEvent` rows;
- analytics often require grouping by link, day, browser, device, OS, or referrer;
- indexes matter for redirect lookup and analytics queries;
- migrations are important in a production project.

Prisma is used as the database access layer because it gives:

- generated TypeScript types from the schema;
- repeatable migrations;
- safe query APIs for normal CRUD operations;
- raw SQL escape hatches for analytics queries such as daily click aggregation.

This is a practical balance: most code stays strongly typed and readable, while PostgreSQL-specific analytics can still use SQL where SQL is the better tool.

## 4. Backend Folder Structure

The backend is organized by responsibility:

- `src/app.ts`: creates the Express application and registers middleware/routes.
- `src/server.ts`: starts the HTTP server and handles graceful shutdown.
- `src/config`: environment and HTTP configuration.
- `src/db`: Prisma client lifecycle.
- `src/lib`: shared application primitives like logging and custom errors.
- `src/middleware`: request ID, validation, rate limits, error handling, and 404 handling.
- `src/modules/links`: all URL-shortener domain logic.
- `src/routes`: top-level route composition.
- `src/utils`: small generic helpers.
- `prisma`: schema, migrations, and seed data.
- `tests`: test cases for helpers and app wiring.

This structure avoids putting everything in one `app.ts`. It also avoids over-engineering with many layers that do not yet pay rent. The link domain has its own module because it is the core business area.

## 5. Environment Validation

`src/config/env.ts` reads process environment variables and validates them with Zod. This is important because environment mistakes are common in production:

- missing `DATABASE_URL`;
- invalid `API_BASE_URL`;
- accidentally setting a non-numeric rate limit;
- forgetting a privacy salt.

The app fails fast if required config is invalid. This is better than letting the server boot and then failing at the first request.

Important variables include:

- `PORT`: backend HTTP port.
- `API_BASE_URL`: base URL used to generate short links.
- `WEB_BASE_URL`: frontend base URL used to generate analytics page links.
- `DATABASE_URL`: PostgreSQL connection string.
- `CORS_ORIGINS`: comma-separated frontend origins allowed by CORS.
- `IP_HASH_SALT`: deployment-specific salt used before hashing IP addresses.
- rate-limit and redirect-cache settings.

## 6. URL Safety

The backend rejects URLs that do not use `http` or `https`. It also rejects loopback and private-network targets such as:

- `localhost`;
- `127.0.0.1`;
- `10.x.x.x`;
- `172.16.x.x` through `172.31.x.x`;
- `192.168.x.x`;
- `169.254.x.x`.

This matters because a public URL shortener can otherwise be abused as a server-side request forgery helper. Even though the backend does not fetch the target URL today, blocking private targets is a defensive product rule: users should not be able to create short public aliases to internal admin panels, metadata services, or private network tools.

Fragments are removed from target URLs because fragments are not sent to servers and usually do not belong in canonical stored URLs. Query strings are preserved because they often represent real destination state.

## 7. Short Code Generation

Short codes are generated with `nanoid` using a URL-safe alphanumeric alphabet. Codes are compact and random, which avoids sequential guessing patterns. The backend retries code generation on database unique conflicts.

Why random codes instead of auto-increment IDs?

- They are harder to enumerate.
- They do not reveal total link volume.
- They avoid coupling public identifiers to database primary keys.

The database still has an internal `id` for stable relational references. The public-facing identifier is `code`.

## 8. Admin Keys

When a link is created, the backend returns an `adminKey`. This key is required to view protected analytics or perform administrative actions later.

The backend stores only a SHA-256 hash of the admin key, not the key itself. Verification uses `timingSafeEqual` to avoid leaking comparison timing details.

This design gives anonymous users ownership-like control without requiring a full authentication system in the first production version. A future version could add user accounts and map links to user IDs, but the admin-key model keeps the initial product simpler while still preventing public analytics access.

## 9. Redirect Flow

The redirect route is `GET /:code`.

The flow is:

1. Validate the code format.
2. Look up the link by `code`.
3. Reject missing, disabled, or expired links.
4. Build click metadata from the request.
5. Insert a `ClickEvent` asynchronously.
6. Redirect the client to the target URL.

Click recording is intentionally asynchronous with `void recordClick(...).catch(...)`. Redirects should stay fast. If analytics insertion fails temporarily, the user should still reach the destination. The failure is logged with the link ID for observability.

## 10. Analytics Flow

The analytics route is `GET /api/links/:code/analytics`.

It requires an admin key, either via:

- `X-Admin-Key` header; or
- `adminKey` query parameter.

The endpoint returns:

- link metadata;
- total clicks;
- recent click events;
- breakdown by browser;
- breakdown by OS;
- breakdown by device;
- breakdown by referrer;
- daily click counts.

The query accepts optional `from`, `to`, and `limit` parameters. `limit` is bounded to protect the database from unbounded recent-event reads. The date range rejects inverted windows where `from` is after `to`.

## 11. Public Link Metadata Endpoint

The backend includes `GET /api/links/:code` to fetch public metadata for a short link without triggering a redirect and without exposing protected analytics.

What it returns:

- `id`;
- `code`;
- generated `shortUrl`;
- `targetUrl`;
- title and description;
- tags;
- status;
- expiration date;
- creation and update timestamps.

Why this endpoint exists:

- The frontend can show a link summary without accidentally recording a click.
- Analytics pages can display link context separately from protected analytics.
- API clients can verify that a short code exists before presenting a management UI.

Why it does not return click counts:

- Click counts are analytics data.
- Analytics are protected by admin key.
- Keeping this endpoint public but limited prevents accidental leakage.

How it works:

1. Route validation checks the `code` path parameter.
2. The controller calls `getPublicLink`.
3. The service queries Prisma by unique `code`.
4. Missing links throw a typed `AppError`.
5. The presenter shapes the Prisma record into a public API response.

This is the best current choice because it separates "read public link identity" from "redirect user" and "read private analytics." Those are three different use cases and should not be overloaded into one endpoint.

## 12. Response Envelopes

Successful JSON responses use a `{ data: ... }` envelope. Some responses may also include `meta`.

Why this pattern is useful:

- frontend code can consistently read `response.data`;
- future pagination can add `meta` without changing top-level response shape;
- errors can consistently use `{ error: ... }`.

This is a small convention, but conventions compound into maintainable APIs.

## 13. Error Handling and Request IDs

Errors are handled centrally in `src/middleware/error-handler.ts`.

The middleware recognizes:

- Zod validation errors;
- custom `AppError` instances;
- Prisma unique conflicts;
- unknown server errors.

Every error response includes `requestId` when available. The request ID is also sent as an `x-request-id` response header. This helps production debugging: a user can report a request ID, and logs can be searched for the same ID.

## 14. Rate Limiting

The backend uses `express-rate-limit`.

There is a general API rate limit and a stricter create-link limit. Link creation is more expensive and more abuse-prone than simple reads, so it deserves its own threshold.

Rate limiting is not a complete abuse-prevention system, but it is a necessary first layer.

## 15. Docker and PostgreSQL Runtime

The root `docker-compose.yml` defines PostgreSQL and backend services. PostgreSQL has a healthcheck, and the backend waits for that healthcheck before starting.

The backend container runs migrations before starting the server:

```sh
npx prisma migrate deploy && node dist/src/server.js
```

This makes local production-like startup repeatable. In a larger deployment, migrations might be run as a separate release job, but for this project Compose startup is practical and clear.

## 16. Testing Strategy

The project includes tests for pure helpers and app wiring. The current instruction is not to run tests during this generation phase, but the tests remain valuable code artifacts.

The test approach is intentionally layered:

- pure utility tests for URL rules, code generation, security helpers, and request context;
- schema tests for validation behavior;
- app wiring tests for Express hardening.

Database integration tests can be added once the Docker PostgreSQL flow is active in the development loop.

## 17. Reserved Short Codes

The backend blocks reserved short codes such as `api`, `health`, and `ready`.

What this feature is:

- a small domain rule in `reserved-codes.ts`;
- a check inside link creation before custom codes are inserted;
- a defensive check for generated codes, even though random generation is unlikely to produce route words.

Why it exists:

The backend has system routes:

- `/api/...` for JSON API endpoints;
- `/health` for process health;
- `/ready` for database readiness.

If a user could create a short link with code `api`, then `GET /api` would become ambiguous. It might be treated as an application route today, but future routing changes could accidentally make the short link shadow an API namespace or vice versa.

How it works:

1. `isReservedCode` lowercases the candidate code.
2. The code is checked against a `Set` for constant-time lookup.
3. Custom reserved codes fail with `RESERVED_CODE`.
4. Generated reserved codes are skipped and generation retries.

Why this is the best choice:

A database-only unique constraint cannot solve this because reserved words are not rows in the link table. Keeping the rule in the domain service makes the restriction explicit and easy to update as new backend or frontend routes appear.

Tradeoff:

Some valid-looking words become unavailable to users. This is acceptable because route stability is more important than allowing every possible custom slug.

## 18. Admin-Protected Link Status Updates

The backend supports `PATCH /api/links/:code/status` for changing a link between `ACTIVE` and `DISABLED`.

What this feature is:

- a management endpoint for the owner of an anonymous short link;
- protected by the same admin key model used for analytics;
- intentionally limited to status changes instead of arbitrary link edits.

Why it exists:

Production shorteners need a way to stop a link without deleting history. A campaign might end, a destination might become unsafe, or the creator may simply want to pause traffic. Deleting the link would destroy analytics context and can make debugging harder. Disabling keeps the row and click history but prevents future redirects.

How it works:

1. The route validates `code` and request body.
2. The body accepts only `ACTIVE` or `DISABLED`.
3. The admin key may be supplied in `X-Admin-Key` or the body.
4. The service loads the link by code.
5. The stored admin-key hash is compared with the provided key.
6. Prisma updates only the `status` field.
7. The response returns the public link representation.

Why this is the best current design:

The project does not yet have user accounts. Admin keys provide lightweight ownership for anonymous users. Restricting the endpoint to status updates keeps the blast radius small: users cannot mutate target URLs and silently redirect existing shared links to a different destination. That kind of target editing can be added later with audit history, but status toggling is safer as an early management feature.

Tradeoff:

If a user loses the admin key, they cannot manage the link. That is acceptable for this version because no user identity system exists yet.

## 19. Admin-Protected Metadata Updates

The backend supports `PATCH /api/links/:code` for editing safe metadata fields:

- `title`;
- `description`;
- `tags`;
- `expiresAt`.

What this feature is:

It is an owner-management endpoint for improving how a link is described and governed after creation. It does not allow changing the destination URL.

Why this exists:

Real users often create links quickly and then need to clean up labels later. Analytics dashboards also become much easier to scan when links have meaningful titles and tags. Expiration is operationally useful because a campaign or temporary document may need to stop working after a specific date.

Why target URL editing is intentionally excluded:

A URL shortener has a trust problem: once a short link is shared, people assume it keeps pointing to the same destination. If the creator could silently change the target URL later, a benign shared link could become malicious. That feature can exist in mature systems, but it should come with audit logs, user accounts, notifications, or policy controls. This project chooses the safer industry default for now: metadata can change, destination cannot.

How it works:

1. The route validates the short code and request body with Zod.
2. The admin key is accepted through `X-Admin-Key` or the body.
3. The service loads the link by code.
4. The admin-key hash is verified.
5. `expiresAt` is converted to a `Date` or cleared with `null`.
6. Past expiration dates are rejected.
7. Prisma updates only fields explicitly present in the request.

Why this is a good design:

Partial updates are useful for frontend forms because the client does not need to send every field. Keeping update logic in the service layer prevents route handlers from becoming business-rule containers. Returning the same public link presenter keeps API responses consistent across create, read, and update flows.

Tradeoff:

The endpoint does not currently keep a metadata change history. For a larger multi-user product, audit tables would be a strong next step.
