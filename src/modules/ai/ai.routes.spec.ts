import express from "express"
import request from "supertest"
import { beforeAll, describe, expect, it } from "vitest"

let aiRoutes: typeof import("./ai.routes.js").aiRoutes
let errorHandler: typeof import("../shared/errorHandler.js").errorHandler
let openapiRoutes: typeof import("../shared/openapi.js").openapiRoutes

beforeAll(async () => {
	process.env.DATABASE_URL ??=
		"postgresql://test:test@127.0.0.1:5432/test?schema=public"
	process.env.PROBLEM_DETAILS_BASE_URL ??= "https://ritmoapp.com"
	;[{ aiRoutes }, { errorHandler }, { openapiRoutes }] = await Promise.all([
		import("./ai.routes.js"),
		import("../shared/errorHandler.js"),
		import("../shared/openapi.js"),
	])
})

describe("AI routes", () => {
	it("does not expose the legacy chat endpoint", async () => {
		const app = express()
		app.use(express.json())
		app.use(aiRoutes)
		app.use(errorHandler)

		const response = await request(app)
			.post("/api/v1/ai/chat")
			.send({ message: "Olá" })

		expect(response.status).toBe(404)
	})

	it("requires authentication before opening the agent stream", async () => {
		const app = express()
		app.use(express.json())
		app.use(aiRoutes)
		app.use(errorHandler)

		const response = await request(app)
			.post("/api/v1/ai/chat/stream")
			.send({ message: "Olá" })

		expect(response.status).toBe(401)
		expect(response.body.code).toBe("UNAUTHENTICATED")
	})

	it("requires authentication before deciding a proposal", async () => {
		const app = express()
		app.use(express.json())
		app.use(aiRoutes)
		app.use(errorHandler)
		const response = await request(app)
			.post(
				"/api/v1/ai/proposals/33114aa6-ab20-41d1-9f08-45f439ef7c53/decision",
			)
			.send({ decision: "accepted" })
		expect(response.status).toBe(401)
		expect(response.body.code).toBe("UNAUTHENTICATED")
	})

	it("publishes the chat request and response in the OpenAPI document", async () => {
		const app = express()
		app.use(openapiRoutes)

		const response = await request(app).get("/docs.json")

		expect(response.status).toBe(200)
		expect(response.body.paths["/api/v1/ai/chat"]).toBeUndefined()
		expect(response.body.components.schemas.AiChatRequest).toBeUndefined()
		expect(
			response.body.paths["/api/v1/ai/chat/stream"].post.responses["200"]
				.content["text/event-stream"],
		).toBeDefined()
		expect(
			response.body.paths["/api/v1/ai/proposals/{proposalId}/decision"].post,
		).toMatchObject({ security: [{ bearerAuth: [] }] })
	})
})
