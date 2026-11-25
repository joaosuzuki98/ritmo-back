import type { Prisma } from "@prisma/client"

import { AppError, problemTypeUri } from "../shared/errors.js"
import {
	applyAiCompletion,
	applyAiHabit,
	syncAiMutations,
} from "../sync/index.js"
import { aiProposalsRepository } from "./ai.proposals.repository.js"
import type { AiChatResponse } from "./ai.schemas.js"

type Proposal = NonNullable<AiChatResponse["proposal"]>

const applyProposal = async (
	client: Prisma.TransactionClient,
	userId: string,
	proposal: Proposal,
	timeZone: string,
) => {
	switch (proposal.type) {
		case "habit.completion.create":
			await applyAiCompletion(client, userId, proposal, timeZone)
			return
		case "habit.create":
		case "habit.update":
			await applyAiHabit(client, userId, proposal, timeZone)
			return
		case "todo.create":
		case "todo.update":
			await syncAiMutations.applyTodo(client, userId, proposal)
			return
		case "goal.update":
			await syncAiMutations.applyGoalUpdate(client, userId, proposal)
			return
		case "goal.create":
			await syncAiMutations.applyGoalCreate(client, userId, proposal, timeZone)
			return
		case "event.create":
		case "event.update":
			await syncAiMutations.applyEvent(client, userId, proposal, timeZone)
			return
		default:
			throw new AppError({
				statusCode: 422,
				type: problemTypeUri("ai-proposal-not-supported"),
				detail:
					"Este tipo de proposta ainda não pode ser aplicado no servidor.",
				code: "AI_PROPOSAL_NOT_SUPPORTED",
			})
	}
}

const save = (userId: string, proposal: Proposal, timeZone: string) =>
	aiProposalsRepository.save(userId, proposal, timeZone)

const decide = (
	userId: string,
	proposalId: string,
	decision: "accepted" | "rejected",
) =>
	aiProposalsRepository.decide(
		userId,
		proposalId,
		decision,
		(client, proposal, timeZone) =>
			applyProposal(client, userId, proposal, timeZone),
	)

export const aiProposalsService = { save, decide }
