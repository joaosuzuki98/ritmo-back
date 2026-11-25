import { randomUUID } from "node:crypto"
import { Temporal } from "@js-temporal/polyfill"
import type { Prisma } from "@prisma/client"
import { z } from "zod"

import { AppError, problemTypeUri } from "../shared/errors.js"
import { syncAiRepository } from "./sync.ai.repository.js"
import { findEventConflict, getLocalTimestamp } from "./sync.ai.schedule.js"
import { syncRepository } from "./sync.repository.js"

const todoChangesSchema = z
	.object({
		title: z.string().trim().min(1).max(200).optional(),
		category: z.string().trim().min(1).max(100).optional(),
		isComplete: z.boolean().optional(),
	})
	.strict()
	.refine((changes) => Object.keys(changes).length > 0)

const todoActionSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("todo.create"),
		task: z
			.object({
				title: z.string().trim().min(1).max(200),
				category: z.string().trim().min(1).max(100).optional(),
			})
			.strict(),
	}),
	z.object({
		type: z.literal("todo.update"),
		entityId: z.string().min(1).max(255),
		changes: todoChangesSchema,
	}),
])

type TodoAction = z.infer<typeof todoActionSchema>

const goalUpdateSchema = z.object({
	type: z.literal("goal.update"),
	entityId: z.string().min(1).max(255),
	changes: z
		.object({
			description: z.string().trim().min(1).max(500).optional(),
			targetValue: z.number().int().positive().optional(),
			deadlineType: z
				.enum(["short_term", "medium_term", "long_term"])
				.optional(),
		})
		.strict()
		.refine((changes) => Object.keys(changes).length > 0),
})

type GoalUpdate = z.infer<typeof goalUpdateSchema>

const goalCreateSchema = z.object({
	type: z.literal("goal.create"),
	goal: z.object({
		habitId: z.string().min(1).max(255),
		description: z.string().trim().min(1).max(500),
		targetValue: z.number().int().positive(),
		deadlineType: z.enum(["short_term", "medium_term", "long_term"]),
	}),
})
type GoalCreate = z.infer<typeof goalCreateSchema>

const eventFields = {
	title: z.string().trim().min(1).max(200),
	dateTime: z.iso.datetime({ offset: true }),
	endTime: z.iso.datetime({ offset: true }).nullable().optional(),
	location: z.string().max(200).nullable().optional(),
	description: z.string().max(500).nullable().optional(),
	reminderType: z.enum(["normal", "holiday", "important_day"]).optional(),
}
const eventActionSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("event.create"),
		event: z.object(eventFields).strict(),
	}),
	z.object({
		type: z.literal("event.update"),
		entityId: z.string().min(1).max(255),
		changes: z
			.object(eventFields)
			.partial()
			.strict()
			.refine((changes) => Object.keys(changes).length > 0),
	}),
])
type EventAction = z.infer<typeof eventActionSchema>

const unavailable = () =>
	new AppError({
		statusCode: 409,
		type: problemTypeUri("ai-target-unavailable"),
		detail: "A tarefa não está mais disponível.",
		code: "AI_TARGET_UNAVAILABLE",
	})

const applyTodo = async (
	client: Prisma.TransactionClient,
	userId: string,
	input: TodoAction,
) => {
	const action = todoActionSchema.parse(input)
	const previousTimestamp = await syncRepository.lockSyncState(client, userId)
	if (action.type === "todo.update") {
		const existing = await syncAiRepository.findTodo(
			client,
			userId,
			action.entityId,
		)
		if (!existing) throw unavailable()
	}

	const desiredCategory =
		action.type === "todo.create"
			? action.task.category?.trim()
			: action.changes.category?.trim()
	const fallbackCategory =
		action.type === "todo.create" && !desiredCategory
			? await syncAiRepository.findFirstTodoCategory(client, userId)
			: null
	const categoryName = desiredCategory || fallbackCategory?.name || ""
	const category =
		categoryName && desiredCategory
			? await syncAiRepository.findTodoCategory(client, userId, categoryName)
			: null
	const timestamp = await syncRepository.updateSyncTimestamp(
		client,
		userId,
		previousTimestamp,
	)
	if (desiredCategory && !category) {
		await syncRepository.pushRecord(
			client,
			userId,
			"todo_categories",
			"created",
			{
				id: randomUUID(),
				name: desiredCategory,
				created_at: Number(timestamp),
			},
			timestamp,
		)
	}
	const resolvedCategory = category?.name ?? categoryName
	if (action.type === "todo.create") {
		await syncRepository.pushRecord(
			client,
			userId,
			"todo_tasks",
			"created",
			{
				id: randomUUID(),
				title: action.task.title.trim(),
				category: resolvedCategory,
				is_complete: false,
				created_at: Number(timestamp),
			},
			timestamp,
		)
		return
	}
	const changes = action.changes
	await syncRepository.pushRecord(
		client,
		userId,
		"todo_tasks",
		"updated",
		{
			id: action.entityId,
			...(changes.title !== undefined ? { title: changes.title.trim() } : {}),
			...(changes.category !== undefined ? { category: resolvedCategory } : {}),
			...(changes.isComplete !== undefined
				? { is_complete: changes.isComplete }
				: {}),
		},
		timestamp,
	)
}

