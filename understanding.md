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

## 20. Admin Link Summary Endpoint

The backend supports `GET /api/links/:code/admin`.

What this feature is:

It is a lightweight owner-only endpoint that returns:

- the public link representation;
- total click count;
- the most recent click timestamp.

Why this exists:

Full analytics can be more expensive because it groups events by browser, OS, device, referrer, and day. A dashboard often needs a quick summary first: "Is this link active? How many total clicks does it have? When was it last used?" Loading that summary separately keeps dashboard screens snappy and avoids running heavier aggregation queries when the user only needs a small operational view.

How it works:

1. The route validates the short code.
2. The controller reads the admin key from `X-Admin-Key` or query string.
3. The service loads the link by unique code.
4. The admin key is verified against the stored hash.
5. Two small queries run in parallel: total click count and newest click row.
6. The response returns a stable `{ data: ... }` envelope.

Why this is the best choice:

Separating summary from analytics lets the frontend choose the right data cost for each screen. It also makes future caching easier: summary data can be refreshed frequently, while full analytics can be loaded on demand.

Tradeoff:

This adds one more API endpoint, but the separation of concerns is worth it because summary and analytics have different performance profiles.

## 21. CSV Analytics Export

The backend supports `GET /api/links/:code/analytics/export.csv`.

What this feature is:

It is an admin-key protected export endpoint that returns raw click events as CSV. It supports the same `from` and `to` date filtering idea as the analytics endpoint, but allows a larger bounded `limit` for export use cases.

Why this exists:

Production analytics are often used outside the product UI. Teams may want to:

- open click data in a spreadsheet;
- share a campaign report;
- import rows into a BI tool;
- debug a suspicious spike by inspecting recent events.

Providing CSV avoids forcing users to connect directly to PostgreSQL, which would be unsafe and operationally clumsy.

How it works:

1. The route validates the short code and export query.
2. The admin key is required.
3. The service loads the link and verifies ownership.
4. Prisma fetches recent click rows with a hard maximum of 5000 rows.
5. The controller converts rows to CSV using a small escaping utility.
6. The response sets `Content-Type: text/csv` and an attachment filename.

Why the export has a hard limit:

CSV endpoints can become expensive if they stream unlimited historical data. A hard limit keeps memory and database work bounded. A future large-scale version could add cursor pagination or background export jobs.

Why a custom CSV utility is acceptable here:

The CSV shape is simple: flat rows with known scalar fields. The helper quotes cells only when needed and escapes double quotes according to CSV rules. If exports become more complex, a dedicated CSV library would be reasonable.

## 22. OpenAPI Contract

The project includes `docs/openapi.yaml`.

What this feature is:

It is a machine-readable API contract that describes the backend routes, parameters, request bodies, and important response cases.

Why it exists:

Production APIs need a source of truth outside the code. Frontend developers should not have to inspect Express route files to know which fields are valid. QA should be able to see expected error cases. Future API clients can generate SDKs or typed clients from the OpenAPI document.

How it works:

The file follows OpenAPI 3.1 and documents:

- health and readiness routes;
- short-link creation;
- public metadata reads;
- admin metadata updates;
- admin status updates;
- analytics reads;
- CSV export;
- redirect behavior.

Why this is a good choice:

OpenAPI is an industry standard. It works with documentation renderers, client generators, API gateways, and contract-testing tools. Even though this project does not yet generate code from the spec, keeping the spec in the repo makes the backend easier to maintain and review.

Tradeoff:

The spec must be kept in sync with code. That is why backend feature commits should update `docs/openapi.yaml` when they change the public API.

## 23. Manual API Examples

The project includes `docs/api-examples.http`.

What this feature is:

It is a plain HTTP request collection that can be opened by editors and REST clients that understand `.http` files.

Why it exists:

OpenAPI is excellent for contracts, but developers often need quick executable examples. The `.http` file shows the practical sequence:

1. check health;
2. create a link;
3. copy the returned admin key;
4. fetch metadata;
5. update metadata;
6. disable or reactivate the link;
7. fetch analytics;
8. export CSV;
9. follow the redirect.

How it works:

Each section is separated by `###`. A developer can replace the placeholder admin key with the key from the create response and then send requests one by one.

Why this is useful in an industry-grade project:

It reduces onboarding friction. New developers and reviewers can exercise the API without reading controllers first, and support engineers can reproduce flows quickly.

Tradeoff:

The examples are not automated tests. They are living documentation and must be updated when routes change.

## 24. Explicit Security Headers

The backend configures Helmet through `src/config/security.ts`.

What this feature is:

It is a central security-header policy for the Express API.

The policy currently:

