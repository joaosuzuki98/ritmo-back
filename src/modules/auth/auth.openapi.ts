import { registry } from "../shared/openapi-registry.js"
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

const registerPath = {
	method: "post" as const,
	tags: ["Authentication"],
	responses: {
		201: {
			description: "Account created and session opened",
			content: { "application/json": { schema: authResponseSchema } },
		},
		409: { description: "Email is already registered" },
		422: { description: "Invalid request" },
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
		401: { description: "Invalid credentials" },
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
		401: { description: "Invalid or expired refresh token" },
	},
})
registry.registerPath({
	method: "post",
	path: "/api/v1/auth/logout",
	tags: ["Authentication"],
	request: {
		body: { content: { "application/json": { schema: logoutRequestSchema } } },
	},
	responses: { 204: { description: "Session revoked" } },
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
		503: { description: "Email delivery is not configured" },
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
		400: { description: "Invalid or expired code" },
	},
})
