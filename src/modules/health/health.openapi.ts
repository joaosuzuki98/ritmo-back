import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi"
import type { ZodType } from "zod"

import type { HealthResponse } from "./health.schemas"

const { registry } = require("../shared/openapi-registry") as {
	registry: OpenAPIRegistry
}
const { healthResponseSchema } = require("./health.schemas") as {
	healthResponseSchema: ZodType<HealthResponse>
}

registry.registerPath({
	method: "get",
	path: "/api/v1/health",
	tags: ["Health"],
	responses: {
		200: {
			description: "Current application health status",
			content: {
				"application/json": {
					schema: healthResponseSchema,
				},
			},
		},
	},
})
