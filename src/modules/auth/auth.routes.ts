import express from "express"
import rateLimit from "express-rate-limit"

import { AppError, problemTypeUri } from "../shared/errors.js"
import {
	completePasswordReset,
	login,
	logout,
	refresh,
	register,
	requestPasswordReset,
} from "./auth.controller.js"

const authRoutes = express.Router()
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 10,
	standardHeaders: true,
	legacyHeaders: false,
	handler: (_request, _response, next) => {
		next(
			new AppError({
				statusCode: 429,
				type: problemTypeUri("rate-limit-exceeded"),
				detail: "Too many requests. Please try again later.",
				code: "RATE_LIMIT_EXCEEDED",
			}),
		)
	},
})
const passwordResetLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 5,
	standardHeaders: true,
	legacyHeaders: false,
	handler: (_request, _response, next) => {
		next(
			new AppError({
				statusCode: 429,
				type: problemTypeUri("rate-limit-exceeded"),
				detail: "Too many requests. Please try again later.",
				code: "RATE_LIMIT_EXCEEDED",
			}),
		)
	},
})

authRoutes.post("/api/v1/auth/register", authLimiter, register)
authRoutes.post("/api/v1/auth/login", authLimiter, login)
authRoutes.post("/api/v1/auth/refresh", authLimiter, refresh)
authRoutes.post("/api/v1/auth/logout", authLimiter, logout)
authRoutes.post(
	"/api/v1/auth/password-reset/request",
	passwordResetLimiter,
	requestPasswordReset,
)
authRoutes.post(
	"/api/v1/auth/password-reset/complete",
	passwordResetLimiter,
	completePasswordReset,
)

export { authRoutes }
