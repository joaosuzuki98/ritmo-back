import { STATUS_CODES } from "node:http"
import { env } from "./env.js"

export const problemTypeUri = (slug: string) =>
	`${env.PROBLEM_DETAILS_BASE_URL}/errors/${slug}`

type AppErrorOptions = {
	statusCode: number
	type: string
	detail: string
	code?: string
}

export class AppError extends Error {
	readonly statusCode: number
	readonly type: string
	readonly title: string
	readonly code: string | undefined

	constructor({ statusCode, type, detail, code }: AppErrorOptions) {
		super(detail)
		this.name = "AppError"
		this.statusCode = statusCode
		this.type = type
		this.title = STATUS_CODES[statusCode] ?? "Error"
		this.code = code
	}
}

export class NotFoundError extends AppError {
	constructor(detail = "The requested resource was not found.") {
		super({
			statusCode: 404,
			type: problemTypeUri("not-found"),
			detail,
		})
		this.name = "NotFoundError"
	}
}
