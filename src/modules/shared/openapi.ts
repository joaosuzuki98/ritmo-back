import { createRequire } from "node:module"
import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi"
import express from "express"
import swaggerUi from "swagger-ui-express"
import { registry } from "./openapi-registry.js"
import "../auth/auth.openapi.js"
import "../ai/ai.openapi.js"
import "../health/health.openapi.js"
import "../sync/sync.openapi.js"

const require = createRequire(import.meta.url)
const packageJson = require("../../../package.json") as { version: string }
registry.registerComponent("securitySchemes", "bearerAuth", {
	type: "http",
	scheme: "bearer",
	bearerFormat: "JWT",
})
const generator = new OpenApiGeneratorV3(registry.definitions)
const document = generator.generateDocument({
	openapi: "3.0.0",
	info: {
		title: "Ritmo App API",
		version: packageJson.version,
	},
})

const openapiRoutes = express.Router()

openapiRoutes.get("/docs.json", (_request, response) => {
	response.json(document)
})
openapiRoutes.use("/docs", swaggerUi.serve, swaggerUi.setup(document))

export { openapiRoutes }
