import type { Prisma } from "@prisma/client"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
	repository: {
		findHabitForUpdate: vi.fn(),
		findHabitCategory: vi.fn(),
		findSchedule: vi.fn(),
	},
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
let applyHabit: typeof import("./sync.ai.habit.js").applyHabit
const client = {} as Prisma.TransactionClient

beforeAll(async () => {
	process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test"
	process.env.PROBLEM_DETAILS_BASE_URL ??= "https://ritmoapp.com"
	;({ applyHabit } = await import("./sync.ai.habit.js"))
})

beforeEach(() => {
	vi.resetAllMocks()
	mocks.sync.lockSyncState.mockResolvedValue(100n)
	mocks.sync.updateSyncTimestamp.mockResolvedValue(101n)
	mocks.repository.findSchedule.mockResolvedValue({ events: [], habits: [] })
	mocks.repository.findHabitCategory.mockResolvedValue(null)
})

describe("AI habit changes", () => {
	it("creates a habit and its category through tracked sync writes", async () => {
		await applyHabit(
			client,
			"user-1",
			{
				type: "habit.create",
				habit: {
					name: " Caminhada ",
					frequencyType: "daily",
					categoryName: "Saúde",
				},
			},
			"America/Sao_Paulo",
		)
		expect(mocks.sync.pushRecord).toHaveBeenCalledTimes(2)
		expect(mocks.sync.pushRecord).toHaveBeenLastCalledWith(
			client,
			"user-1",
			"habits",
			"created",
			expect.objectContaining({
				name: "Caminhada",
				frequency_type: "daily",
				week_days: "[1,2,3,4,5,6,7]",
				priority: "medium",
				status: "pending",
			}),
			101n,
		)
	})

	it("rejects a weekly habit with no days instead of inventing them", async () => {
		await expect(
			applyHabit(
				client,
				"user-1",
				{
					type: "habit.create",
					habit: { name: "Caminhada", frequencyType: "weekly" },
				},
				"America/Sao_Paulo",
			),
		).rejects.toMatchObject({ code: "AI_HABIT_DAYS_REQUIRED" })
		expect(mocks.sync.pushRecord).not.toHaveBeenCalled()
	})

	it("rejects updates to a missing or foreign habit", async () => {
		mocks.repository.findHabitForUpdate.mockResolvedValue(null)
		await expect(
			applyHabit(
				client,
				"user-1",
				{
					type: "habit.update",
					entityId: "foreign",
					changes: { name: "Outro" },
				},
				"America/Sao_Paulo",
			),
		).rejects.toMatchObject({ code: "AI_TARGET_UNAVAILABLE" })
		expect(mocks.repository.findHabitForUpdate).toHaveBeenCalledWith(
			client,
			"user-1",
			"foreign",
		)
		expect(mocks.sync.pushRecord).not.toHaveBeenCalled()
	})
})
