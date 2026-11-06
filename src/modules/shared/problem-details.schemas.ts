import { z } from "zod"

import { registry } from "./openapi-registry.js"

const problemDetailsBaseSchema = z.object({
	type: z.string().url(),
	title: z.string(),
	status: z.number().int(),
	detail: z.string(),
	instance: z.string(),
	code: z.string().optional(),
})

const problemDetailsSchema = registry.register(
	"ProblemDetails",
	problemDetailsBaseSchema,
)

const validationProblemDetailsSchema = registry.register(
	"ValidationProblemDetails",
	problemDetailsBaseSchema.extend({
		errors: z.array(z.object({ field: z.string(), message: z.string() })),
	}),
)

export { problemDetailsSchema, validationProblemDetailsSchema }
