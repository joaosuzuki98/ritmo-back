import express = require("express")
import swaggerUi = require("swagger-ui-express")

const { OpenApiGeneratorV3 } =
	require("@asteasolutions/zod-to-openapi") as typeof import("@asteasolutions/zod-to-openapi")

const { registry } = require("./openapi-registry")
require("../health/health.openapi")

const packageJson = require("../../../package.json") as { version: string }
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

module.exports = openapiRoutes
