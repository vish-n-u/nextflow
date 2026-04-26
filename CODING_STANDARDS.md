# Coding Standards & Architecture Guide

These are the coding standards, architecture patterns, and style rules to follow when writing or reviewing code in this project. Apply them consistently across all new files and features.

---

## General Philosophy

- **Thin route handlers, fat service layer.** Route files only parse input, call a service function, and return a response. All business logic lives in dedicated helper files.
- **Minimum necessary complexity.** Only build what is needed right now. No abstractions for hypothetical future use cases, no extra configurability, no defensive code for scenarios that cannot happen.
- **One responsibility per file.** Each file does one thing. A file named `create-link.ts` only creates a link.
- **Throw errors, never return them.** Errors are always thrown as typed error class instances. Route-level middleware catches and formats them into HTTP responses.
- **Self-documenting code.** Code should read clearly enough that comments are not needed. Only add a comment when the logic is genuinely non-obvious.

---

## Project Structure

```
apps/
  web/                        # Application entry point (Next.js)
    app/
      api/                    # HTTP route handlers (thin)
    lib/
      api/                    # Business logic, one folder per domain
        <domain>/
          index.ts            # Re-exports all functions in the folder
          create-<resource>.ts
          update-<resource>.ts
          delete-<resource>.ts
          get-<resource>-or-throw.ts
          get-<resources>.ts
          transform-<resource>.ts
          utils.ts
      auth/                   # Authentication middleware
      zod/
        schemas/              # All Zod schemas, one file per domain
      types.ts                # Shared TypeScript interfaces
packages/
  ui/                         # Shared UI components
  utils/                      # Shared utility functions
  <other-shared-packages>/
```

### Rules
- Never put business logic directly in a route file.
- Never define Zod schemas inline inside route files — they belong in `lib/zod/schemas/<domain>.ts`.
- Never import cross-domain business logic directly; go through each domain's `index.ts`.
- Shared code used across multiple apps goes in a `packages/` workspace package, not in `apps/`.

---

## API Routes

### Structure

Each route file exports named HTTP method handlers. Method names are uppercase (`GET`, `POST`, `PATCH`, `DELETE`).

```ts
// app/api/<resource>/route.ts

export const GET = withAuth(async ({ req, params, searchParams, headers, session }) => {
  const filters = myQuerySchema.parse(searchParams);
  const result = await getResources(filters);
  return NextResponse.json(result, { headers });
});

export const POST = withAuth(async ({ req, headers, session }) => {
  const body = await myBodySchema.parseAsync(await parseRequestBody(req));
  const result = await createResource(body, session.user.id);
  return NextResponse.json(result, { status: 201, headers });
});
```

### Auth middleware (HOC pattern)

All routes are wrapped in an auth HOC (e.g. `withAuth`, `withWorkspace`). The HOC is responsible for:
- Authenticating the request (API key or session)
- Rate limiting
- Loading the authenticated user/workspace
- Permission/role checks
- Error handling (catches all thrown errors and formats them)

The handler receives a context object — never re-do auth or permission checks inside the handler that the HOC already handles.

### Always forward `headers`

The HOC populates response headers (e.g. rate-limit info). Always pass them to `NextResponse.json`:

```ts
return NextResponse.json(data, { headers }); // correct
return NextResponse.json(data);              // wrong — drops rate-limit headers
```

---

## Error Handling

### Custom error class

Define a typed error class for API errors:

```ts
export class AppApiError extends Error {
  public readonly code: ErrorCode;

  constructor({ code, message }: { code: ErrorCode; message: string }) {
    super(message);
    this.code = code;
  }
}
```

### Always throw, never return error responses

```ts
// correct
throw new AppApiError({ code: "not_found", message: "User not found." });

// wrong
return NextResponse.json({ error: "User not found." }, { status: 404 });
```

The auth HOC catches thrown errors and converts them to `NextResponse.json` automatically.

### Standard error codes

Define a fixed set of error codes mapped to HTTP statuses:

```ts
export const ErrorCodes = {
  bad_request:           400,
  unauthorized:          401,
  forbidden:             403,
  not_found:             404,
  conflict:              409,
  unprocessable_entity:  422,
  rate_limit_exceeded:   429,
  internal_server_error: 500,
} as const;
```

### `getXOrThrow` pattern

Wrap resource lookups that need validation into dedicated helpers:

```ts
// lib/api/users/get-user-or-throw.ts
export const getUserOrThrow = async ({ userId, requesterId }) => {
  const user = await db.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppApiError({ code: "not_found", message: "User not found." });
  }

  if (user.id !== requesterId) {
    throw new AppApiError({ code: "forbidden", message: "Access denied." });
  }

  return user;
};
```

Use these helpers at the top of route handlers instead of repeating lookup + validation logic.

---

## Validation (Zod)

### Version

Use Zod v4 exclusively:

```ts
import * as z from "zod/v4"; // correct
import { z } from "zod";     // wrong
```

### Schema file location

