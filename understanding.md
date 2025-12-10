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

## 34. Frontend API Types

The frontend defines API contracts in `src/types/api.ts`.

What this is:

It is a TypeScript model of the backend response shapes used by the UI.

Why it exists:

The backend already returns consistent envelopes and typed concepts such as links, analytics, summaries, and audit events. The frontend should not treat those as untyped blobs. Strong frontend types make component props clearer and reduce accidental field mismatches.

How it works:

The file defines:

- response envelopes;
- public link shape;
- create-link payloads;
- analytics responses;
- admin summaries;
- audit events;
- backend error envelopes.

Why this is a good choice:

It gives most of the benefit of generated clients while keeping the current project simple. Later, the OpenAPI file could generate these types automatically.

Tradeoff:

Manual types must be kept in sync with backend changes. For this project phase, that is acceptable because the API surface is still compact.

## 35. Frontend API Client

The frontend uses `src/lib/api-client.ts` for backend requests.

What this is:

It is a typed wrapper around `fetch`.

Why it exists:

Frontend components should not each implement their own error parsing, timeout behavior, JSON serialization, or API base URL handling. Repeating that logic causes inconsistent UX and subtle bugs.

How it works:

1. The caller passes an API path and optional request options.
2. The client joins the path with `config.apiBaseUrl`.
3. Request bodies are JSON serialized.
4. An `AbortController` enforces a timeout.
5. Successful responses unwrap the backend `{ data }` envelope.
6. Backend error envelopes become `ApiClientError`.
7. Network failures and timeouts are normalized into user-readable errors.

Why this is a good choice:

It keeps the UI components focused on product behavior. It also creates one place to add future cross-cutting behavior such as auth headers, retry policy, tracing headers, or client-side metrics.

Tradeoff:

The wrapper currently assumes JSON success responses. CSV export uses a direct URL instead of this helper because it intentionally returns `text/csv`.

## 36. Frontend Request Cache and De-Duplication

The frontend includes `src/lib/request-cache.ts`.

What this is:

It is a tiny in-memory cache with request de-duplication.

Why it exists:

Analytics pages can trigger repeated fetches: initial render, tab changes, refresh clicks, and React re-renders. Without de-duplication, the same expensive analytics endpoint could be called multiple times at once. That wastes backend resources and creates flickery UI.

How it works:

- `memoryCache` stores resolved values until their TTL expires.
- `inFlight` stores promises for requests currently running.
- If the same key is requested while a request is in flight, the existing promise is reused.
- Cache keys can be cleared directly or by prefix after mutations.

Why this is a good choice:

It gives SWR-style behavior without adding another dependency yet. The project can later adopt TanStack Query or SWR if caching needs become more complex, but this lightweight helper covers the immediate optimization need.

Tradeoff:

The cache is per browser tab and disappears on refresh. That is fine for analytics UI performance; it is not meant to be durable storage.

## 37. Frontend API Endpoint Layer

The frontend uses `src/lib/links-api.ts` as its endpoint layer.

What this is:

It is a collection of typed functions for every backend operation the UI needs.

Why it exists:

Components should not know backend URL patterns, cache keys, or invalidation rules. If route strings are scattered across the UI, future backend changes become expensive and error-prone.

How it works:

The endpoint layer provides functions for:

- creating links;
- reading public metadata;
- reading owner summary;
- reading analytics;
- reading audit events;
- updating metadata;
- updating status;
- building the CSV export URL.

Caching and invalidation:

- read calls use the in-memory request cache;
- mutations clear related cache prefixes;
- analytics cache keys include the admin key and query window so different views do not collide.

Why this is a good choice:

It creates a clean boundary between product components and transport details. It also gives one place to introduce future batching, retries, or generated OpenAPI clients.

Tradeoff:

The endpoint layer is manually maintained. Generated clients could reduce drift later, but manual functions keep the code easy to read during the project build-out.

## 38. Frontend Formatting Utilities

The frontend includes `src/lib/format.ts`.

What this is:

It is a small shared formatting module for numbers, date-times, short dates, and readable URLs.

Why it exists:

Dashboards become inconsistent when every component formats dates and numbers differently. Shared formatting keeps the UI polished and makes localization easier later.

How it works:

