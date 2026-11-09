import { registry } from "../shared/openapi-registry.js"
import {
	problemDetailsSchema,
	validationProblemDetailsSchema,
} from "../shared/problem-details.schemas.js"
import {
	authResponseSchema,
	loginRequestSchema,
	logoutRequestSchema,
	messageResponseSchema,
	passwordResetCompleteSchema,
	passwordResetRequestSchema,
	refreshRequestSchema,
	registerRequestSchema,
} from "./auth.schemas.js"

const problemResponse = (
	description: string,
	schema:
		| typeof problemDetailsSchema
		| typeof validationProblemDetailsSchema = problemDetailsSchema,
) => ({
	description,
	content: { "application/problem+json": { schema } },
})

const validationProblemResponse = problemResponse(
	"Invalid request",
	validationProblemDetailsSchema,
)
const invalidJsonResponse = problemResponse("Malformed JSON request body")
const payloadTooLargeResponse = problemResponse(
	"Request body exceeds the limit",
)

const registerPath = {
	method: "post" as const,
	tags: ["Authentication"],
	responses: {
		201: {
			description: "Account created and session opened",
			content: { "application/json": { schema: authResponseSchema } },
		},
		409: problemResponse("Email is already registered"),
		400: invalidJsonResponse,
		422: validationProblemResponse,
		429: problemResponse("Too many requests"),
		413: payloadTooLargeResponse,
		500: problemResponse("Unexpected server error"),
	},
}

registry.registerPath({
	...registerPath,
	path: "/api/v1/auth/register",
	request: {
		body: {
			content: { "application/json": { schema: registerRequestSchema } },
		},
	},
})
registry.registerPath({
	method: "post",
	path: "/api/v1/auth/login",
	tags: ["Authentication"],
	request: {
		body: { content: { "application/json": { schema: loginRequestSchema } } },
	},
	responses: {
		200: {
			description: "Authenticated",
			content: { "application/json": { schema: authResponseSchema } },
		},
		401: problemResponse("Invalid credentials"),
		400: invalidJsonResponse,
		422: validationProblemResponse,
		429: problemResponse("Too many requests"),
		413: payloadTooLargeResponse,
		500: problemResponse("Unexpected server error"),
	},
})
registry.registerPath({
	method: "post",
	path: "/api/v1/auth/refresh",
	tags: ["Authentication"],
	request: {
		body: { content: { "application/json": { schema: refreshRequestSchema } } },
	},
	responses: {
		200: {
			description: "Rotated tokens",
			content: { "application/json": { schema: authResponseSchema } },
		},
		401: problemResponse("Invalid or expired refresh token"),
		400: invalidJsonResponse,
		422: validationProblemResponse,
		429: problemResponse("Too many requests"),
		413: payloadTooLargeResponse,
		500: problemResponse("Unexpected server error"),
	},
})
registry.registerPath({
	method: "post",
	path: "/api/v1/auth/logout",
	tags: ["Authentication"],
	request: {
		body: { content: { "application/json": { schema: logoutRequestSchema } } },
	},
	responses: {
		204: { description: "Session revoked" },
		400: invalidJsonResponse,
		422: validationProblemResponse,
		429: problemResponse("Too many requests"),
		413: payloadTooLargeResponse,
		500: problemResponse("Unexpected server error"),
	},
})
registry.registerPath({
	method: "post",
	path: "/api/v1/auth/password-reset/request",
	tags: ["Authentication"],
	request: {
		body: {
			content: { "application/json": { schema: passwordResetRequestSchema } },
		},
	},
	responses: {
		200: {
			description: "If the account exists, a code is sent",
			content: { "application/json": { schema: messageResponseSchema } },
		},
		422: validationProblemResponse,
		429: problemResponse("Too many requests"),
		413: payloadTooLargeResponse,
		400: invalidJsonResponse,
		500: problemResponse("Unexpected server error"),
		503: problemResponse("Email delivery is not configured"),
	},
})
registry.registerPath({
	method: "post",
	path: "/api/v1/auth/password-reset/complete",
	tags: ["Authentication"],
	request: {
		body: {
			content: { "application/json": { schema: passwordResetCompleteSchema } },
		},
	},
	responses: {
		200: {
			description: "Password changed and sessions revoked",
			content: { "application/json": { schema: messageResponseSchema } },
		},
		400: problemResponse("Invalid reset code or malformed JSON"),
		422: validationProblemResponse,
		429: problemResponse("Too many requests"),
		413: payloadTooLargeResponse,
		500: problemResponse("Unexpected server error"),
	},
})