- disables Content Security Policy because this backend serves JSON and redirects, not browser-rendered HTML;
- sets `Cross-Origin-Resource-Policy` to `same-site`;
- sets `Referrer-Policy` to `no-referrer`;
- enables HSTS only in production.

Why it exists:

Security headers are a basic production baseline. They reduce accidental browser data leakage and make deployment behavior more explicit. Keeping options in `config/security.ts` prevents `app.ts` from becoming a pile of middleware details.

Why Content Security Policy is disabled here:

CSP is most useful for HTML pages that execute scripts. This backend returns JSON and redirects. A strict CSP on an API usually adds noise without meaningful protection. The Next.js frontend can define its own CSP later because frontend HTML has different security needs.

Why HSTS is production-only:

HSTS tells browsers to force HTTPS for a host. That is good in production, but painful in local development where HTTP is common. Enabling it only in production gives the security benefit without breaking local workflows.

Tradeoff:

Security headers do not replace authentication, validation, rate limiting, or deployment-level protections. They are one layer in a layered security model.

## 25. API Cache-Control

The backend applies `Cache-Control: no-store` to `/api` responses.

What this feature is:

It is a small middleware named `noStoreApiResponses`.

Why it exists:

API responses may contain admin-owned data such as analytics summaries, click counts, metadata, and CSV exports. Browsers, shared proxies, or reverse proxies should not reuse stale copies of these responses unless the backend explicitly designs for caching.

How it works:

1. Requests entering `/api` pass through the cache-control middleware.
2. The middleware sets `Cache-Control: no-store`.
3. The route continues through rate limiting and normal handlers.

Why redirects are handled differently:

Redirects are not under `/api`; they use their own `Cache-Control: private, max-age=...` header in the redirect controller. Redirect caching can improve user-facing performance, but API JSON should favor correctness and privacy.

Why this is the best choice now:

It is conservative and safe. Later, specific public endpoints could opt into caching if there is a measured performance need.

## 26. Runtime Version Endpoint

The backend supports `GET /version`.

What this feature is:

It returns lightweight deployment metadata:

- service name;
- app version;
- git SHA;
- runtime environment.

Why it exists:

In production, teams often need to answer "what code is actually running?" without SSH access or container inspection. A version endpoint helps support, QA, and operations compare observed behavior against a known release.

How it works:

1. `APP_VERSION` and `GIT_SHA` are read through the validated environment layer.
2. The route returns them through the standard success envelope.
3. Docker Compose supplies default local values, while real deployments can inject release-specific values.

Why this is a good choice:

The endpoint does not expose secrets or database state. It is safe to keep public in most internal deployments and very useful during rollout debugging.

Tradeoff:

Some security teams prefer not to expose version details publicly. If this service were deployed on the open internet under a stricter policy, the route could be moved behind internal networking or authentication.

## 27. Link Audit Events

The backend stores owner-action audit events in `LinkAuditEvent` and exposes them through `GET /api/links/:code/audit`.

What this feature is:

It is an audit trail for important link lifecycle actions:

- link creation;
- status changes;
- metadata changes.

Why it exists:

Production systems should not make important state changes invisible. If a link is disabled, reactivated, renamed, retagged, or given a new expiration date, the owner should have a history of that change. Audit trails are useful for debugging, support, compliance review, and team accountability.

How the database model works:

`LinkAuditEvent` belongs to `Link` through `linkId`. It stores:

- `action`: a stable action name such as `STATUS_UPDATED`;
- `changes`: JSON payload describing what changed;
- `createdAt`: timestamp of the event.

The table is indexed by `(linkId, createdAt)` so the backend can quickly load recent events for one link.

How the API works:

1. The route validates the short code.
2. The admin key is required.
3. The service verifies the admin key against the link.
4. The latest 100 audit events are returned newest first.

Why this is a good design:

JSON changes keep the audit model flexible while the product is still evolving. A strongly typed audit table per event would be more rigid and heavier. The action string plus JSON payload gives enough structure for the current backend while preserving speed of development.

Tradeoff:

JSON audit payloads are less strict than fully normalized audit tables. If the project later needs compliance-grade reporting, the event schema should become more formal and possibly append-only with actor identity.

## 28. Readiness Latency

The `/ready` endpoint reports `databaseLatencyMs`.

What this feature is:

It is a small operational enhancement to the readiness check. The backend still runs a simple `SELECT 1`, but it now measures how long the query took.

Why it exists:

A binary ready/not-ready response is useful, but latency adds early warning value. If the database is technically reachable but suddenly takes much longer to respond, deployments and health dashboards can catch that symptom before users experience widespread failures.

How it works:

