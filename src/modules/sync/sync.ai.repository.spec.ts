import { beforeEach, describe, expect, it, vi } from "vitest"

const prisma = vi.hoisted(() => ({
	habit: { findMany: vi.fn() },
	todoTask: { findMany: vi.fn() },
	event: { findMany: vi.fn() },
	goal: { findMany: vi.fn() },
	completionRecord: { groupBy: vi.fn() },
}))

vi.mock("../shared/database.js", () => ({ prisma }))

import { syncAiRepository } from "./sync.ai.repository.js"

describe("sync AI repository", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("filters user-owned lists and limits their size", async () => {
		await syncAiRepository.listHabits("user-1")
		await syncAiRepository.listTasks("user-1")
		await syncAiRepository.listEvents("user-1")
		expect(prisma.habit.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ userId: "user-1" }),
				take: 51,
			}),
		)
		expect(prisma.todoTask.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { userId: "user-1" }, take: 51 }),
		)
		expect(prisma.event.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { userId: "user-1" }, take: 51 }),
		)
	})

	it("filters goals and completion records through the owning habit", async () => {
		await syncAiRepository.listGoals("user-1")
		await syncAiRepository.countCompletions("user-1", 100, 200, "habit-2")
		expect(prisma.goal.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { habit: { is: { userId: "user-1" } } },
			}),
		)
		expect(prisma.completionRecord.groupBy).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					habit: { is: { userId: "user-1" } },
					habitId: "habit-2",
					date: { gte: 100n, lt: 200n },
				},
			}),
		)
	})

	it("applies a cursor without removing the owner filter", async () => {
		await syncAiRepository.listEvents("user-1", "event-10")
		expect(prisma.event.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { userId: "user-1", id: { gt: "event-10" } },
				orderBy: { id: "asc" },
			}),
		)
	})
})