const applyGoalUpdate = async (
	client: Prisma.TransactionClient,
	userId: string,
	input: GoalUpdate,
) => {
	const action = goalUpdateSchema.parse(input)
	const previousTimestamp = await syncRepository.lockSyncState(client, userId)
	const goal = await syncAiRepository.findGoalForUpdate(
		client,
		userId,
		action.entityId,
	)
	if (!goal) {
		throw new AppError({
			statusCode: 409,
			type: problemTypeUri("ai-target-unavailable"),
			detail: "A meta não está mais disponível.",
			code: "AI_TARGET_UNAVAILABLE",
		})
	}
	const timestamp = await syncRepository.updateSyncTimestamp(
		client,
		userId,
		previousTimestamp,
	)
	const changes = action.changes
	const targetValue = changes.targetValue ?? goal.targetValue
	await syncRepository.pushRecord(
		client,
		userId,
		"goals",
		"updated",
		{
			id: goal.id,
			...(changes.description !== undefined
				? { description: changes.description }
				: {}),
			...(changes.targetValue !== undefined
				? { target_value: changes.targetValue }
				: {}),
			...(changes.deadlineType !== undefined
				? { deadline_type: changes.deadlineType }
				: {}),
			status: goal.currentValue >= targetValue ? "completed" : "in_progress",
		},
		timestamp,
	)
}

const applyGoalCreate = async (
	client: Prisma.TransactionClient,
	userId: string,
	input: GoalCreate,
	timeZone: string,
) => {
	const { goal } = goalCreateSchema.parse(input)
	const previousTimestamp = await syncRepository.lockSyncState(client, userId)
	const habit = await syncAiRepository.findOwnedHabit(
		client,
		userId,
		goal.habitId,
	)
	if (!habit) {
		throw new AppError({
			statusCode: 409,
			type: problemTypeUri("ai-target-unavailable"),
			detail: "O hábito da meta não está mais disponível.",
			code: "AI_TARGET_UNAVAILABLE",
		})
	}
	const today = Temporal.Now.zonedDateTimeISO(timeZone).toPlainDate()
	const start = getLocalTimestamp(today.toString(), "00:00", timeZone)
	const end = getLocalTimestamp(
		today.add({ days: 1 }).toString(),
		"00:00",
		timeZone,
	)
	const lastCompletion = await syncAiRepository.findLatestHabitCompletion(
		client,
		userId,
		goal.habitId,
		start,
		end,
	)
	const currentValue = lastCompletion?.status === "completed" ? 1 : 0
	const timestamp = await syncRepository.updateSyncTimestamp(
		client,
		userId,
		previousTimestamp,
	)
	await syncRepository.pushRecord(
		client,
		userId,
		"goals",
		"created",
		{
			id: randomUUID(),
			habit_id: goal.habitId,
			description: goal.description,
			target_value: goal.targetValue,
			deadline_type: goal.deadlineType,
			current_value: currentValue,
			status: currentValue >= goal.targetValue ? "completed" : "in_progress",
			created_at: Number(start),
		},
		timestamp,
	)
}

const applyEvent = async (
	client: Prisma.TransactionClient,
	userId: string,
	input: EventAction,
	timeZone: string,
) => {
	const action = eventActionSchema.parse(input)
	const previousTimestamp = await syncRepository.lockSyncState(client, userId)
	const existing =
		action.type === "event.update"
			? await syncAiRepository.findEventForUpdate(
					client,
					userId,
					action.entityId,
				)
			: null
	if (action.type === "event.update" && !existing) {
		throw new AppError({
			statusCode: 409,
			type: problemTypeUri("ai-target-unavailable"),
			detail: "O evento não está mais disponível.",
			code: "AI_TARGET_UNAVAILABLE",
		})
	}
	const fields = action.type === "event.create" ? action.event : action.changes
	const dateTime =
		fields.dateTime !== undefined
			? BigInt(Date.parse(fields.dateTime))
			: existing?.dateTime
	if (dateTime === undefined) throw new Error("Missing event date")
	const endTime =
		fields.endTime === undefined
			? (existing?.endTime ?? null)
			: fields.endTime === null
				? null
				: BigInt(Date.parse(fields.endTime))
	const { habits, events } = await syncAiRepository.findSchedule(client, userId)
	const conflict = findEventConflict(
		{ ...(existing ? { id: existing.id } : {}), dateTime, endTime },
		events,
		habits,
		timeZone,
	)
	if (conflict) {
		throw new AppError({
			statusCode: 409,
			type: problemTypeUri("ai-schedule-conflict"),
			detail: `O horário entra em conflito com “${conflict}”.`,
			code: "AI_SCHEDULE_CONFLICT",
		})
	}
	const timestamp = await syncRepository.updateSyncTimestamp(
		client,
		userId,
		previousTimestamp,
	)
	const changes = {
		...(fields.title !== undefined ? { title: fields.title } : {}),
		...(fields.dateTime !== undefined ? { date_time: Number(dateTime) } : {}),
		...(fields.endTime !== undefined
			? { end_time: endTime === null ? null : Number(endTime) }
			: {}),
		...(fields.location !== undefined
			? { location: fields.location?.trim() || null }
			: {}),
		...(fields.description !== undefined
			? { description: fields.description?.trim() || null }
			: {}),
		...(fields.reminderType !== undefined
			? { reminder_type: fields.reminderType }
			: {}),
	}
	await syncRepository.pushRecord(
		client,
		userId,
		"events",
		action.type === "event.create" ? "created" : "updated",
		action.type === "event.create"
			? {
					id: randomUUID(),
					...changes,
					recurrence: "none",
					countdown_enabled: false,
					conversion_origin: "reminders",
					reminder_type: fields.reminderType ?? "normal",
					created_at: Number(timestamp),
				}
			: { id: action.entityId, ...changes },
		timestamp,
	)
}

export const syncAiMutations = {
	applyTodo,
	applyGoalUpdate,
	applyGoalCreate,
	applyEvent,
}
