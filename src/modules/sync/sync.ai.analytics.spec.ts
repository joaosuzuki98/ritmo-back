import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest"

const { findAnalyticsData } = vi.hoisted(() => ({ findAnalyticsData: vi.fn() }))
vi.mock("./sync.ai.repository.js", () => ({
	syncAiRepository: { findAnalyticsData },
}))
let getHabitSummary: typeof import("./sync.ai.analytics.js").getHabitSummary

beforeAll(async () => {
	process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test"
	process.env.PROBLEM_DETAILS_BASE_URL ??= "https://ritmoapp.com"
	;({ getHabitSummary } = await import("./sync.ai.analytics.js"))
})

beforeEach(() => {
	vi.resetAllMocks()
	vi.useFakeTimers()
	vi.setSystemTime(new Date("2026-11-25T12:00:00Z"))
})
afterEach(() => vi.useRealTimers())

const habit = {
	id: "habit-1",
	name: "Caminhada",
	frequencyType: "daily",
	weekDays: "[1,2,3,4,5,6,7]",
	createdAt: BigInt(Date.parse("2026-11-19T03:00:00Z")),
	seasonalStart: null,
	seasonalEnd: null,
	preferredTime: BigInt(Date.parse("2026-11-25T12:00:00Z")),
	estimatedDurationMinutes: 30,
	category: { name: "Saúde" },
}

describe("server habit analytics", () => {
	it("calculates rates from scheduled dates and the latest record per habit and day", async () => {
		findAnalyticsData.mockResolvedValue({
			habits: [
				habit,
				{
					...habit,
					id: "habit-2",
					name: "Ler",
					frequencyType: "weekly",
					weekDays: "[3]",
				},
			],
			completions: [
				{
					habitId: "habit-1",
					date: BigInt(Date.parse("2026-11-24T03:00:00Z")),
					status: "completed",
					updatedAt: 1n,
					incompletionReason: null,
				},
				{
					habitId: "habit-1",
					date: BigInt(Date.parse("2026-11-25T03:00:00Z")),
					status: "completed",
					updatedAt: 1n,
					incompletionReason: null,
				},
				{
					habitId: "habit-1",
					date: BigInt(Date.parse("2026-11-25T03:00:00Z")),
					status: "skipped",
					updatedAt: 2n,
					incompletionReason: { description: "Cansaço" },
				},
				{
					habitId: "habit-2",
					date: BigInt(Date.parse("2026-11-25T03:00:00Z")),
					status: "completed",
					updatedAt: 1n,
					incompletionReason: null,
				},
			],
		})
		const result = await getHabitSummary("user-1", "America/Sao_Paulo", {
			period: "last_7_days",
			startDate: null,
			endDate: null,
		})
		expect(result.period).toEqual({
			startDate: "2026-11-19",
			endDate: "2026-11-25",
			timeZone: "America/Sao_Paulo",
		})
		expect(result.totals).toEqual({
			planned: 8,
			completed: 2,
			completionRate: 0.25,
		})
		expect(result.incompletionReasons).toEqual([
			{ reason: "Cansaço", count: 1 },
		])
		expect(result.estimatedPlannedMinutes).toBe(240)
		expect(result.timeOfDay.find((item) => item.label === "morning")).toEqual({
			label: "morning",
			planned: 8,
			completed: 2,
			completionRate: 0.25,
		})
		expect(result.categories[0]).toMatchObject({
			name: "Saúde",
			habitCount: 2,
			planned: 8,
		})
		expect(findAnalyticsData).toHaveBeenCalledWith(
			"user-1",
			BigInt(Date.parse("2026-11-19T03:00:00Z")),
			BigInt(Date.parse("2026-11-26T03:00:00Z")),
		)
	})

	it("uses daylight-saving boundaries rather than fixed 24-hour days", async () => {
		vi.setSystemTime(new Date("2026-03-08T16:00:00Z"))
		findAnalyticsData.mockResolvedValue({ habits: [], completions: [] })
		await getHabitSummary("user-1", "America/New_York", {
			period: "last_7_days",
			startDate: null,
			endDate: null,
		})
		expect(findAnalyticsData).toHaveBeenCalledWith(
			"user-1",
			BigInt(Date.parse("2026-03-02T05:00:00Z")),
			BigInt(Date.parse("2026-03-09T04:00:00Z")),
		)
	})

	it("calculates associations only with enough paired observations", async () => {
		const completions = Array.from({ length: 7 }, (_, index) =>
			["habit-1", "habit-2"].map((habitId) => ({
				habitId,
				date: BigInt(Date.parse(`2026-11-${19 + index}T03:00:00Z`)),
				status: index % 2 === 0 ? "completed" : "skipped",
				updatedAt: 1n,
				incompletionReason: null,
			})),
		).flat()
		findAnalyticsData.mockResolvedValue({
			habits: [habit, { ...habit, id: "habit-2", name: "Ler" }],
			completions,
		})
		const result = await getHabitSummary("user-1", "America/Sao_Paulo", {
			period: "last_7_days",
			startDate: null,
			endDate: null,
		})
		expect(result.correlations).toEqual([
			expect.objectContaining({
				habitA: "Caminhada",
				habitB: "Ler",
				sampleSize: 7,
			}),
		])
		expect(result.correlations?.[0]?.coefficient).toBeCloseTo(1)
		expect(result.correlationNote).toContain("não implica causalidade")
	})

	it("rejects excessive periods before querying data", async () => {
		await expect(
			getHabitSummary("user-1", "UTC", {
				period: "custom",
				startDate: "2020-01-01",
				endDate: "2026-01-01",
			}),
		).rejects.toMatchObject({ code: "AI_STATISTICS_PERIOD_INVALID" })
		expect(findAnalyticsData).not.toHaveBeenCalled()
	})
})
