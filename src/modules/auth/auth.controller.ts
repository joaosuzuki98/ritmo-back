import type { Request, Response } from "express"
import {
	loginRequestSchema,
	logoutRequestSchema,
	passwordResetCompleteSchema,
	passwordResetRequestSchema,
	refreshRequestSchema,
	registerRequestSchema,
} from "./auth.schemas.js"
import { authService } from "./auth.service.js"

const parseBody = <T>(
	schema: { parse: (value: unknown) => T },
	value: unknown,
) => schema.parse(value)

const register = async (request: Request, response: Response) => {
	const body = parseBody(registerRequestSchema, request.body)
	response.status(201).json(await authService.register(body))
}

const login = async (request: Request, response: Response) => {
	const body = parseBody(loginRequestSchema, request.body)
	response.json(await authService.login(body))
}

const refresh = async (request: Request, response: Response) => {
	const body = parseBody(refreshRequestSchema, request.body)
	response.json(await authService.refresh(body.refreshToken))
}

const logout = async (request: Request, response: Response) => {
	const body = parseBody(logoutRequestSchema, request.body)
	await authService.logout(body.refreshToken)
	response.status(204).end()
}

const requestPasswordReset = async (request: Request, response: Response) => {
	const body = parseBody(passwordResetRequestSchema, request.body)
	response.json(await authService.requestPasswordReset(body))
}

const completePasswordReset = async (request: Request, response: Response) => {
	const body = parseBody(passwordResetCompleteSchema, request.body)
	response.json(await authService.completePasswordReset(body))
}

export {
	completePasswordReset,
	login,
	logout,
	refresh,
	register,
	requestPasswordReset,
}
