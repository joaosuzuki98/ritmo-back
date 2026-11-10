import type { NextFunction, Request, Response } from "express"

import { AppError, problemTypeUri } from "../shared/errors.js"
import { authRepository } from "./auth.repository.js"
import { createRefreshExpiry, verifyAccessToken } from "./auth.tokens.js"

export type AuthenticatedRequest = Request & {
	auth: { userId: string; sessionId: string }
}

export const requireAuth = async (
	request: Request,
	_response: Response,
	next: NextFunction,
) => {
	const [scheme, token] = request.header("authorization")?.split(" ") ?? []
	if (scheme !== "Bearer" || !token) {
		throw new AppError({
			statusCode: 401,
			type: problemTypeUri("unauthenticated"),
			detail: "Autenticação necessária.",
			code: "UNAUTHENTICATED",
		})
	}

	let claims: Awaited<ReturnType<typeof verifyAccessToken>>
	try {
		claims = await verifyAccessToken(token)
	} catch {
		throw new AppError({
			statusCode: 401,
			type: problemTypeUri("invalid-access-token"),
			detail: "Token inválido ou expirado.",
			code: "INVALID_ACCESS_TOKEN",
		})
	}

	const session = await authRepository.findSession(claims.sessionId)
	const now = new Date()
	if (!session || session.userId !== claims.userId || session.revokedAt) {
		throw new AppError({
			statusCode: 401,
			type: problemTypeUri("session-expired"),
			detail: "Sessão expirada.",
			code: "SESSION_EXPIRED",
		})
	}
	if (session.idleExpiresAt <= now) {
		await authRepository.revokeSessionById(session.id, now)
		throw new AppError({
			statusCode: 401,
			type: problemTypeUri("session-expired"),
			detail: "Sessão expirada.",
			code: "SESSION_EXPIRED",
		})
	}

	const touched = await authRepository.touchSession(
		session.id,
		now,
		createRefreshExpiry(now),
	)
	if (touched.count !== 1) {
		throw new AppError({
			statusCode: 401,
			type: problemTypeUri("session-expired"),
			detail: "Sessão expirada.",
			code: "SESSION_EXPIRED",
		})
	}

	;(request as AuthenticatedRequest).auth = claims
	next()
}
