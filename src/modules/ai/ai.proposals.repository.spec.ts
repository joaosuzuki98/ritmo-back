import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
	const client = {
		aiProposal: {
			create: vi.fn(),
			findFirst: vi.fn(),
			updateMany: vi.fn(),
		},
	}
	return {
		client,
		prisma: {
			aiProposal: client.aiProposal,
			$transaction: vi.fn(
				async (callback: (transaction: typeof client) => Promise<unknown>) =>
					callback(client),
			),
		},
	}
})

vi.mock("../shared/database.js", () => ({ prisma: mocks.prisma }))

let repository: typeof import("./ai.proposals.repository.js").aiProposalsRepository

beforeAll(async () => {
	process.env.DATABASE_URL ??=
		"postgresql://test:test@127.0.0.1:5432/test?schema=public"
	process.env.PROBLEM_DETAILS_BASE_URL ??= "https://ritmoapp.com"
	;({ aiProposalsRepository: repository } = await import(
		"./ai.proposals.repository.js"
	))
})

const payload = {
	type: "todo.create" as const,
	task: { title: "Comprar ração" },
}
const pending = {
	id: "proposal-1",
	userId: "user-1",
	status: "pending",
	timeZone: "America/Sao_Paulo",
	expiresAt: new Date("2099-01-01T00:00:00Z"),
	payload,
}

beforeEach(() => {
	vi.clearAllMocks()
	mocks.client.aiProposal.findFirst.mockResolvedValue(pending)
	mocks.client.aiProposal.updateMany.mockResolvedValue({ count: 1 })
})

describe("AI proposal storage", () => {
	it("stores validated proposals for the authenticated user with an expiry", async () => {
		mocks.client.aiProposal.create.mockResolvedValue({ id: "proposal-1" })
		await repository.save("user-1", payload, "America/Sao_Paulo")
		expect(mocks.client.aiProposal.create).toHaveBeenCalledWith({
			data: {
				userId: "user-1",
				payload,
				timeZone: "America/Sao_Paulo",
				expiresAt: expect.any(Date),
			},
			select: { id: true, expiresAt: true },
		})
	})

	it("claims and applies an accepted proposal in the same transaction", async () => {
		const apply = vi.fn().mockResolvedValue(undefined)
		await expect(
			repository.decide("user-1", "proposal-1", "accepted", apply),
		).resolves.toEqual({ status: "accepted" })
		expect(mocks.client.aiProposal.findFirst).toHaveBeenCalledWith({
			where: { id: "proposal-1", userId: "user-1" },
		})
		expect(mocks.client.aiProposal.updateMany).toHaveBeenCalledWith({
			where: {
				id: "proposal-1",
				userId: "user-1",
				status: "pending",
				expiresAt: { gt: expect.any(Date) },
			},
			data: { status: "accepted" },
		})
		expect(apply).toHaveBeenCalledWith(
			mocks.client,
			payload,
			"America/Sao_Paulo",
		)
	})

	it("never applies rejected proposals", async () => {
		const apply = vi.fn()
		await expect(
			repository.decide("user-1", "proposal-1", "rejected", apply),
		).resolves.toEqual({ status: "rejected" })
		expect(apply).not.toHaveBeenCalled()
	})

	it("does not reveal proposals belonging to another user", async () => {
		mocks.client.aiProposal.findFirst.mockResolvedValue(null)
		const apply = vi.fn()
		await expect(
			repository.decide("other-user", "proposal-1", "accepted", apply),
		).rejects.toMatchObject({ code: "AI_PROPOSAL_NOT_FOUND" })
		expect(mocks.client.aiProposal.updateMany).not.toHaveBeenCalled()
		expect(apply).not.toHaveBeenCalled()
	})

	it("is idempotent for repeated decisions and rejects opposite decisions", async () => {
		const apply = vi.fn()
		mocks.client.aiProposal.findFirst.mockResolvedValue({
			...pending,
			status: "accepted",
		})
		await expect(
			repository.decide("user-1", "proposal-1", "accepted", apply),
		).resolves.toEqual({ status: "accepted" })
		await expect(
			repository.decide("user-1", "proposal-1", "rejected", apply),
		).rejects.toMatchObject({ code: "AI_PROPOSAL_CONFLICT" })
		expect(apply).not.toHaveBeenCalled()
	})

	it("does not apply expired or malformed proposals", async () => {
		const apply = vi.fn()
		mocks.client.aiProposal.findFirst.mockResolvedValue({
			...pending,
			expiresAt: new Date("2000-01-01"),
		})
		await expect(
			repository.decide("user-1", "proposal-1", "accepted", apply),
		).rejects.toMatchObject({ code: "AI_PROPOSAL_CONFLICT" })
		mocks.client.aiProposal.findFirst.mockResolvedValue({
			...pending,
			payload: { type: "habit.delete" },
		})
		await expect(
			repository.decide("user-1", "proposal-1", "accepted", apply),
		).rejects.toMatchObject({ code: "INVALID_AI_PROPOSAL" })
		expect(apply).not.toHaveBeenCalled()
	})

	it("fails closed when the proposal has no valid time zone", async () => {
		const apply = vi.fn()
		mocks.client.aiProposal.findFirst.mockResolvedValue({
			...pending,
			timeZone: null,
		})
		await expect(
			repository.decide("user-1", "proposal-1", "accepted", apply),
		).rejects.toMatchObject({ code: "AI_PROPOSAL_TIME_ZONE_UNAVAILABLE" })
		expect(apply).not.toHaveBeenCalled()
		expect(mocks.client.aiProposal.updateMany).not.toHaveBeenCalled()
	})

	it("allows rejection of a legacy proposal without a time zone", async () => {
		mocks.client.aiProposal.findFirst.mockResolvedValue({
			...pending,
			timeZone: null,
		})
		const apply = vi.fn()
		await expect(
			repository.decide("user-1", "proposal-1", "rejected", apply),
		).resolves.toEqual({ status: "rejected" })
		expect(apply).not.toHaveBeenCalled()
	})

	it("rejects an invalid time zone when storing a proposal", async () => {
		await expect(
			repository.save("user-1", payload, "Invalid/Zone"),
		).rejects.toThrow()
		expect(mocks.client.aiProposal.create).not.toHaveBeenCalled()
	})

	it("does not apply twice when a concurrent decision has already won", async () => {
		const apply = vi.fn()
		mocks.client.aiProposal.updateMany.mockResolvedValue({ count: 0 })
		mocks.client.aiProposal.findFirst
			.mockResolvedValueOnce(pending)
			.mockResolvedValueOnce({ status: "accepted" })
		await expect(
			repository.decide("user-1", "proposal-1", "accepted", apply),
		).resolves.toEqual({ status: "accepted" })
		expect(apply).not.toHaveBeenCalled()
	})

	it("propagates failed changes so the transaction can roll back", async () => {
		const apply = vi.fn().mockRejectedValue(new Error("write failed"))
		await expect(
			repository.decide("user-1", "proposal-1", "accepted", apply),
		).rejects.toThrow("write failed")
		expect(mocks.prisma.$transaction).toHaveBeenCalledOnce()
	})
})
