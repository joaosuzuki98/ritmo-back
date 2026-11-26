import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
	create: vi.fn(),
	executeAiTool: vi.fn(),
}))

vi.mock("./ai.provider.js", async (importOriginal) => {
	const original = await importOriginal<typeof import("./ai.provider.js")>()
	return {
		...original,
		getClient: () => ({ responses: { create: mocks.create } }),
	}
})
vi.mock("./ai.tools.js", () => ({
	responseAiTools: [],
	executeAiTool: mocks.executeAiTool,
}))

let runAgent: typeof import("./ai.agent.js").runAgent

beforeAll(async () => {
	process.env.DATABASE_URL ??=
		"postgresql://test:test@127.0.0.1:5432/test?schema=public"
	process.env.PROBLEM_DETAILS_BASE_URL ??= "https://ritmoapp.com"
	;({ runAgent } = await import("./ai.agent.js"))
})

beforeEach(() => {
	vi.resetAllMocks()
})

const input = {
	message: "Altere minha caminhada",
	history: [],
	timeZone: "America/Sao_Paulo",
}
const toolCall = (name: string, args = '{"cursor":null}', id = "call-1") => ({
	id: `fc-${id}`,
	call_id: id,
	type: "function_call",
	name,
	arguments: args,
})
const toolResponse = (...calls: ReturnType<typeof toolCall>[]) => ({
	status: "completed",
	output: [
		{
			type: "reasoning",
			id: "rs-1",
			summary: [],
			encrypted_content: "encrypted",
		},
		...calls,
	],
})
const textResponse = (text: string) => ({
	status: "completed",
	output: [
		{
			type: "message",
			role: "assistant",
			content: [{ type: "output_text", text }],
		},
	],
})
const finalResponse = (id: string) =>
	textResponse(
		JSON.stringify({
			reply: "Posso alterar o hábito.",
			proposal: {
				type: "habit.update",
				entityId: id,
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
				clearFields: [],
			},
		}),
	)

