import type { Request, Response } from "express"

import type { AuthenticatedRequest } from "../auth/auth.middleware.js"
import { syncPullRequestSchema, syncPushRequestSchema } from "./sync.schemas.js"
import { syncService } from "./sync.service.js"

const pullChanges = async (request: Request, response: Response) => {
	const { lastPulledAt } = syncPullRequestSchema.parse(request.body)
	const userId = (request as AuthenticatedRequest).auth.userId
	response.json(await syncService.pullChanges(userId, lastPulledAt))
}

const pushChanges = async (request: Request, response: Response) => {
	const body = syncPushRequestSchema.parse(request.body)
	const userId = (request as AuthenticatedRequest).auth.userId
	await syncService.pushChanges(userId, body)
	response.status(204).end()
}

export { pullChanges, pushChanges }
