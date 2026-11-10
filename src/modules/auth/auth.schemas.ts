import { z } from "zod"

import { registry } from "../shared/openapi-registry.js"

const passwordSchema = z
	.string()
	.min(8)
	.max(128)
	.regex(/\d/, "Password must contain at least one number.")
	.regex(/[^a-zA-Z0-9]/, "Password must contain a special character.")

const registerRequestSchema = registry.register(
	"AuthRegisterRequest",
	z.object({
		name: z.string().trim().min(2).max(100),
		mascotName: z.string().trim().min(1).max(60),
		email: z.string().trim().email().max(254).toLowerCase(),
		password: passwordSchema,
	}),
)

const loginRequestSchema = registry.register(
	"AuthLoginRequest",
	z.object({
		email: z.string().trim().email().max(254).toLowerCase(),
		password: z.string().min(1).max(128),
	}),
)

const refreshRequestSchema = registry.register(
	"AuthRefreshRequest",
	z.object({ refreshToken: z.string().min(40).max(256) }),
)

const logoutRequestSchema = registry.register(
	"AuthLogoutRequest",
	z.object({ refreshToken: z.string().min(40).max(256) }),
)

const passwordResetRequestSchema = registry.register(
	"PasswordResetRequest",
	z.object({ email: z.string().trim().email().max(254).toLowerCase() }),
)

const passwordResetCompleteSchema = registry.register(
	"PasswordResetCompleteRequest",
	z.object({
		email: z.string().trim().email().max(254).toLowerCase(),
		code: z.string().regex(/^\d{8}$/),
		password: passwordSchema,
	}),
)

const authUserSchema = registry.register(
	"AuthUser",
	z.object({
		id: z.string(),
		name: z.string(),
		mascotName: z.string().nullable(),
		email: z.string().email(),
		totalPoints: z.number(),
		level: z.number(),
		createdAt: z.number(),
		updatedAt: z.number(),
	}),
)

const authResponseSchema = registry.register(
	"AuthResponse",
	z.object({
		user: authUserSchema,
		accessToken: z.string(),
		refreshToken: z.string(),
		accessTokenExpiresAt: z.number(),
		refreshTokenIdleExpiresAt: z.number(),
	}),
)

const messageResponseSchema = registry.register(
	"AuthMessageResponse",
	z.object({ message: z.string() }),
)

export type RegisterRequest = z.infer<typeof registerRequestSchema>
export type LoginRequest = z.infer<typeof loginRequestSchema>
export type AuthResponse = z.infer<typeof authResponseSchema>
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>
export type PasswordResetComplete = z.infer<typeof passwordResetCompleteSchema>

export {
	authResponseSchema,
	loginRequestSchema,
	logoutRequestSchema,
	messageResponseSchema,
	passwordResetCompleteSchema,
	passwordResetRequestSchema,
	refreshRequestSchema,
	registerRequestSchema,
}
