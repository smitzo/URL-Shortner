# Shortner Frontend

Next.js App Router frontend for the URL Shortner product.

## Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Heroicons

## Important Folders

- `src/app`: Next.js routes and route-level loading states.
- `src/components`: shared UI and app shell components.
- `src/features/links`: link creation workflow.
- `src/features/analytics`: analytics and management dashboard.
- `src/hooks`: reusable client-side state hooks.
- `src/lib`: API client, endpoint layer, cache, config, formatting helpers.
- `src/types`: shared frontend API types.

## Runtime Configuration

Set:

```sh
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

This value is read by `src/lib/config.ts`.

## Caching Strategy

The frontend uses a small in-memory cache in `src/lib/request-cache.ts`.

It provides:

- TTL-based cached reads;
- in-flight request de-duplication;
- prefix invalidation after metadata and status mutations.

This keeps the app optimized without introducing a larger data-fetching library during the initial build.

## Admin Key Handling

Analytics pages use `useAdminKey`.

The hook:

- reads `adminKey` from the query string;
- stores it per short code in `localStorage`;
- lets users clear the saved key.

The backend remains the authority; the frontend only gates UI optimistically.

## Styling Rules

The frontend uses Tailwind utility classes only. There are no custom raw CSS files beyond Tailwind directives in `globals.css`.

UI primitives live in `src/components/ui` so forms, panels, buttons, and status badges remain consistent.
