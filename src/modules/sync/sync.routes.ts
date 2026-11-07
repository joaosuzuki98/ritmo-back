import express from "express"

import { requireAuth } from "../auth/auth.middleware.js"
import { pullChanges, pushChanges } from "./sync.controller.js"

const syncRoutes = express.Router()

syncRoutes.post("/api/v1/sync/pull", requireAuth, pullChanges)
syncRoutes.post("/api/v1/sync/push", requireAuth, pushChanges)

export { syncRoutes }
