import { randomUUID } from "node:crypto"
import { Temporal } from "@js-temporal/polyfill"
import type { Prisma } from "@prisma/client"
import { z } from "zod"

import { AppError, problemTypeUri } from "../shared/errors.js"
import { syncAiRepository } from "./sync.ai.repository.js"
import { findHabitConflict, getLocalTimestamp } from "./sync.ai.schedule.js"
import { syncRepository } from "./sync.repository.js"

const daysSchema = z
	.array(z.number().int().min(1).max(7))
	.min(1)
	.max(7)
	.refine((days) => new Set(days).size === days.length)
const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
const prioritySchema = z.enum(["low", "medium", "high"])
const statusSchema = z.enum([
	"pending",
	"completed",
	"partial",
	"skipped",
	"paused",
])
const frequencySchema = z.enum(["daily", "weekly"])

const habitCreateFields = z.object({
	name: z.string().trim().min(1).max(120),
	categoryName: z.string().trim().min(1).max(100).optional(),
	description: z.string().max(500).nullable().optional(),
	frequencyType: frequencySchema,
	weekDays: daysSchema.optional(),
	estimatedDurationMinutes: z.number().int().positive().nullable().optional(),
	preferredTime: timeSchema.nullable().optional(),
	priority: prioritySchema.optional(),
	status: statusSchema.optional(),
})
const habitChanges = habitCreateFields.omit({ categoryName: true }).partial()
const habitActionSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("habit.create"), habit: habitCreateFields }),
	z.object({
		type: z.literal("habit.update"),
		entityId: z.string().min(1).max(255),
		changes: habitChanges.refine((value) => Object.keys(value).length > 0),
	}),
])
const applyHabit = async (
	client: Prisma.TransactionClient,
	userId: string,
	input: unknown,
	timeZone: string,
) => {
	const action = habitActionSchema.parse(input)
	const previousTimestamp = await syncRepository.lockSyncState(client, userId)
	const existing =
		action.type === "habit.update"
			? await syncAiRepository.findHabitForUpdate(
					client,
					userId,
					action.entityId,
				)
			: null
	if (action.type === "habit.update" && !existing) {
		throw new AppError({
			statusCode: 409,
			type: problemTypeUri("ai-target-unavailable"),
			detail: "O hábito não está mais disponível.",
			code: "AI_TARGET_UNAVAILABLE",
		})
	}
	const fields = action.type === "habit.create" ? action.habit : action.changes
	const frequencyType = fields.frequencyType ?? existing?.frequencyType
	const storedDays = existing
		? daysSchema.parse(JSON.parse(existing.weekDays))
		: []
	const days =
		frequencyType === "daily"
			? [1, 2, 3, 4, 5, 6, 7]
			: (fields.weekDays ?? storedDays)
	if (frequencyType !== "daily" && frequencyType !== "weekly") {
		throw new Error("Invalid habit frequency")
	}
	if (!days.length) {
		throw new AppError({
			statusCode: 422,
			type: problemTypeUri("ai-habit-days-required"),
			detail: "Informe os dias da semana para este hábito.",
			code: "AI_HABIT_DAYS_REQUIRED",
		})
	}
	const today = Temporal.Now.zonedDateTimeISO(timeZone).toPlainDate().toString()
	const preferredTime =
		fields.preferredTime === undefined
			? (existing?.preferredTime ?? null)
			: fields.preferredTime === null
				? null
				: getLocalTimestamp(today, fields.preferredTime, timeZone)
	const estimatedDurationMinutes =
		fields.estimatedDurationMinutes === undefined
			? (existing?.estimatedDurationMinutes ?? null)
			: fields.estimatedDurationMinutes
	const { habits, events } = await syncAiRepository.findSchedule(client, userId)
	const conflict = findHabitConflict(
		{
			...(existing ? { id: existing.id } : {}),
			weekDays: days,
			preferredTime,
			estimatedDurationMinutes,
		},
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
	const categoryName =
		action.type === "habit.create" ? action.habit.categoryName : undefined
	const category = categoryName
		? await syncAiRepository.findHabitCategory(client, userId, categoryName)
		: null
	const timestamp = await syncRepository.updateSyncTimestamp(
		client,
		userId,
		previousTimestamp,
	)
	let categoryId = category?.id
	if (categoryName && !categoryId) {
		categoryId = randomUUID()
		await syncRepository.pushRecord(
			client,
			userId,
			"categories",
			"created",
			{ id: categoryId, name: categoryName, created_at: Number(timestamp) },
			timestamp,
		)
	}
	const changes = {
		...(fields.name !== undefined ? { name: fields.name } : {}),
		...(fields.description !== undefined
			? { description: fields.description?.trim() || null }
			: {}),
		...(fields.frequencyType !== undefined
			? { frequency_type: frequencyType }
			: {}),
		...(fields.weekDays !== undefined || fields.frequencyType !== undefined
			? { week_days: JSON.stringify(days) }
			: {}),
		...(fields.estimatedDurationMinutes !== undefined
			? { estimated_duration_minutes: estimatedDurationMinutes }
			: {}),
		...(fields.preferredTime !== undefined
			? {
					preferred_time: preferredTime === null ? null : Number(preferredTime),
				}
			: {}),
		...(fields.priority !== undefined ? { priority: fields.priority } : {}),
		...(fields.status !== undefined ? { status: fields.status } : {}),
	}
	await syncRepository.pushRecord(
		client,
		userId,
		"habits",
		action.type === "habit.create" ? "created" : "updated",
		action.type === "habit.create"
			? {
					id: randomUUID(),
					...changes,
					week_days: JSON.stringify(days),
					category_id: categoryId ?? null,
					priority: fields.priority ?? "medium",
					status: fields.status ?? "pending",
					is_focus_of_day: false,
					created_at: Number(timestamp),
				}
			: { id: action.entityId, ...changes },
		timestamp,
	)
}

export { applyHabit }