The module uses `Intl.NumberFormat` and `Intl.DateTimeFormat`, which are browser-native and optimized.

Why this is a good choice:

Using native Intl avoids adding a date library for simple display formatting. It is fast, standard, and enough for the current UI.

Tradeoff:

The locale is currently fixed to English. A future internationalized app should read locale from user preference or Next.js routing.

## 39. Tailwind Class Composition

The frontend uses `src/lib/cn.ts`.

What this is:

It combines `clsx` and `tailwind-merge` into one helper for conditional Tailwind classes.

Why it exists:

Industry-grade Tailwind code often needs conditional styling for states like disabled, loading, active, error, and selected. `clsx` handles conditions, while `tailwind-merge` resolves conflicting Tailwind classes such as two different padding or color utilities.

How it works:

Components call `cn("base classes", condition && "state classes")`. The helper returns a clean class string.

Why this is a good choice:

It keeps components readable and avoids raw CSS. It also prevents subtle style conflicts when variants override base classes.

Tradeoff:

It adds a tiny abstraction, but the pattern is common in Tailwind production apps and pays for itself quickly.

## 40. Button UI Primitive

The frontend includes `src/components/ui/button.tsx`.

What this is:

It is a reusable Tailwind-based button component with variants, disabled behavior, optional icons, and loading state.

Why it exists:

Buttons appear throughout the app: create link, copy link, refresh analytics, save metadata, disable link, reactivate link, and export CSV. If each button is hand-styled, the UI becomes inconsistent.

How it works:

The component accepts:

- `variant`: `primary`, `secondary`, `ghost`, or `danger`;
- `loading`: disables the button and shows a spinner icon;
- `icon`: displays an icon before the label;
- normal native button props.

Why this is a good choice:

It keeps the visual system consistent while preserving native button behavior and accessibility. It uses Tailwind utilities only, not raw CSS.

Tradeoff:

The component is intentionally small. If the design system grows, variants may move into a more formal variant utility.

The frontend also includes a `LinkButton` primitive for navigation actions. This avoids invalid HTML where a Next.js `Link` wraps a real `button`. Navigation controls render as links, form/action controls render as buttons.

## 41. Form Field Primitive

The frontend includes `src/components/ui/field.tsx`.

What this is:

It is a reusable input/textarea component with label, hint, error text, and accessible ARIA wiring.

Why it exists:

URL creation and link management both need forms. Consistent field behavior matters because validation errors should be easy to scan, helper text should look consistent, and screen readers need useful relationships between controls and messages.

How it works:

The component renders either an `input` or `textarea` based on `multiline`. It attaches `aria-invalid` and `aria-describedby` when errors or hints exist.

Why this is a good choice:

It keeps forms consistent without introducing a large form library. It also follows the requirement to use Tailwind CSS utilities instead of raw CSS.

Tradeoff:

The component is controlled by parent state. If forms become very complex, a dedicated form library could reduce boilerplate.

## 42. Panel and Status Badge Primitives

The frontend includes `Panel` and `StatusBadge` UI primitives.

What these are:

- `Panel`: a compact section container for dashboard surfaces.
- `StatusBadge`: a semantic visual label for `ACTIVE`, `DISABLED`, and `EXPIRED` links.

Why they exist:

The app has repeated operational surfaces: create form, result panel, recent links, analytics summary, metadata editor, and audit timeline. Panels keep those areas visually consistent. Status badges make link state scannable without forcing users to read full paragraphs.

How they work:

Both components are Tailwind-only. `Panel` accepts title, description, optional action, and children. `StatusBadge` maps backend link status to restrained color classes.

Why this is a good choice:

Operational tools should feel organized and easy to scan. These primitives give structure without turning the app into a marketing landing page.

Tradeoff:

Panels are useful for individual tool surfaces, but page sections should not become nested card stacks. The app keeps panels flat and purposeful.

## 43. Frontend App Shell

The frontend includes `src/components/app-shell.tsx`.

What this is:

It is the shared page frame: header, navigation, brand mark, and main content width.

Why it exists:

The app is an operational tool, not a marketing page. Users need to create links, inspect analytics, and manage state quickly. A stable app shell keeps navigation predictable and leaves the first screen for the actual workflow.

How it works:

