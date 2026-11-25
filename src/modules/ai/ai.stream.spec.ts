import express from "express"
import request from "supertest"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const { runAgent, save } = vi.hoisted(() => ({
	runAgent: vi.fn(),
	save: vi.fn(),
}))

vi.mock("./ai.agent.js", () => ({ runAgent }))
vi.mock("./ai.proposals.service.js", () => ({ aiProposalsService: { save } }))
vi.mock("../auth/auth.middleware.js", () => ({
	requireAuth: (
		req: express.Request,
		_res: express.Response,
		next: express.NextFunction,
	) => {
		Object.assign(req, { auth: { userId: "user-1", sessionId: "session-1" } })
		next()
	},
}))

let app: express.Express

beforeAll(async () => {
	process.env.DATABASE_URL ??=
		"postgresql://test:test@127.0.0.1:5432/test?schema=public"
	process.env.PROBLEM_DETAILS_BASE_URL ??= "https://ritmoapp.com"
	const [{ aiRoutes }, { errorHandler }] = await Promise.all([
		import("./ai.routes.js"),
		import("../shared/errorHandler.js"),
	])
	app = express()
	app.use(express.json())
	app.use(aiRoutes)
	app.use(errorHandler)
})

beforeEach(() => {
	vi.resetAllMocks()
	save.mockResolvedValue({
		id: "33114aa6-ab20-41d1-9f08-45f439ef7c53",
		expiresAt: new Date("2026-11-25T12:15:00Z"),
	})
})

describe("AI agent SSE route", () => {
	it("streams a status followed by the validated agent result", async () => {
		runAgent.mockResolvedValue({
			reply: "Posso criar seu hábito.",
			proposal: {
				type: "habit.create",
				habit: { name: "Caminhada", frequencyType: "daily" },
			},
		})
		const response = await request(app)
			.post("/api/v1/ai/chat/stream")
			.send({ message: "Criar caminhada", timeZone: "America/Sao_Paulo" })

		expect(response.status).toBe(200)
		expect(response.headers["content-type"]).toContain("text/event-stream")
		expect(response.text).toContain('event: status\ndata: {"status":"started"}')
		expect(response.text).toContain(
			'event: result\ndata: {"reply":"Posso criar seu hábito."',
		)
		expect(response.text).toContain(
			'"proposalId":"33114aa6-ab20-41d1-9f08-45f439ef7c53"',
		)
		expect(save).toHaveBeenCalledWith(
			"user-1",
			expect.objectContaining({ type: "habit.create" }),
			"America/Sao_Paulo",
		)
		expect(runAgent).toHaveBeenCalledWith(
			"user-1",
			{
				message: "Criar caminhada",
				history: [],
				timeZone: "America/Sao_Paulo",
			},
			expect.any(AbortSignal),
		)
	})

	it("does not store a proposal for ordinary messages", async () => {
		runAgent.mockResolvedValue({ reply: "Olá", proposal: null })
		const response = await request(app)
			.post("/api/v1/ai/chat/stream")
			.send({ message: "Olá", timeZone: "America/Sao_Paulo" })
		expect(response.text).toContain('"proposalId":null')
		expect(save).not.toHaveBeenCalled()
	})

	it("passes the selected app language to the agent", async () => {
		runAgent.mockResolvedValue({ reply: "Hello", proposal: null })
		const response = await request(app)
			.post("/api/v1/ai/chat/stream")
			.send({ message: "Olá", timeZone: "America/Sao_Paulo", language: "en" })
		expect(response.status).toBe(200)
		expect(runAgent).toHaveBeenCalledWith(
			"user-1",
			expect.objectContaining({ language: "en" }),
			expect.any(AbortSignal),
		)
	})

	it("rejects unsupported app languages", async () => {
		const response = await request(app)
			.post("/api/v1/ai/chat/stream")
			.send({ message: "Hola", timeZone: "America/Sao_Paulo", language: "es" })
		expect(response.status).toBe(422)
		expect(runAgent).not.toHaveBeenCalled()
	})

	it("rejects client-supplied context before opening the stream", async () => {
		const response = await request(app)
			.post("/api/v1/ai/chat/stream")
			.send({
				message: "Olá",
				timeZone: "America/Sao_Paulo",
				context: { habits: [] },
			})
		expect(response.status).toBe(422)
		expect(runAgent).not.toHaveBeenCalled()
	})

	it("reports a sanitized error event after the stream starts", async () => {
		runAgent.mockRejectedValue(new Error("secret provider details"))
		const response = await request(app)
			.post("/api/v1/ai/chat/stream")
			.send({ message: "Olá", timeZone: "America/Sao_Paulo" })
		expect(response.status).toBe(200)
		expect(response.text).toContain("event: error")
		expect(response.text).not.toContain("secret")
	})

	it("localizes stream errors to the app language", async () => {
		runAgent.mockRejectedValue(new Error("secret provider details"))
		const response = await request(app)
			.post("/api/v1/ai/chat/stream")
			.send({ message: "Hi", timeZone: "America/Sao_Paulo", language: "en" })
		expect(response.text).toContain("Unable to get an AI response.")
		expect(response.text).not.toContain("secret")
	})

	it("rejects unknown time zones before opening the stream", async () => {
		const response = await request(app)
			.post("/api/v1/ai/chat/stream")
			.send({ message: "Olá", timeZone: "Invalid/Zone" })
		expect(response.status).toBe(422)
		expect(runAgent).not.toHaveBeenCalled()
	})
})
