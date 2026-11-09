import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const { parse, openAiConstructor, OpenAiMock } = vi.hoisted(() => {
	const parse = vi.fn()
	const openAiConstructor = vi.fn()
	class OpenAiMock {
		readonly chat = { completions: { parse } }

		constructor(...args: unknown[]) {
			openAiConstructor(...args)
		}
	}
	return { parse, openAiConstructor, OpenAiMock }
})

vi.mock("openai", () => ({ default: OpenAiMock }))
vi.mock("openai/helpers/zod", () => ({
	zodResponseFormat: vi.fn(() => ({ type: "json_schema" })),
}))

let env: typeof import("../shared/env.js").env
let generateAiChatResponse: typeof import("./ai.provider.js").generateAiChatResponse

beforeAll(async () => {
	process.env.DATABASE_URL ??=
		"postgresql://test:test@127.0.0.1:5432/test?schema=public"
	process.env.PROBLEM_DETAILS_BASE_URL ??= "https://ritmoapp.com"
	delete process.env.OPENAI_API_KEY
	;[{ env }, { generateAiChatResponse }] = await Promise.all([
		import("../shared/env.js"),
		import("./ai.provider.js"),
	])
})

beforeEach(() => {
	parse.mockReset()
	openAiConstructor.mockClear()
	delete env.OPENAI_API_KEY
})

const input = {
	message: "Olá",
	mode: "chat" as const,
	history: [],
	context: { habits: [], tasks: [], events: [], goals: [] },
}

describe("generateAiChatResponse", () => {
	it("returns a safe service error when the API key is not configured", async () => {
		await expect(generateAiChatResponse(input)).rejects.toMatchObject({
			statusCode: 503,
			code: "AI_NOT_CONFIGURED",
		})
		expect(openAiConstructor).not.toHaveBeenCalled()
	})

	it("uses the OpenAI structured response and returns its parsed result", async () => {
		env.OPENAI_API_KEY = "test-key"
		parse.mockResolvedValue({
			choices: [
				{
					message: {
						parsed: { reply: "Olá!", proposal: null },
						refusal: null,
					},
				},
			],
		})

		await expect(generateAiChatResponse(input)).resolves.toEqual({
			reply: "Olá!",
			proposal: null,
		})
		expect(parse).toHaveBeenCalledOnce()
	})

	it("converts nullable model fields into only the requested changes", async () => {
		env.OPENAI_API_KEY = "test-key"
		parse.mockResolvedValue({
			choices: [
				{
					message: {
						parsed: {
							reply: "Posso mudar a frequência e limpar a descrição.",
							proposal: {
								type: "habit.update",
								entityId: "habit-1",
								changes: {
									name: null,
									description: null,
									frequencyType: "daily",
									weekDays: null,
									estimatedDurationMinutes: null,
									preferredTime: null,
									priority: null,
									status: null,
								},
								clearFields: ["description"],
							},
						},
						refusal: null,
					},
				},
			],
		})

		await expect(generateAiChatResponse(input)).resolves.toMatchObject({
			proposal: {
				type: "habit.update",
				entityId: "habit-1",
				changes: { description: null, frequencyType: "daily" },
			},
		})
	})

	it("normalizes a create proposal and leaves ID generation to the app", async () => {
		env.OPENAI_API_KEY = "test-key"
		parse.mockResolvedValue({
			choices: [
				{
					message: {
						parsed: {
							reply: "Posso criar o hábito Caminhada diariamente.",
							proposal: {
								type: "habit.create",
								habit: {
									name: "Caminhada",
									categoryName: "Saúde",
									description: null,
									frequencyType: "daily",
									weekDays: null,
									estimatedDurationMinutes: null,
									preferredTime: null,
									priority: null,
									status: null,
								},
							},
						},
						refusal: null,
					},
				},
			],
		})

		await expect(generateAiChatResponse(input)).resolves.toEqual({
			reply: "Posso criar o hábito Caminhada diariamente.",
			proposal: {
				type: "habit.create",
				habit: {
					name: "Caminhada",
					categoryName: "Saúde",
					frequencyType: "daily",
				},
			},
		})
	})

	it("normalizes a completion proposal without adding unprovided details", async () => {
		env.OPENAI_API_KEY = "test-key"
		parse.mockResolvedValue({
			choices: [
				{
					message: {
						parsed: {
							reply: "Posso registrar a conclusão de hoje.",
							proposal: {
								type: "habit.completion.create",
								habitId: "habit-1",
								date: "2026-11-09",
								completionTime: null,
								note: null,
							},
						},
						refusal: null,
					},
				},
			],
		})

		await expect(generateAiChatResponse(input)).resolves.toEqual({
			reply: "Posso registrar a conclusão de hoje.",
			proposal: {
				type: "habit.completion.create",
				habitId: "habit-1",
				date: "2026-11-09",
			},
		})
	})

	it("normalizes explicit event field clearing", async () => {
		env.OPENAI_API_KEY = "test-key"
		parse.mockResolvedValue({
			choices: [
				{
					message: {
						parsed: {
							reply: "Posso remover o local do evento.",
							proposal: {
								type: "event.update",
								entityId: "event-1",
								changes: {
									title: null,
									dateTime: null,
									endTime: null,
									location: null,
									description: null,
									reminderType: null,
								},
								clearFields: ["location"],
							},
						},
						refusal: null,
					},
				},
			],
		})

		await expect(generateAiChatResponse(input)).resolves.toMatchObject({
			proposal: {
				type: "event.update",
				entityId: "event-1",
				changes: { location: null },
			},
		})
	})

	it("maps provider failures to a sanitized service error", async () => {
		env.OPENAI_API_KEY = "test-key"
		parse.mockRejectedValue(new Error("sensitive provider details"))

		await expect(generateAiChatResponse(input)).rejects.toMatchObject({
			statusCode: 503,
			code: "AI_PROVIDER_UNAVAILABLE",
			message: "O serviço de IA está temporariamente indisponível.",
		})
	})
})
