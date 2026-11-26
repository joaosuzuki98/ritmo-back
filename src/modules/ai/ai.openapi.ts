import { z } from "zod"
import { registry } from "../shared/openapi-registry.js"
import {
	problemDetailsSchema,
	validationProblemDetailsSchema,
} from "../shared/problem-details.schemas.js"

import {
	agentChatRequestSchema,
	proposalDecisionParamsSchema,
	proposalDecisionRequestSchema,
	proposalDecisionResponseSchema,
} from "./ai.schemas.js"

const problemResponse = (
	description: string,
	schema = problemDetailsSchema,
) => ({
	description,
	content: { "application/problem+json": { schema } },
})

registry.registerPath({
	method: "post",
	path: "/api/v1/ai/proposals/{proposalId}/decision",
	tags: ["AI"],
	security: [{ bearerAuth: [] }],
	request: {
		params: proposalDecisionParamsSchema,
		body: {
			content: {
				"application/json": { schema: proposalDecisionRequestSchema },
			},
		},
	},
	responses: {
		200: {
			description: "Proposal decision recorded; retries are idempotent.",
			content: {
				"application/json": { schema: proposalDecisionResponseSchema },
			},
		},
		400: problemResponse("Malformed JSON request body"),
		401: problemResponse("Authentication is required"),
		404: problemResponse("Proposal is unavailable"),
		409: problemResponse("Proposal expired or has a conflicting decision"),
		422: problemResponse(
			"Invalid request or unsupported action",
			validationProblemDetailsSchema,
		),
	},
})

registry.registerPath({
	method: "post",
	path: "/api/v1/ai/chat/stream",
	tags: ["AI"],
	security: [{ bearerAuth: [] }],
	request: {
		body: {
			content: { "application/json": { schema: agentChatRequestSchema } },
		},
	},
	responses: {
		200: {
			description:
				"Server-sent events: status, followed by result or error. Result includes reply, proposal, proposalId and proposalExpiresAt. Proposal identifiers are required for server-side confirmation.",
			content: { "text/event-stream": { schema: z.string() } },
		},
		400: problemResponse("Malformed JSON request body"),
		401: problemResponse("Authentication is required"),
		413: problemResponse("Request body exceeds the limit"),
		422: problemResponse(
			"Invalid chat request",
			validationProblemDetailsSchema,
		),
		429: problemResponse("AI usage limit exceeded"),
	},
})
