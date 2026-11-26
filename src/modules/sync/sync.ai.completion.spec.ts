import type { Prisma } from "@prisma/client"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
	repository: { findCompletionGraph: vi.fn() },
	sync: {
		lockSyncState: vi.fn(),
		updateSyncTimestamp: vi.fn(),
		pushRecord: vi.fn(),
	},
}))
vi.mock("./sync.ai.repository.js", () => ({
	syncAiRepository: mocks.repository,
}))
vi.mock("./sync.repository.js", () => ({ syncRepository: mocks.sync }))
let applyCompletion: typeof import("./sync.ai.completion.js").applyCompletion
const client = {} as Prisma.TransactionClient
const root = {
	id: "habit-1",
	status: "pending",
	frequencyType: "daily",
	weekDays: "[1,2,3,4,5,6,7]",
	seasonalStart: null,
	seasonalEnd: null,
	dependencies: [],
	conditions: [],
}
const action = {
	type: "habit.completion.create",
	habitId: "habit-1",
	date: "2026-11-25",
	completionTime: "09:30",
}

beforeAll(async () => {
	process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test"
	process.env.PROBLEM_DETAILS_BASE_URL ??= "https://ritmoapp.com"
	;({ applyCompletion } = await import("./sync.ai.completion.js"))
})

beforeEach(() => {
	vi.resetAllMocks()
	mocks.sync.lockSyncState.mockResolvedValue(100n)
	mocks.sync.updateSyncTimestamp.mockResolvedValue(101n)
	mocks.repository.findCompletionGraph.mockResolvedValue({
		habits: [root],
		completions: [],
		streaks: [],
	})
})

describe("AI habit completion", () => {
	it("records completion and streak using the user's local date", async () => {
		await applyCompletion(client, "user-1", action, "America/Sao_Paulo")
		expect(mocks.sync.pushRecord).toHaveBeenCalledTimes(2)
		expect(mocks.sync.pushRecord).toHaveBeenNthCalledWith(
			1,
			client,
			"user-1",
			"completion_records",
			"created",
			expect.objectContaining({
				habit_id: "habit-1",
				date: Date.parse("2026-11-25T03:00:00Z"),
				completion_time: Date.parse("2026-11-25T12:30:00Z"),
				status: "completed",
			}),
			101n,
		)
		expect(mocks.sync.pushRecord).toHaveBeenNthCalledWith(
			2,
			client,
			"user-1",
			"streaks",
			"created",
			expect.objectContaining({
				habit_id: "habit-1",
				current_streak: 1,
				longest_streak: 1,
			}),
			101n,
		)
	})

	it("rejects an unmet prerequisite without writing", async () => {
		mocks.repository.findCompletionGraph.mockResolvedValue({
			habits: [
				{
					...root,
					dependencies: [{ triggerHabitId: "other", type: "after_completion" }],
				},
			],
			completions: [],
			streaks: [],
		})
		await expect(
			applyCompletion(client, "user-1", action, "America/Sao_Paulo"),
		).rejects.toMatchObject({ code: "AI_HABIT_COMPLETION_INVALID" })
		expect(mocks.sync.pushRecord).not.toHaveBeenCalled()
	})

	it("completes dependent habits and records their streaks", async () => {
		mocks.repository.findCompletionGraph.mockResolvedValue({
			habits: [
				root,
				{
					...root,
					id: "habit-2",
					dependencies: [
						{ triggerHabitId: "habit-1", type: "after_completion" },
					],
				},
			],
			completions: [],
			streaks: [],
		})
		await applyCompletion(client, "user-1", action, "America/Sao_Paulo")
		expect(mocks.sync.pushRecord).toHaveBeenCalledTimes(4)
		expect(mocks.sync.pushRecord).toHaveBeenNthCalledWith(
			2,
			client,
			"user-1",
			"completion_records",
			"created",
			expect.objectContaining({ habit_id: "habit-2" }),
			101n,
		)
	})
})
