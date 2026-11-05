import type { Request, Response } from "express"
import {
	loginRequestSchema,
	logoutRequestSchema,
	passwordResetCompleteSchema,
	passwordResetRequestSchema,
	refreshRequestSchema,
	registerRequestSchema,
} from "./auth.schemas.js"
import { AuthServiceError, authService } from "./auth.service.js"

const sendFailure = (response: Response, error: unknown) => {
	if (error instanceof AuthServiceError) {
		response.status(error.statusCode).json({
			error: { code: error.code, message: error.message },
		})
		return
	}
	response.status(500).json({
		error: { code: "INTERNAL_ERROR", message: "Ocorreu um erro inesperado." },
	})
}

const parseBody = <T>(
	response: Response,
	schema: {
		safeParse: (
			value: unknown,
		) =>
			| { success: true; data: T }
			| { success: false; error: { issues: unknown[] } }
	},
	value: unknown,
) => {
	const result = schema.safeParse(value)
	if (!result.success) {
		response.status(422).json({
			error: {
				code: "VALIDATION_ERROR",
				message: "Os dados enviados são inválidos.",
				issues: result.error.issues,
			},
		})
		return null
	}
	return result.data
}

const register = async (request: Request, response: Response) => {
	const body = parseBody(response, registerRequestSchema, request.body)
	if (!body) return
	try {
		response.status(201).json(await authService.register(body))
	} catch (error) {
		sendFailure(response, error)
	}
}

const login = async (request: Request, response: Response) => {
	const body = parseBody(response, loginRequestSchema, request.body)
	if (!body) return
	try {
		response.json(await authService.login(body))
	} catch (error) {
		sendFailure(response, error)
	}
}

const refresh = async (request: Request, response: Response) => {
	const body = parseBody(response, refreshRequestSchema, request.body)
	if (!body) return
	try {
		response.json(await authService.refresh(body.refreshToken))
	} catch (error) {
		sendFailure(response, error)
	}
}

const logout = async (request: Request, response: Response) => {
	const body = parseBody(response, logoutRequestSchema, request.body)
	if (!body) return
	try {
		await authService.logout(body.refreshToken)
		response.status(204).end()
	} catch (error) {
		sendFailure(response, error)
	}
}

const requestPasswordReset = async (request: Request, response: Response) => {
	const body = parseBody(response, passwordResetRequestSchema, request.body)
	if (!body) return
	try {
		response.json(await authService.requestPasswordReset(body))
	} catch (error) {
		sendFailure(response, error)
	}
}

const completePasswordReset = async (request: Request, response: Response) => {
	const body = parseBody(response, passwordResetCompleteSchema, request.body)
	if (!body) return
	try {
		response.json(await authService.completePasswordReset(body))
	} catch (error) {
		sendFailure(response, error)
	}
}

export {
	completePasswordReset,
	login,
	logout,
	refresh,
	register,
	requestPasswordReset,
}
