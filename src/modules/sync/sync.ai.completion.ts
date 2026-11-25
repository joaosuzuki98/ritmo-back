import { randomUUID } from "node:crypto"
import { Temporal } from "@js-temporal/polyfill"
import type { Prisma } from "@prisma/client"
import { z } from "zod"

import { AppError, problemTypeUri } from "../shared/errors.js"
import { syncAiRepository } from "./sync.ai.repository.js"
import { getLocalTimestamp, getZonedDateTime } from "./sync.ai.schedule.js"
import { syncRepository } from "./sync.repository.js"

const completionSchema = z.object({
	type: z.literal("habit.completion.create"),
	habitId: z.string().min(1).max(255),
	date: z.iso.date(),
	completionTime: z
		.string()
		.regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
		.optional(),
	note: z.string().max(500).optional(),
})
const daysSchema = z.array(z.number().int().min(1).max(7))
const conditionSchema = z.object({
	status: z.enum(["completed", "partial", "skipped"]),
})
type Graph = Awaited<ReturnType<typeof syncAiRepository.findCompletionGraph>>
type Completion = Graph["completions"][number]
type Habit = Graph["habits"][number]

const validationError = (detail: string) =>
	new AppError({
		statusCode: 409,
		type: problemTypeUri("ai-habit-completion-invalid"),
		detail,
		code: "AI_HABIT_COMPLETION_INVALID",
	})

const dateKey = (value: bigint, timeZone: string) =>
	getZonedDateTime(value, timeZone).toPlainDate().toString()

const latestRecords = (records: Completion[], timeZone: string) => {
	const latest = new Map<string, Completion>()
	for (const record of records) {
		const key = `${record.habitId}:${dateKey(record.date, timeZone)}`
		const previous = latest.get(key)
		if (!previous || record.updatedAt >= previous.updatedAt)
			latest.set(key, record)
	}
	return latest
}

const getCondition = (habit: Habit) => {
	const condition = habit.conditions.find(
		(item) => item.conditionType === "habit_status",
	)
	if (!condition) return null
	const parsed = conditionSchema.safeParse(JSON.parse(condition.conditionRule))
	if (!parsed.success) throw validationError("A condição do hábito é inválida.")
	return { habitId: condition.conditionHabitId, status: parsed.data.status }
}

const calculateStreak = (
	habit: Habit,
	latest: Map<string, Completion>,
	today: Temporal.PlainDate,
	timeZone: string,
) => {
	const records = [...latest.values()].filter(
		(record) => record.habitId === habit.id,
	)
	const scheduled = new Set(daysSchema.parse(JSON.parse(habit.weekDays)))
	if (!records.length || !scheduled.size) return { current: 0, longest: 0 }
	const dates = records.map((record) => dateKey(record.date, timeZone)).sort()
	const firstDate = dates[0]
	if (!firstDate) return { current: 0, longest: 0 }
	const first = Temporal.PlainDate.from(firstDate)
	if (first.until(today).days > 36_600)
		throw validationError(
			"O histórico é grande demais para calcular a sequência.",
		)
	const condition = getCondition(habit)
	const eligible = (date: Temporal.PlainDate) => {
		if (!scheduled.has(date.dayOfWeek)) return false
		if (!condition) return true
		return (
			latest.get(`${condition.habitId}:${date}`)?.status === condition.status
		)
	}
	const completed = (date: Temporal.PlainDate) =>
		latest.get(`${habit.id}:${date}`)?.status === "completed"
	let longest = 0
	let run = 0
	for (
		let date = first;
		Temporal.PlainDate.compare(date, today) <= 0;
		date = date.add({ days: 1 })
	) {
		if (!eligible(date)) continue
		if (completed(date)) {
			run += 1
			longest = Math.max(longest, run)
		} else run = 0
	}
	let cursor = today
	if (scheduled.has(cursor.dayOfWeek) && !completed(cursor))
		cursor = cursor.subtract({ days: 1 })
	let current = 0
	for (
		;
		Temporal.PlainDate.compare(cursor, first) >= 0;
		cursor = cursor.subtract({ days: 1 })
	) {
		if (!eligible(cursor)) continue
		if (!completed(cursor)) break
		current += 1
	}
	return { current, longest }
}

