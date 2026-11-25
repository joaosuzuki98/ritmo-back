import { Prisma } from "@prisma/client"

import { prisma } from "../shared/database.js"

const LIST_LIMIT = 50

const listHabits = async (userId: string, cursor?: string) =>
	prisma.habit.findMany({
		where: {
			userId,
			status: { notIn: ["deleted", "paused"] },
			...(cursor ? { id: { gt: cursor } } : {}),
		},
		select: {
			id: true,
			name: true,
			description: true,
			frequencyType: true,
			weekDays: true,
			priority: true,
			status: true,
		},
		orderBy: { id: "asc" },
		take: LIST_LIMIT + 1,
	})

const listTasks = async (userId: string, cursor?: string) =>
	prisma.todoTask.findMany({
		where: { userId, ...(cursor ? { id: { gt: cursor } } : {}) },
		select: { id: true, title: true, category: true, isComplete: true },
		orderBy: { id: "asc" },
		take: LIST_LIMIT + 1,
	})

const listEvents = async (userId: string, cursor?: string) =>
	prisma.event.findMany({
		where: { userId, ...(cursor ? { id: { gt: cursor } } : {}) },
		select: { id: true, title: true, dateTime: true, endTime: true },
		orderBy: { id: "asc" },
		take: LIST_LIMIT + 1,
	})

const listGoals = async (userId: string, cursor?: string) =>
	prisma.goal.findMany({
		where: {
			habit: { is: { userId } },
			...(cursor ? { id: { gt: cursor } } : {}),
		},
		select: {
			id: true,
			habitId: true,
			description: true,
			targetValue: true,
			currentValue: true,
			deadlineType: true,
			status: true,
		},
		orderBy: { id: "asc" },
		take: LIST_LIMIT + 1,
	})

const countCompletions = async (
	userId: string,
	start: number,
	end: number,
	habitId?: string,
) =>
	prisma.completionRecord.groupBy({
		by: ["status"],
		where: {
			habit: { is: { userId } },
			...(habitId ? { habitId } : {}),
			date: { gte: BigInt(start), lt: BigInt(end) },
		},
		_count: { _all: true },
	})

const findTodo = async (
	client: Prisma.TransactionClient,
	userId: string,
	id: string,
) =>
	client.todoTask.findFirst({
		where: { id, userId },
		select: { id: true },
	})

const findTodoCategory = async (
	client: Prisma.TransactionClient,
	userId: string,
	name: string,
) =>
	client.todoCategory.findFirst({
		where: { userId, name: { equals: name, mode: "insensitive" } },
		select: { name: true },
	})

const findFirstTodoCategory = async (
	client: Prisma.TransactionClient,
	userId: string,
) =>
	client.todoCategory.findFirst({
		where: { userId },
		orderBy: { id: "asc" },
		select: { name: true },
	})

const findGoalForUpdate = async (
	client: Prisma.TransactionClient,
	userId: string,
	id: string,
) =>
	client.goal.findFirst({
		where: { id, habit: { is: { userId } } },
		select: { id: true, currentValue: true, targetValue: true },
	})

const findEventForUpdate = async (
	client: Prisma.TransactionClient,
	userId: string,
	id: string,
) =>
	client.event.findFirst({
		where: { id, userId },
		select: { id: true, dateTime: true, endTime: true },
	})

const findOwnedHabit = async (
	client: Prisma.TransactionClient,
	userId: string,
	id: string,
) =>
	client.habit.findFirst({
		where: { id, userId },
		select: { id: true },
	})

const findHabitForUpdate = async (
	client: Prisma.TransactionClient,
	userId: string,
	id: string,
) =>
	client.habit.findFirst({
		where: { id, userId },
		select: {
			id: true,
			frequencyType: true,
			weekDays: true,
			preferredTime: true,
			estimatedDurationMinutes: true,
		},
	})

const findHabitCategory = async (
	client: Prisma.TransactionClient,
	userId: string,
	name: string,
) =>
	client.category.findFirst({
		where: { userId, name: { equals: name, mode: "insensitive" } },
		select: { id: true },
	})

