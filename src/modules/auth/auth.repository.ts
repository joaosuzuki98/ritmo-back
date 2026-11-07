import type { Prisma } from "@prisma/client"

import { prisma } from "../shared/database.js"

type CreateAccountInput = {
	userId: string
	name: string
	mascotName: string
	email: string
	passwordHash: string
	sessionId: string
	refreshTokenHash: string
	idleExpiresAt: Date
}

export const authRepository = {
	createAccount: async (input: CreateAccountInput) =>
		prisma.user.create({
			data: {
				id: input.userId,
				name: input.name,
				mascotName: input.mascotName,
				email: input.email,
				authCredential: {
					create: {
						emailNormalized: input.email,
						passwordHash: input.passwordHash,
					},
				},
				authSessions: {
					create: {
						id: input.sessionId,
						refreshTokenHash: input.refreshTokenHash,
						idleExpiresAt: input.idleExpiresAt,
					},
				},
			},
		}),
	findCredentialByEmail: (emailNormalized: string) =>
		prisma.authCredential.findUnique({
			where: { emailNormalized },
			include: { user: true },
		}),
	findSession: (id: string) =>
		prisma.authSession.findUnique({ where: { id }, include: { user: true } }),
	createSession: (input: {
		id: string
		userId: string
		refreshTokenHash: string
		idleExpiresAt: Date
	}) => prisma.authSession.create({ data: input }),
	rotateSession: async (input: {
		id: string
		previousHash: string
		nextHash: string
		now: Date
		idleExpiresAt: Date
	}) =>
		prisma.authSession.updateMany({
			where: {
				id: input.id,
				refreshTokenHash: input.previousHash,
				revokedAt: null,
				idleExpiresAt: { gt: input.now },
			},
			data: {
				refreshTokenHash: input.nextHash,
				lastUsedAt: input.now,
				idleExpiresAt: input.idleExpiresAt,
			},
		}),
	touchSession: (id: string, now: Date, idleExpiresAt: Date) =>
		prisma.authSession.updateMany({
			where: { id, revokedAt: null, idleExpiresAt: { gt: now } },
			data: { lastUsedAt: now, idleExpiresAt },
		}),
	revokeSession: (id: string, refreshTokenHash: string, now: Date) =>
		prisma.authSession.updateMany({
			where: { id, refreshTokenHash, revokedAt: null },
			data: { revokedAt: now },
		}),
	revokeSessionById: (id: string, now: Date) =>
		prisma.authSession.updateMany({
			where: { id, revokedAt: null },
			data: { revokedAt: now },
		}),
	revokeAllUserSessions: (userId: string, now: Date) =>
		prisma.authSession.updateMany({
			where: { userId, revokedAt: null },
			data: { revokedAt: now },
		}),
	createPasswordResetCode: async (input: {
		userId: string
		codeHash: string
		expiresAt: Date
	}) =>
		prisma.$transaction(async (transaction) => {
			await transaction.passwordResetCode.deleteMany({
				where: { userId: input.userId, consumedAt: null },
			})
			return transaction.passwordResetCode.create({ data: input })
		}),
	findLatestPasswordResetCode: (userId: string, now: Date) =>
		prisma.passwordResetCode.findFirst({
			where: {
				userId,
				consumedAt: null,
				expiresAt: { gt: now },
				attempts: { lt: 5 },
			},
			orderBy: { createdAt: "desc" },
		}),
	incrementPasswordResetAttempts: (id: string) =>
		prisma.passwordResetCode.updateMany({
			where: { id, consumedAt: null, attempts: { lt: 5 } },
			data: { attempts: { increment: 1 } },
		}),
	deletePasswordResetCode: (id: string) =>
		prisma.passwordResetCode.deleteMany({ where: { id } }),
	completePasswordReset: async (input: {
		codeId: string
		userId: string
		passwordHash: string
		now: Date
	}) =>
		prisma.$transaction(async (transaction) => {
			const consumed = await transaction.passwordResetCode.updateMany({
				where: {
					id: input.codeId,
					userId: input.userId,
					consumedAt: null,
					expiresAt: { gt: input.now },
					attempts: { lt: 5 },
				},
				data: { consumedAt: input.now },
			})
			if (consumed.count !== 1) return false

			await transaction.authCredential.update({
				where: { userId: input.userId },
				data: { passwordHash: input.passwordHash },
			})
			await transaction.authSession.updateMany({
				where: { userId: input.userId, revokedAt: null },
				data: { revokedAt: input.now },
			})
			return true
		}),
}

export type AuthCredentialWithUser = Prisma.AuthCredentialGetPayload<{
	include: { user: true }
}>
