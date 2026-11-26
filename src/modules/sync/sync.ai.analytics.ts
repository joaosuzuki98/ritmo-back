import { Temporal } from "@js-temporal/polyfill"
import { z } from "zod"

import { AppError, problemTypeUri } from "../shared/errors.js"
import { syncAiRepository } from "./sync.ai.repository.js"
import { getLocalTimestamp, getZonedDateTime } from "./sync.ai.schedule.js"

const periodSchema = z
	.object({
		period: z.enum([
			"this_week",
			"last_week",
			"last_7_days",
			"last_28_days",
			"this_month",
			"last_month",
			"custom",
		]),
		startDate: z.iso.date().nullable(),
		endDate: z.iso.date().nullable(),
	})
	.strict()
type PeriodInput = z.infer<typeof periodSchema>
type Count = { planned: number; completed: number }

const rate = ({ planned, completed }: Count) =>
	planned > 0 ? completed / planned : null

const bounds = (input: PeriodInput, today: Temporal.PlainDate) => {
	const monday = today.subtract({ days: today.dayOfWeek - 1 })
	const month = today.with({ day: 1 })
	switch (input.period) {
		case "this_week":
			return [monday, today] as const
		case "last_week":
			return [
				monday.subtract({ days: 7 }),
				monday.subtract({ days: 1 }),
			] as const
		case "last_7_days":
			return [today.subtract({ days: 6 }), today] as const
		case "last_28_days":
			return [today.subtract({ days: 27 }), today] as const
		case "this_month":
			return [month, today] as const
		case "last_month":
			return [
				month.subtract({ months: 1 }),
				month.subtract({ days: 1 }),
			] as const
		case "custom":
			if (!input.startDate || !input.endDate)
				throw new Error("Custom period requires both dates")
			return [
				Temporal.PlainDate.from(input.startDate),
				Temporal.PlainDate.from(input.endDate),
			] as const
	}
}

