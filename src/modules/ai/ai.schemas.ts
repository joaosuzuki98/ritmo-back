import { z } from "zod"

import { registry } from "../shared/openapi-registry.js"

const weekDaysSchema = z.array(z.number().int().min(1).max(7)).min(1).max(7)
const preferredTimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
const isoDateSchema = z.iso.date()
const isoDateTimeSchema = z.iso.datetime({ offset: true })
const goalDeadlineSchema = z.enum(["short_term", "medium_term", "long_term"])
const reminderTypeSchema = z.enum(["normal", "holiday", "important_day"])

const habitAnalyticsSchema = z.object({
	habitId: z.string().min(1).max(255),
	name: z.string().min(1).max(120),
	planned: z.number().int().nonnegative(),
	completed: z.number().int().nonnegative(),
	completionRate: z.number().min(0).max(1).nullable(),
	currentStreak: z.number().int().nonnegative().optional(),
	longestStreak: z.number().int().nonnegative().optional(),
	nextStreakMilestone: z.number().int().positive().nullable().optional(),
	periods: z
		.array(
			z.object({
				label: z.string().min(1).max(80),
				planned: z.number().int().nonnegative(),
				completed: z.number().int().nonnegative(),
				completionRate: z.number().min(0).max(1).nullable(),
			}),
		)
		.max(24)
		.optional(),
})

const statsContextSchema = z.object({
	periods: z
		.array(
			z.object({
				label: z.string().min(1).max(80),
				planned: z.number().int().nonnegative(),
				completed: z.number().int().nonnegative(),
				completionRate: z.number().min(0).max(1).nullable(),
			}),
		)
		.max(24)
		.optional(),
	habits: z.array(habitAnalyticsSchema).max(30).optional(),
	weekdays: z
		.array(
			z.object({
				weekDay: z.number().int().min(1).max(7),
				planned: z.number().int().nonnegative(),
				completed: z.number().int().nonnegative(),
				completionRate: z.number().min(0).max(1).nullable(),
			}),
		)
		.max(7)
		.optional(),
	timeOfDay: z
		.array(
			z.object({
				label: z.string().min(1).max(50),
				planned: z.number().int().nonnegative(),
				completed: z.number().int().nonnegative(),
				completionRate: z.number().min(0).max(1).nullable(),
			}),
		)
		.max(12)
		.optional(),
	incompletionReasons: z
		.array(
			z.object({
				reason: z.string().max(200),
				count: z.number().int().nonnegative(),
			}),
		)
		.max(20)
		.optional(),
	categories: z
		.array(
			z.object({
				name: z.string().max(100),
				habitCount: z.number().int().nonnegative(),
				completionRate: z.number().min(0).max(1).nullable(),
			}),
		)
		.max(30)
		.optional(),
	weeklyLoad: z
		.object({
			plannedSessions: z.number().int().nonnegative(),
			estimatedMinutes: z.number().nonnegative().nullable(),
			completionRate: z.number().min(0).max(1).nullable(),
		})
		.optional(),
	goals: z
		.array(
			z.object({
				goalId: z.string().min(1).max(255),
				habitId: z.string().min(1).max(255),
				description: z.string().max(500),
				targetValue: z.number().nonnegative(),
				currentValue: z.number().nonnegative(),
				remainingValue: z.number().nonnegative().nullable().optional(),
				recentPacePerWeek: z.number().nonnegative().nullable().optional(),
				deadlineType: z.string().max(50),
				status: z.string().max(50),
				projectedCompletionDate: isoDateSchema.nullable().optional(),
			}),
		)
		.max(30)
		.optional(),
	correlations: z
		.array(
			z.object({
				habitA: z.string().max(120),
				habitB: z.string().max(120),
				coefficient: z.number().min(-1).max(1),
				sampleSize: z.number().int().nonnegative(),
			}),
		)
		.max(100)
		.optional(),
})

const chatHistoryMessageSchema = z.object({
	role: z.enum(["user", "assistant"]).openapi({
		description: "Role of a previous message in the conversation.",
	}),
	content: z.string().min(1).max(2000).openapi({
		description: "Text content of a previous message.",
	}),
})

const habitContextSchema = z.object({
	id: z.string().min(1).max(255).openapi({ example: "habit-123" }),
	name: z.string().min(1).max(120).openapi({ example: "Caminhada" }),
	description: z.string().max(500).nullable().optional(),
	frequencyType: z.string().max(50).openapi({ example: "weekly" }),
	weekDays: weekDaysSchema.optional(),
	estimatedDurationMinutes: z.number().finite().nullable().optional(),
	preferredTime: preferredTimeSchema.nullable().optional(),
	priority: z.string().max(50).optional(),
	status: z.string().max(50).optional(),
})

