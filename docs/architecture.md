# Ritmo App Backend Architecture

## Overview

This project adopts the **Modular Monolith** pattern: a single application, a single deployment, but with code organized into **independent domain modules** (e.g., `users`, `orders`, `payments`), each with well-defined internal boundaries — as if they were "internal microservices" running in the same process.

## Folder Structure

```
src/
├── modules/
│   ├── users/
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.repository.ts
│   │   ├── users.routes.ts
│   │   ├── users.schemas.ts     # Zod schemas + inferred types
│   │   ├── users.events.ts      # Inngest functions for the module
│   │   └── index.ts             # module's public API
│   ├── orders/
│   │   ├── orders.controller.ts
│   │   ├── orders.service.ts
│   │   ├── orders.repository.ts
│   │   ├── orders.routes.ts
│   │   ├── orders.schemas.ts
│   │   ├── orders.events.ts
│   │   └── index.ts
│   ├── notifications/
│   │   ├── notifications.service.ts
│   │   ├── notifications.repository.ts
│   │   ├── notifications.schemas.ts
│   │   ├── providers/
│   │   │   ├── onesignal.provider.ts
│   │   │   └── fcm.provider.ts
│   │   └── index.ts
│   └── shared/
│       ├── database.ts          # single PrismaClient instance
│       ├── errors.ts
│       ├── event-bus.ts         # EventEmitter for synchronous in-memory reactions
│       ├── schemas.ts           # Zod schemas shared across modules
│       └── inngest/
│           ├── client.ts        # single Inngest instance
│           └── index.ts         # registers all functions, exposes the endpoint
├── app.ts
└── server.ts

prisma/
├── schema.prisma                # single schema, organized by domain (comments/@@map)
└── migrations/
```

## Internal Layers of a Module

Each module follows the same layered structure, keeping responsibilities separated:

| Layer | Responsibility |
|---|---|
| `*.routes.ts` | Defines the HTTP endpoints and maps each route to its controller |
| `*.controller.ts` | Receives the request, validates input with Zod, delegates to the service, formats the HTTP response |
| `*.service.ts` | Contains the domain's business logic |
| `*.repository.ts` | Data access (Prisma, cache, etc.) |
| `*.schemas.ts` | The domain's Zod schemas and TS types inferred from them |
| `*.events.ts` | Inngest functions — what the module fires and/or listens for durably |
| `index.ts` | The module's public API — the only access point allowed from outside |

## Golden Rule: Boundaries Between Modules

> **Modules can only communicate through each other's `index.ts`.**

This means:

- ❌ `orders` **cannot** import directly from `users/users.repository.ts` or `users/users.service.ts`.
- ✅ `orders` **must** import only what is exported from `users/index.ts`.
- ❌ No module can call the OneSignal or Firebase Admin SDK directly — this is encapsulated inside `notifications`.
- ❌ No module can access `prisma.<model>` for a table it doesn't own — only the owning module's `*.repository.ts` accesses its own tables.

```typescript
// Correct
import { UsersService } from '../users';

// Wrong — breaks the module's encapsulation
import { UsersRepository } from '../users/users.repository';
```

## Communication Between Modules

There are three allowed forms of communication between modules:

1. **Direct call via public API** (`index.ts`) — used when a module needs a synchronous response from another (e.g., `orders` validates a `user` before creating an order).
2. **Events via `event-bus`** — asynchronous, in-memory communication within the same process. Used for trivial reactions that don't need to survive a restart or have retries (e.g., invalidating a local cache).
3. **Events via Inngest** — asynchronous and durable communication, with automatic retry, scheduling, and observability. Used for any important side effect (sending a push notification, processing a payment, generating a report).

```typescript
// modules/shared/event-bus.ts
import { EventEmitter } from 'events';

export const eventBus = new EventEmitter();
```

```typescript
// modules/shared/inngest/client.ts
import { Inngest } from 'inngest';

export const inngest = new Inngest({ id: 'ritmo-app' });
```

### When to Use Each Mechanism

| Mechanism | When to use |
|---|---|
| `event-bus` (EventEmitter) | Trivial reactions, same process, no need for retry (e.g., invalidating a local cache) |
| **Inngest** | Anything that needs to survive a restart, have automatic retry, delay/scheduling, or an important side effect (push, billing, report) |

Example of firing and consuming via Inngest:

```typescript
// users.service.ts
import { inngest } from '../shared/inngest/client';

export const UsersService = {
  async create(input: CreateUserInput) {
    const user = await usersRepository.create(input);

    await inngest.send({
      name: 'user.created',
      data: { userId: user.id, email: user.email },
    });

    return user;
  },
};
```

