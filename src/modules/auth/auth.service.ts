import { randomUUID, timingSafeEqual } from "node:crypto"
import { Prisma } from "@prisma/client"
import argon2 from "argon2"
import {
	isPasswordResetEmailConfigured,
	sendPasswordResetCode,
} from "./auth.email.js"
import { authRepository } from "./auth.repository.js"
import type {
	LoginRequest,
	PasswordResetComplete,
	PasswordResetRequest,
	RegisterRequest,
} from "./auth.schemas.js"
import {
	createAccessToken,
	createPasswordResetCode,
	createRefreshExpiry,
	createRefreshToken,
	hashRefreshToken,
} from "./auth.tokens.js"

const PASSWORD_RESET_TTL_MINUTES = 10
const PASSWORD_RESET_GENERIC_MESSAGE =
	"Se o email estiver cadastrado, enviaremos um código de redefinição."

export class AuthServiceError extends Error {
	readonly statusCode: number
	readonly code: string

	constructor(statusCode: number, code: string, message: string) {
		super(message)
		this.name = "AuthServiceError"
		this.statusCode = statusCode
		this.code = code
	}
}

const hashPassword = (password: string) =>
	argon2.hash(password, { type: argon2.argon2id })

const verifyPassword = async (hash: string, password: string) => {
	try {
		return await argon2.verify(hash, password)
	} catch {
		return false
	}
}

const makePublicUser = (user: {
	id: string
	name: string
	mascotName: string | null
	email: string
	totalPoints: number
	level: number
	createdAt: bigint
	updatedAt: bigint
}) => ({
	id: user.id,
	name: user.name,
	mascotName: user.mascotName,
	email: user.email,
	totalPoints: user.totalPoints,
	level: user.level,
	createdAt: Number(user.createdAt),
	updatedAt: Number(user.updatedAt),
})

const makeAuthResponse = async (
	user: Parameters<typeof makePublicUser>[0],
	sessionId: string,
	refreshToken: string,
) => {
	const now = new Date()
	const accessToken = await createAccessToken({ userId: user.id, sessionId })
	return {
		user: makePublicUser(user),
		accessToken: accessToken.token,
		refreshToken,
		accessTokenExpiresAt: accessToken.expiresAt,
		refreshTokenIdleExpiresAt: createRefreshExpiry(now).getTime(),
	}
}

const getRefreshTokenParts = (token: string) => {
	const separator = token.indexOf(".")
	if (separator < 1) return null
	const sessionId = token.slice(0, separator)
	const secret = token.slice(separator + 1)
	if (!/^[0-9a-f-]{36}$/i.test(sessionId) || secret.length < 40) return null
	return { sessionId, hash: hashRefreshToken(token) }
}

const hashesMatch = (storedHash: string, presentedHash: string) => {
	const stored = Buffer.from(storedHash, "hex")
	const presented = Buffer.from(presentedHash, "hex")
	return (
		stored.length === presented.length && timingSafeEqual(stored, presented)
	)
}

const invalidCredentials = () =>
	new AuthServiceError(401, "INVALID_CREDENTIALS", "Email ou senha incorretos.")

