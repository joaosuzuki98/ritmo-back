import { Temporal } from "@js-temporal/polyfill"

import { AppError, problemTypeUri } from "../shared/errors.js"
import { calculateStreak, latestRecords } from "./sync.ai.completion.js"
import { syncAiRepository } from "./sync.ai.repository.js"

const getHabitStreaks = async (userId: string, timeZone: string) => {
	const graph = await syncAiRepository.findCompletionGraphSnapshot(userId)
	if (graph.habits.length > 500 || graph.completions.length > 50_000) {
		throw new AppError({
			statusCode: 422,
			type: problemTypeUri("ai-statistics-limit"),
			detail: "Há dados demais para calcular as sequências.",
			code: "AI_STATISTICS_LIMIT",
		})
	}
	const latest = latestRecords(graph.completions, timeZone)
	const today = Temporal.Now.zonedDateTimeISO(timeZone).toPlainDate()
	return {
		asOf: today.toString(),
		timeZone,
		note: "As sequências usam a programação atual e apenas hábitos atualmente ativos.",
		habits: graph.habits
			.filter(
				(habit) => habit.status !== "paused" && habit.status !== "deleted",
			)
			.map((habit) => {
				const { current, longest } = calculateStreak(
					habit,
					latest,
					today,
					timeZone,
				)
				return {
					habitId: habit.id,
					currentStreak: current,
					longestStreak: longest,
					nextStreakMilestone: (Math.floor(current / 7) + 1) * 7,
				}
			}),
	}
}

export { getHabitStreaks }
