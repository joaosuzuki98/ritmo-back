import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest"

const { findGoalAnalyticsData } = vi.hoisted(() => ({
	findGoalAnalyticsData: vi.fn(),
}))
vi.mock("./sync.ai.repository.js", () => ({
	syncAiRepository: { findGoalAnalyticsData },
}))
let getGoalInsights: typeof import("./sync.ai.goals.js").getGoalInsights

beforeAll(async () => {
	process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test"
	process.env.PROBLEM_DETAILS_BASE_URL ??= "https://ritmoapp.com"
	;({ getGoalInsights } = await import("./sync.ai.goals.js"))
})
beforeEach(() => {
	vi.resetAllMocks()
	vi.useFakeTimers()
	vi.setSystemTime(new Date("2026-11-25T12:00:00Z"))
})
afterEach(() => vi.useRealTimers())

describe("server goal insights", () => {
	it("counts the latest completion per day and calculates pace and projection", async () => {
		findGoalAnalyticsData.mockResolvedValue({
			goals: [
				{
					id: "goal-1",
					habitId: "habit-1",
					habit: { name: "Caminhada" },
					description: "Quatro caminhadas",
					targetValue: 4,
					deadlineType: "short_term",
					status: "in_progress",
					createdAt: BigInt(Date.parse("2026-11-19T03:00:00Z")),
				},
			],
			completions: [
				{
					habitId: "habit-1",
					date: BigInt(Date.parse("2026-11-24T03:00:00Z")),
					status: "skipped",
					updatedAt: 1n,
				},
				{
					habitId: "habit-1",
					date: BigInt(Date.parse("2026-11-24T03:00:00Z")),
					status: "completed",
					updatedAt: 2n,
				},
				{
					habitId: "habit-1",
					date: BigInt(Date.parse("2026-11-25T03:00:00Z")),
					status: "completed",
					updatedAt: 1n,
				},
			],
		})
		const result = await getGoalInsights("user-1", "America/Sao_Paulo")
		expect(findGoalAnalyticsData).toHaveBeenCalledWith("user-1")
		expect(result.goals[0]).toMatchObject({
			goalId: "goal-1",
			currentValue: 2,
			remainingValue: 2,
			recentPacePerWeek: 2,
			projectedCompletionDate: "2026-12-02",
		})
	})
})
