import express from "express"
import request from "supertest"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const { decide } = vi.hoisted(() => ({ decide: vi.fn() }))

vi.mock("./ai.proposals.service.js", () => ({
	aiProposalsService: { decide },
}))
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

const id = "33114aa6-ab20-41d1-9f08-45f439ef7c53"
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
})

describe("AI proposal decision route", () => {
	it.each(["accepted", "rejected"] as const)(
		"uses the authenticated identity for %s",
		async (decision) => {
			decide.mockResolvedValue({ status: decision })
			const response = await request(app)
				.post(`/api/v1/ai/proposals/${id}/decision`)
				.send({ decision })
			expect(response.status).toBe(200)
			expect(response.body).toEqual({ status: decision })
			expect(decide).toHaveBeenCalledWith("user-1", id, decision)
		},
	)

	it("rejects an invalid proposal ID before executing any action", async () => {
		const response = await request(app)
			.post("/api/v1/ai/proposals/not-a-uuid/decision")
			.send({ decision: "accepted" })
		expect(response.status).toBe(422)
		expect(decide).not.toHaveBeenCalled()
	})

	it("rejects extra client-supplied data or unsupported decisions", async () => {
		const extra = await request(app)
			.post(`/api/v1/ai/proposals/${id}/decision`)
			.send({ decision: "accepted", userId: "other-user" })
		expect(extra.status).toBe(422)
		const invalid = await request(app)
			.post(`/api/v1/ai/proposals/${id}/decision`)
			.send({ decision: "delete" })
		expect(invalid.status).toBe(422)
		expect(decide).not.toHaveBeenCalled()
	})
})
