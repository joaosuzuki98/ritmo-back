import { Temporal } from "@js-temporal/polyfill"

import { AppError, problemTypeUri } from "../shared/errors.js"
import { syncAiRepository } from "./sync.ai.repository.js"
import { getZonedDateTime } from "./sync.ai.schedule.js"

const getGoalInsights = async (userId: string, timeZone: string) => {
	const { goals, completions } =
		await syncAiRepository.findGoalAnalyticsData(userId)
	if (goals.length > 100 || completions.length > 50_000) {
		throw new AppError({
			statusCode: 422,
			type: problemTypeUri("ai-statistics-limit"),
			detail: "Há dados demais para calcular as metas.",
			code: "AI_STATISTICS_LIMIT",
		})
	}
	const now = Temporal.Now.zonedDateTimeISO(timeZone)
	const today = now.toPlainDate()
	const latest = new Map<string, (typeof completions)[number]>()
	for (const record of completions) {
		const date = getZonedDateTime(record.date, timeZone)
			.toPlainDate()
			.toString()
		const key = `${record.habitId}:${date}`
		const prior = latest.get(key)
		if (!prior || record.updatedAt >= prior.updatedAt) latest.set(key, record)
	}
	const datesByHabit = new Map<string, Temporal.PlainDate[]>()
	for (const record of latest.values()) {
		if (record.status !== "completed") continue
		const dates = datesByHabit.get(record.habitId) ?? []
		dates.push(getZonedDateTime(record.date, timeZone).toPlainDate())
		datesByHabit.set(record.habitId, dates)
	}
	const rows = goals.map((goal) => {
		const created = getZonedDateTime(goal.createdAt, timeZone).toPlainDate()
		const recentStart =
			Temporal.PlainDate.compare(created, today.subtract({ days: 27 })) > 0
				? created
				: today.subtract({ days: 27 })
		const dates = (datesByHabit.get(goal.habitId) ?? []).filter(
			(date) =>
				Temporal.PlainDate.compare(date, created) >= 0 &&
				Temporal.PlainDate.compare(date, today) <= 0,
		)
		const currentValue = dates.length
		const remainingValue = Math.max(0, goal.targetValue - currentValue)
		const recentCount = dates.filter(
			(date) => Temporal.PlainDate.compare(date, recentStart) >= 0,
		).length
		const elapsedDays = Math.max(0, recentStart.until(today).days + 1)
		const elapsedWeeks = Math.max(1, elapsedDays / 7)
		const recentPacePerWeek = recentCount ? recentCount / elapsedWeeks : null
		const projectedEpoch =
			recentPacePerWeek === null
				? null
				: now.epochMilliseconds +
					(remainingValue / recentPacePerWeek) * 7 * 86_400_000
		const projectedCompletionDate =
			projectedEpoch === null ||
			!Number.isFinite(projectedEpoch) ||
			Math.abs(projectedEpoch) > 8_640_000_000_000_000
				? null
				: Temporal.Instant.fromEpochMilliseconds(Math.round(projectedEpoch))
						.toZonedDateTimeISO(timeZone)
						.toPlainDate()
						.toString()
		return {
			goalId: goal.id,
			habitId: goal.habitId,
			habitName: goal.habit.name,
			description: goal.description,
			targetValue: goal.targetValue,
			currentValue,
			remainingValue,
			recentPacePerWeek,
			projectedCompletionDate,
			deadlineType: goal.deadlineType,
			status: goal.status,
		}
	})
	return {
		asOf: today.toString(),
		timeZone,
		note: "Projeções são estimativas baseadas no ritmo dos últimos 28 dias e não garantem resultados.",
		goals: rows,
	}
}

export { getGoalInsights }
