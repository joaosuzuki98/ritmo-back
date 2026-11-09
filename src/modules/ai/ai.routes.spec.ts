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
	it("requires authentication before accessing the chat endpoint", async () => {
		const app = express()
		app.use(express.json())
		app.use(aiRoutes)
		app.use(errorHandler)

		const response = await request(app)
			.post("/api/v1/ai/chat")
			.send({ message: "Olá" })

		expect(response.status).toBe(401)
		expect(response.body.code).toBe("UNAUTHENTICATED")
	})

	it("publishes the chat request and response in the OpenAPI document", async () => {
		const app = express()
		app.use(openapiRoutes)

		const response = await request(app).get("/docs.json")

		expect(response.status).toBe(200)
		expect(response.body.paths["/api/v1/ai/chat"].post).toMatchObject({
			security: [{ bearerAuth: [] }],
			tags: ["AI"],
		})
	})
})
