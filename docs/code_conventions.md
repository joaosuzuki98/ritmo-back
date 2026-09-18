# Ritmo App Backend Code Conventions

## 1. File Naming

Every file within a module follows the pattern:

```
<domain>.<layer>.ts
```

Where `<domain>` is the module name (singular or plural, but consistent within the module) and `<layer>` is the file's responsibility.

| Layer | Example |
|---|---|
| routes | `users.routes.ts` |
| controller | `users.controller.ts` |
| service | `users.service.ts` |
| repository | `users.repository.ts` |
| schemas (Zod) | `users.schemas.ts` |
| events (Inngest) | `users.events.ts` |
| types (when not derived from Zod) | `users.types.ts` |

Exceptions:

- `index.ts` — always this name; it's the module's public API.
- Files inside module subfolders (e.g., `providers/onesignal.provider.ts`) follow `<something>.<role>.ts`, keeping the descriptive suffix even outside the `<domain>.<layer>` pattern.

❌ Avoid: `userController.ts`, `controller.ts`, `UsersController.ts` (missing the domain), `usersCtrl.ts` (abbreviations).

## 2. Functions

- Always use **arrow functions**, including for methods exported from `service` and `repository`.
- No `function functionName() {}` and no anonymous `function`.

```typescript
// Correct
export const createUser = async (input: CreateUserInput) => {
  // ...
}

// Wrong
export async function createUser(input: CreateUserInput) {
  // ...
}
```

- For objects that group a domain's methods (`service`, `repository`), use arrow functions as properties:

```typescript
export const usersService = {
  create: async (input: CreateUserInput) => {
    // ...
  },
  findById: async (id: string) => {
    // ...
  },
}
```

## 3. Formatting

See [Biome.json](../biome.json)

## 4. Imports and Exports

**No `export default`** — always use named exports.

## 5. Types: `type` vs `interface`

- Use `type` for types inferred from Zod (`z.infer<...>`) and unions.
- Use `interface` only for contracts that may be extended (e.g., `PushProvider`).

## 6. General Naming

| Element | Convention | Example |
|---|---|---|
| Variables and functions | camelCase | `createUser`, `userId` |
| Types and interfaces | PascalCase | `CreateUserInput`, `PushProvider` |
| Classes | PascalCase | `OneSignalProvider` |
| Fixed/enum-like constants | UPPER_SNAKE_CASE | `MAX_RETRY_ATTEMPTS` |
| Zod schemas | camelCase + `Schema` suffix | `createUserSchema` |
| Events (event bus / Inngest) | `domain.action` in snake/dot case | `user.created`, `order.payment_failed` |

## 7. Async/await

- Always use `async/await`, never chained `.then()/.catch()`.
- Handle async errors with `try/catch` only when local handling is needed; otherwise, let them propagate to the global error middleware.

## 8. Error Handling

- Every domain error class extends a base `AppError` (`modules/shared/errors.ts`), with `statusCode` and `message`.
- `service` and `repository` throw domain errors (`throw new NotFoundError(...)`), never silently return `null`/`undefined` to indicate an error.

## 9. Input Validation

Every route that receives `body`, `query`, or `params` must validate with Zod in the `controller`, even if the field seems trivial.

## 10. Test Files

- One test file per source file, named `<domain>.<layer>.spec.ts`, placed alongside the tested file.
- `service`/`repository`: unit tests with Prisma mocked.
- `routes`/`controller`: integration tests using `supertest`, isolated per module.

## 11. Environment Variables

- Centralize reading and validation of `process.env` in `modules/shared/env.ts`, validated with Zod at startup (fail fast if a required variable is missing) — instead of accessing `process.env.X` directly scattered throughout the code.

```typescript
// modules/shared/env.ts
import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  ONESIGNAL_API_KEY: z.string(),
  FCM_PROJECT_ID: z.string(),
})

export const env = envSchema.parse(process.env)
```

## 12. Comments

- Comment on the **why**, not the **what** — the code already describes what it does; the comment should justify a non-obvious decision (e.g., why use Inngest instead of an event bus in a specific case).

## 13. API Documentation (OpenAPI)

- API documentation is generated from Zod schemas using `@asteasolutions/zod-to-openapi`, exposed via `swagger-ui-express`. There is no separate/duplicated schema for docs — the same schema used for request validation (see §9) is reused to generate the OpenAPI spec.
- Every Zod schema that represents a request or response shape must be registered with `.openapi(...)` (adding `example`, `description`, etc. where useful) and registered in the module's OpenAPI registry.
- Each module has an `<domain>.openapi.ts` file, responsible for registering that module's paths and schemas in the shared registry.

| Layer | Example |
|---|---|
| openapi registration | `users.openapi.ts` |

```typescript
// modules/users/users.schemas.ts
import { z } from "zod"
import { registry } from "modules/shared/openapi-registry"

export const createUserSchema = registry.register(
  "CreateUserInput",
  z.object({
    name: z.string().openapi({ example: "Jane Doe" }),
    email: z.string().email().openapi({ example: "jane@example.com" }),
  })
)

export type CreateUserInput = z.infer<typeof createUserSchema>
```

```typescript
// modules/users/users.openapi.ts
import { registry } from "modules/shared/openapi-registry"
import { createUserSchema } from "./users.schemas"

registry.registerPath({
  method: "post",
  path: "/users",
  tags: ["Users"],
  request: {
    body: {
      content: { "application/json": { schema: createUserSchema } },
    },
  },
  responses: {
    201: {
      description: "User created",
      content: { "application/json": { schema: createUserSchema } },
    },
  },
})
```

- The global registry (`OpenAPIRegistry` instance) lives in `modules/shared/openapi-registry.ts`, and the final document is generated and served in `modules/shared/openapi.ts` (mounted at `/docs`).
- `<domain>.openapi.ts` files must be imported once, centrally (e.g. in `modules/shared/openapi.ts` or the app bootstrap), so every module's routes get registered before the spec is generated.
- Adding a new route to a `<domain>.routes.ts` file without a corresponding entry in `<domain>.openapi.ts` is considered incomplete work.