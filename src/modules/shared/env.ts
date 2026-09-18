require("dotenv/config")

import z = require("zod")

const envSchema = z.object({
	SERVER_PORT: z.coerce.number().int().positive().default(3000),
	SERVER_HOST: z.string().default("127.0.0.1"),
	DATABASE_URL: z.string().url(),
	POSTGRES_HOST: z.string().default("127.0.0.1"),
	POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
	POSTGRES_USER: z.string().default("my_user"),
	POSTGRES_PASSWORD: z.string().default("my_password"),
	POSTGRES_DB: z.string().default("my_database"),
})

const env = envSchema.parse(process.env)

module.exports = { env }