const taskContextSchema = z.object({
	id: z.string().min(1).max(255),
	title: z.string().max(200),
	category: z.string().max(100),
	isComplete: z.boolean(),
})

const eventContextSchema = z.object({
	id: z.string().min(1).max(255),
	title: z.string().max(200),
	dateTime: isoDateTimeSchema,
})

const goalContextSchema = z.object({
	id: z.string().min(1).max(255),
	habitId: z.string().min(1).max(255),
	description: z.string().max(500),
})

const chatRequestSchema = registry.register(
	"AiChatRequest",
	z.object({
		message: z.string().trim().min(1).max(2000).openapi({
			example: "Quero mudar minha caminhada para todos os dias.",
		}),
		mode: z.enum(["chat", "statistics"]).default("chat").openapi({
			description:
				"Use statistics mode for aggregate-only insights; it never returns action proposals.",
			example: "statistics",
		}),
		history: z.array(chatHistoryMessageSchema).max(10).default([]),
		context: z
			.object({
				habits: z.array(habitContextSchema).max(30).default([]),
				tasks: z.array(taskContextSchema).max(100).default([]),
				events: z.array(eventContextSchema).max(100).default([]),
				goals: z.array(goalContextSchema).max(100).default([]),
				statistics: statsContextSchema.optional(),
			})
			.default({ habits: [], tasks: [], events: [], goals: [] }),
	}),
)

const habitUpdateChangesSchema = z.object({
	name: z.string().min(1).max(120).optional(),
	description: z.string().max(500).nullable().optional(),
	frequencyType: z.string().min(1).max(50).optional(),
	weekDays: weekDaysSchema.optional(),
	estimatedDurationMinutes: z
		.number()
		.finite()
		.nonnegative()
		.nullable()
		.optional(),
	preferredTime: preferredTimeSchema.nullable().optional(),
	priority: z.string().min(1).max(50).optional(),
	status: z.string().min(1).max(50).optional(),
})

const aiProposalSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("habit.update"),
		entityId: z.string().min(1).max(255),
		changes: habitUpdateChangesSchema,
	}),
	z.object({
		type: z.literal("habit.create"),
		habit: z.object({
			name: z.string().min(1).max(120),
			categoryName: z.string().trim().min(1).max(100).optional(),
			description: z.string().max(500).nullable().optional(),
			frequencyType: z.string().min(1).max(50),
			weekDays: weekDaysSchema.optional(),
			estimatedDurationMinutes: z
				.number()
				.finite()
				.nonnegative()
				.nullable()
				.optional(),
			preferredTime: preferredTimeSchema.nullable().optional(),
			priority: z.string().min(1).max(50).optional(),
			status: z.string().min(1).max(50).optional(),
		}),
	}),
	z.object({
		type: z.literal("habit.completion.create"),
		habitId: z.string().min(1).max(255),
		date: isoDateSchema,
		completionTime: preferredTimeSchema.optional(),
		note: z.string().max(500).optional(),
	}),
	z.object({
		type: z.literal("todo.create"),
		task: z.object({
			title: z.string().min(1).max(200),
			category: z.string().trim().min(1).max(100).optional(),
		}),
	}),
	z.object({
		type: z.literal("todo.update"),
		entityId: z.string().min(1).max(255),
		changes: z.object({
			title: z.string().min(1).max(200).optional(),
			category: z.string().trim().min(1).max(100).optional(),
			isComplete: z.boolean().optional(),
		}),
	}),
	z.object({
		type: z.literal("event.create"),
		event: z.object({
			title: z.string().min(1).max(200),
			dateTime: isoDateTimeSchema,
			endTime: isoDateTimeSchema.optional(),
			location: z.string().max(200).optional(),
			description: z.string().max(500).optional(),
			reminderType: reminderTypeSchema.optional(),
		}),
	}),
	z.object({
		type: z.literal("event.update"),
		entityId: z.string().min(1).max(255),
		changes: z.object({
			title: z.string().min(1).max(200).optional(),
			dateTime: isoDateTimeSchema.optional(),
			endTime: isoDateTimeSchema.nullable().optional(),
			location: z.string().max(200).nullable().optional(),
			description: z.string().max(500).nullable().optional(),
			reminderType: reminderTypeSchema.optional(),
		}),
	}),
	z.object({
		type: z.literal("goal.create"),
		goal: z.object({
			habitId: z.string().min(1).max(255),
			description: z.string().trim().min(1).max(500),
			targetValue: z.number().finite().positive(),
			deadlineType: goalDeadlineSchema,
		}),
	}),
	z.object({
		type: z.literal("goal.update"),
		entityId: z.string().min(1).max(255),
		changes: z.object({
			description: z.string().trim().min(1).max(500).optional(),
			targetValue: z.number().finite().positive().optional(),
			deadlineType: goalDeadlineSchema.optional(),
		}),
	}),
])

