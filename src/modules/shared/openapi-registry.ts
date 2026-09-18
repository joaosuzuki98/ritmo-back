import z = require("zod")

const { extendZodWithOpenApi, OpenAPIRegistry } =
	require("@asteasolutions/zod-to-openapi") as typeof import("@asteasolutions/zod-to-openapi")

extendZodWithOpenApi(z)

const registry = new OpenAPIRegistry()

module.exports = { registry }
