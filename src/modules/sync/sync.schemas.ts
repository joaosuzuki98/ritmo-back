import { z } from "zod"

import { registry } from "../shared/openapi-registry.js"

const syncRecordSchema = z.record(z.string(), z.unknown())

const collectionChangesSchema = z.object({
	created: z.array(syncRecordSchema).max(1000).default([]),
	updated: z.array(syncRecordSchema).max(1000).default([]),
	deleted: z.array(z.string().min(1).max(255)).max(1000).default([]),
})

const syncPullRequestSchema = registry.register(
	"SyncPullRequest",
	z.object({ lastPulledAt: z.number().int().nonnegative().nullable() }),
)

const syncPushRequestSchema = registry.register(
	"SyncPushRequest",
	z.object({
		lastPulledAt: z.number().int().nonnegative().nullable(),
		changes: z
			.record(z.string(), collectionChangesSchema)
			.refine(
				(changes) =>
					Object.values(changes).reduce(
						(total, value) =>
							total +
							value.created.length +
							value.updated.length +
							value.deleted.length,
						0,
					) <= 5000,
				"A sync push cannot contain more than 5000 record changes.",
			),
	}),
)

const syncPullResponseSchema = registry.register(
	"SyncPullResponse",
	z.object({
		changes: z.record(z.string(), collectionChangesSchema),
		timestamp: z.number().int().nonnegative(),
	}),
)

export type SyncPullRequest = z.infer<typeof syncPullRequestSchema>
export type SyncPushRequest = z.infer<typeof syncPushRequestSchema>

export {
	collectionChangesSchema,
	syncPullRequestSchema,
	syncPullResponseSchema,
	syncPushRequestSchema,
}
