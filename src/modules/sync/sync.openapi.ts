import { registry } from "../shared/openapi-registry.js"
import {
	problemDetailsSchema,
	validationProblemDetailsSchema,
} from "../shared/problem-details.schemas.js"
import {
	syncPullRequestSchema,
	syncPullResponseSchema,
	syncPushRequestSchema,
} from "./sync.schemas.js"

const problemResponse = (
	description: string,
	schema = problemDetailsSchema,
) => ({
	description,
	content: { "application/problem+json": { schema } },
})

const validationResponse = problemResponse(
	"Invalid sync request",
	validationProblemDetailsSchema,
)
const unauthorizedResponse = problemResponse("Authentication is required")
const conflictResponse = problemResponse(
	"The sync operation conflicts with current server data",
)
const invalidJsonResponse = problemResponse("Malformed JSON request body")
const payloadTooLargeResponse = problemResponse(
	"Request body exceeds the limit",
)

registry.registerPath({
	method: "post",
	path: "/api/v1/sync/pull",
	tags: ["Synchronization"],
	security: [{ bearerAuth: [] }],
	request: {
		body: {
			content: { "application/json": { schema: syncPullRequestSchema } },
		},
	},
	responses: {
		200: {
			description: "Incremental changes for the authenticated user",
			content: { "application/json": { schema: syncPullResponseSchema } },
		},
		401: unauthorizedResponse,
		400: invalidJsonResponse,
		422: validationResponse,
		413: payloadTooLargeResponse,
		500: problemResponse("Unexpected server error"),
	},
})

registry.registerPath({
	method: "post",
	path: "/api/v1/sync/push",
	tags: ["Synchronization"],
	security: [{ bearerAuth: [] }],
	request: {
		body: {
			content: { "application/json": { schema: syncPushRequestSchema } },
		},
	},
	responses: {
		204: { description: "Changes accepted" },
		401: unauthorizedResponse,
		400: invalidJsonResponse,
		403: problemResponse("A sync record is not owned by this user"),
		409: conflictResponse,
		422: validationResponse,
		413: payloadTooLargeResponse,
		500: problemResponse("Unexpected server error"),
	},
})
