import { Temporal } from "@js-temporal/polyfill"
import { describe, expect, it } from "vitest"

import {
	findEventConflict,
	findHabitConflict,
	getLocalTimestamp,
} from "./sync.ai.schedule.js"

const zone = "America/Sao_Paulo"
const habit = {
	id: "habit-1",
	name: "Caminhada",
	status: "pending",
	weekDays: "[1,2,3,4,5,6,7]",
	preferredTime: BigInt(Date.parse("2026-11-25T12:00:00Z")),
	estimatedDurationMinutes: 60,
}

describe("AI schedule validation", () => {
	it("detects event conflicts with a habit in the device time zone", () => {
		expect(
			findEventConflict(
				{
					dateTime: BigInt(Date.parse("2026-11-25T12:30:00Z")),
					endTime: BigInt(Date.parse("2026-11-25T13:30:00Z")),
				},
				[],
				[habit],
				zone,
			),
		).toBe("Caminhada")
	})

	it("allows adjacent events and ignores paused habits", () => {
		expect(
			findEventConflict(
				{
					dateTime: BigInt(Date.parse("2026-11-25T13:00:00Z")),
					endTime: null,
				},
				[
					{
						id: "event-1",
						title: "Consulta",
						dateTime: BigInt(Date.parse("2026-11-25T12:00:00Z")),
						endTime: BigInt(Date.parse("2026-11-25T13:00:00Z")),
					},
				],
				[habit],
				zone,
			),
		).toBeNull()
	})

	it("checks recurring habits against future events, not historical events", () => {
		const event = {
			id: "event-1",
			title: "Consulta",
			dateTime: BigInt(Date.parse("2026-11-25T12:30:00Z")),
			endTime: null,
		}
		const candidate = {
			weekDays: [3],
			preferredTime: habit.preferredTime,
			estimatedDurationMinutes: 60,
		}
		expect(
			findHabitConflict(
				candidate,
				[event],
				[],
				zone,
				Temporal.Instant.from("2026-11-25T10:00:00Z"),
			),
		).toBe("Consulta")
		expect(
			findHabitConflict(
				candidate,
				[event],
				[],
				zone,
				Temporal.Instant.from("2026-11-26T10:00:00Z"),
			),
		).toBeNull()
	})

	it("uses the IANA zone rules for daylight-saving transitions", () => {
		expect(getLocalTimestamp("2026-03-08", "02:30", "America/New_York")).toBe(
			BigInt(Date.parse("2026-03-08T07:30:00Z")),
		)
		expect(getLocalTimestamp("2026-11-01", "01:30", "America/New_York")).toBe(
			BigInt(Date.parse("2026-11-01T05:30:00Z")),
		)
	})
})