The shell uses Next.js `Link` for navigation and Heroicons for clear visual cues. It constrains content to `max-w-7xl` and uses Tailwind spacing, borders, and typography.

Why this is a good choice:

It matches the product's job: quiet, utilitarian, and scannable. It avoids oversized hero marketing patterns and gives the dashboard room to grow.

Tradeoff:

The navigation is intentionally minimal for now. More sections can be added when the frontend has account management or broader reporting.

## 44. Create Link Form

The frontend includes `src/features/links/create-link-form.tsx`.

What this is:

It is the main client-side form for creating short links.

Why it exists:

Creating a short link is the core product workflow. The form captures destination URL, optional custom code, title, description, tags, and expiration.

How it works:

1. The component stores form state locally.
2. It performs lightweight client-side URL validation for immediate feedback.
3. Tags are split by comma.
4. `datetime-local` input values are converted to ISO strings.
5. The typed endpoint layer sends the create request.
6. The parent receives the created link, including admin key.

Why this is a good choice:

The backend remains the source of truth for security validation, but client-side validation improves UX by catching obvious mistakes earlier. The form uses reusable UI primitives, so styling stays consistent and Tailwind-only.

Tradeoff:

The form does not use a dedicated form library. For this amount of state, React state is clearer and avoids extra dependency weight.

## 45. Created Link Result Card

The frontend includes `src/features/links/created-link-card.tsx`.

What this is:

It is the post-create success panel that shows the short URL, destination summary, link status, admin key, and next actions.

Why it exists:

The backend returns the admin key only at creation time. The UI must make that moment obvious so users know to store the key. A generic toast would be too easy to miss.

How it works:

The card exposes:

- short URL link;
- status badge;
- destination hostname/path;
- admin key in a high-visibility warning panel;
- copy short URL action;
- copy admin key action;
- direct analytics link with the admin key in the query string.

Why this is a good choice:

It moves the user naturally from creation to management. Copy actions reduce friction and prevent manual selection mistakes.

Tradeoff:

Putting the admin key into the analytics URL is convenient but should be treated carefully. The backend also accepts the key through a header, and a future authenticated product would avoid query-string secrets.

## 46. Recent Links Client Queue

The frontend includes `src/hooks/use-recent-links.ts`.

What this is:

It is a small browser-side recent-links queue backed by `localStorage`.

Why it exists:

The current product does not have user accounts. Without a lightweight local queue, users would lose quick access to links they just created after the success card disappears. The queue keeps recent work visible without requiring backend user identity.

How it works:

- links are read from `localStorage` after the component mounts;
- new links are moved to the front;
- duplicate codes are de-duplicated;
- the list is capped at eight links;
- users can clear the local list.

Why this is a good choice:

It improves UX while keeping the architecture simple. It also avoids storing recent links on the backend without a real user model.

Tradeoff:

The queue is device-local. Clearing browser storage or switching devices loses it. That is acceptable until authentication exists.

## 47. Recent Links Panel

The frontend includes `src/features/links/recent-links-panel.tsx`.

What this is:

It is the visual dashboard panel for the browser-local recent link queue.

Why it exists:

Users need a way to return to analytics for links they just created. Because there are no accounts yet, this panel provides a pragmatic local history.

How it works:

Each recent link shows:

- short URL;
- status;
- destination summary;
- creation time;
- analytics route link with admin key.

Why this is a good choice:

It keeps the home screen workflow-oriented: create link on the left, recent operational context on the right. It is useful without requiring backend changes.

Tradeoff:

The panel can only show links created in the same browser. This is a conscious temporary tradeoff before authentication.

## 48. Link Dashboard Composition

The frontend includes `src/features/links/link-dashboard.tsx`.

What this is:

It is the home page product experience. It composes the app shell, create form, created-link result, and recent-links panel.

Why it exists:

The first screen should be the usable tool, not a marketing landing page. Users arrive to shorten a URL, so the create workflow is immediately available.

How it works:

The dashboard owns the latest created link state and passes an `onCreated` callback to the form. When a link is created, it shows the result card and inserts the link into the local recent queue.

Why this is a good choice:

State is kept at the smallest shared level: the dashboard coordinates sibling components, while individual components stay focused. This keeps the flow easy to understand and avoids global state prematurely.

Tradeoff:

