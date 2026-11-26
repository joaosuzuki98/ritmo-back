import type { FunctionTool } from "openai/resources/responses/responses.js"
import { z } from "zod"

import {
	getAiGoalInsights,
	getAiHabitStreaks,
	getAiHabitSummary,
	syncAiService,
} from "../sync/index.js"

const listArgumentsSchema = z
	.object({ cursor: z.string().min(1).max(255).nullable() })
	.strict()
const countArgumentsSchema = z
	.object({
		start: z.number().int().safe().nonnegative(),
		end: z.number().int().safe().positive(),
		habitId: z.string().min(1).max(255).nullable(),
	})
	.strict()
	.refine((input) => input.start < input.end)

const summaryArgumentsSchema = z
	.object({
		period: z.enum([
			"this_week",
			"last_week",
			"last_7_days",
			"last_28_days",
			"this_month",
			"last_month",
			"custom",
		]),
		startDate: z.iso.date().nullable(),
		endDate: z.iso.date().nullable(),
	})
	.strict()

const listTool = (name: string, description: string): FunctionTool => ({
	type: "function",
	name,
	description,
	strict: true,
	parameters: {
		type: "object",
		properties: {
			cursor: {
				type: ["string", "null"],
				description: "Use null na primeira página ou nextCursor na próxima.",
			},
		},
		required: ["cursor"],
		additionalProperties: false,
	},
})

const responseAiTools: FunctionTool[] = [
	{
		type: "function",
		name: "get_goal_insights",
		description:
			"Calcula progresso de metas, quantidade restante, ritmo recente e projeção estimada no servidor.",
		strict: true,
		parameters: {
			type: "object",
			properties: {},
			required: [],
			additionalProperties: false,
		},
	},
	{
		type: "function",
		name: "get_habit_streaks",
		description:
			"Calcula sequências atuais, maiores sequências e próximos marcos de hábitos ativos, usando o fuso do dispositivo e a programação atual.",
		strict: true,
		parameters: {
			type: "object",
			properties: {},
			required: [],
			additionalProperties: false,
		},
	},
	{
		type: "function",
		name: "get_habit_summary",
		description:
			"Calcula no servidor hábitos previstos e concluídos, taxas, duração planejada, dias da semana, horários preferidos, categorias, motivos e associações em um período. Associações não são causalidade. Usa o fuso do dispositivo e a programação atual.",
		strict: true,
		parameters: {
			type: "object",
			properties: {
				period: {
					type: "string",
					enum: [
						"this_week",
						"last_week",
						"last_7_days",
						"last_28_days",
						"this_month",
						"last_month",
						"custom",
					],
				},
				startDate: {
					type: ["string", "null"],
					description:
						"Data inicial inclusiva YYYY-MM-DD apenas para custom; null caso contrário.",
				},
				endDate: {
					type: ["string", "null"],
					description:
						"Data final inclusiva YYYY-MM-DD apenas para custom; null caso contrário.",
				},
			},
			required: ["period", "startDate", "endDate"],
			additionalProperties: false,
		},
	},
	listTool("list_habits", "Lista até 50 hábitos não pausados do usuário."),
	listTool("list_tasks", "Lista até 50 tarefas do usuário."),
	listTool("list_events", "Lista até 50 eventos do usuário."),
	listTool("list_goals", "Lista até 50 metas do usuário."),
	{
		type: "function",
		name: "count_completion_records",
		description:
			"Conta registros de conclusão por status no intervalo [start, end). São registros brutos, não taxas, dias ou ocorrências planejadas; pode haver mais de um registro para o mesmo hábito e dia.",
		strict: true,
		parameters: {
			type: "object",
			properties: {
				start: {
					type: "integer",
					description: "Início inclusivo em milissegundos desde a época Unix.",
				},
				end: {
					type: "integer",
					description: "Fim exclusivo em milissegundos desde a época Unix.",
				},
				habitId: {
					type: ["string", "null"],
					description: "ID do hábito ou null para todos os hábitos.",
				},
			},
			required: ["start", "end", "habitId"],
			additionalProperties: false,
		},
	},
]

const executeAiTool = async (
	userId: string,
	name: string,
	args: unknown,
	timeZone?: string,
): Promise<unknown> => {
	switch (name) {
		case "get_goal_insights":
			z.object({}).strict().parse(args)
			if (!timeZone) throw new Error("Missing user time zone")
			return getAiGoalInsights(userId, timeZone)
		case "get_habit_streaks":
			z.object({}).strict().parse(args)
			if (!timeZone) throw new Error("Missing user time zone")
			return getAiHabitStreaks(userId, timeZone)
		case "get_habit_summary": {
			const input = summaryArgumentsSchema.parse(args)
			if (!timeZone) throw new Error("Missing user time zone")
			return getAiHabitSummary(userId, timeZone, input)
		}
		case "list_habits": {
			const { cursor } = listArgumentsSchema.parse(args)
			return syncAiService.listHabits(userId, cursor ?? undefined)
		}
		case "list_tasks": {
			const { cursor } = listArgumentsSchema.parse(args)
			return syncAiService.listTasks(userId, cursor ?? undefined)
		}
		case "list_events": {
			const { cursor } = listArgumentsSchema.parse(args)
			return syncAiService.listEvents(userId, cursor ?? undefined)
		}
		case "list_goals": {
			const { cursor } = listArgumentsSchema.parse(args)
			return syncAiService.listGoals(userId, cursor ?? undefined)
		}
		case "count_completion_records": {
			const input = countArgumentsSchema.parse(args)
			return syncAiService.countCompletions(
				userId,
				input.start,
				input.end,
				input.habitId ?? undefined,
			)
		}
		default:
			throw new Error("Unknown AI tool")
	}
}

export { executeAiTool, responseAiTools }
