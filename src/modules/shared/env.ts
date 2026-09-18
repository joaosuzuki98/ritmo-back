require("dotenv/config")

import z = require("zod")

const envSchema = z.object({
	SERVER_PORT: z.coerce.number().int().positive().default(3000),
})

const env = envSchema.parse(process.env)

module.exports = { env }
