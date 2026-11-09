import express from "express"

import { getHealth } from "./health.controller.js"

const healthRoutes = express.Router()

healthRoutes.get("/api/v1/health", getHealth)

export { healthRoutes }
