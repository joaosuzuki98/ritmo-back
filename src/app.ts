import express from "express"
import { healthRoutes } from "./modules/health/index.js"
import { openapiRoutes } from "./modules/shared/openapi.js"

const app = express()

app.use(openapiRoutes)
app.use(healthRoutes)

export { app }
