import { createRequire } from "node:module"
import type { Request, Response } from "express"

import { healthResponseSchema } from "./health.schemas.js"

const require = createRequire(import.meta.url)
const packageJson = require("../../../package.json") as { version: string }

const getHealth = (_request: Request, response: Response) => {
	const healthResponse = healthResponseSchema.parse({
		status: "ok",
		timestamp: new Date().toISOString(),
		version: packageJson.version,
	})

	response.json(healthResponse)
}

export { getHealth }
