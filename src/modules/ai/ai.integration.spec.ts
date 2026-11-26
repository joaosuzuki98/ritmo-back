import { randomUUID } from "node:crypto"
import { Temporal } from "@js-temporal/polyfill"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

const { runAgent } = vi.hoisted(() => ({ runAgent: vi.fn() }))
vi.mock("./ai.agent.js", () => ({ runAgent }))

const databaseUrl = process.env.AI_INTEGRATION_DATABASE_URL
let prisma: typeof import("../shared/database.js").prisma
let proposals: typeof import("./ai.proposals.service.js").aiProposalsService
let sync: typeof import("../sync/sync.service.js").syncService
let app: typeof import("../../app.js").app
let createAccessToken: typeof import("../auth/auth.tokens.js").createAccessToken
let getAiHabitSummary: typeof import("../sync/index.js").getAiHabitSummary
let getAiHabitStreaks: typeof import("../sync/index.js").getAiHabitStreaks
let getAiGoalInsights: typeof import("../sync/index.js").getAiGoalInsights
const userId = randomUUID()
const timeZone = "America/Sao_Paulo"

describe.skipIf(!databaseUrl)("AI proposal PostgreSQL integration", () => {
	beforeAll(async () => {
		process.env.DATABASE_URL = databaseUrl
		process.env.PROBLEM_DETAILS_BASE_URL = "https://ritmoapp.com"
		;[
			{ prisma },
			{ aiProposalsService: proposals },
			{ syncService: sync },
			{ app },
			{ createAccessToken },
			{ getAiHabitSummary, getAiHabitStreaks, getAiGoalInsights },
		] = await Promise.all([
			import("../shared/database.js"),
			import("./ai.proposals.service.js"),
			import("../sync/sync.service.js"),
			import("../../app.js"),
			import("../auth/auth.tokens.js"),
			import("../sync/index.js"),
		])
		await prisma.user.create({
			data: {
				id: userId,
				name: "AI integration",
				email: `${userId}@example.test`,
			},
		})
	})

	afterAll(async () => {
		await prisma.$disconnect()
	})

	it("applies actions once, reports them through sync, and rolls back conflicts", async () => {
		const snapshot = await sync.pullChanges(userId, null)
		const task = await proposals.save(
			userId,
			{
				type: "todo.create",
				task: { title: "Comprar ração", category: "Casa" },
			},
			timeZone,
		)
		await expect(
			proposals.decide("other-user", task.id, "accepted"),
		).rejects.toMatchObject({ code: "AI_PROPOSAL_NOT_FOUND" })
		await Promise.all([
			proposals.decide(userId, task.id, "accepted"),
			proposals.decide(userId, task.id, "accepted"),
		])
		expect(await prisma.todoTask.count({ where: { userId } })).toBe(1)
		const changes = await sync.pullChanges(userId, snapshot.timestamp)
		expect(changes.changes.todo_tasks?.created).toHaveLength(1)
		expect(changes.changes.todo_categories?.created).toHaveLength(1)
		const rejected = await proposals.save(
			userId,
			{ type: "todo.create", task: { title: "Não criar" } },
			timeZone,
		)
		await proposals.decide(userId, rejected.id, "rejected")
		expect(
			await prisma.todoTask.count({ where: { userId, title: "Não criar" } }),
		).toBe(0)
		await expect(
			proposals.decide(userId, rejected.id, "accepted"),
		).rejects.toMatchObject({
			code: "AI_PROPOSAL_CONFLICT",
		})

		const habitProposal = await proposals.save(
			userId,
			{
				type: "habit.create",
				habit: { name: "Caminhada", frequencyType: "daily" },
			},
			timeZone,
		)
		await proposals.decide(userId, habitProposal.id, "accepted")
		const habit = await prisma.habit.findFirstOrThrow({
			where: { userId, name: "Caminhada" },
		})
		const completion = await proposals.save(
			userId,
			{
				type: "habit.completion.create",
				habitId: habit.id,
				date: Temporal.Now.zonedDateTimeISO(timeZone).toPlainDate().toString(),
				completionTime: "09:00",
			},
			timeZone,
		)
		await proposals.decide(userId, completion.id, "accepted")
		expect(
			await prisma.completionRecord.count({ where: { habitId: habit.id } }),
		).toBe(1)
		expect(
			await prisma.streak.findFirst({ where: { habitId: habit.id } }),
		).toMatchObject({
			currentStreak: 1,
			longestStreak: 1,
		})
		const summary = await getAiHabitSummary(userId, timeZone, {
			period: "this_week",
			startDate: null,
			endDate: null,
		})
		expect(summary.totals).toEqual({
			planned: 1,
			completed: 1,
			completionRate: 1,
		})
		const goalCreate = await proposals.save(
			userId,
			{
				type: "goal.create",
				goal: {
					habitId: habit.id,
					description: "Três caminhadas",
					targetValue: 3,
					deadlineType: "short_term",
				},
			},
			timeZone,
		)
		await proposals.decide(userId, goalCreate.id, "accepted")
		const goal = await prisma.goal.findFirstOrThrow({
			where: { habitId: habit.id },
		})
		expect(goal).toMatchObject({ currentValue: 1, status: "in_progress" })
		const goalUpdate = await proposals.save(
			userId,
			{ type: "goal.update", entityId: goal.id, changes: { targetValue: 1 } },
			timeZone,
		)
		await proposals.decide(userId, goalUpdate.id, "accepted")
		expect(
			await prisma.goal.findUnique({ where: { id: goal.id } }),
		).toMatchObject({
			targetValue: 1,
			status: "completed",
		})
		const goalInsights = await getAiGoalInsights(userId, timeZone)
		expect(goalInsights.goals).toContainEqual(
			expect.objectContaining({
				goalId: goal.id,
				currentValue: 1,
				remainingValue: 0,
			}),
		)
		const streaks = await getAiHabitStreaks(userId, timeZone)
		expect(streaks.habits).toContainEqual(
			expect.objectContaining({ habitId: habit.id, currentStreak: 1 }),
		)

		const event = await proposals.save(
			userId,
			{
				type: "event.create",
				event: { title: "Consulta", dateTime: "2028-01-04T10:00:00-03:00" },
			},
			timeZone,
		)
		await proposals.decide(userId, event.id, "accepted")
		const habitUpdate = await proposals.save(
			userId,
			{
				type: "habit.update",
				entityId: habit.id,
				changes: { preferredTime: "09:00" },
			},
			timeZone,
		)
		await proposals.decide(userId, habitUpdate.id, "accepted")
		const conflictingHabitEvent = await proposals.save(
			userId,
			{
				type: "event.create",
				event: {
					title: "Conflito com hábito",
					dateTime: "2028-01-04T09:30:00-03:00",
				},
			},
			timeZone,
		)
		await expect(
			proposals.decide(userId, conflictingHabitEvent.id, "accepted"),
		).rejects.toMatchObject({ code: "AI_SCHEDULE_CONFLICT" })
		const conflict = await proposals.save(
			userId,
			{
				type: "event.create",
				event: { title: "Conflito", dateTime: "2028-01-04T10:30:00-03:00" },
			},
			timeZone,
		)
		await expect(
			proposals.decide(userId, conflict.id, "accepted"),
		).rejects.toMatchObject({
			code: "AI_SCHEDULE_CONFLICT",
		})
		expect(
			await prisma.aiProposal.findUnique({ where: { id: conflict.id } }),
		).toMatchObject({
			status: "pending",
		})
		expect(await prisma.event.count({ where: { userId } })).toBe(1)
	}, 30_000)

	it("streams a persisted proposal and applies a confirmed decision over HTTP", async () => {
		const sessionId = randomUUID()
		await prisma.authSession.create({
			data: {
				id: sessionId,
				userId,
				refreshTokenHash: randomUUID(),
				idleExpiresAt: new Date(Date.now() + 60_000),
			},
		})
		const { token } = await createAccessToken({ userId, sessionId })
		runAgent.mockResolvedValue({
			reply: "Posso criar a tarefa.",
			proposal: { type: "todo.create", task: { title: "Tarefa SSE" } },
		})
		const stream = await request(app)
			.post("/api/v1/ai/chat/stream")
			.set("Authorization", `Bearer ${token}`)
			.send({ message: "Crie uma tarefa", timeZone })
		expect(stream.status).toBe(200)
		const match = /event: result\ndata: ([^\n]+)/.exec(stream.text)
		expect(match?.[1]).toBeDefined()
		const result: unknown = JSON.parse(match?.[1] ?? "")
		expect(result).toMatchObject({
			proposalId: expect.any(String),
			proposal: { type: "todo.create" },
		})
		if (!result || typeof result !== "object" || !("proposalId" in result))
			throw new Error("Missing proposal identifier")
		const response = await request(app)
			.post(`/api/v1/ai/proposals/${String(result.proposalId)}/decision`)
			.set("Authorization", `Bearer ${token}`)
			.send({ decision: "accepted" })
		expect(response.status).toBe(200)
		expect(response.body).toEqual({ status: "accepted" })
		expect(
			await prisma.todoTask.count({ where: { userId, title: "Tarefa SSE" } }),
		).toBe(1)
	}, 30_000)
})
