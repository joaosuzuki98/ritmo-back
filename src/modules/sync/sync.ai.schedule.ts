import { Temporal } from "@js-temporal/polyfill"
import { z } from "zod"

const weekDaysSchema = z.array(z.number().int().min(1).max(7))
type ScheduledHabit = {
	id: string
	name: string
	status: string
	weekDays: string
	preferredTime: bigint | null
	estimatedDurationMinutes: number | null
}
type ScheduledEvent = {
	id: string
	title: string
	dateTime: bigint
	endTime: bigint | null
}
type HabitCandidate = {
	id?: string
	weekDays: number[]
	preferredTime: bigint | null
	estimatedDurationMinutes: number | null
}
type EventCandidate = {
	id?: string
	dateTime: bigint
	endTime: bigint | null
}

const getZonedDateTime = (instant: bigint, timeZone: string) =>
	Temporal.Instant.fromEpochMilliseconds(Number(instant)).toZonedDateTimeISO(
		timeZone,
	)

const getHabitMinutes = (habit: HabitCandidate, timeZone: string) => {
	if (habit.preferredTime === null) return null
	const time = getZonedDateTime(habit.preferredTime, timeZone)
	const start = time.hour * 60 + time.minute
	return [start, start + Math.max(1, habit.estimatedDurationMinutes ?? 60)] as [
		number,
		number,
	]
}

const getEventInterval = (event: EventCandidate): [number, number] => {
	const start = Number(event.dateTime)
	const end = event.endTime === null ? 0 : Number(event.endTime)
	return [start, end > start ? end : start + 60 * 60_000]
}

const overlap = ([a, b]: [number, number], [c, d]: [number, number]) =>
	a < d && c < b

const getHabitIntervalOnDate = (
	habit: HabitCandidate,
	date: Temporal.PlainDate,
	timeZone: string,
): [number, number] | null => {
	const minutes = getHabitMinutes(habit, timeZone)
	if (!minutes) return null
	const midnight = date.toZonedDateTime({ timeZone, plainTime: "00:00" })
	return [
		midnight.epochMilliseconds + minutes[0] * 60_000,
		midnight.epochMilliseconds + minutes[1] * 60_000,
	]
}

const parseDays = (value: string) => weekDaysSchema.parse(JSON.parse(value))

const findEventConflict = (
	candidate: EventCandidate,
	events: ScheduledEvent[],
	habits: ScheduledHabit[],
	timeZone: string,
) => {
	const interval = getEventInterval(candidate)
	const event = events.find(
		(item) =>
			item.id !== candidate.id && overlap(interval, getEventInterval(item)),
	)
	if (event) return event.title
	const date = getZonedDateTime(candidate.dateTime, timeZone).toPlainDate()
	const habit = habits.find((item) => {
		if (
			item.status === "paused" ||
			!parseDays(item.weekDays).includes(date.dayOfWeek)
		)
			return false
		const habitInterval = getHabitIntervalOnDate(
			{ ...item, weekDays: parseDays(item.weekDays) },
			date,
			timeZone,
		)
		return habitInterval !== null && overlap(interval, habitInterval)
	})
	return habit?.name ?? null
}

const findHabitConflict = (
	candidate: HabitCandidate,
	events: ScheduledEvent[],
	habits: ScheduledHabit[],
	timeZone: string,
	now = Temporal.Now.instant(),
) => {
	const interval = getHabitMinutes(candidate, timeZone)
	if (!interval) return null
	const habit = habits.find((item) => {
		if (item.id === candidate.id || item.status === "paused") return false
		if (
			!parseDays(item.weekDays).some((day) => candidate.weekDays.includes(day))
		)
			return false
		const existing = getHabitMinutes(
			{ ...item, weekDays: parseDays(item.weekDays) },
			timeZone,
		)
		return existing !== null && overlap(interval, existing)
	})
	if (habit) return habit.name
	const today = now.toZonedDateTimeISO(timeZone).toPlainDate()
	const startOfToday = today.toZonedDateTime({ timeZone, plainTime: "00:00" })
	const event = events.find((item) => {
		if (Number(item.dateTime) < startOfToday.epochMilliseconds) return false
		const date = getZonedDateTime(item.dateTime, timeZone).toPlainDate()
		if (!candidate.weekDays.includes(date.dayOfWeek)) return false
		const habitInterval = getHabitIntervalOnDate(candidate, date, timeZone)
		return (
			habitInterval !== null && overlap(habitInterval, getEventInterval(item))
		)
	})
	return event?.title ?? null
}

const getLocalTimestamp = (date: string, time: string, timeZone: string) =>
	BigInt(
		Temporal.PlainDate.from(date).toZonedDateTime({
			timeZone,
			plainTime: Temporal.PlainTime.from(time),
		}).epochMilliseconds,
	)

export {
	findEventConflict,
	findHabitConflict,
	getLocalTimestamp,
	getZonedDateTime,
}