All schemas live in `lib/zod/schemas/<domain>.ts`. Import them into route files; never define schemas in route files.

### Parsing

```ts
// Query params — synchronous
const filters = myQuerySchema.parse(searchParams);

// Request body — async (body reading is async)
const body = await myBodySchema.parseAsync(await parseRequestBody(req));
```

### Schema design rules

- Export schemas and their inferred types together:
  ```ts
  export const createUserSchema = z.object({ ... });
  export type CreateUserInput = z.infer<typeof createUserSchema>;
  ```
- Add `.describe()` to every field for documentation/OpenAPI generation.
- Add `.meta({ example: ... })` to fields that benefit from examples.
- Use `.coerce` for fields that come in as strings from query params (numbers, booleans, dates).
- Reuse primitive schemas (`parseUrlSchema`, `parseDateSchema`, pagination schemas) rather than redefining them.

### Pagination schemas

Define reusable pagination schemas:

```ts
// Offset pagination
const paginationSchema = z.object({
  page:     z.coerce.number().positive().optional().default(1),
  pageSize: z.coerce.number().positive().max(100).optional().default(50),
});

// Cursor pagination
const cursorSchema = z.object({
  startingAfter: z.string().optional(),
  endingBefore:  z.string().optional(),
});
```

---

## Business Logic Layer (`lib/api/<domain>/`)

### File naming

| File | Purpose |
|---|---|
| `create-<resource>.ts` | Insert a new record |
| `update-<resource>.ts` | Update an existing record |
| `delete-<resource>.ts` | Delete a record |
| `get-<resource>-or-throw.ts` | Fetch one record, throw if not found/unauthorized |
| `get-<resources>.ts` | Fetch a list with filters |
| `get-<resources>-count.ts` | Count query |
| `transform-<resource>.ts` | Shape a DB row into the API response format |
| `process-<resource>.ts` | Validate + normalise input before a write |
| `utils.ts` | Internal helpers for the domain |
| `index.ts` | Re-exports all of the above |

### Rules
- One function per file.
- Functions are pure where possible — accept explicit arguments, return explicit values.
- No side effects (cache writes, webhooks, emails) inside core CRUD functions — call those separately from the route handler.
- Transform functions (`transformX`) convert raw DB shapes into the public API shape.
- Process functions (`processX`) validate and normalise input before it touches the database.

---

## Async Side Effects

Side effects that don't affect the response (cache invalidation, webhook delivery, analytics events, audit logs) must not block the response. Use a fire-and-forget mechanism:

```ts
import { waitUntil } from "@vercel/functions"; // or equivalent for your runtime

// correct — response is returned immediately, side effect runs in background
waitUntil(sendWebhook({ event: "user.created", data }));

// wrong — blocks the response unnecessarily
await sendWebhook({ event: "user.created", data });
```

---

## TypeScript

- Use `interface` for object shapes that may be extended; use `type` for unions, intersections, and aliases.
- Export types alongside the functions that use them — do not dump all types into a single `types.ts` unless they are genuinely shared across many files.
- Use `satisfies` to validate objects against a type without widening.
- Avoid `any`. Use `unknown` for truly unknown values and narrow with type guards.
- Prefer explicit return types on exported functions.

---

## Database (Prisma)

- Import the client from a single shared location (e.g. `@/lib/db` or a shared package). Never instantiate a new client per file.
- Always use `select` or `include` explicitly — never fetch columns you don't need.
- Keep Prisma queries inside `lib/api/<domain>/` files, not in route handlers.
- Catch Prisma's `P2025` error (record not found) and convert it to a typed `not_found` error.

---

## Rate Limiting

- Rate limiting is handled in the auth HOC, not in individual route handlers.
- Different limits apply to different tiers (free vs paid) and request types (read vs write, regular vs analytics).
- Identify requests by hashed API key or user ID, never by raw IP alone for authenticated requests.
- Rate-limit headers must be forwarded in the response (hence always pass `headers` to `NextResponse.json`).

---

## Monorepo (Turborepo + pnpm)

- Shared code used by more than one app lives in `packages/`, published as internal workspace packages (e.g. `@myapp/ui`, `@myapp/utils`).
- Each package has its own `package.json`, `tsconfig.json`, and builds independently.
- Apps import from packages via workspace protocol: `"@myapp/ui": "workspace:*"`.
- Run tasks with `turbo` (e.g. `turbo build`, `turbo dev`) to respect dependency order.
- Do not import directly across `apps/` — use a shared package instead.

---

## What NOT to Do

- Do not add error handling for scenarios that cannot realistically occur.
- Do not create utility abstractions until the same logic appears in at least three places.
- Do not add comments explaining what the code does — only add comments explaining *why* when the reason is not obvious.
- Do not add backwards-compatibility shims, re-exports of removed code, or `// removed` comments.
- Do not define Zod schemas, constants, or types inline in route files.
- Do not `await` side effects that do not affect the response.
- Do not add features, flags, or configuration options that are not required by the current task.
