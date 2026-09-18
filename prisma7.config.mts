import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl =
  process.env["DATABASE_URL"] ??
  `postgresql://${process.env["POSTGRES_USER"]}:${process.env["POSTGRES_PASSWORD"]}@${process.env["POSTGRES_HOST"]}:${process.env["POSTGRES_PORT"]}/${process.env["POSTGRES_DB"]}?schema=public`;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