const findLatestHabitCompletion = async (
	client: Prisma.TransactionClient,
	userId: string,
	habitId: string,
	start: bigint,
	end: bigint,
) =>
	client.completionRecord.findFirst({
		where: {
			habitId,
			habit: { is: { userId } },
			date: { gte: start, lt: end },
		},
		orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
		select: { status: true },
	})

const findCompletionGraph = async (
	client: Prisma.TransactionClient,
	userId: string,
) => {
	const [habits, completions, streaks] = await Promise.all([
		client.habit.findMany({
			where: { userId },
			take: 501,
			select: {
				id: true,
				status: true,
				frequencyType: true,
				weekDays: true,
				seasonalStart: true,
				seasonalEnd: true,
				dependencies: {
					select: { triggerHabitId: true, type: true },
				},
				conditions: {
					select: {
						conditionHabitId: true,
						conditionType: true,
						conditionRule: true,
					},
				},
			},
		}),
		client.completionRecord.findMany({
			where: { habit: { is: { userId } } },
			take: 50_001,
			orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
			select: {
				id: true,
				habitId: true,
				date: true,
				status: true,
				updatedAt: true,
			},
		}),
		client.streak.findMany({
			where: { habit: { is: { userId } } },
			take: 501,
			select: { id: true, habitId: true },
		}),
	])
	return { habits, completions, streaks }
}

const findCompletionGraphSnapshot = async (userId: string) =>
	prisma.$transaction((client) => findCompletionGraph(client, userId), {
		isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
	})

const findAnalyticsData = async (userId: string, start: bigint, end: bigint) =>
	prisma.$transaction(
		async (client) => {
			const [habits, completions] = await Promise.all([
				client.habit.findMany({
					where: { userId, status: { notIn: ["paused", "deleted"] } },
					select: {
						id: true,
						name: true,
						frequencyType: true,
						weekDays: true,
						createdAt: true,
						seasonalStart: true,
						seasonalEnd: true,
						preferredTime: true,
						estimatedDurationMinutes: true,
						category: { select: { name: true } },
					},
					take: 501,
				}),
				client.completionRecord.findMany({
					where: {
						habit: { is: { userId, status: { notIn: ["paused", "deleted"] } } },
						date: { gte: start, lt: end },
					},
					select: {
						habitId: true,
						date: true,
						status: true,
						updatedAt: true,
						incompletionReason: { select: { description: true } },
					},
					take: 50_001,
					orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
				}),
			])
			return { habits, completions }
		},
		{ isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
	)

const findGoalAnalyticsData = async (userId: string) =>
	prisma.$transaction(
		async (client) => {
			const [goals, completions] = await Promise.all([
				client.goal.findMany({
					where: {
						habit: { is: { userId, status: { notIn: ["paused", "deleted"] } } },
					},
					select: {
						id: true,
						habitId: true,
						description: true,
						targetValue: true,
						deadlineType: true,
						status: true,
						createdAt: true,
						habit: { select: { name: true } },
					},
					take: 101,
				}),
				client.completionRecord.findMany({
					where: { habit: { is: { userId } } },
					select: { habitId: true, date: true, status: true, updatedAt: true },
					take: 50_001,
					orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
				}),
			])
			return { goals, completions }
		},
		{ isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
	)

const findSchedule = async (
	client: Prisma.TransactionClient,
	userId: string,
) => {
	const [habits, events] = await Promise.all([
		client.habit.findMany({
			where: { userId },
			select: {
				id: true,
				name: true,
				status: true,
				weekDays: true,
				preferredTime: true,
				estimatedDurationMinutes: true,
			},
		}),
		client.event.findMany({
			where: { userId },
			select: { id: true, title: true, dateTime: true, endTime: true },
		}),
	])
	return { habits, events }
}

export const syncAiRepository = {
	listHabits,
	listTasks,
	listEvents,
	listGoals,
	countCompletions,
	findTodo,
	findTodoCategory,
	findFirstTodoCategory,
	findGoalForUpdate,
	findEventForUpdate,
	findOwnedHabit,
	findHabitForUpdate,
	findHabitCategory,
	findLatestHabitCompletion,
	findCompletionGraph,
	findCompletionGraphSnapshot,
	findAnalyticsData,
	findGoalAnalyticsData,
	findSchedule,
}
