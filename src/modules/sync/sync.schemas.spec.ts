import { describe, expect, it } from "vitest"

import { syncPullRequestSchema, syncPushRequestSchema } from "./sync.schemas.js"

describe("sync schemas", () => {
	it("accepts an initial pull request", () => {
		expect(syncPullRequestSchema.parse({ lastPulledAt: null })).toEqual({
			lastPulledAt: null,
		})
	})

	it("defaults omitted change groups to empty arrays", () => {
		expect(
			syncPushRequestSchema.parse({
				lastPulledAt: 1000,
				changes: { habits: { created: [{ id: "habit-1", name: "Read" }] } },
			}),
		).toEqual({
			lastPulledAt: 1000,
			changes: {
				habits: {
					created: [{ id: "habit-1", name: "Read" }],
					updated: [],
					deleted: [],
				},
			},
		})
	})

	it("limits the number of changes in a push", () => {
		const created = Array.from({ length: 1001 }, (_, index) => ({
			id: `habit-${index}`,
		}))
		const result = syncPushRequestSchema.safeParse({
			lastPulledAt: null,
			changes: { habits: { created } },
		})

		expect(result.success).toBe(false)
	})
})
