import type { Prisma } from "@prisma/client"

import { prisma } from "../shared/database.js"
import { AppError, problemTypeUri } from "../shared/errors.js"
import {
	type AiChatResponse,
	aiProposalSchema,
	aiTimeZoneSchema,
} from "./ai.schemas.js"

type Proposal = NonNullable<AiChatResponse["proposal"]>
type Decision = "accepted" | "rejected"

const PROPOSAL_TTL_MS = 15 * 60 * 1000

const unavailable = () =>
	new AppError({
		statusCode: 404,
		type: problemTypeUri("ai-proposal-not-found"),
		detail: "A proposta não está disponível.",
		code: "AI_PROPOSAL_NOT_FOUND",
	})

const conflict = () =>
	new AppError({
		statusCode: 409,
		type: problemTypeUri("ai-proposal-conflict"),
		detail: "A proposta expirou ou já recebeu outra decisão.",
		code: "AI_PROPOSAL_CONFLICT",
	})

const save = async (userId: string, proposal: Proposal, timeZone: string) => {
	const payload = aiProposalSchema.parse(proposal)
	const validatedTimeZone = aiTimeZoneSchema.parse(timeZone)
	return prisma.aiProposal.create({
		data: {
			userId,
			payload: payload as Prisma.InputJsonValue,
			timeZone: validatedTimeZone,
			expiresAt: new Date(Date.now() + PROPOSAL_TTL_MS),
		},
		select: { id: true, expiresAt: true },
	})
}

const decide = async (
	userId: string,
	proposalId: string,
	decision: Decision,
	apply: (
		client: Prisma.TransactionClient,
		proposal: Proposal,
		timeZone: string,
	) => Promise<void>,
) =>
	prisma.$transaction(async (client) => {
		const now = new Date()
		const proposal = await client.aiProposal.findFirst({
			where: { id: proposalId, userId },
		})
		if (!proposal) throw unavailable()
		if (proposal.status === decision) return { status: decision }
		if (proposal.status !== "pending" || proposal.expiresAt <= now)
			throw conflict()

		const payload = aiProposalSchema.safeParse(proposal.payload)
		if (!payload.success) {
			throw new AppError({
				statusCode: 500,
				type: problemTypeUri("invalid-ai-proposal"),
				detail: "Não foi possível validar a proposta armazenada.",
				code: "INVALID_AI_PROPOSAL",
			})
		}
		const timeZone = aiTimeZoneSchema.safeParse(proposal.timeZone)
		if (decision === "accepted" && !timeZone.success) {
			throw new AppError({
				statusCode: 409,
				type: problemTypeUri("ai-proposal-time-zone-unavailable"),
				detail: "O fuso horário da proposta não está disponível.",
				code: "AI_PROPOSAL_TIME_ZONE_UNAVAILABLE",
			})
		}

		const claimed = await client.aiProposal.updateMany({
			where: {
				id: proposalId,
				userId,
				status: "pending",
				expiresAt: { gt: now },
			},
			data: { status: decision },
		})
		if (claimed.count !== 1) {
			const current = await client.aiProposal.findFirst({
				where: { id: proposalId, userId },
				select: { status: true },
			})
			if (current?.status === decision) return { status: decision }
			throw conflict()
		}
		if (decision === "accepted" && timeZone.success)
			await apply(client, payload.data, timeZone.data)
		return { status: decision }
	})

export const aiProposalsRepository = { save, decide }
