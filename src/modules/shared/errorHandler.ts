import type { ErrorRequestHandler, RequestHandler, Response } from "express"
import { z } from "zod"

import { AppError, NotFoundError } from "./errors.js"

type ProblemDetails = {
	type: string
	title: string
	status: number
	detail: string
	instance: string
	code?: string
	errors?: { field: string; message: string }[]
}

const sendProblem = (response: Response, problem: ProblemDetails) => {
	response.status(problem.status).type("application/problem+json").json(problem)
}

const isErrorWithType = (error: unknown): error is { type: string } =>
	typeof error === "object" &&
	error !== null &&
	"type" in error &&
	typeof error.type === "string"

const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
	if (response.headersSent) {
		_next(error)
		return
	}

	if (error instanceof z.ZodError) {
		sendProblem(response, {
			type: "https://ritmoapp.com/errors/validation",
			title: "Validation failed",
			status: 422,
			detail: "One or more fields are invalid.",
			instance: request.originalUrl,
			code: "VALIDATION_ERROR",
			errors: error.issues.map((issue) => ({
				field: issue.path.map(String).join("."),
				message: issue.message,
			})),
		})
		return
	}

	if (error instanceof AppError) {
		sendProblem(response, {
			type: error.type,
			title: error.title,
			status: error.statusCode,
			detail: error.message,
			instance: request.originalUrl,
			...(error.code ? { code: error.code } : {}),
		})
		return
	}

	if (isErrorWithType(error) && error.type === "entity.parse.failed") {
		sendProblem(response, {
			type: "https://ritmoapp.com/errors/invalid-json",
			title: "Invalid JSON",
			status: 400,
			detail: "The request body contains invalid JSON.",
			instance: request.originalUrl,
			code: "INVALID_JSON",
		})
		return
	}

	if (isErrorWithType(error) && error.type === "entity.too.large") {
		sendProblem(response, {
			type: "https://ritmoapp.com/errors/payload-too-large",
			title: "Payload Too Large",
			status: 413,
			detail: "The request body exceeds the allowed size.",
			instance: request.originalUrl,
			code: "PAYLOAD_TOO_LARGE",
		})
		return
	}

	console.error("Unhandled API error:", error)
	sendProblem(response, {
		type: "https://ritmoapp.com/errors/internal",
		title: "Internal Server Error",
		status: 500,
		detail: "Ocorreu um erro inesperado.",
		instance: request.originalUrl,
		code: "INTERNAL_ERROR",
	})
}

const notFoundHandler: RequestHandler = (request, _response, next) => {
	next(
		new NotFoundError(
			`No route matches ${request.method} ${request.originalUrl}.`,
		),
	)
}

export { errorHandler, notFoundHandler }