describe("runAgent", () => {
	it.each([
		["pt", "português"],
		["en", "inglês"],
	] as const)(
		"instructs the model to use app language %s",
		async (language, label) => {
			mocks.create.mockResolvedValue(
				textResponse(JSON.stringify({ reply: "OK", proposal: null })),
			)
			await runAgent("user-1", { ...input, language })
			const messages = mocks.create.mock.calls[0]?.[0].input
			expect(messages[0].content).toContain(
				"usuário solicitar explicitamente outro idioma",
			)
			expect(messages[1].content).toContain(
				`Idioma selecionado no aplicativo: ${label}`,
			)
		},
	)

	it("defaults to Portuguese for older clients", async () => {
		mocks.create.mockResolvedValue(
			textResponse(JSON.stringify({ reply: "OK", proposal: null })),
		)
		await runAgent("user-1", input)
		expect(mocks.create.mock.calls[0]?.[0].input[1].content).toContain(
			"Idioma selecionado no aplicativo: português",
		)
	})

	it("passes a configured reasoning effort to Responses", async () => {
		const { env } = await import("../shared/env.js")
		const previous = env.OPENAI_REASONING_EFFORT
		env.OPENAI_REASONING_EFFORT = "low"
		try {
			mocks.create.mockResolvedValue(finalResponse("habit-1"))
			await runAgent("user-1", input)
			expect(mocks.create.mock.calls[0]?.[0].reasoning).toEqual({
				effort: "low",
			})
		} finally {
			if (previous === undefined) delete env.OPENAI_REASONING_EFFORT
			else env.OPENAI_REASONING_EFFORT = previous
		}
	})

	it("executes tools for the authenticated user and validates the proposal target", async () => {
		mocks.create
			.mockResolvedValueOnce(toolResponse(toolCall("list_habits")))
			.mockResolvedValueOnce(finalResponse("habit-1"))
		mocks.executeAiTool.mockResolvedValue({
			items: [{ id: "habit-1", name: "Caminhada" }],
			nextCursor: null,
		})

		await expect(runAgent("user-1", input)).resolves.toEqual({
			reply: "Posso alterar o hábito.",
			proposal: {
				type: "habit.update",
				entityId: "habit-1",
				changes: { frequencyType: "daily" },
			},
		})
		expect(mocks.executeAiTool).toHaveBeenCalledWith(
			"user-1",
			"list_habits",
			{ cursor: null },
			"America/Sao_Paulo",
		)
		expect(mocks.create).toHaveBeenCalledTimes(2)
		expect(mocks.create.mock.calls[0]?.[0].input[1].content).toContain(
			"America/Sao_Paulo",
		)
		expect(mocks.create.mock.calls[0]?.[0].store).toBe(false)
		expect(mocks.create.mock.calls[1]?.[0].store).toBe(false)
		expect(mocks.create.mock.calls[0]?.[0].include).toContain(
			"reasoning.encrypted_content",
		)
		expect(mocks.create.mock.calls[1]?.[0].input).toContainEqual(
			expect.objectContaining({
				type: "reasoning",
				encrypted_content: "encrypted",
			}),
		)
		expect(mocks.create.mock.calls[1]?.[0].input).toContainEqual({
			type: "function_call_output",
			call_id: "call-1",
			output: JSON.stringify({
				items: [{ id: "habit-1", name: "Caminhada" }],
				nextCursor: null,
			}),
		})
	})

	it("rejects a proposal targeting an item not returned by a tool", async () => {
		mocks.create
			.mockResolvedValueOnce(toolResponse(toolCall("list_habits")))
			.mockResolvedValueOnce(finalResponse("other-user-habit"))
		mocks.executeAiTool.mockResolvedValue({
			items: [{ id: "habit-1" }],
			nextCursor: null,
		})
		await expect(runAgent("user-1", input)).resolves.toMatchObject({
			proposal: null,
			reply: expect.stringContaining("validar"),
		})
	})

	it("rejects a target even if no tools were called", async () => {
		mocks.create.mockResolvedValue(finalResponse("habit-1"))
		await expect(runAgent("user-1", input)).resolves.toMatchObject({
			proposal: null,
		})
	})

	it("asks for days rather than proposing an incomplete weekly habit", async () => {
		mocks.create.mockResolvedValue(
			textResponse(
				JSON.stringify({
					reply: "Posso criar.",
					proposal: {
						type: "habit.create",
						habit: {
							name: "Caminhada",
							categoryName: null,
							description: null,
							frequencyType: "weekly",
							weekDays: null,
							estimatedDurationMinutes: null,
							preferredTime: null,
							priority: null,
							status: null,
						},
					},
				}),
			),
		)
		await expect(runAgent("user-1", input)).resolves.toEqual({
			reply: "Em quais dias da semana você quer realizar esse hábito?",
			proposal: null,
		})
		await expect(
			runAgent("user-1", { ...input, language: "en" }),
		).resolves.toEqual({
			reply: "Which days of the week would you like to do this habit?",
			proposal: null,
		})
	})

	it("localizes an invalid proposal target using the app language", async () => {
		mocks.create.mockResolvedValue(finalResponse("unknown-habit"))
		await expect(
			runAgent("user-1", { ...input, language: "en" }),
		).resolves.toMatchObject({
			proposal: null,
			reply: expect.stringContaining("couldn't validate"),
		})
	})

	it("localizes duplicate weekday validation", async () => {
		mocks.create.mockResolvedValue(
			textResponse(
				JSON.stringify({
					reply: "Ready.",
					proposal: {
						type: "habit.create",
						habit: {
							name: "Walk",
							categoryName: null,
							description: null,
							frequencyType: "weekly",
							weekDays: [1, 1],
							estimatedDurationMinutes: null,
							preferredTime: null,
							priority: null,
							status: null,
						},
					},
				}),
			),
		)
		await expect(
			runAgent("user-1", { ...input, language: "en" }),
		).resolves.toEqual({
			reply:
				"I couldn't validate the days of the week. Could you provide them again?",
			proposal: null,
		})
	})

	it("rejects malformed tool arguments without revealing provider details", async () => {
		mocks.create.mockResolvedValue(
			toolResponse(toolCall("list_habits", "invalid json")),
		)
		await expect(runAgent("user-1", input)).rejects.toMatchObject({
			code: "AI_PROVIDER_UNAVAILABLE",
		})
		expect(mocks.executeAiTool).not.toHaveBeenCalled()
	})

	it("limits the number of tool calls", async () => {
		mocks.create.mockResolvedValue(
			toolResponse(
				...Array.from({ length: 13 }, (_, index) =>
					toolCall("list_habits", '{"cursor":null}', `call-${index}`),
				),
			),
		)
		await expect(runAgent("user-1", input)).rejects.toMatchObject({
			code: "AI_PROVIDER_UNAVAILABLE",
		})
		expect(mocks.executeAiTool).not.toHaveBeenCalled()
	})

	it("rejects malformed model output", async () => {
		mocks.create.mockResolvedValue(textResponse("not json"))
		await expect(runAgent("user-1", input)).rejects.toMatchObject({
			code: "INVALID_AI_RESPONSE",
		})
	})

	it("does not execute tools from an incomplete response", async () => {
		mocks.create.mockResolvedValue({
			...toolResponse(toolCall("list_habits")),
			status: "incomplete",
		})
		await expect(runAgent("user-1", input)).rejects.toMatchObject({
			code: "INVALID_AI_RESPONSE",
		})
		expect(mocks.executeAiTool).not.toHaveBeenCalled()
	})

	it("returns a model refusal without a proposal", async () => {
		mocks.create.mockResolvedValue({
			status: "completed",
			output: [
				{
					type: "message",
					content: [{ type: "refusal", refusal: "Não posso ajudar com isso." }],
				},
			],
		})
		await expect(runAgent("user-1", input)).resolves.toEqual({
			reply: "Não posso ajudar com isso.",
			proposal: null,
		})
	})

	it("limits repeated tool rounds", async () => {
		mocks.create.mockResolvedValue(toolResponse(toolCall("list_habits")))
		mocks.executeAiTool.mockResolvedValue({ items: [], nextCursor: null })
		await expect(runAgent("user-1", input)).rejects.toMatchObject({
			code: "AI_PROVIDER_UNAVAILABLE",
		})
		expect(mocks.create).toHaveBeenCalledTimes(6)
	})

	it("does not expose provider or tool errors", async () => {
		mocks.create.mockRejectedValue(new Error("secret provider data"))
		await expect(runAgent("user-1", input)).rejects.toMatchObject({
			message: "O serviço de IA está temporariamente indisponível.",
			code: "AI_PROVIDER_UNAVAILABLE",
		})
		mocks.create.mockReset()
		mocks.create.mockResolvedValue(toolResponse(toolCall("list_habits")))
		mocks.executeAiTool.mockRejectedValue(new Error("secret database data"))
		await expect(runAgent("user-1", input)).rejects.toMatchObject({
			message: "O serviço de IA está temporariamente indisponível.",
			code: "AI_PROVIDER_UNAVAILABLE",
		})
	})

	it("does not call the provider when the stream is already disconnected", async () => {
		const controller = new AbortController()
		controller.abort()
		await expect(
			runAgent("user-1", input, controller.signal),
		).rejects.toMatchObject({ code: "AI_PROVIDER_UNAVAILABLE" })
		expect(mocks.create).not.toHaveBeenCalled()
	})
})
