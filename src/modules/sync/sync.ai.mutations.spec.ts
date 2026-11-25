import type { Prisma } from "@prisma/client"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
	syncRepository: {
		lockSyncState: vi.fn(),
		updateSyncTimestamp: vi.fn(),
		pushRecord: vi.fn(),
	},
	client: {
		todoTask: { findFirst: vi.fn() },
		todoCategory: { findFirst: vi.fn() },
		goal: { findFirst: vi.fn() },
		habit: { findFirst: vi.fn(), findMany: vi.fn() },
		completionRecord: { findFirst: vi.fn() },
		event: { findFirst: vi.fn(), findMany: vi.fn() },
	},
}))

vi.mock("./sync.repository.js", () => ({
	syncRepository: mocks.syncRepository,
}))

let mutations: typeof import("./sync.ai.mutations.js").syncAiMutations
const client = mocks.client as unknown as Prisma.TransactionClient

beforeAll(async () => {
	process.env.DATABASE_URL ??=
		"postgresql://test:test@127.0.0.1:5432/test?schema=public"
	process.env.PROBLEM_DETAILS_BASE_URL ??= "https://ritmoapp.com"
	;({ syncAiMutations: mutations } = await import("./sync.ai.mutations.js"))
})

describe("AI goal updates", () => {
	it("recalculates goal status and records the update for synchronization", async () => {
		mocks.client.goal.findFirst.mockResolvedValue({
			id: "goal-1",
			targetValue: 10,
			currentValue: 8,
		})
		await mutations.applyGoalUpdate(client, "user-1", {
			type: "goal.update",
			entityId: "goal-1",
			changes: { targetValue: 5 },
		})
		expect(mocks.client.goal.findFirst).toHaveBeenCalledWith({
			where: { id: "goal-1", habit: { is: { userId: "user-1" } } },
			select: { id: true, currentValue: true, targetValue: true },
		})
		expect(mocks.syncRepository.pushRecord).toHaveBeenCalledWith(
			client,
			"user-1",
			"goals",
			"updated",
			{ id: "goal-1", target_value: 5, status: "completed" },
			101n,
		)
	})

	it("does not update a goal belonging to another user", async () => {
		mocks.client.goal.findFirst.mockResolvedValue(null)
		await expect(
			mutations.applyGoalUpdate(client, "user-1", {
				type: "goal.update",
				entityId: "other-user-goal",
				changes: { description: "Nova descrição" },
			}),
		).rejects.toMatchObject({ code: "AI_TARGET_UNAVAILABLE" })
		expect(mocks.syncRepository.updateSyncTimestamp).not.toHaveBeenCalled()
		expect(mocks.syncRepository.pushRecord).not.toHaveBeenCalled()
	})

	it("rejects empty or fractional goal changes", async () => {
		await expect(
			mutations.applyGoalUpdate(client, "user-1", {
				type: "goal.update",
				entityId: "goal-1",
				changes: {},
			}),
		).rejects.toThrow()
		await expect(
			mutations.applyGoalUpdate(client, "user-1", {
				type: "goal.update",
				entityId: "goal-1",
				changes: { targetValue: 2.5 },
			}),
		).rejects.toThrow()
		expect(mocks.syncRepository.lockSyncState).not.toHaveBeenCalled()
	})
})

describe("AI goal creation", () => {
	it("counts today's most recent completion in the device time zone", async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date("2026-11-25T12:00:00Z"))
		try {
			mocks.client.habit.findFirst.mockResolvedValue({ id: "habit-1" })
			mocks.client.completionRecord.findFirst.mockResolvedValue({
				status: "completed",
			})
			await mutations.applyGoalCreate(
				client,
				"user-1",
				{
					type: "goal.create",
					goal: {
						habitId: "habit-1",
						description: "Caminhar",
						targetValue: 3,
						deadlineType: "short_term",
					},
				},
				"America/Sao_Paulo",
			)
			expect(mocks.client.completionRecord.findFirst).toHaveBeenCalledWith({
				where: {
					habitId: "habit-1",
					habit: { is: { userId: "user-1" } },
					date: {
						gte: BigInt(Date.parse("2026-11-25T03:00:00Z")),
						lt: BigInt(Date.parse("2026-11-26T03:00:00Z")),
					},
				},
				orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
				select: { status: true },
			})
			expect(mocks.syncRepository.pushRecord).toHaveBeenCalledWith(
				client,
				"user-1",
				"goals",
				"created",
				expect.objectContaining({
					habit_id: "habit-1",
					current_value: 1,
					status: "in_progress",
					created_at: Date.parse("2026-11-25T03:00:00Z"),
				}),
				101n,
			)
		} finally {
			vi.useRealTimers()
		}
	})
})

beforeEach(() => {
	vi.resetAllMocks()
	mocks.syncRepository.lockSyncState.mockResolvedValue(100n)
	mocks.syncRepository.updateSyncTimestamp.mockResolvedValue(101n)
	mocks.syncRepository.pushRecord.mockResolvedValue(undefined)
	mocks.client.todoCategory.findFirst.mockResolvedValue(null)
	mocks.client.habit.findMany.mockResolvedValue([])
	mocks.client.event.findMany.mockResolvedValue([])
})