The page is a client component because the create workflow and local queue are interactive. Server components can still be used later for static or authenticated data-loading sections.

## 49. Analytics Admin Key State

The frontend includes `src/hooks/use-admin-key.ts`.

What this is:

It is a client hook for reading, storing, and updating the admin key for a specific short code.

Why it exists:

Analytics and management endpoints require the admin key. Users may arrive from the creation result link with the key in the query string, or they may paste it manually later. The UI needs a consistent way to handle both paths.

How it works:

- reads `adminKey` from the URL query string;
- falls back to `localStorage` for the specific short code;
- saves query-provided keys automatically;
- exposes `hasAdminKey` for simple UI gating.

Why this is a good choice:

It keeps key management out of analytics components. Persisting by code improves usability without adding accounts.

Tradeoff:

`localStorage` is convenient but not secure against a compromised browser. This is acceptable for the anonymous-key model, but authenticated accounts would be better for sensitive production use.

## 50. Async Resource Hook

The frontend includes `src/hooks/use-async-resource.ts`.

What this is:

It is a reusable hook for client-side asynchronous data loading.

Why it exists:

Analytics pages need to load several resources: public link metadata, admin summary, analytics data, and audit events. Each has loading, error, refresh, and stale-data behavior. Repeating that state logic in every component would be noisy and inconsistent.

How it works:

- `enabled` gates whether loading should happen;
- `load` performs the async work;
- request IDs prevent older responses from overwriting newer responses;
- the hook distinguishes initial `loading` from later `refreshing`;
- `refresh` can be called manually.

Why this is a good choice:

It provides the key behavior needed for this app without adding a heavier data-fetching dependency. It also composes with the request cache layer.

Tradeoff:

The hook is intentionally simple. If the app later needs pagination, background polling, offline mutation queues, or optimistic cache updates across many resources, TanStack Query would be a strong upgrade.

Implementation note:

The hook imports React's `DependencyList` type directly. That keeps the file explicit and avoids relying on the global `React` namespace.

## 51. Analytics Page Shell

The frontend includes the route `src/app/analytics/[code]/page.tsx` and the client dashboard `src/features/analytics/analytics-dashboard.tsx`.

What this is:

It is the management and analytics page for a single short code.

Why it exists:

Creating links is only half of the product. Users also need to understand performance and manage link state after sharing it.

How it works:

The Next.js route extracts the `code` path parameter and renders a client dashboard. The dashboard reads the admin key through `useAdminKey` and gates protected panels until a valid-looking key is present.

Why this is a good choice:

The route itself stays small and server-friendly, while the dashboard owns interactive state. This follows the App Router pattern: use server components for routing and metadata, client components for browser interactivity.

Tradeoff:

The first version gates by key length client-side, while the backend remains the real authority. Invalid keys still fail at the API layer.

## 52. Analytics Link Overview

The frontend includes `src/features/analytics/link-overview.tsx`.

What this is:

It is the first protected analytics panel. It loads the owner summary endpoint and shows short URL, status, destination, last click time, and total clicks.

Why it exists:

Users need a quick operational answer before reading deeper analytics: is the link active, where does it point, and how much traffic has it received?

How it works:

The component uses `useAsyncResource` and `getAdminSummary`. It supports loading, error, disabled, and refresh states. Cached requests prevent duplicate summary loads.

Why this is a good choice:

It separates a lightweight summary from full analytics. That mirrors the backend design and keeps the dashboard responsive.

Tradeoff:

The panel depends on the admin key. Public metadata could be loaded without a key, but the summary intentionally stays owner-only because it includes click counts.

## 53. Analytics Summary and Daily Trend

The frontend includes `src/features/analytics/analytics-summary.tsx`.

What this is:

It is the main analytics panel showing total clicks, recent event count, tracked days, and a daily click trend.

Why it exists:

Users need a compact visual summary before inspecting detailed breakdowns. A daily trend helps answer whether a link is gaining, losing, or receiving no traffic.

How it works:

The component loads protected analytics through the endpoint layer. It uses the request cache and async resource hook, then renders metrics and Tailwind-based segmented bars for daily clicks.

Why Tailwind bars instead of a chart library here:

The data is simple and the UI should stay lightweight. Segmented bars are readable, responsive, and avoid extra client-side chart complexity. They also avoid inline raw CSS by using a Tailwind grid extension.

