import type { Request, Response } from "express"

import type { AuthenticatedRequest } from "../auth/auth.middleware.js"
import { syncPullRequestSchema, syncPushRequestSchema } from "./sync.schemas.js"
import { syncService } from "./sync.service.js"

type CollectionCounts = { created: number; updated: number; deleted: number }

const countCollectionChanges = (
	changesByCollection: Record<
		string,
		{ created: unknown[]; updated: unknown[]; deleted: unknown[] }
	>,
) =>
	Object.fromEntries(
		Object.entries(changesByCollection)
			.map(([name, changes]) => {
				const counts: CollectionCounts = {
					created: changes.created.length,
					updated: changes.updated.length,
					deleted: changes.deleted.length,
				}
				return [name, counts] as const
			})
			.filter(
				([, counts]) => counts.created + counts.updated + counts.deleted > 0,
			),
	)

const pullChanges = async (request: Request, response: Response) => {
	const { lastPulledAt } = syncPullRequestSchema.parse(request.body)
	const userId = (request as AuthenticatedRequest).auth.userId
	const result = await syncService.pullChanges(userId, lastPulledAt)
	const collections = countCollectionChanges(result.changes)
	request.log.info(
		{
			event: "sync.pull.completed",
			userId,
			lastPulledAt,
			timestamp: result.timestamp,
			collections,
		},
		"Sync pull completed",
	)
	response.json(result)
}

const pushChanges = async (request: Request, response: Response) => {
	const body = syncPushRequestSchema.parse(request.body)
	const userId = (request as AuthenticatedRequest).auth.userId
	await syncService.pushChanges(userId, body)
	const collections = countCollectionChanges(body.changes)
	request.log.info(
		{ event: "sync.push.completed", userId, collections },
		"Sync push completed",
	)
	response.status(204).end()
}

export { pullChanges, pushChanges }