describe("AI event changes", () => {
	it("records an event creation for synchronization", async () => {
		await mutations.applyEvent(
			client,
			"user-1",
			{
				type: "event.create",
				event: { title: "Consulta", dateTime: "2026-11-25T10:00:00-03:00" },
			},
			"America/Sao_Paulo",
		)
		expect(mocks.syncRepository.pushRecord).toHaveBeenCalledWith(
			client,
			"user-1",
			"events",
			"created",
			expect.objectContaining({
				title: "Consulta",
				date_time: Date.parse("2026-11-25T13:00:00Z"),
				recurrence: "none",
				conversion_origin: "reminders",
				reminder_type: "normal",
			}),
			101n,
		)
	})

	it("rejects a conflicting event before recording changes", async () => {
		mocks.client.event.findMany.mockResolvedValue([
			{
				id: "other",
				title: "Trabalho",
				dateTime: BigInt(Date.parse("2026-11-25T13:00:00Z")),
				endTime: null,
			},
		])
		await expect(
			mutations.applyEvent(
				client,
				"user-1",
				{
					type: "event.create",
					event: { title: "Consulta", dateTime: "2026-11-25T10:30:00-03:00" },
				},
				"America/Sao_Paulo",
			),
		).rejects.toMatchObject({ code: "AI_SCHEDULE_CONFLICT" })
		expect(mocks.syncRepository.pushRecord).not.toHaveBeenCalled()
	})

	it("does not update an event owned by another user", async () => {
		mocks.client.event.findFirst.mockResolvedValue(null)
		await expect(
			mutations.applyEvent(
				client,
				"user-1",
				{ type: "event.update", entityId: "event-1", changes: { title: "x" } },
				"America/Sao_Paulo",
			),
		).rejects.toMatchObject({ code: "AI_TARGET_UNAVAILABLE" })
		expect(mocks.client.event.findFirst).toHaveBeenCalledWith({
			where: { id: "event-1", userId: "user-1" },
			select: { id: true, dateTime: true, endTime: true },
		})
		expect(mocks.syncRepository.pushRecord).not.toHaveBeenCalled()
	})
})

describe("AI task changes", () => {
	it("creates the task and its new category in the sync transaction", async () => {
		await mutations.applyTodo(client, "user-1", {
			type: "todo.create",
			task: { title: " Comprar ração ", category: " Casa " },
		})
		expect(mocks.syncRepository.lockSyncState).toHaveBeenCalledWith(
			client,
			"user-1",
		)
		expect(mocks.syncRepository.pushRecord).toHaveBeenCalledTimes(2)
		expect(mocks.syncRepository.pushRecord).toHaveBeenNthCalledWith(
			1,
			client,
			"user-1",
			"todo_categories",
			"created",
			expect.objectContaining({ name: "Casa", created_at: 101 }),
			101n,
		)
		expect(mocks.syncRepository.pushRecord).toHaveBeenNthCalledWith(
			2,
			client,
			"user-1",
			"todo_tasks",
			"created",
			expect.objectContaining({
				title: "Comprar ração",
				category: "Casa",
				is_complete: false,
				created_at: 101,
			}),
			101n,
		)
	})

	it("uses an existing category without creating a duplicate", async () => {
		mocks.client.todoCategory.findFirst.mockResolvedValue({ name: "Casa" })
		await mutations.applyTodo(client, "user-1", {
			type: "todo.create",
			task: { title: "Comprar ração", category: "casa" },
		})
		expect(mocks.syncRepository.pushRecord).toHaveBeenCalledTimes(1)
		expect(mocks.syncRepository.pushRecord).toHaveBeenCalledWith(
			client,
			"user-1",
			"todo_tasks",
			"created",
			expect.objectContaining({ category: "Casa" }),
			101n,
		)
	})

	it("verifies ownership and records task updates for synchronization", async () => {
		mocks.client.todoTask.findFirst.mockResolvedValue({ id: "task-1" })
		await mutations.applyTodo(client, "user-1", {
			type: "todo.update",
			entityId: "task-1",
			changes: { isComplete: true },
		})
		expect(mocks.client.todoTask.findFirst).toHaveBeenCalledWith({
			where: { id: "task-1", userId: "user-1" },
			select: { id: true },
		})
		expect(mocks.syncRepository.pushRecord).toHaveBeenCalledWith(
			client,
			"user-1",
			"todo_tasks",
			"updated",
			{ id: "task-1", is_complete: true },
			101n,
		)
	})

	it("does not write when an update target is unavailable", async () => {
		mocks.client.todoTask.findFirst.mockResolvedValue(null)
		await expect(
			mutations.applyTodo(client, "user-1", {
				type: "todo.update",
				entityId: "other-user-task",
				changes: { title: "Alterada" },
			}),
		).rejects.toMatchObject({ code: "AI_TARGET_UNAVAILABLE" })
		expect(mocks.syncRepository.updateSyncTimestamp).not.toHaveBeenCalled()
		expect(mocks.syncRepository.pushRecord).not.toHaveBeenCalled()
	})

	it("rejects empty updates before touching the database", async () => {
		await expect(
			mutations.applyTodo(client, "user-1", {
				type: "todo.update",
				entityId: "task-1",
				changes: {},
			}),
		).rejects.toThrow()
		expect(mocks.syncRepository.lockSyncState).not.toHaveBeenCalled()
	})
})