Tradeoff:

The bar chart is not as feature-rich as a dedicated chart library. It does not include hover tooltips or zooming, but it is fast and clear for this product phase.

## 54. Analytics Breakdown Grid

The frontend includes `src/features/analytics/breakdown-grid.tsx`.

What this is:

It renders browser, OS, device, and referrer analytics as compact panels.

Why it exists:

Total clicks are useful, but operators also need to understand traffic composition. Browser and OS can reveal compatibility patterns. Device data shows desktop versus mobile behavior. Referrers show where traffic originates.

How it works:

Each breakdown panel receives a list of `{ name, clicks }` items and renders a count plus segmented Tailwind bar. Empty states are explicit.

Why this is a good choice:

The segmented table style is dense, readable, responsive, and avoids raw CSS. It fits an operational dashboard better than decorative chart-heavy layouts.

Tradeoff:

The breakdown grid is descriptive rather than exploratory. Advanced filtering can come later if analytics needs grow.

## 55. Recent Clicks Table

The frontend includes `src/features/analytics/recent-clicks-table.tsx`.

What this is:

It is a tabular view of the latest click events.

Why it exists:

Aggregates answer "how many" and "what kind." Recent events answer "what just happened." That is useful when validating a newly shared link or investigating traffic spikes.

How it works:

The table renders time, referrer, browser, OS, and device. It uses horizontal overflow for small screens so columns remain readable instead of squeezing into broken layouts.

Why this is a good choice:

Tables are the right UI for event logs. They are scannable, accessible, and familiar in operational tools.

Tradeoff:

The backend currently returns a bounded recent list, not full pagination. That keeps the UI fast and simple; pagination can be added later.

## 56. CSV Export Action

The frontend includes `src/features/analytics/export-actions.tsx`.

What this is:

It is the UI action that downloads click analytics as CSV.

Why it exists:

Analytics often need to leave the dashboard. Users may share reports, inspect rows in spreadsheets, or import click events into another tool.

How it works:

The component builds a CSV export URL through the endpoint layer and renders a disabled button until an admin key is available. The download itself is handled by the browser because the backend returns `text/csv` with attachment headers.

Why this is a good choice:

CSV is a file download, so using a normal anchor is simpler and more reliable than fetching bytes manually in JavaScript.

Tradeoff:

The admin key is included in the generated URL for browser download convenience. A future authenticated app could use secure cookies or a signed short-lived export token.

## 57. Metadata Editor

The frontend includes `src/features/analytics/metadata-editor.tsx`.

What this is:

It is an owner-only form for editing title, description, tags, and expiration.

Why it exists:

Links often need better labels after creation. Metadata makes analytics easier to understand without changing the destination URL.

How it works:

The component receives the current link, mirrors editable fields into local state, submits through `updateLinkMetadata`, and reports the updated link back to the dashboard.

Why this is a good choice:

It reflects the backend safety model: users can update descriptive metadata, but not the target URL. The endpoint layer handles cache invalidation after saving.

Tradeoff:

The component uses a simple status message instead of a global toast system. That keeps the UI dependency-light for now.

## 58. Link Status Controls

The frontend includes `src/features/analytics/status-controls.tsx`.

What this is:

It is the owner-only UI for disabling or reactivating a short link.

Why it exists:

Production users need a non-destructive way to stop traffic. Deleting a link would also remove useful historical context, while disabling preserves analytics and audit history.

How it works:

The component reads the current link status and chooses the next valid action. It calls `updateLinkStatus`, shows a local message, and sends the updated link back to the dashboard.

Why this is a good choice:

The UI mirrors backend constraints. Expired links cannot be reactivated from this simple control because expiration is managed separately through metadata.

Tradeoff:

There is no confirmation modal yet. The action is reversible for active/disabled states, so inline controls are acceptable for this phase.

## 59. Audit Timeline

The frontend includes `src/features/analytics/audit-timeline.tsx`.

What this is:

It is the owner-facing view of backend audit events.

Why it exists:

Users should be able to see important lifecycle changes: creation, metadata updates, and status changes. This improves trust and helps debug "who changed what" style questions even before full user accounts exist.

How it works:

The component loads audit events with the admin key, renders loading and error states, and displays events newest-first as a timeline.

