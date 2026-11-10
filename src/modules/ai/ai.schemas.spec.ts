import { zodResponseFormat } from "openai/helpers/zod"
import { describe, expect, it } from "vitest"

import {
	aiChatResponseSchema,
	aiModelResponseSchema,
	chatRequestSchema,
} from "./ai.schemas.js"

describe("AI chat schemas", () => {
	it("accepts a bounded request and supplies empty context defaults", () => {
		expect(chatRequestSchema.parse({ message: "Olá" })).toMatchObject({
			message: "Olá",
			mode: "chat",
			history: [],
			context: { habits: [], tasks: [], events: [], goals: [] },
		})
	})

	it("accepts bounded entity and aggregate context for the new actions", () => {
		const request = chatRequestSchema.safeParse({
			message: "Como foi minha semana?",
			context: {
				habits: [{ id: "habit-1", name: "Caminhada", frequencyType: "daily" }],
				tasks: [
					{
						id: "task-1",
						title: "Comprar ração",
						category: "Pessoal",
						isComplete: false,
					},
				],
				events: [
					{
						id: "event-1",
						title: "Consulta",
						dateTime: "2026-11-10T10:00:00.000Z",
					},
				],
				goals: [{ id: "goal-1", habitId: "habit-1", description: "Caminhar" }],
				statistics: {
					periods: [
						{
							label: "Esta semana",
							planned: 7,
							completed: 5,
							completionRate: 5 / 7,
						},
					],
					weekdays: [
						{
							weekDay: 1,
							planned: 1,
							completed: 1,
							completionRate: 1,
						},
					],
					timeOfDay: [
						{
							label: "manhã",
							planned: 3,
							completed: 2,
							completionRate: 2 / 3,
						},
					],
					habits: [
						{
							habitId: "habit-1",
							name: "Caminhada",
							planned: 7,
							completed: 5,
							completionRate: 5 / 7,
							currentStreak: 3,
							longestStreak: 6,
							nextStreakMilestone: 5,
						},
					],
					correlations: [
						{
							habitA: "Caminhada",
							habitB: "Leitura",
							coefficient: 0.5,
							sampleSize: 12,
						},
					],
				},
			},
		})

		expect(request.success).toBe(true)
	})

	it("accepts the app's weekday array and local HH:mm time formats", () => {
		const appRequest = {
			message: "Atualize meu hábito",
			context: {
				habits: [
					{
						id: "habit-1",
						name: "Caminhada",
						frequencyType: "weekly",
						weekDays: [1, 3, 5],
						preferredTime: "08:30",
					},
				],
			},
		}

		expect(chatRequestSchema.safeParse(appRequest).success).toBe(true)
		expect(
			chatRequestSchema.safeParse({
				...appRequest,
				context: {
					habits: [
						{
							...appRequest.context.habits[0],
							weekDays: "[1,3,5]",
							preferredTime: 1770000000000,
						},
					],
				},
			}).success,
		).toBe(false)
	})

	it("rejects requests that exceed message and context limits", () => {
		expect(
			chatRequestSchema.safeParse({ message: "a".repeat(2001) }).success,
		).toBe(false)
		expect(
			chatRequestSchema.safeParse({
				message: "Olá",
				context: {
					habits: Array.from({ length: 31 }, (_, index) => ({
						id: `habit-${index}`,
						name: "Hábito",
						frequencyType: "daily",
					})),
				},
			}).success,
		).toBe(false)
	})

	it("accepts only a supported habit update proposal", () => {
		expect(
			aiChatResponseSchema.safeParse({
				reply: "Posso atualizar o hábito.",
				proposal: {
					type: "habit.update",
					entityId: "habit-1",
					changes: { frequencyType: "daily" },
				},
			}).success,
		).toBe(true)
		expect(
			aiChatResponseSchema.safeParse({
				reply: "Vou excluir o hábito.",
				proposal: { type: "habit.delete", entityId: "habit-1" },
			}).success,
		).toBe(false)
	})

	it("accepts a habit creation proposal without a client-generated id", () => {
		expect(
			aiChatResponseSchema.safeParse({
				reply: "Posso criar esse hábito.",
				proposal: {
					type: "habit.create",
					habit: {
						name: "Caminhada",
						categoryName: "Saúde",
						frequencyType: "daily",
					},
				},
			}).success,
		).toBe(true)
	})

	it("validates update proposals using the app's time and weekday types", () => {
		expect(
			aiChatResponseSchema.safeParse({
				reply: "Posso ajustar os dias e o horário.",
				proposal: {
					type: "habit.update",
					entityId: "habit-1",
					changes: {
						weekDays: [1, 3, 5],
						preferredTime: "08:30",
					},
				},
			}).success,
		).toBe(true)
	})

	it.each([
		{
			type: "habit.completion.create",
			habitId: "habit-1",
			date: "2026-11-09",
			completionTime: "08:30",
		},
		{
			type: "todo.create",
			task: { title: "Comprar ração", category: "Pessoal" },
		},
		{
			type: "todo.update",
			entityId: "task-1",
			changes: { isComplete: true },
		},
		{
			type: "event.create",
			event: {
				title: "Consulta",
				dateTime: "2026-11-10T10:00:00-03:00",
			},
		},
		{
			type: "event.update",
			entityId: "event-1",
			changes: { dateTime: "2026-11-10T11:00:00.000Z" },
		},
		{
			type: "goal.create",
			goal: {
				habitId: "habit-1",
				description: "Caminhar 20 vezes",
				targetValue: 20,
				deadlineType: "short_term",
			},
		},
		{
			type: "goal.update",
			entityId: "goal-1",
			changes: { targetValue: 24 },
		},
	])("accepts a supported $type proposal", (proposal) => {
		expect(
			aiChatResponseSchema.safeParse({
				reply: "Posso preparar essa alteração para sua confirmação.",
				proposal,
			}).success,
		).toBe(true)
	})

	it("converts the response schema to an OpenAI structured output format", () => {
		expect(
			zodResponseFormat(aiModelResponseSchema, "ai_chat_response"),
		).toMatchObject({
			type: "json_schema",
		})
	})
})