const aiModelResponseSchema = z.object({
	reply: z.string().min(1).max(4000),
	proposal: z
		.discriminatedUnion("type", [
			z.object({
				type: z.literal("habit.update"),
				entityId: z.string().min(1).max(255),
				changes: z.object({
					name: z.string().min(1).max(120).nullable(),
					description: z.string().max(500).nullable(),
					frequencyType: z.string().min(1).max(50).nullable(),
					weekDays: weekDaysSchema.nullable(),
					estimatedDurationMinutes: z
						.number()
						.finite()
						.nonnegative()
						.nullable(),
					preferredTime: preferredTimeSchema.nullable(),
					priority: z.string().min(1).max(50).nullable(),
					status: z.string().min(1).max(50).nullable(),
				}),
				clearFields: z
					.array(
						z.enum([
							"description",
							"estimatedDurationMinutes",
							"preferredTime",
						]),
					)
					.max(3),
			}),
			z.object({
				type: z.literal("habit.create"),
				habit: z.object({
					name: z.string().min(1).max(120),
					categoryName: z.string().trim().min(1).max(100).nullable(),
					description: z.string().max(500).nullable(),
					frequencyType: z.string().min(1).max(50),
					weekDays: weekDaysSchema.nullable(),
					estimatedDurationMinutes: z
						.number()
						.finite()
						.nonnegative()
						.nullable(),
					preferredTime: preferredTimeSchema.nullable(),
					priority: z.string().min(1).max(50).nullable(),
					status: z.string().min(1).max(50).nullable(),
				}),
			}),
			z.object({
				type: z.literal("habit.completion.create"),
				habitId: z.string().min(1).max(255),
				date: isoDateSchema,
				completionTime: preferredTimeSchema.nullable(),
				note: z.string().max(500).nullable(),
			}),
			z.object({
				type: z.literal("todo.create"),
				task: z.object({
					title: z.string().min(1).max(200),
					category: z.string().trim().min(1).max(100).nullable(),
				}),
			}),
			z.object({
				type: z.literal("todo.update"),
				entityId: z.string().min(1).max(255),
				changes: z.object({
					title: z.string().min(1).max(200).nullable(),
					category: z.string().trim().min(1).max(100).nullable(),
					isComplete: z.boolean().nullable(),
				}),
			}),
			z.object({
				type: z.literal("event.create"),
				event: z.object({
					title: z.string().min(1).max(200),
					dateTime: isoDateTimeSchema,
					endTime: isoDateTimeSchema.nullable(),
					location: z.string().max(200).nullable(),
					description: z.string().max(500).nullable(),
					reminderType: reminderTypeSchema.nullable(),
				}),
			}),
			z.object({
				type: z.literal("event.update"),
				entityId: z.string().min(1).max(255),
				changes: z.object({
					title: z.string().min(1).max(200).nullable(),
					dateTime: isoDateTimeSchema.nullable(),
					endTime: isoDateTimeSchema.nullable(),
					location: z.string().max(200).nullable(),
					description: z.string().max(500).nullable(),
					reminderType: reminderTypeSchema.nullable(),
				}),
				clearFields: z
					.array(z.enum(["endTime", "location", "description"]))
					.max(3),
			}),
			z.object({
				type: z.literal("goal.create"),
				goal: z.object({
					habitId: z.string().min(1).max(255),
					description: z.string().trim().min(1).max(500),
					targetValue: z.number().finite().positive(),
					deadlineType: goalDeadlineSchema,
				}),
			}),
			z.object({
				type: z.literal("goal.update"),
				entityId: z.string().min(1).max(255),
				changes: z.object({
					description: z.string().trim().min(1).max(500).nullable(),
					targetValue: z.number().finite().positive().nullable(),
					deadlineType: goalDeadlineSchema.nullable(),
				}),
			}),
		])
		.nullable(),
})

const aiChatResponseSchema = registry.register(
	"AiChatResponse",
	z.object({
		reply: z.string().min(1).max(4000).openapi({
			example: "Posso mudar sua caminhada para todos os dias.",
		}),
		proposal: aiProposalSchema.nullable(),
	}),
)

type AiChatRequest = z.infer<typeof chatRequestSchema>
type AiChatResponse = z.infer<typeof aiChatResponseSchema>
type AiModelResponse = z.infer<typeof aiModelResponseSchema>

export type { AiChatRequest, AiChatResponse, AiModelResponse }
export {
	aiChatResponseSchema,
	aiModelResponseSchema,
	aiProposalSchema,
	chatRequestSchema,
	habitContextSchema,
}
