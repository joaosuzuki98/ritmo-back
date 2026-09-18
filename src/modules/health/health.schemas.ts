import z = require("zod")

import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi"

const { registry } = require("../shared/openapi-registry") as {
	registry: OpenAPIRegistry
}

const healthResponseSchema = registry.register(
	"HealthResponse",
	z.object({
		status: z.literal("ok").openapi({ example: "ok" }),
		timestamp: z.iso.datetime().openapi({
			example: "2026-09-18T12:00:00.000Z",
		}),
		version: z.string().openapi({ example: "0.1.0" }),
	}),
)

export type HealthResponse = z.infer<typeof healthResponseSchema>

module.exports = { healthResponseSchema }
