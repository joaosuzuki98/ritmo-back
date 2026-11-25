import { beforeEach, describe, expect, it, vi } from "vitest"

const repository = vi.hoisted(() => ({
	listHabits: vi.fn(),
	listTasks: vi.fn(),
	listEvents: vi.fn(),
	listGoals: vi.fn(),
	countCompletions: vi.fn(),
}))

vi.mock("./sync.ai.repository.js", () => ({ syncAiRepository: repository }))

import { syncAiService } from "./sync.ai.service.js"

describe("sync AI service", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("returns a cursor when there are more records", async () => {
		repository.listTasks.mockResolvedValue(
			Array.from({ length: 51 }, (_, index) => ({ id: `task-${index}` })),
		)
		const result = await syncAiService.listTasks("user-1", "previous")
		expect(result.items).toHaveLength(50)
		expect(result.nextCursor).toBe("task-49")
		expect(repository.listTasks).toHaveBeenCalledWith("user-1", "previous")
	})

	it("serializes event timestamps before returning them to a tool", async () => {
		repository.listEvents.mockResolvedValue([
			{ id: "event-1", dateTime: 0n, endTime: null, title: "Evento" },
		])
		await expect(syncAiService.listEvents("user-1")).resolves.toEqual({
			items: [
				{
					id: "event-1",
					dateTime: "1970-01-01T00:00:00.000Z",
					endTime: null,
					title: "Evento",
				},
			],
			nextCursor: null,
		})
	})
})
