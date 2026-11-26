import OpenAI from "openai"

import { env } from "../shared/env.js"
import { AppError, problemTypeUri } from "../shared/errors.js"
import type { AiModelResponse } from "./ai.schemas.js"

const omitNullValues = (value: object) =>
	Object.fromEntries(
		Object.entries(value).filter(([, fieldValue]) => fieldValue !== null),
	)

const normalizeModelResponse = (result: AiModelResponse) => {
	if (!result.proposal) return { reply: result.reply, proposal: null }

	const proposal = result.proposal
	switch (proposal.type) {
		case "habit.create":
			return {
				reply: result.reply,
				proposal: {
					type: proposal.type,
					habit: omitNullValues(proposal.habit),
				},
			}
		case "habit.update": {
			const changes = omitNullValues(proposal.changes)
			for (const field of proposal.clearFields) changes[field] = null
			return {
				reply: result.reply,
				proposal: { type: proposal.type, entityId: proposal.entityId, changes },
			}
		}
		case "habit.completion.create":
			return {
				reply: result.reply,
				proposal: {
					type: proposal.type,
					habitId: proposal.habitId,
					date: proposal.date,
					...omitNullValues({
						completionTime: proposal.completionTime,
						note: proposal.note,
					}),
				},
			}
		case "todo.create":
			return {
				reply: result.reply,
				proposal: { type: proposal.type, task: omitNullValues(proposal.task) },
			}
		case "todo.update":
			return {
				reply: result.reply,
				proposal: {
					type: proposal.type,
					entityId: proposal.entityId,
					changes: omitNullValues(proposal.changes),
				},
			}
		case "event.create":
			return {
				reply: result.reply,
				proposal: {
					type: proposal.type,
					event: omitNullValues(proposal.event),
				},
			}
		case "event.update": {
			const changes = omitNullValues(proposal.changes)
			for (const field of proposal.clearFields) changes[field] = null
			return {
				reply: result.reply,
				proposal: { type: proposal.type, entityId: proposal.entityId, changes },
			}
		}
		case "goal.create":
			return {
				reply: result.reply,
				proposal: { type: proposal.type, goal: proposal.goal },
			}
		case "goal.update":
			return {
				reply: result.reply,
				proposal: {
					type: proposal.type,
					entityId: proposal.entityId,
					changes: omitNullValues(proposal.changes),
				},
			}
	}
}

const getClient = () => {
	if (!env.OPENAI_API_KEY) {
		throw new AppError({
			statusCode: 503,
			type: problemTypeUri("ai-not-configured"),
			detail: "O serviço de IA não está configurado.",
			code: "AI_NOT_CONFIGURED",
		})
	}

	return new OpenAI({
		apiKey: env.OPENAI_API_KEY,
		timeout: 25_000,
		maxRetries: 0,
	})
}

export { getClient, normalizeModelResponse }
