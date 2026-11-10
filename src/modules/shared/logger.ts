import pino from "pino"
import { pinoHttp } from "pino-http"

import { env } from "./env.js"

const logger = pino({ level: env.LOG_LEVEL })

const httpLogger = pinoHttp({
	logger,
	customLogLevel: (_request, response, error) => {
		if (error || response.statusCode >= 500) return "error"
		if (response.statusCode >= 400) return "warn"
		return "info"
	},
	serializers: {
		req: (request) => ({
			id: request.id,
			method: request.method,
			url: request.originalUrl?.split("?")[0] ?? request.url?.split("?")[0],
		}),
		res: (response) => ({ statusCode: response.statusCode }),
	},
})

export { httpLogger, logger }
