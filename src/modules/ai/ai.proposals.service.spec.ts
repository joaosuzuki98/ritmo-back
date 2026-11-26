import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
	save: vi.fn(),
	decide: vi.fn(),
	applyTodo: vi.fn(),
	applyGoalUpdate: vi.fn(),
	applyGoalCreate: vi.fn(),
	applyEvent: vi.fn(),
	applyAiHabit: vi.fn(),
	applyAiCompletion: vi.fn(),
}))

vi.mock("./ai.proposals.repository.js", () => ({
	aiProposalsRepository: { save: mocks.save, decide: mocks.decide },
}))
vi.mock("../sync/index.js", () => ({
	applyAiHabit: mocks.applyAiHabit,
	applyAiCompletion: mocks.applyAiCompletion,
	syncAiMutations: {
		applyTodo: mocks.applyTodo,
		applyGoalUpdate: mocks.applyGoalUpdate,
		applyGoalCreate: mocks.applyGoalCreate,
		applyEvent: mocks.applyEvent,
	},
}))

let service: typeof import("./ai.proposals.service.js").aiProposalsService
const client = { transaction: true }

beforeAll(async () => {
	process.env.DATABASE_URL ??=
		"postgresql://test:test@127.0.0.1:5432/test?schema=public"
	process.env.PROBLEM_DETAILS_BASE_URL ??= "https://ritmoapp.com"
	;({ aiProposalsService: service } = await import("./ai.proposals.service.js"))
})

beforeEach(() => {
	vi.resetAllMocks()
	mocks.decide.mockImplementation(async (_user, _id, _decision, apply) => {
		await apply(client, {
			type: "todo.create",
			task: { title: "Comprar ração" },
		})
		return { status: "accepted" }
	})
})

describe("AI proposal decisions", () => {
	it("passes the authenticated user and transaction to the sync domain", async () => {
		await service.decide("user-1", "proposal-1", "accepted")
		expect(mocks.applyTodo).toHaveBeenCalledWith(client, "user-1", {
			type: "todo.create",
			task: { title: "Comprar ração" },
		})
		expect(mocks.decide).toHaveBeenCalledWith(
			"user-1",
			"proposal-1",
			"accepted",
			expect.any(Function),
		)
	})

	it("routes habit completions to the sync domain", async () => {
		mocks.decide.mockImplementation(async (_user, _id, _decision, apply) => {
			await apply(
				client,
				{
					type: "habit.completion.create",
					habitId: "habit-1",
					date: "2026-11-25",
				},
				"America/Sao_Paulo",
			)
		})
		await service.decide("user-1", "proposal-1", "accepted")
		expect(mocks.applyAiCompletion).toHaveBeenCalledWith(
			client,
			"user-1",
			expect.objectContaining({ habitId: "habit-1" }),
			"America/Sao_Paulo",
		)
	})

	it("routes goal changes through the sync domain", async () => {
		const proposal = {
			type: "goal.update",
			entityId: "goal-1",
			changes: { targetValue: 5 },
		}
		mocks.decide.mockImplementation(async (_user, _id, _decision, apply) => {
			await apply(client, proposal)
		})
		await service.decide("user-1", "proposal-1", "accepted")
		expect(mocks.applyGoalUpdate).toHaveBeenCalledWith(
			client,
			"user-1",
			proposal,
		)
	})
})
