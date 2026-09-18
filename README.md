# Ritmo App Backend

## 🚀 Technologies

- **Express**: Web framework for Node.js
- **Prisma**: ORM for database communication
- **Zod**: Data validation and typed schemas
- **tsx**: TypeScript executor to run the application in a development environment
- **Biome**: Fast and modern linting and code formatting tool
- **Vitest + Supertest**: Frameworks for writing and running tests, including integration tests for HTTP routes
- **Pino**: High-performance logging library
- **Inngest**: Event and background job orchestration

## 🏗️ Architecture

See more about the architecture [here](./docs/architecture.md)

## 📐 Code conventions

See more about code conventions [here](./docs/code_conventions.md)

## ⚙️ Running the project

1. Install the project dependencies using
```bash
npm install
```

2. Create the .env file and fill in the variables:
```bash
cp .env.example .env
```

3. Start the dependencies for use in the dev environment:
```bash
docker compose up -d
```

4. Validate the Prisma schema:
```bash
npx prisma validate --schema prisma/schema.prisma --config prisma7.config.mts
```

5. Apply the existing Prisma migrations, or create and apply a new migration when the schema has changed:
```bash
npx prisma migrate dev --schema prisma/schema.prisma --config prisma7.config.mts
```

To create a migration without applying it immediately, use a descriptive name:
```bash
npx prisma migrate dev --create-only --name <migration-name> --schema prisma/schema.prisma --config prisma7.config.mts
```

For production or another deployment environment, apply migrations without creating new ones:
```bash
npx prisma migrate deploy --schema prisma/schema.prisma --config prisma7.config.mts
```

6. Finally, run the API in the dev environment using:
```bash
npm run dev
```

If you're using the default values in the .env for the server, it will be available at `http://localhost:3000`.

## 📚 API documentation

With the API running, access the interactive Swagger UI at:

`http://localhost:<SERVER_PORT>/docs`

The raw OpenAPI specification is available at:

`http://localhost:<SERVER_PORT>/docs.json`

For example, with `SERVER_PORT=3000`:

- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs.json`

## 🧪 Tests

To run the tests:
```bash
npm run test
```