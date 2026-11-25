import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const { openAiConstructor, OpenAiMock } = vi.hoisted(() => {
	const openAiConstructor = vi.fn()
	class OpenAiMock {
		constructor(...args: unknown[]) {
			openAiConstructor(...args)
		}
	}
	return { openAiConstructor, OpenAiMock }
})

vi.mock("openai", () => ({ default: OpenAiMock }))

let env: typeof import("../shared/env.js").env
let getClient: typeof import("./ai.provider.js").getClient
let normalizeModelResponse: typeof import("./ai.provider.js").normalizeModelResponse

beforeAll(async () => {
	process.env.DATABASE_URL ??=
		"postgresql://test:test@127.0.0.1:5432/test?schema=public"
	process.env.PROBLEM_DETAILS_BASE_URL ??= "https://ritmoapp.com"
	;[{ env }, { getClient, normalizeModelResponse }] = await Promise.all([
		import("../shared/env.js"),
		import("./ai.provider.js"),
	])
})

beforeEach(() => {
	openAiConstructor.mockClear()
	delete env.OPENAI_API_KEY
})

describe("AI provider", () => {
	it("reports a safe error when the API key is not configured", () => {
		expect(() => getClient()).toThrowError(
			expect.objectContaining({ statusCode: 503, code: "AI_NOT_CONFIGURED" }),
		)
		expect(openAiConstructor).not.toHaveBeenCalled()
	})

	it("constructs a client with bounded timeout and retries", () => {
		env.OPENAI_API_KEY = "test-key"
		getClient()
		expect(openAiConstructor).toHaveBeenCalledWith({
			apiKey: "test-key",
			timeout: 25_000,
			maxRetries: 0,
		})
	})

	it("normalizes a habit creation without unprovided optional fields", () => {
		expect(
			normalizeModelResponse({
				reply: "Posso criar.",
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
			}),
		).toEqual({
			reply: "Posso criar.",
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

	it("keeps explicit habit field clearing and excludes unchanged fields", () => {
		expect(
			normalizeModelResponse({
				reply: "Posso alterar.",
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
			}).proposal,
		).toEqual({
			type: "habit.update",
			entityId: "habit-1",
			changes: { frequencyType: "daily", description: null },
		})
	})

	it("normalizes completion without adding unprovided details", () => {
		expect(
			normalizeModelResponse({
				reply: "Posso registrar.",
				proposal: {
					type: "habit.completion.create",
					habitId: "habit-1",
					date: "2026-11-09",
					completionTime: null,
					note: null,
				},
			}).proposal,
		).toEqual({
			type: "habit.completion.create",
			habitId: "habit-1",
			date: "2026-11-09",
		})
	})

	it("keeps explicit event field clearing", () => {
		expect(
			normalizeModelResponse({
				reply: "Posso alterar.",
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
			}).proposal,
		).toEqual({
			type: "event.update",
			entityId: "event-1",
			changes: { location: null },
		})
	})
})
