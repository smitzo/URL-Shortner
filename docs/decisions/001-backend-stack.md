# ADR 001: Backend Stack

## Status

Accepted

## Context

The project needs a backend that can:

- create short links;
- redirect quickly;
- write click analytics;
- aggregate analytics;
- run with PostgreSQL;
- be understandable for a small team;
- remain production-ready without excessive framework complexity.

## Decision

Use:

- Node.js 20 as the runtime;
- Express as the HTTP framework;
- TypeScript for static typing;
- Prisma as the PostgreSQL ORM and migration tool;
- Zod for runtime validation;
- Pino for structured logging.

## Rationale

Node.js is a good match because the workload is I/O-heavy. Redirects and analytics writes mostly wait on the database, so the event loop model is appropriate.

Express keeps the HTTP layer explicit. The codebase can show exactly where middleware, routes, and error handling live. This is easier to teach and review than a heavier framework for the current project size.

TypeScript reduces accidental API and service contract mistakes. It is especially useful because request validation, Prisma models, and frontend API clients all benefit from predictable shapes.

Prisma provides typed database access and repeatable migrations. PostgreSQL remains the source of truth, while Prisma reduces handwritten SQL for common operations.

Zod validates untrusted request data. TypeScript alone cannot protect runtime boundaries because HTTP bodies arrive as unknown data.

Pino gives structured logs with low overhead. This matters for production debugging and request correlation.

## Consequences

Benefits:

- clear backend structure;
- strong typing;
- migration discipline;
- easy onboarding;
- production-friendly logging and validation.

Costs:

- Express requires us to design project structure ourselves;
- Prisma generated types require a generate step after schema changes;
- Zod schemas must be kept aligned with API documentation.

## Alternatives Considered

NestJS:

- More built-in architecture.
- More ceremony than needed for the current service.

Fastify:

- Very strong performance.
- Express has broader familiarity and enough performance for this workload.

Raw SQL only:

- Maximum control.
- More repetitive and easier to get wrong for standard CRUD.
