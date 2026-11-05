import type { NextFunction, Request, Response } from "express"

import { authRepository } from "./auth.repository.js"
import { createRefreshExpiry, verifyAccessToken } from "./auth.tokens.js"

export type AuthenticatedRequest = Request & {
	auth: { userId: string; sessionId: string }
}

export const requireAuth = async (
	request: Request,
	response: Response,
	next: NextFunction,
) => {
	const [scheme, token] = request.header("authorization")?.split(" ") ?? []
	if (scheme !== "Bearer" || !token) {
		response.status(401).json({
			error: { code: "UNAUTHENTICATED", message: "Autenticação necessária." },
		})
		return
	}

	let claims: Awaited<ReturnType<typeof verifyAccessToken>>
	try {
		claims = await verifyAccessToken(token)
	} catch {
		response.status(401).json({
			error: {
				code: "INVALID_ACCESS_TOKEN",
				message: "Token inválido ou expirado.",
			},
		})
		return
	}

	const session = await authRepository.findSession(claims.sessionId)
	const now = new Date()
	if (!session || session.userId !== claims.userId || session.revokedAt) {
		response.status(401).json({
			error: { code: "SESSION_EXPIRED", message: "Sessão expirada." },
		})
		return
	}
	if (session.idleExpiresAt <= now) {
		await authRepository.revokeSessionById(session.id, now)
		response.status(401).json({
			error: { code: "SESSION_EXPIRED", message: "Sessão expirada." },
		})
		return
	}

	const touched = await authRepository.touchSession(
		session.id,
		now,
		createRefreshExpiry(now),
	)
	if (touched.count !== 1) {
		response.status(401).json({
			error: { code: "SESSION_EXPIRED", message: "Sessão expirada." },
		})
		return
	}

	;(request as AuthenticatedRequest).auth = claims
	next()
}
