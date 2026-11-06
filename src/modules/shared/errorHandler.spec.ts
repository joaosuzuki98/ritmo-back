import express from "express"
import request from "supertest"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { errorHandler, notFoundHandler } from "./errorHandler.js"
import { AppError } from "./errors.js"

const requestSchema = z.object({ email: z.string().email() })

const createTestApp = () => {
	const app = express()
	app.use(express.json())
	app.post("/validation", (req, res) => {
		res.json(requestSchema.parse(req.body))
	})
	app.get("/domain-error", (_req, _res, next) => {
		next(
			new AppError({
				statusCode: 409,
				type: "https://ritmoapp.com/errors/email-in-use",
				detail: "Email is already registered.",
				code: "EMAIL_IN_USE",
			}),
		)
	})
	app.use(notFoundHandler)
	app.use(errorHandler)
	return app
}

describe("errorHandler", () => {
	it("converts Zod errors to RFC 9457 validation details", async () => {
		const response = await request(createTestApp())
			.post("/validation")
			.send({ email: "not-an-email" })

		expect(response.status).toBe(422)
		expect(response.headers["content-type"]).toContain(
			"application/problem+json",
		)
		expect(response.body).toMatchObject({
			type: "https://ritmoapp.com/errors/validation",
			title: "Validation failed",
			status: 422,
			detail: "One or more fields are invalid.",
			instance: "/validation",
			code: "VALIDATION_ERROR",
		})
		expect(response.body.errors).toEqual([
			expect.objectContaining({ field: "email" }),
		])
	})

	it("converts domain errors to RFC 9457 problem details", async () => {
		const response = await request(createTestApp()).get("/domain-error")

		expect(response.status).toBe(409)
		expect(response.headers["content-type"]).toContain(
			"application/problem+json",
		)
		expect(response.body).toMatchObject({
			type: "https://ritmoapp.com/errors/email-in-use",
			title: "Conflict",
			status: 409,
			detail: "Email is already registered.",
			instance: "/domain-error",
			code: "EMAIL_IN_USE",
		})
	})

	it("uses problem details for unmatched routes", async () => {
		const response = await request(createTestApp()).get("/missing")

		expect(response.status).toBe(404)
		expect(response.headers["content-type"]).toContain(
			"application/problem+json",
		)
		expect(response.body).toMatchObject({
			type: "https://ritmoapp.com/errors/not-found",
			title: "Not Found",
			status: 404,
			instance: "/missing",
		})
	})
})
