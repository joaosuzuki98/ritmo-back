import { AppError, problemTypeUri } from "../shared/errors.js"
import { generateAiChatResponse } from "./ai.provider.js"
import type { AiChatRequest, AiChatResponse } from "./ai.schemas.js"
import { aiChatResponseSchema } from "./ai.schemas.js"

const hasStatisticsData = (
	statistics: AiChatRequest["context"]["statistics"],
) =>
	Boolean(
		statistics &&
			Object.values(statistics).some((value) =>
				Array.isArray(value) ? value.length > 0 : value !== undefined,
			),
	)

const chat = async (input: AiChatRequest): Promise<AiChatResponse> => {
	if (
		input.mode === "statistics" &&
		!hasStatisticsData(input.context.statistics)
	) {
		return {
			reply:
				"Ainda não recebi dados estatísticos agregados suficientes do app para responder com segurança. Peça ao app para calcular e enviar um resumo do período.",
			proposal: null,
		}
	}

	const generated = await generateAiChatResponse(input)
	const parsed = aiChatResponseSchema.safeParse(generated)
	if (!parsed.success) {
		throw new AppError({
			statusCode: 502,
			type: problemTypeUri("invalid-ai-response"),
			detail: "Não foi possível validar a resposta do serviço de IA.",
			code: "INVALID_AI_RESPONSE",
		})
	}

	if (input.mode === "statistics") {
		return { ...parsed.data, proposal: null }
	}

	const { proposal } = parsed.data
	if (!proposal) return parsed.data

	const hasTarget = (() => {
		switch (proposal.type) {
			case "habit.create":
			case "todo.create":
			case "event.create":
				return true
			case "habit.update":
			case "habit.completion.create":
				return input.context.habits.some(
					(habit) =>
						habit.id ===
						(proposal.type === "habit.update"
							? proposal.entityId
							: proposal.habitId),
				)
			case "todo.update":
				return input.context.tasks.some((task) => task.id === proposal.entityId)
			case "event.update":
				return input.context.events.some(
					(event) => event.id === proposal.entityId,
				)
			case "goal.create":
				return input.context.habits.some(
					(habit) => habit.id === proposal.goal.habitId,
				)
			case "goal.update":
				return input.context.goals.some((goal) => goal.id === proposal.entityId)
		}
	})()

	const hasChanges =
		proposal.type === "habit.update" ||
		proposal.type === "todo.update" ||
		proposal.type === "event.update" ||
		proposal.type === "goal.update"
			? Object.keys(proposal.changes).length > 0
			: true
	if (!hasTarget || !hasChanges) {
		return {
			reply:
				"Não consegui validar o item ou a alteração com os dados disponíveis. Confira se ele ainda existe e tente novamente.",
			proposal: null,
		}
	}

	return parsed.data
}

export const aiService = { chat }
