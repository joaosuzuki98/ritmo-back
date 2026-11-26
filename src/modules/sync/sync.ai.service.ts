import { syncAiRepository } from "./sync.ai.repository.js"

const LIST_LIMIT = 50

const limitResults = <T extends { id: string }>(records: T[]) => {
	const items = records.slice(0, LIST_LIMIT)
	return {
		items,
		nextCursor: records.length > LIST_LIMIT ? items.at(-1)?.id : null,
	}
}

const listHabits = async (userId: string, cursor?: string) =>
	limitResults(await syncAiRepository.listHabits(userId, cursor))

const listTasks = async (userId: string, cursor?: string) =>
	limitResults(await syncAiRepository.listTasks(userId, cursor))

const listEvents = async (userId: string, cursor?: string) => {
	const records = await syncAiRepository.listEvents(userId, cursor)
	return limitResults(
		records.map((event) => ({
			...event,
			dateTime: new Date(Number(event.dateTime)).toISOString(),
			endTime:
				event.endTime === null
					? null
					: new Date(Number(event.endTime)).toISOString(),
		})),
	)
}

const listGoals = async (userId: string, cursor?: string) =>
	limitResults(await syncAiRepository.listGoals(userId, cursor))

const countCompletions = async (
	userId: string,
	start: number,
	end: number,
	habitId?: string,
) => {
	const counts = await syncAiRepository.countCompletions(
		userId,
		start,
		end,
		habitId,
	)
	return {
		start,
		end,
		habitId: habitId ?? null,
		counts: counts.map((count) => ({
			status: count.status,
			count: count._count._all,
		})),
	}
}

export const syncAiService = {
	listHabits,
	listTasks,
	listEvents,
	listGoals,
	countCompletions,
}
