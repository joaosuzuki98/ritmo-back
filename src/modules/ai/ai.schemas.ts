import { z } from "zod"

import { registry } from "../shared/openapi-registry.js"

const weekDaysSchema = z.array(z.number().int().min(1).max(7)).min(1).max(7)
const preferredTimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
const isoDateSchema = z.iso.date()
const isoDateTimeSchema = z.iso.datetime({ offset: true })
const goalDeadlineSchema = z.enum(["short_term", "medium_term", "long_term"])
const reminderTypeSchema = z.enum(["normal", "holiday", "important_day"])

const chatHistoryMessageSchema = z.object({
	role: z.enum(["user", "assistant"]).openapi({
		description: "Role of a previous message in the conversation.",
	}),
	content: z.string().min(1).max(2000).openapi({
		description: "Text content of a previous message.",
	}),
})

const aiTimeZoneSchema = z
	.string()
	.min(1)
	.max(100)
	.refine((timeZone) => {
		try {
			new Intl.DateTimeFormat("en-US", { timeZone }).format()
			return true
		} catch {
			return false
		}
	}, "Invalid IANA time zone")

const agentChatRequestSchema = registry.register(
	"AiAgentChatRequest",
	z
		.object({
			message: z.string().trim().min(1).max(2000),
			history: z.array(chatHistoryMessageSchema).max(10).default([]),
			timeZone: aiTimeZoneSchema.openapi({ example: "America/Sao_Paulo" }),
			language: z.enum(["pt", "en"]).optional().openapi({
				description:
					"App language used by default for replies. Omitted by older clients; defaults to Portuguese.",
				example: "en",
			}),
		})
		.strict(),
)

const proposalDecisionRequestSchema = registry.register(
	"AiProposalDecisionRequest",
	z.object({ decision: z.enum(["accepted", "rejected"]) }).strict(),
)

const proposalDecisionParamsSchema = z.object({
	proposalId: z.uuid(),
})

const proposalDecisionResponseSchema = registry.register(
	"AiProposalDecisionResponse",
	z.object({ status: z.enum(["accepted", "rejected"]) }),
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
					frequencyType: z.enum(["daily", "weekly"]).nullable(),
					weekDays: weekDaysSchema.nullable(),
					estimatedDurationMinutes: z.number().int().positive().nullable(),
					preferredTime: preferredTimeSchema.nullable(),
					priority: z.enum(["low", "medium", "high"]).nullable(),
					status: z
						.enum(["pending", "completed", "partial", "skipped", "paused"])
						.nullable(),
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
					frequencyType: z.enum(["daily", "weekly"]),
					weekDays: weekDaysSchema.nullable(),
					estimatedDurationMinutes: z.number().int().positive().nullable(),
					preferredTime: preferredTimeSchema.nullable(),
					priority: z.enum(["low", "medium", "high"]).nullable(),
					status: z
						.enum(["pending", "completed", "partial", "skipped", "paused"])
						.nullable(),
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
					targetValue: z.number().int().positive(),
					deadlineType: goalDeadlineSchema,
				}),
			}),
			z.object({
				type: z.literal("goal.update"),
				entityId: z.string().min(1).max(255),
				changes: z.object({
					description: z.string().trim().min(1).max(500).nullable(),
					targetValue: z.number().int().positive().nullable(),
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

type AiAgentChatRequest = z.infer<typeof agentChatRequestSchema>
type AiChatResponse = z.infer<typeof aiChatResponseSchema>
type AiModelResponse = z.infer<typeof aiModelResponseSchema>

export type { AiAgentChatRequest, AiChatResponse, AiModelResponse }
export {
	agentChatRequestSchema,
	aiChatResponseSchema,
	aiModelResponseSchema,
	aiProposalSchema,
	aiTimeZoneSchema,
	proposalDecisionParamsSchema,
	proposalDecisionRequestSchema,
	proposalDecisionResponseSchema,
}