```typescript
// users.events.ts
import { inngest } from '../shared/inngest/client';
import { userCreatedPayloadSchema } from './users.schemas';

export const sendWelcomeNotification = inngest.createFunction(
  { id: 'send-welcome-notification' },
  { event: 'user.created' },
  async ({ event, step }) => {
    const data = userCreatedPayloadSchema.parse(event.data);

    await step.run('send-push', async () => {
      const { NotificationsService } = await import('../notifications');
      await NotificationsService.sendToUser(data.userId, {
        title: 'Welcome!',
        body: 'Your account has been created successfully.',
      });
    });
  }
);
```

All Inngest functions from all modules are registered centrally:

```typescript
// modules/shared/inngest/index.ts
import { serve } from 'inngest/express';
import { inngest } from './client';
import { sendWelcomeNotification } from '../../users/users.events';
import { processOrderPayment } from '../../orders/orders.events';

export const inngestRouter = serve({
  client: inngest,
  functions: [sendWelcomeNotification, processOrderPayment],
});
```

## Database (Prisma)

The Prisma Client is a **single shared instance**, exported by `modules/shared/database.ts`:

```typescript
// modules/shared/database.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
```

Rules:

- The `schema.prisma` file is physically a single file, but the `model`s are **grouped by domain** (section comments and/or `@@map`), making it clear which module owns each table.
- Each module **exclusively** accesses its own tables, and only through its own `*.repository.ts`.
- No module queries another module's tables directly — if it needs data from another domain, it calls the public API (`index.ts`) of the owning module.

```prisma
// ===== users =====
model User {
  id    String @id @default(uuid())
  email String @unique
}

// ===== orders =====
model Order {
  id     String @id @default(uuid())
  userId String
  @@map("orders")
}
```

## Push Notifications (OneSignal + FCM)

Push notifications are treated as an **infrastructure module** (`modules/notifications`), not business logic. No other module knows about the OneSignal or Firebase Admin SDK — all of them talk only to `NotificationsService` via `index.ts`.

```
modules/notifications/
├── notifications.service.ts     # decides channel/provider, formats payload
├── notifications.repository.ts  # persists device tokens and preferences (Prisma)
├── notifications.schemas.ts     # Zod schemas for notification payloads
├── providers/
│   ├── onesignal.provider.ts
│   └── fcm.provider.ts
└── index.ts
```

```typescript
// notifications.schemas.ts
import { z } from 'zod';

export const pushPayloadSchema = z.object({
  title: z.string(),
  body: z.string(),
  data: z.record(z.string()).optional(),
});

export type PushPayload = z.infer<typeof pushPayloadSchema>;
```

```typescript
// providers/onesignal.provider.ts + fcm.provider.ts
// implement a common interface PushProvider { send(token, payload) }
```

```typescript
// notifications.service.ts
export const NotificationsService = {
  async sendToUser(userId: string, payload: PushPayload) {
    const devices = await notificationsRepository.getDeviceTokens(userId);
    for (const device of devices) {
      const provider = providers[device.provider]; // 'onesignal' | 'fcm'
      await provider.send(device.token, payload);
    }
  },
};
```

```typescript
// index.ts
export { NotificationsService } from './notifications.service';
export type { PushPayload } from './notifications.schemas';
```

## Application Composition

`app.ts` is the only place where modules are "wired" into Express, through the routes exposed by each `index.ts`, including the Inngest endpoint.

## Error Handling

Domain errors should be handled centrally in `modules/shared/errors.ts`, with custom error classes (e.g., `NotFoundError`, `ValidationError`) caught by a global error middleware in Express. The same middleware also catches `ZodError`, converting it into a standardized 400 response — avoiding duplicated handling logic in each controller.

## Testability

Since each module has isolated responsibilities and controlled communication, it is possible to:

- Unit test `service` and `repository` without starting the HTTP server (mocking the Prisma Client).
- Integration test `controller` and `routes` isolated per module.
- Mock a module's public API (`index.ts`) when testing another module that depends on it — including `NotificationsService`, to avoid actually sending push notifications during tests.
- Test Inngest functions in isolation with `InngestTestEngine`, without depending on the in-memory event-bus or external infrastructure.

## Summary of Principles

1. One module per business domain (including infrastructure domains, such as `notifications`).
2. Consistent internal layers: `routes → controller → service → repository`, with `schemas.ts` (Zod) and `events.ts` (Inngest) as supporting layers.
3. Communication between modules only via `index.ts` (public API), `event-bus` (in-memory async/sync), or Inngest (durable async).
4. Shared database (Prisma), but with logical isolation per module — each module only accesses its own tables.
5. Input validation and event payloads always via Zod, with TS types inferred from the schemas.
6. External providers (OneSignal, FCM) are encapsulated behind the `notifications` public API — no other module knows about them directly.