import { createHash, randomBytes, randomUUID } from "node:crypto"
import { jwtVerify, SignJWT } from "jose"

import { env } from "../shared/env.js"

const ACCESS_TOKEN_TTL_SECONDS = 10 * 60
const REFRESH_TOKEN_IDLE_DAYS = 90
const JWT_ISSUER = "ritmo-api"
const JWT_AUDIENCE = "ritmo-mobile"
const jwtSecret = new TextEncoder().encode(env.AUTH_ACCESS_TOKEN_SECRET)

export type AccessTokenClaims = {
	userId: string
	sessionId: string
}

export const createRefreshToken = (sessionId: string = randomUUID()) => ({
	sessionId,
	token: `${sessionId}.${randomBytes(48).toString("base64url")}`,
})

export const hashRefreshToken = (token: string) =>
	createHash("sha256").update(token).digest("hex")

export const createPasswordResetCode = () =>
	String(randomBytes(4).readUInt32BE(0) % 100_000_000).padStart(8, "0")

export const createAccessToken = async ({
	userId,
	sessionId,
}: AccessTokenClaims) => {
	const now = Math.floor(Date.now() / 1000)
	const token = await new SignJWT({ sid: sessionId })
		.setProtectedHeader({ alg: "HS256", typ: "JWT" })
		.setIssuer(JWT_ISSUER)
		.setAudience(JWT_AUDIENCE)
		.setSubject(userId)
		.setIssuedAt(now)
		.setExpirationTime(now + ACCESS_TOKEN_TTL_SECONDS)
		.sign(jwtSecret)

	return {
		token,
		expiresAt: (now + ACCESS_TOKEN_TTL_SECONDS) * 1000,
	}
}

export const verifyAccessToken = async (token: string) => {
	const { payload } = await jwtVerify(token, jwtSecret, {
		algorithms: ["HS256"],
		issuer: JWT_ISSUER,
		audience: JWT_AUDIENCE,
		maxTokenAge: "10m",
	})
	if (typeof payload.sub !== "string" || typeof payload.sid !== "string") {
		throw new Error("Invalid access token claims.")
	}
	return { userId: payload.sub, sessionId: payload.sid }
}

export const createRefreshExpiry = (from = new Date()) => {
	const expiresAt = new Date(from)
	expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_IDLE_DAYS)
	return expiresAt
}
