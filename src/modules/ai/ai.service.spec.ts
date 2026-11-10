import { beforeAll, describe, expect, it, vi } from "vitest"

const { generateAiChatResponse } = vi.hoisted(() => ({
	generateAiChatResponse: vi.fn(),
}))

vi.mock("./ai.provider.js", () => ({ generateAiChatResponse }))

let aiService: typeof import("./ai.service.js").aiService

beforeAll(async () => {
	process.env.DATABASE_URL ??=
		"postgresql://test:test@127.0.0.1:5432/test?schema=public"
	process.env.PROBLEM_DETAILS_BASE_URL ??= "https://ritmoapp.com"
	;({ aiService } = await import("./ai.service.js"))
})

const request = {
	message: "Mude a caminhada para diária",
	mode: "chat" as const,
	history: [],
	context: {
		habits: [{ id: "habit-1", name: "Caminhada", frequencyType: "weekly" }],
		tasks: [
			{
				id: "task-1",
				title: "Comprar ração",
				category: "Pessoal",
				isComplete: false,
			},
		],
		events: [
			{
				id: "event-1",
				title: "Consulta",
				dateTime: "2026-11-10T10:00:00.000Z",
			},
		],
		goals: [{ id: "goal-1", habitId: "habit-1", description: "Caminhar" }],
	},
}

describe("aiService.chat", () => {
	it("returns a validated proposal for a habit in the supplied context", async () => {
		generateAiChatResponse.mockResolvedValue({
			reply: "Posso mudar sua caminhada para todos os dias.",
			proposal: {
				type: "habit.update",
				entityId: "habit-1",
				changes: { frequencyType: "daily" },
			},
		})

		await expect(aiService.chat(request)).resolves.toMatchObject({
			reply: "Posso mudar sua caminhada para todos os dias.",
			proposal: { entityId: "habit-1" },
		})
		expect(generateAiChatResponse).toHaveBeenCalledWith(request)
	})

	it("returns a creation proposal without inventing an id", async () => {
		generateAiChatResponse.mockResolvedValue({
			reply: "Posso criar o hábito Caminhada diariamente.",
			proposal: {
				type: "habit.create",
				habit: { name: "Caminhada", frequencyType: "daily" },
			},
		})

		await expect(aiService.chat(request)).resolves.toMatchObject({
			proposal: {
				type: "habit.create",
				habit: { name: "Caminhada", frequencyType: "daily" },
			},
		})
	})

	it("does not return a proposal that targets an unknown habit", async () => {
		generateAiChatResponse.mockResolvedValue({
			reply: "Atualizei.",
			proposal: {
				type: "habit.update",
				entityId: "not-in-context",
				changes: { frequencyType: "daily" },
			},
		})

		await expect(aiService.chat(request)).resolves.toMatchObject({
			proposal: null,
		})
	})

	it("validates completion and edit targets against the supplied local context", async () => {
		generateAiChatResponse.mockResolvedValue({
			reply: "Posso marcar a caminhada como concluída.",
			proposal: {
				type: "habit.completion.create",
				habitId: "habit-1",
				date: "2026-11-09",
			},
		})

		await expect(aiService.chat(request)).resolves.toMatchObject({
			proposal: { type: "habit.completion.create", habitId: "habit-1" },
		})

		generateAiChatResponse.mockResolvedValue({
			reply: "Posso atualizar a tarefa.",
			proposal: {
				type: "todo.update",
				entityId: "missing-task",
				changes: { isComplete: true },
			},
		})

		await expect(aiService.chat(request)).resolves.toMatchObject({
			proposal: null,
		})
	})

	it("only proposes goals linked to a habit in the supplied context", async () => {
		generateAiChatResponse.mockResolvedValue({
			reply: "Posso criar essa meta.",
			proposal: {
				type: "goal.create",
				goal: {
					habitId: "habit-1",
					description: "Caminhar 20 vezes",
					targetValue: 20,
					deadlineType: "short_term",
				},
			},
		})

		await expect(aiService.chat(request)).resolves.toMatchObject({
			proposal: { type: "goal.create", goal: { habitId: "habit-1" } },
		})
	})

	it("requires client aggregates and never returns an action in statistics mode", async () => {
		generateAiChatResponse.mockClear()
		await expect(
			aiService.chat({ ...request, mode: "statistics" }),
		).resolves.toMatchObject({
			proposal: null,
			reply: expect.stringContaining("dados estatísticos"),
		})
		expect(generateAiChatResponse).not.toHaveBeenCalled()

		generateAiChatResponse.mockResolvedValue({
			reply: "Posso criar uma tarefa.",
			proposal: { type: "todo.create", task: { title: "Nova tarefa" } },
		})
		await expect(
			aiService.chat({
				...request,
				mode: "statistics",
				context: {
					...request.context,
					statistics: {
						periods: [
							{
								label: "Esta semana",
								planned: 5,
								completed: 3,
								completionRate: 0.6,
							},
						],
					},
				},
			}),
		).resolves.toMatchObject({
			reply: "Posso criar uma tarefa.",
			proposal: null,
		})
	})

	it("rejects a malformed model response", async () => {
		generateAiChatResponse.mockResolvedValue({
			reply: "Resposta válida",
			proposal: { type: "habit.delete", entityId: "habit-1" },
		})

		await expect(aiService.chat(request)).rejects.toMatchObject({
			statusCode: 502,
			code: "INVALID_AI_RESPONSE",
		})
	})
})