const applyCompletion = async (
	client: Prisma.TransactionClient,
	userId: string,
	input: unknown,
	timeZone: string,
) => {
	const action = completionSchema.parse(input)
	const date = Temporal.PlainDate.from(action.date)
	const start = getLocalTimestamp(action.date, "00:00", timeZone)
	const now = Temporal.Now.zonedDateTimeISO(timeZone)
	const time =
		action.completionTime ??
		`${String(now.hour).padStart(2, "0")}:${String(now.minute).padStart(2, "0")}`
	const completionTime = getLocalTimestamp(action.date, time, timeZone)
	const previousTimestamp = await syncRepository.lockSyncState(client, userId)
	const graph = await syncAiRepository.findCompletionGraph(client, userId)
	if (
		graph.habits.length > 500 ||
		graph.completions.length > 50_000 ||
		graph.streaks.length > 500
	)
		throw validationError(
			"O histórico é grande demais para validar a conclusão.",
		)
	const habits = new Map(graph.habits.map((habit) => [habit.id, habit]))
	const root = habits.get(action.habitId)
	if (!root) throw validationError("O hábito não está mais disponível.")
	const days = daysSchema.parse(JSON.parse(root.weekDays))
	if (
		root.status === "paused" ||
		(root.frequencyType === "weekly" && !days.includes(date.dayOfWeek)) ||
		(root.seasonalStart !== null &&
			action.date < dateKey(root.seasonalStart, timeZone)) ||
		(root.seasonalEnd !== null &&
			action.date > dateKey(root.seasonalEnd, timeZone))
	)
		throw validationError("O hábito não pode ser concluído nesta data.")
	const latest = latestRecords(graph.completions, timeZone)
	const statusOf = (id: string) => latest.get(`${id}:${action.date}`)?.status
	const dependency = root.dependencies.find(
		(item) => item.type === "after_completion",
	)
	if (dependency && statusOf(dependency.triggerHabitId) !== "completed")
		throw validationError("Conclua o hábito pré-requisito primeiro.")
	const condition = getCondition(root)
	if (condition && statusOf(condition.habitId) !== condition.status)
		throw validationError("A condição do hábito ainda não foi satisfeita.")

	const status = new Map(
		graph.habits.map((habit) => [habit.id, statusOf(habit.id)]),
	)
	status.set(root.id, "completed")
	const queue = [root.id]
	const visited = new Set<string>()
	const toComplete = new Set([root.id])
	while (queue.length) {
		const trigger = queue.shift()
		if (!trigger || visited.has(trigger)) continue
		visited.add(trigger)
		for (const habit of graph.habits) {
			if (
				!habit.dependencies.some(
					(item) =>
						item.type === "after_completion" && item.triggerHabitId === trigger,
				)
			)
				continue
			if (status.get(habit.id) === "completed") {
				queue.push(habit.id)
				continue
			}
			if (habit.status === "paused") continue
			const required = getCondition(habit)
			if (required && status.get(required.habitId) !== required.status) continue
			status.set(habit.id, "completed")
			toComplete.add(habit.id)
			queue.push(habit.id)
		}
	}
	const timestamp = await syncRepository.updateSyncTimestamp(
		client,
		userId,
		previousTimestamp,
	)
	for (const habitId of toComplete) {
		const key = `${habitId}:${action.date}`
		const existing = latest.get(key)
		const id = existing?.id ?? randomUUID()
		await syncRepository.pushRecord(
			client,
			userId,
			"completion_records",
			existing ? "updated" : "created",
			{
				id,
				...(existing
					? {}
					: {
							habit_id: habitId,
							distraction_lock_enabled: false,
							created_at: Number(timestamp),
						}),
				date: Number(start),
				status: "completed",
				completion_time: Number(completionTime),
				incompletion_reason_id: null,
				...(habitId === root.id && action.note !== undefined
					? { note: action.note }
					: {}),
			},
			timestamp,
		)
		latest.set(key, {
			id,
			habitId,
			date: start,
			status: "completed",
			updatedAt: timestamp,
		})
	}
	for (const habitId of toComplete) {
		const habit = habits.get(habitId)
		if (!habit) throw validationError("O hábito não está mais disponível.")
		const { current, longest } = calculateStreak(habit, latest, date, timeZone)
		const existing = graph.streaks.find((streak) => streak.habitId === habitId)
		await syncRepository.pushRecord(
			client,
			userId,
			"streaks",
			existing ? "updated" : "created",
			{
				id: existing?.id ?? randomUUID(),
				...(existing ? {} : { habit_id: habitId }),
				current_streak: current,
				longest_streak: longest,
			},
			timestamp,
		)
	}
}

export { applyCompletion, calculateStreak, latestRecords }