1. The route records `performance.now()` before the database probe.
2. Prisma runs `SELECT 1`.
3. The route calculates elapsed milliseconds.
4. The readiness response includes `databaseLatencyMs`.

Why this is the best current choice:

It adds useful observability without introducing a metrics stack yet. It is also cheap: `SELECT 1` is minimal database work.

Tradeoff:

The measurement is request-local and not a historical metric. A production deployment should still export metrics to a monitoring system later.

## 29. Bounded Graceful Shutdown

The backend has graceful shutdown logic in `src/server.ts`.

What this feature is:

When the process receives `SIGTERM` or `SIGINT`, the server stops accepting new connections, disconnects Prisma, and exits. A timeout forces exit if shutdown hangs.

Why it exists:

Containers and process managers send shutdown signals during deploys, restarts, and scaling events. A backend should stop cleanly so in-flight requests get a chance to finish and database connections are released. But it should not hang forever, because that can block deployments and leave unhealthy containers around.

How it works:

1. `SIGTERM` or `SIGINT` calls `shutdown`.
2. A timer is started using `SHUTDOWN_TIMEOUT_MS`.
3. `server.close` stops accepting new connections and waits for open ones to close.
4. Prisma disconnects.
5. The timeout is cleared and the process exits successfully.
6. If the timeout fires first, the process exits with failure.

Why this is a good choice:

It matches common container orchestration behavior. Kubernetes, Docker, and process managers all expect services to respond correctly to termination signals.

Tradeoff:

If a request legitimately needs longer than the timeout, it may be cut off. The timeout should be tuned based on real endpoint latency and deployment requirements.

## 30. Backend Runbook

The project includes `docs/backend-runbook.md`.

What this document is:

It is an operations guide for running the backend after it leaves a developer's laptop.

Why it exists:

Production readiness is not only code. Teams need to know how to deploy, migrate, observe, and recover the service. Without a runbook, operational knowledge stays trapped in one developer's head.

What it covers:

- service overview;
- required environment variables;
- deployment steps;
- migration policy;
- logging expectations;
- incident checks;
- backup and recovery;
- security reminders.

Why this is a good project choice:

The backend now has multiple operational concerns: migrations, Docker, request IDs, audit logs, rate limits, and privacy salts. A runbook ties those pieces together so the service can be operated repeatably.

Tradeoff:

The runbook is documentation, so it must be maintained. Any future deployment change should update it.

## 31. Architecture Decision Records

The project uses lightweight Architecture Decision Records under `docs/decisions`.

What this feature is:

An ADR is a short document that captures an important engineering decision, the alternatives considered, and the consequences.

Why it exists:

As the project grows, people will ask why the backend uses Express, Prisma, Zod, Pino, and PostgreSQL. An ADR answers that without relying on memory.

How it works:

`001-backend-stack.md` records the backend stack decision. Future decisions can be added as numbered files.

Why this is useful:

Good production projects preserve decision context. Code shows what exists today, but ADRs explain why the team chose it and what tradeoffs were accepted.

Tradeoff:

ADRs require discipline. They should be added for meaningful decisions, not every tiny implementation detail.

## 32. Robots Policy

The backend serves `GET /robots.txt` with `Disallow: /`.

What this feature is:

It is a crawler policy that asks search engines not to index the backend's paths.

Why it exists:

URL shorteners can accidentally expose public paths that are not meant to become search results. A short link may point to a private-but-shareable document, a temporary campaign, or a staging resource. Even though `robots.txt` is voluntary and not a security boundary, it is a responsible default.

How it works:

The route returns plain text:

```txt
User-agent: *
Disallow: /
```

Why this is a good choice:

It is simple, cheap, and clear. Search engines that honor robots rules will avoid crawling and indexing short-link paths.

Tradeoff:

Malicious crawlers can ignore `robots.txt`. Sensitive destinations must still be protected at the destination application, not by the shortener.

## 33. Frontend Environment Configuration

The frontend reads its backend URL from `NEXT_PUBLIC_API_BASE_URL` through `src/lib/config.ts`.

What this is:

It is a tiny typed configuration module for browser-safe frontend environment values.

Why it exists:

Frontend code needs to call the backend from many places: create link, read analytics, export CSV, update metadata, and manage status. If every component reads `process.env` directly, the app becomes harder to deploy and easier to misconfigure.

How it works:

`config.apiBaseUrl` strips a trailing slash and falls back to `http://localhost:5000` for local development.

Why this is a good choice:

A single config module keeps deployment assumptions explicit. It also makes future changes easier, such as switching to an API gateway or same-origin reverse proxy.

Tradeoff:

Only variables prefixed with `NEXT_PUBLIC_` are available in the browser. Secrets must never be placed here.
