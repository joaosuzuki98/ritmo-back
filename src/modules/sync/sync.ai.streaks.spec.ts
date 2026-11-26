import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest"

const { findCompletionGraphSnapshot } = vi.hoisted(() => ({
	findCompletionGraphSnapshot: vi.fn(),
}))
vi.mock("./sync.ai.repository.js", () => ({
	syncAiRepository: { findCompletionGraphSnapshot },
}))
vi.mock("./sync.repository.js", () => ({ syncRepository: {} }))

let getHabitStreaks: typeof import("./sync.ai.streaks.js").getHabitStreaks

beforeAll(async () => {
	process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test"
	process.env.PROBLEM_DETAILS_BASE_URL ??= "https://ritmoapp.com"
	;({ getHabitStreaks } = await import("./sync.ai.streaks.js"))
})
beforeEach(() => {
	vi.resetAllMocks()
	vi.useFakeTimers()
	vi.setSystemTime(new Date("2026-11-25T12:00:00Z"))
})
afterEach(() => vi.useRealTimers())

describe("server habit streaks", () => {
	it("deduplicates daily records and uses local dates", async () => {
		findCompletionGraphSnapshot.mockResolvedValue({
			habits: [
				{
					id: "habit-1",
					status: "pending",
					frequencyType: "daily",
					weekDays: "[1,2,3,4,5,6,7]",
					seasonalStart: null,
					seasonalEnd: null,
					dependencies: [],
					conditions: [],
				},
			],
			completions: [
				{
					id: "one",
					habitId: "habit-1",
					date: BigInt(Date.parse("2026-11-24T03:00:00Z")),
					status: "completed",
					updatedAt: 1n,
				},
				{
					id: "two",
					habitId: "habit-1",
					date: BigInt(Date.parse("2026-11-25T03:00:00Z")),
					status: "skipped",
					updatedAt: 1n,
				},
				{
					id: "three",
					habitId: "habit-1",
					date: BigInt(Date.parse("2026-11-25T03:00:00Z")),
					status: "completed",
					updatedAt: 2n,
				},
			],
			streaks: [],
		})
		const result = await getHabitStreaks("user-1", "America/Sao_Paulo")
		expect(result.habits).toEqual([
			{
				habitId: "habit-1",
				currentStreak: 2,
				longestStreak: 2,
				nextStreakMilestone: 7,
			},
		])
		expect(findCompletionGraphSnapshot).toHaveBeenCalledWith("user-1")
	})
})
