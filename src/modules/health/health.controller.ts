import type { Request, Response } from "express"

const { healthResponseSchema } = require("./health.schemas") as {
	healthResponseSchema: {
		parse: (input: unknown) => unknown
	}
}

const packageJson = require("../../../package.json") as { version: string }

const getHealth = (_request: Request, response: Response) => {
	const healthResponse = healthResponseSchema.parse({
		status: "ok",
		timestamp: new Date().toISOString(),
		version: packageJson.version,
	})

	response.json(healthResponse)
}

module.exports = { getHealth }
