import { registry } from "../shared/openapi-registry.js"
import { problemDetailsSchema } from "../shared/problem-details.schemas.js"
import { healthResponseSchema } from "./health.schemas.js"

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
		500: {
			description: "Unexpected server error",
			content: {
				"application/problem+json": {
					schema: problemDetailsSchema,
				},
			},
		},
	},
})
