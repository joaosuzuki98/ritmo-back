import express from "express"
import { authRoutes } from "./modules/auth/index.js"
import { healthRoutes } from "./modules/health/index.js"
import { openapiRoutes } from "./modules/shared/openapi.js"

const app = express()

app.use(express.json({ limit: "32kb" }))
app.use(openapiRoutes)
app.use(authRoutes)
app.use(healthRoutes)

export { app }
