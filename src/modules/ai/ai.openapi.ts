import { registry } from "../shared/openapi-registry.js"
import {
	problemDetailsSchema,
	validationProblemDetailsSchema,
} from "../shared/problem-details.schemas.js"
import { aiChatResponseSchema, chatRequestSchema } from "./ai.schemas.js"

const problemResponse = (
	description: string,
	schema = problemDetailsSchema,
) => ({
	description,
	content: { "application/problem+json": { schema } },
})

registry.registerPath({
	method: "post",
	path: "/api/v1/ai/chat",
	tags: ["AI"],
	security: [{ bearerAuth: [] }],
	request: {
		body: {
			content: { "application/json": { schema: chatRequestSchema } },
		},
	},
	responses: {
		200: {
			description: "AI reply and an optional client-side change proposal",
			content: { "application/json": { schema: aiChatResponseSchema } },
		},
		400: problemResponse("Malformed JSON request body"),
		401: problemResponse("Authentication is required"),
		413: problemResponse("Request body exceeds the limit"),
		422: problemResponse(
			"Invalid chat request",
			validationProblemDetailsSchema,
		),
		429: problemResponse("AI usage limit exceeded"),
		502: problemResponse("The AI response could not be validated"),
		503: problemResponse("The AI provider is unavailable or not configured"),
	},
})
