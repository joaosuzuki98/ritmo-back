import { zodTextFormat } from "openai/helpers/zod"
import { describe, expect, it } from "vitest"

import {
	agentChatRequestSchema,
	aiChatResponseSchema,
	aiModelResponseSchema,
} from "./ai.schemas.js"

describe("AI chat schemas", () => {
	it("accepts the agent request and defaults the history", () => {
		expect(
			agentChatRequestSchema.parse({
				message: "Olá",
				timeZone: "America/Sao_Paulo",
				language: "pt",
			}),
		).toEqual({
			message: "Olá",
			timeZone: "America/Sao_Paulo",
			language: "pt",
			history: [],
		})
	})

	it("rejects oversized requests and client-supplied context", () => {
		expect(
			agentChatRequestSchema.safeParse({
				message: "a".repeat(2001),
				timeZone: "UTC",
			}).success,
		).toBe(false)
		expect(
			agentChatRequestSchema.safeParse({
				message: "Olá",
				timeZone: "UTC",
				context: { habits: [] },
			}).success,
		).toBe(false)
	})

	it("accepts supported changes and rejects deletion proposals", () => {
		expect(
			aiChatResponseSchema.safeParse({
				reply: "Posso atualizar.",
				proposal: {
					type: "habit.update",
					entityId: "habit-1",
					changes: {
						frequencyType: "daily",
						weekDays: [1, 3, 5],
						preferredTime: "08:30",
					},
				},
			}).success,
		).toBe(true)
		expect(
			aiChatResponseSchema.safeParse({
				reply: "Vou excluir.",
				proposal: { type: "habit.delete", entityId: "habit-1" },
			}).success,
		).toBe(false)
	})

	it.each([
		{
			type: "habit.create",
			habit: { name: "Caminhada", frequencyType: "daily" },
		},
		{
			type: "habit.completion.create",
			habitId: "h1",
			date: "2026-11-09",
			completionTime: "08:30",
		},
		{
			type: "todo.create",
			task: { title: "Comprar ração", category: "Pessoal" },
		},
		{ type: "todo.update", entityId: "t1", changes: { isComplete: true } },
		{
			type: "event.create",
			event: { title: "Consulta", dateTime: "2026-11-10T10:00:00-03:00" },
		},
		{
			type: "event.update",
			entityId: "e1",
			changes: { dateTime: "2026-11-10T11:00:00.000Z" },
		},
		{
			type: "goal.create",
			goal: {
				habitId: "h1",
				description: "Caminhar",
				targetValue: 20,
				deadlineType: "short_term",
			},
		},
		{ type: "goal.update", entityId: "g1", changes: { targetValue: 24 } },
	])("accepts a supported $type proposal", (proposal) => {
		expect(
			aiChatResponseSchema.safeParse({
				reply: "Posso preparar essa alteração.",
				proposal,
			}).success,
		).toBe(true)
	})

	it("converts the response schema to Responses structured output format", () => {
		expect(
			zodTextFormat(aiModelResponseSchema, "ai_chat_response"),
		).toMatchObject({
			type: "json_schema",
		})
	})
})
