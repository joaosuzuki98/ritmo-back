type SyncReference = {
	field: string
	collection: string
	optional?: boolean
}

type SyncCollection = {
	name: string
	modelName: string
	whereForOwner: (userId: string) => Record<string, unknown>
	readOnly?: boolean
	createDisabled?: boolean
	writeFields?: string[]
	references?: SyncReference[]
}

const userWhere = (userId: string) => ({ userId })
const habitOwnerWhere = (userId: string) => ({ habit: { is: { userId } } })
const eventOwnerWhere = (userId: string) => ({ event: { is: { userId } } })

const syncCollections: SyncCollection[] = [
	{
		name: "users",
		modelName: "User",
		whereForOwner: (userId) => ({ id: userId }),
		createDisabled: true,
		writeFields: ["name", "mascot_name"],
	},
	{ name: "categories", modelName: "Category", whereForOwner: userWhere },
	{
		name: "habits",
		modelName: "Habit",
		whereForOwner: userWhere,
		references: [
			{ field: "category_id", collection: "categories", optional: true },
		],
	},
	{
		name: "habit_dependencies",
		modelName: "HabitDependency",
		whereForOwner: habitOwnerWhere,
		references: [
			{ field: "habit_id", collection: "habits" },
			{ field: "trigger_habit_id", collection: "habits" },
		],
	},
	{
		name: "habit_conditions",
		modelName: "HabitCondition",
		whereForOwner: habitOwnerWhere,
		references: [
			{ field: "habit_id", collection: "habits" },
			{ field: "condition_habit_id", collection: "habits" },
		],
	},
	{
		name: "events",
		modelName: "Event",
		whereForOwner: userWhere,
	},
	{
		name: "event_subtasks",
		modelName: "EventSubtask",
		whereForOwner: (userId) => ({
			AND: [eventOwnerWhere(userId), habitOwnerWhere(userId)],
		}),
		references: [
			{ field: "event_id", collection: "events" },
			{ field: "habit_id", collection: "habits" },
		],
	},
	{
		name: "incompletion_reasons",
		modelName: "IncompletionReason",
		whereForOwner: () => ({}),
		readOnly: true,
	},
	{
		name: "completion_records",
		modelName: "CompletionRecord",
		whereForOwner: habitOwnerWhere,
		references: [
			{ field: "habit_id", collection: "habits" },
			{
				field: "incompletion_reason_id",
				collection: "incompletion_reasons",
				optional: true,
			},
		],
	},
	{
		name: "streaks",
		modelName: "Streak",
		whereForOwner: habitOwnerWhere,
		references: [{ field: "habit_id", collection: "habits" }],
	},
	{ name: "daily_notes", modelName: "DailyNote", whereForOwner: userWhere },
	{
		name: "goals",
		modelName: "Goal",
		whereForOwner: habitOwnerWhere,
		references: [{ field: "habit_id", collection: "habits" }],
	},
	{
		name: "group_consistency_goals",
		modelName: "GroupConsistencyGoal",
		whereForOwner: userWhere,
	},
	{
		name: "temporary_challenges",
		modelName: "TemporaryChallenge",
		whereForOwner: habitOwnerWhere,
		references: [{ field: "habit_id", collection: "habits" }],
	},
	{
		name: "rewards",
		modelName: "Reward",
		whereForOwner: userWhere,
		references: [{ field: "goal_id", collection: "goals", optional: true }],
	},
	{
		name: "reminders",
		modelName: "Reminder",
		whereForOwner: (userId) => ({
			OR: [habitOwnerWhere(userId), eventOwnerWhere(userId)],
		}),
		references: [
			{ field: "habit_id", collection: "habits", optional: true },
			{ field: "event_id", collection: "events", optional: true },
		],
	},
	{
		name: "routine_templates",
		modelName: "RoutineTemplate",
		whereForOwner: userWhere,
	},
	{
		name: "habit_display_preferences",
		modelName: "HabitDisplayPreference",
		whereForOwner: userWhere,
	},
	{ name: "todo_tasks", modelName: "TodoTask", whereForOwner: userWhere },
	{
		name: "todo_categories",
		modelName: "TodoCategory",
		whereForOwner: userWhere,
	},
]

const syncCollectionByName = new Map(
	syncCollections.map((collection) => [collection.name, collection]),
)

export type { SyncCollection }
export { syncCollectionByName, syncCollections }
