import express from "express"
import rateLimit from "express-rate-limit"
import type { AuthenticatedRequest } from "../auth/auth.middleware.js"
import { requireAuth } from "../auth/auth.middleware.js"
import { AppError, problemTypeUri } from "../shared/errors.js"
import { chat } from "./ai.controller.js"

const aiRoutes = express.Router()
const aiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 20,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (request) => (request as AuthenticatedRequest).auth.userId,
	handler: (_request, _response, next) => {
		next(
			new AppError({
				statusCode: 429,
				type: problemTypeUri("rate-limit-exceeded"),
				detail: "Limite de uso da IA atingido. Tente novamente mais tarde.",
				code: "RATE_LIMIT_EXCEEDED",
			}),
		)
	},
})

aiRoutes.post("/api/v1/ai/chat", requireAuth, aiLimiter, chat)

export { aiRoutes }