const getHabitSummary = async (
	userId: string,
	timeZone: string,
	input: PeriodInput,
) => {
	const parsed = periodSchema.parse(input)
	const today = Temporal.Now.zonedDateTimeISO(timeZone).toPlainDate()
	const [start, requestedEnd] = bounds(parsed, today)
	const end =
		Temporal.PlainDate.compare(requestedEnd, today) > 0 ? today : requestedEnd
	if (
		Temporal.PlainDate.compare(start, end) > 0 ||
		start.until(end).days > 365
	) {
		throw new AppError({
			statusCode: 422,
			type: problemTypeUri("ai-statistics-period-invalid"),
			detail: "O período deve incluir datas já ocorridas e ter até 366 dias.",
			code: "AI_STATISTICS_PERIOD_INVALID",
		})
	}
	const startMs = getLocalTimestamp(start.toString(), "00:00", timeZone)
	const endMs = getLocalTimestamp(
		end.add({ days: 1 }).toString(),
		"00:00",
		timeZone,
	)
	const { habits, completions } = await syncAiRepository.findAnalyticsData(
		userId,
		startMs,
		endMs,
	)
	if (habits.length > 500 || completions.length > 50_000) {
		throw new AppError({
			statusCode: 422,
			type: problemTypeUri("ai-statistics-limit"),
			detail: "O período tem dados demais; escolha um período menor.",
			code: "AI_STATISTICS_LIMIT",
		})
	}
	const latest = new Map<string, (typeof completions)[number]>()
	for (const record of completions) {
		const date = getZonedDateTime(record.date, timeZone)
			.toPlainDate()
			.toString()
		const key = `${record.habitId}:${date}`
		const previous = latest.get(key)
		if (!previous || record.updatedAt >= previous.updatedAt)
			latest.set(key, record)
	}
	const totals: Count = { planned: 0, completed: 0 }
	let estimatedPlannedMinutes = 0
	const weekdays = Array.from({ length: 7 }, (_, index) => ({
		weekDay: index + 1,
		planned: 0,
		completed: 0,
	}))
	const timeOfDay = [
		{ label: "early_morning", from: 0, to: 5, planned: 0, completed: 0 },
		{ label: "morning", from: 5, to: 12, planned: 0, completed: 0 },
		{ label: "afternoon", from: 12, to: 17, planned: 0, completed: 0 },
		{ label: "evening", from: 17, to: 21, planned: 0, completed: 0 },
		{ label: "night", from: 21, to: 24, planned: 0, completed: 0 },
	]
	const reasons = new Map<string, number>()
	const categories = new Map<string, Count & { habitCount: number }>()
	const scheduleDays = new Map<string, number[]>()
	const habitStats = habits.map((habit) => {
		const days = z
			.array(z.number().int().min(1).max(7))
			.parse(JSON.parse(habit.weekDays))
		scheduleDays.set(habit.id, days)
		const created = getZonedDateTime(habit.createdAt, timeZone).toPlainDate()
		const seasonalStart =
			habit.seasonalStart === null
				? null
				: getZonedDateTime(habit.seasonalStart, timeZone).toPlainDate()
		const seasonalEnd =
			habit.seasonalEnd === null
				? null
				: getZonedDateTime(habit.seasonalEnd, timeZone).toPlainDate()
		const count: Count = { planned: 0, completed: 0 }
		const hour =
			habit.preferredTime === null
				? null
				: getZonedDateTime(habit.preferredTime, timeZone).hour
		const slot =
			hour === null
				? null
				: timeOfDay.find((item) => hour >= item.from && hour < item.to)
		for (
			let date = start;
			Temporal.PlainDate.compare(date, end) <= 0;
			date = date.add({ days: 1 })
		) {
			if (
				Temporal.PlainDate.compare(date, created) < 0 ||
				(seasonalStart &&
					Temporal.PlainDate.compare(date, seasonalStart) < 0) ||
				(seasonalEnd && Temporal.PlainDate.compare(date, seasonalEnd) > 0) ||
				(habit.frequencyType !== "daily" && !days.includes(date.dayOfWeek))
			)
				continue
			const weekday = weekdays[date.dayOfWeek - 1]
			if (!weekday) throw new Error("Invalid weekday")
			count.planned += 1
			totals.planned += 1
			weekday.planned += 1
			estimatedPlannedMinutes += Math.max(
				0,
				habit.estimatedDurationMinutes ?? 0,
			)
			if (slot) slot.planned += 1
			const record = latest.get(`${habit.id}:${date}`)
			if (record?.status === "completed") {
				count.completed += 1
				totals.completed += 1
				weekday.completed += 1
				if (slot) slot.completed += 1
			} else if (record?.incompletionReason?.description) {
				const reason = record.incompletionReason.description
				reasons.set(reason, (reasons.get(reason) ?? 0) + 1)
			}
		}
		const categoryName = habit.category?.name ?? "Sem categoria"
		const category = categories.get(categoryName) ?? {
			planned: 0,
			completed: 0,
			habitCount: 0,
		}
		category.planned += count.planned
		category.completed += count.completed
		category.habitCount += 1
		categories.set(categoryName, category)
		return {
			habitId: habit.id,
			name: habit.name,
			...count,
			completionRate: rate(count),
		}
	})
	const correlations: {
		habitA: string
		habitB: string
		coefficient: number
		sampleSize: number
	}[] = []
	if (habits.length <= 50) {
		for (let left = 0; left < habits.length; left += 1) {
			for (let right = left + 1; right < habits.length; right += 1) {
				const habitA = habits[left]
				const habitB = habits[right]
				if (!habitA || !habitB) continue
				const samples: [number, number][] = []
				for (
					let date = start;
					Temporal.PlainDate.compare(date, end) <= 0;
					date = date.add({ days: 1 })
				) {
					const isScheduled = (habit: {
						id: string
						frequencyType: string
					}): boolean =>
						habit.frequencyType === "daily" ||
						(scheduleDays.get(habit.id)?.includes(date.dayOfWeek) ?? false)
					if (!isScheduled(habitA) || !isScheduled(habitB)) continue
					const a = latest.get(`${habitA.id}:${date}`)
					const b = latest.get(`${habitB.id}:${date}`)
					if (!a || !b) continue
					samples.push([
						Number(a.status === "completed"),
						Number(b.status === "completed"),
					])
				}
				if (samples.length < 7) continue
				const meanA =
					samples.reduce((sum, pair) => sum + pair[0], 0) / samples.length
				const meanB =
					samples.reduce((sum, pair) => sum + pair[1], 0) / samples.length
				const covariance = samples.reduce(
					(sum, pair) => sum + (pair[0] - meanA) * (pair[1] - meanB),
					0,
				)
				const varianceA = samples.reduce(
					(sum, pair) => sum + (pair[0] - meanA) ** 2,
					0,
				)
				const varianceB = samples.reduce(
					(sum, pair) => sum + (pair[1] - meanB) ** 2,
					0,
				)
				const denominator = Math.sqrt(varianceA * varianceB)
				if (!denominator) continue
				correlations.push({
					habitA: habitA.name,
					habitB: habitB.name,
					coefficient: Math.max(-1, Math.min(1, covariance / denominator)),
					sampleSize: samples.length,
				})
			}
		}
	}
	correlations.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient))
	return {
		period: { startDate: start.toString(), endDate: end.toString(), timeZone },
		note: "As contagens usam os hábitos atualmente ativos e a programação atual, que pode ter mudado durante o período.",
		totals: { ...totals, completionRate: rate(totals) },
		estimatedPlannedMinutes,
		habits: habitStats,
		weekdays: weekdays.map((item) => ({ ...item, completionRate: rate(item) })),
		timeOfDay: timeOfDay.map(({ label, planned, completed }) => ({
			label,
			planned,
			completed,
			completionRate: rate({ planned, completed }),
		})),
		categories: [...categories].map(([name, value]) => ({
			name,
			...value,
			completionRate: rate(value),
		})),
		incompletionReasons: [...reasons].map(([reason, count]) => ({
			reason,
			count,
		})),
		correlations: habits.length > 50 ? null : correlations.slice(0, 100),
		correlationsTruncated: correlations.length > 100,
		correlationNote:
			habits.length > 50
				? "Associações não foram calculadas porque há mais de 50 hábitos ativos."
				: "Associação não implica causalidade; são necessários ao menos sete dias com registros de ambos os hábitos.",
	}
}

export { getHabitSummary }