export const authService = {
	register: async (input: RegisterRequest) => {
		const email = input.email.trim().toLowerCase()
		const refresh = createRefreshToken()
		const now = new Date()
		let user: Awaited<ReturnType<typeof authRepository.createAccount>>
		try {
			user = await authRepository.createAccount({
				userId: randomUUID(),
				name: input.name.trim(),
				mascotName: input.mascotName.trim(),
				email,
				passwordHash: await hashPassword(input.password),
				sessionId: refresh.sessionId,
				refreshTokenHash: hashRefreshToken(refresh.token),
				idleExpiresAt: createRefreshExpiry(now),
			})
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new AuthServiceError(
					409,
					"EMAIL_IN_USE",
					"Já existe uma conta com este email.",
				)
			}
			throw error
		}
		return makeAuthResponse(user, refresh.sessionId, refresh.token)
	},
	login: async ({ email, password }: LoginRequest) => {
		const credential = await authRepository.findCredentialByEmail(
			email.trim().toLowerCase(),
		)
		if (
			!credential ||
			!(await verifyPassword(credential.passwordHash, password))
		) {
			throw invalidCredentials()
		}

		const refresh = createRefreshToken()
		const now = new Date()
		await authRepository.createSession({
			id: refresh.sessionId,
			userId: credential.userId,
			refreshTokenHash: hashRefreshToken(refresh.token),
			idleExpiresAt: createRefreshExpiry(now),
		})
		return makeAuthResponse(credential.user, refresh.sessionId, refresh.token)
	},
	refresh: async (token: string) => {
		const parts = getRefreshTokenParts(token)
		if (!parts) throw invalidCredentials()

		const session = await authRepository.findSession(parts.sessionId)
		if (!session || session.revokedAt) {
			throw invalidCredentials()
		}
		const now = new Date()
		if (session.idleExpiresAt <= now) {
			await authRepository.revokeSessionById(session.id, now)
			throw invalidCredentials()
		}
		if (!hashesMatch(session.refreshTokenHash, parts.hash)) {
			await authRepository.revokeSessionById(session.id, now)
			throw invalidCredentials()
		}

		const nextRefresh = createRefreshToken(session.id)
		const rotated = await authRepository.rotateSession({
			id: session.id,
			previousHash: parts.hash,
			nextHash: hashRefreshToken(nextRefresh.token),
			now,
			idleExpiresAt: createRefreshExpiry(now),
		})
		if (rotated.count !== 1) throw invalidCredentials()
		return makeAuthResponse(session.user, session.id, nextRefresh.token)
	},
	logout: async (token: string) => {
		const parts = getRefreshTokenParts(token)
		if (!parts) return
		const session = await authRepository.findSession(parts.sessionId)
		if (!session || !hashesMatch(session.refreshTokenHash, parts.hash)) return
		await authRepository.revokeSession(session.id, parts.hash, new Date())
	},
	requestPasswordReset: async ({ email }: PasswordResetRequest) => {
		if (!isPasswordResetEmailConfigured()) {
			throw new AuthServiceError(
				503,
				"PASSWORD_RESET_UNAVAILABLE",
				"A recuperação de senha não está configurada no servidor.",
			)
		}
		const normalizedEmail = email.trim().toLowerCase()
		const credential =
			await authRepository.findCredentialByEmail(normalizedEmail)
		if (!credential) return { message: PASSWORD_RESET_GENERIC_MESSAGE }

		const code = createPasswordResetCode()
		const resetRecord = await authRepository.createPasswordResetCode({
			userId: credential.userId,
			codeHash: await hashPassword(code),
			expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60_000),
		})
		try {
			await sendPasswordResetCode(normalizedEmail, code)
		} catch {
			await authRepository.deletePasswordResetCode(resetRecord.id)
			throw new AuthServiceError(
				503,
				"PASSWORD_RESET_UNAVAILABLE",
				"Não foi possível enviar o email de recuperação. Tente novamente mais tarde.",
			)
		}
		return { message: PASSWORD_RESET_GENERIC_MESSAGE }
	},
	completePasswordReset: async (input: PasswordResetComplete) => {
		const credential = await authRepository.findCredentialByEmail(
			input.email.trim().toLowerCase(),
		)
		if (!credential) {
			throw new AuthServiceError(
				400,
				"INVALID_RESET_CODE",
				"Código inválido ou expirado.",
			)
		}

		const now = new Date()
		const resetRecord = await authRepository.findLatestPasswordResetCode(
			credential.userId,
			now,
		)
		if (!resetRecord) {
			throw new AuthServiceError(
				400,
				"INVALID_RESET_CODE",
				"Código inválido ou expirado.",
			)
		}
		if (!(await verifyPassword(resetRecord.codeHash, input.code))) {
			await authRepository.incrementPasswordResetAttempts(resetRecord.id)
			throw new AuthServiceError(
				400,
				"INVALID_RESET_CODE",
				"Código inválido ou expirado.",
			)
		}

		const completed = await authRepository.completePasswordReset({
			codeId: resetRecord.id,
			userId: credential.userId,
			passwordHash: await hashPassword(input.password),
			now,
		})
		if (!completed) {
			throw new AuthServiceError(
				400,
				"INVALID_RESET_CODE",
				"Código inválido ou expirado.",
			)
		}
		return {
			message: "Senha redefinida. Entre novamente para sincronizar seus dados.",
		}
	},
}
