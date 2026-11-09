import "dotenv/config"

import { randomBytes } from "node:crypto"
import { z } from "zod"

const envSchema = z.object({
	SERVER_PORT: z.coerce.number().int().positive().default(3000),
	SERVER_HOST: z.string().default("127.0.0.1"),
	LOG_LEVEL: z
		.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
		.default("info"),
	PROBLEM_DETAILS_BASE_URL: z
		.string()
		.url()
		.transform((url) => url.replace(/\/+$/, "")),
	DATABASE_URL: z.string().url(),
	POSTGRES_HOST: z.string().default("127.0.0.1"),
	POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
	POSTGRES_USER: z.string().default("my_user"),
	POSTGRES_PASSWORD: z.string().default("my_password"),
	POSTGRES_DB: z.string().default("my_database"),
	AUTH_ACCESS_TOKEN_SECRET: z.string().min(32).optional(),
	OPENAI_API_KEY: z.string().min(1).optional(),
	OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),
	SMTP_URL: z.string().url().optional(),
	MAIL_FROM: z.string().email().optional(),
})

const parsedEnv = envSchema.parse(process.env)

if (
	process.env.NODE_ENV === "production" &&
	!parsedEnv.AUTH_ACCESS_TOKEN_SECRET
) {
	throw new Error("AUTH_ACCESS_TOKEN_SECRET must be configured in production.")
}

export const env = {
	...parsedEnv,
	AUTH_ACCESS_TOKEN_SECRET:
		parsedEnv.AUTH_ACCESS_TOKEN_SECRET ?? randomBytes(48).toString("base64url"),
}
