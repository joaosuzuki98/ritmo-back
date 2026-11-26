import type { Request, Response } from "express"

import type { AuthenticatedRequest } from "../auth/auth.middleware.js"
import { runAgent } from "./ai.agent.js"
import { aiProposalsService } from "./ai.proposals.service.js"
import {
	agentChatRequestSchema,
	proposalDecisionParamsSchema,
	proposalDecisionRequestSchema,
} from "./ai.schemas.js"

const streamChat = async (request: Request, response: Response) => {
	const input = agentChatRequestSchema.parse(request.body)
	const userId = (request as AuthenticatedRequest).auth.userId
	const controller = new AbortController()
	response.once("close", () => {
		if (!response.writableEnded) controller.abort()
	})
	response.status(200).set({
		"Content-Type": "text/event-stream; charset=utf-8",
		"Cache-Control": "no-cache, no-transform",
		"X-Accel-Buffering": "no",
	})
	response.flushHeaders()
	response.write('event: status\ndata: {"status":"started"}\n\n')
	const heartbeat = setInterval(() => {
		if (!controller.signal.aborted) response.write(": keep-alive\n\n")
	}, 15_000)
	try {
		const result = await runAgent(userId, input, controller.signal)
		if (!controller.signal.aborted) {
			const saved = result.proposal
				? await aiProposalsService.save(userId, result.proposal, input.timeZone)
				: null
			if (controller.signal.aborted) return
			response.write(
				`event: result\ndata: ${JSON.stringify({
					...result,
					proposalId: saved?.id ?? null,
					proposalExpiresAt: saved?.expiresAt.toISOString() ?? null,
				})}\n\n`,
			)
			response.end()
		}
	} catch {
		if (!controller.signal.aborted) {
			const message =
				input.language === "en"
					? "Unable to get an AI response. Please try again."
					: "Não foi possível obter uma resposta da IA. Tente novamente."
			response.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`)
			response.end()
		}
	} finally {
		clearInterval(heartbeat)
	}
}

const decideProposal = async (request: Request, response: Response) => {
	const { proposalId } = proposalDecisionParamsSchema.parse(request.params)
	const { decision } = proposalDecisionRequestSchema.parse(request.body)
	const userId = (request as AuthenticatedRequest).auth.userId
	const result = await aiProposalsService.decide(userId, proposalId, decision)
	response.json(result)
}

export { decideProposal, streamChat }
