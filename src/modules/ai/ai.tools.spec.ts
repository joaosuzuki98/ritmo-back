import { beforeEach, describe, expect, it, vi } from "vitest"

const service = vi.hoisted(() => ({
	listHabits: vi.fn(),
	listTasks: vi.fn(),
	listEvents: vi.fn(),
	listGoals: vi.fn(),
	countCompletions: vi.fn(),
	getHabitSummary: vi.fn(),
	getHabitStreaks: vi.fn(),
	getGoalInsights: vi.fn(),
}))

vi.mock("../sync/index.js", () => ({
	syncAiService: service,
	getAiHabitSummary: service.getHabitSummary,
	getAiHabitStreaks: service.getHabitStreaks,
	getAiGoalInsights: service.getGoalInsights,
}))

import { executeAiTool, responseAiTools } from "./ai.tools.js"

describe("executeAiTool", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("defines each tool in strict Responses format", () => {
		expect(responseAiTools.map((tool) => tool.name)).toEqual([
			"get_goal_insights",
			"get_habit_streaks",
			"get_habit_summary",
			"list_habits",
			"list_tasks",
			"list_events",
			"list_goals",
			"count_completion_records",
		])
		for (const tool of responseAiTools) {
			expect(tool).toMatchObject({
				type: "function",
				strict: true,
				parameters: { type: "object", additionalProperties: false },
			})
		}
	})

	it("preserves the cursor, summary and completion-count argument contracts", () => {
		expect(
			responseAiTools.find((tool) => tool.name === "list_habits"),
		).toMatchObject({
			parameters: {
				required: ["cursor"],
				properties: { cursor: { type: ["string", "null"] } },
			},
		})
		expect(
			responseAiTools.find((tool) => tool.name === "get_habit_summary"),
		).toMatchObject({
			parameters: {
				required: ["period", "startDate", "endDate"],
				properties: {
					period: {
						enum: [
							"this_week",
							"last_week",
							"last_7_days",
							"last_28_days",
							"this_month",
							"last_month",
							"custom",
						],
					},
				},
			},
		})
		expect(
			responseAiTools.find((tool) => tool.name === "count_completion_records"),
		).toMatchObject({
			parameters: {
				required: ["start", "end", "habitId"],
				properties: { habitId: { type: ["string", "null"] } },
			},
		})
	})

	it.each([
		["list_habits", "listHabits"],
		["list_tasks", "listTasks"],
		["list_events", "listEvents"],
		["list_goals", "listGoals"],
	] as const)("limits %s to the authenticated user", async (name, method) => {
		service[method].mockResolvedValue({ items: [], nextCursor: null })

		await expect(
			executeAiTool("user-1", name, { cursor: null }),
		).resolves.toEqual({
			items: [],
			nextCursor: null,
		})
		expect(service[method]).toHaveBeenCalledWith("user-1", undefined)
	})

	it("does not accept an identity supplied in tool arguments", async () => {
		await expect(
			executeAiTool("user-1", "list_habits", {
				cursor: null,
				userId: "user-2",
			}),
		).rejects.toThrow()
		expect(service.listHabits).not.toHaveBeenCalled()
	})

	it("validates the time range and keeps the authenticated identity", async () => {
		service.countCompletions.mockResolvedValue({ counts: [] })
		await executeAiTool("user-1", "count_completion_records", {
			start: 100,
			end: 200,
			habitId: "habit-1",
		})
		expect(service.countCompletions).toHaveBeenCalledWith(
			"user-1",
			100,
			200,
			"habit-1",
		)
		await expect(
			executeAiTool("user-1", "count_completion_records", {
				start: 200,
				end: 100,
				habitId: null,
			}),
		).rejects.toThrow()
	})

	it("rejects unknown tools", async () => {
		await expect(executeAiTool("user-1", "delete_habit", {})).rejects.toThrow()
	})

	it("uses the authenticated identity and device time zone for statistics", async () => {
		const input = { period: "this_week", startDate: null, endDate: null }
		service.getHabitSummary.mockResolvedValue({ totals: { planned: 5 } })
		await executeAiTool(
			"user-1",
			"get_habit_summary",
			input,
			"America/Sao_Paulo",
		)
		expect(service.getHabitSummary).toHaveBeenCalledWith(
			"user-1",
			"America/Sao_Paulo",
			input,
		)
	})
})