Why this is a good choice:

A timeline is easier to scan than raw JSON for operational history. The backend keeps the detailed `changes` payload available, while the UI starts with readable action labels.

Tradeoff:

The first UI does not expand full change payloads. That can be added once users need deeper audit inspection.

## 60. Analytics Dashboard Composition

The analytics dashboard now wires together all management and reporting panels.

What this is:

`analytics-dashboard.tsx` composes:

- admin key panel;
- link overview;
- analytics summary;
- breakdown grid;
- recent clicks table;
- CSV export action;
- metadata editor;
- status controls;
- audit timeline.

Why it exists:

Analytics is a workflow, not one chart. A user needs to inspect traffic, export data, update metadata, pause traffic, and review audit history from one place.

How it works:

The dashboard owns shared state for the current short code, admin key, edited link override, analytics data, and summary data. Child components stay focused on one responsibility.

Caching and optimization:

- summary and analytics calls use the request cache;
- child panels receive already-loaded data where possible;
- mutation results update local dashboard state immediately;
- cache invalidation happens in the endpoint layer after mutations.

Why this is a good choice:

It keeps the top-level page readable while preserving local ownership of state. This is a practical middle ground before introducing a global client cache library.

Tradeoff:

Some data is fetched by multiple panels in this phase, but request de-duplication prevents duplicate concurrent network work. A later refactor could pass more loaded data down from the dashboard.

## 61. Analytics Route Loading States

The analytics route includes `loading.tsx` and `not-found.tsx`.

What this is:

These files define route-level fallback UI for slow navigation and unavailable analytics routes.

Why it exists:

Production apps should not show blank screens during navigation. Loading skeletons communicate that work is happening and keep layout stable.

How it works:

Next.js App Router automatically uses `loading.tsx` while the route segment is loading. `not-found.tsx` provides a controlled fallback if the route decides a resource is unavailable later.

Why this is a good choice:

The loading UI matches the dashboard layout, so the page does not jump dramatically when content appears. The not-found state gives users a clear path back to the main workflow.

Tradeoff:

The current not-found file is generic. Once server-side link lookup is added, it can include more specific messaging.

## 62. Frontend README

The project includes `Frontend/README.md`.

What this is:

It is a focused guide for the Next.js frontend.

Why it exists:

The root README explains the whole project. The frontend README explains the frontend's own structure, runtime configuration, caching strategy, admin key handling, and styling rules.

How it works:

The document maps folders to responsibilities and highlights the important architectural choices used by the UI.

Why this is a good choice:

Frontend codebases become hard to onboard when state, API, and styling rules are implicit. A dedicated README makes expectations explicit.

Tradeoff:

It adds another documentation file to maintain, but the clarity is worth it for a fullstack project.

## 63. Frontend Docker Compose Service

The root `docker-compose.yml` includes a `frontend` service.

What this is:

It is the containerized runtime definition for the Next.js frontend.

Why it exists:

A fullstack project should be runnable as a stack. Postgres and backend were already in Compose; adding frontend completes the local production-like topology.

How it works:

The service builds `./Frontend`, injects `NEXT_PUBLIC_API_BASE_URL`, waits for the backend service dependency, and exposes port `3000`.

Why this is a good choice:

It makes the project easier to review and deploy because all primary services are represented in one Compose file.

Tradeoff:

`depends_on` controls start order, not full application readiness. The frontend still handles API errors gracefully if the backend takes a few extra seconds to become ready.

## 64. Root Frontend Loading and Error Boundaries

The frontend includes root `loading.tsx` and `error.tsx` files.

What this is:

These are App Router route-level resilience components for the main application shell.

Why it exists:

Production UIs should avoid blank screens. Loading skeletons keep layout stable while route segments load. Error boundaries give users a recovery action instead of a crash page.

How it works:

- `loading.tsx` renders a shell-shaped skeleton.
- `error.tsx` is a client component because it uses the App Router `reset` callback.
- the error boundary logs the error to the browser console and lets users retry.

Why this is a good choice:

It improves perceived performance and gives a controlled recovery path. The UI stays Tailwind-only and consistent with the dashboard layout.

Tradeoff:

The error boundary logs only client-side right now. A production observability integration could send these errors to a monitoring service later.
