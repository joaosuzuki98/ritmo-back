import express = require("express")

import type { RequestHandler } from "express"

const { getHealth } = require("./health.controller") as {
	getHealth: RequestHandler
}

const healthRoutes = express.Router()

healthRoutes.get("/api/v1/health", getHealth)

module.exports = healthRoutes
