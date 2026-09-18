import express = require("express")

import type { Router } from "express"

const openapiRoutes = require("./modules/shared/openapi") as Router
const healthRoutes = require("./modules/health") as Router

const app = express()

app.use(openapiRoutes)
app.use(healthRoutes)

module.exports = { app }
