import express from "express"
import { authRoutes } from "./modules/auth/index.js"
import { healthRoutes } from "./modules/health/index.js"
import { errorHandler, notFoundHandler } from "./modules/shared/errorHandler.js"
import { openapiRoutes } from "./modules/shared/openapi.js"
import { syncRoutes } from "./modules/sync/index.js"

const app = express()

app.use(express.json({ limit: "5mb" }))
app.use(openapiRoutes)
app.use(authRoutes)
app.use(healthRoutes)
app.use(syncRoutes)
app.use(notFoundHandler)
app.use(errorHandler)

export { app }
