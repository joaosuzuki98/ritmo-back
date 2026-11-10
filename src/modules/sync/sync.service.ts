import { AppError, problemTypeUri } from "../shared/errors.js"
import { syncCollectionByName, syncCollections } from "./sync.collections.js"
import { syncRepository } from "./sync.repository.js"
import type { SyncPushRequest } from "./sync.schemas.js"

const invalidSyncRequest = (detail: string) =>
	new AppError({
		statusCode: 422,
		type: problemTypeUri("invalid-sync-request"),
		detail,
		code: "INVALID_SYNC_REQUEST",
	})

const assertUniqueIds = (
	collectionName: string,
	value: SyncPushRequest["changes"][string],
) => {
	const ids = [
		...value.created.map((record) => record.id),
		...value.updated.map((record) => record.id),
		...value.deleted,
	]
	if (ids.some((id) => typeof id !== "string" || id.length === 0)) {
		throw invalidSyncRequest(
			`Every record in '${collectionName}' must have a string id.`,
		)
	}
	if (new Set(ids).size !== ids.length) {
		throw invalidSyncRequest(
			`A record may only appear once in '${collectionName}' per push.`,
		)
	}
}

const pullChanges = async (userId: string, lastPulledAt: number | null) =>
	syncRepository.transaction(async (client) => {
		const currentTimestamp = await syncRepository.lockSyncState(client, userId)
		if (lastPulledAt !== null && BigInt(lastPulledAt) > currentTimestamp) {
			throw invalidSyncRequest(
				"lastPulledAt cannot be later than the server cursor.",
			)
		}
		const timestamp =
			lastPulledAt === null
				? await syncRepository.updateSyncTimestamp(
						client,
						userId,
						currentTimestamp,
					)
				: currentTimestamp
		const changes =
			lastPulledAt === null
				? await syncRepository.findAllForUser(client, userId)
				: await syncRepository.findChangesSince(
						client,
						userId,
						BigInt(lastPulledAt),
					)
		return { changes, timestamp: Number(timestamp) }
	})

const pushChanges = async (userId: string, input: SyncPushRequest) =>
	syncRepository.transaction(async (client) => {
		const currentTimestamp = await syncRepository.lockSyncState(client, userId)
		if (
			input.lastPulledAt !== null &&
			BigInt(input.lastPulledAt) > currentTimestamp
		) {
			throw invalidSyncRequest(
				"lastPulledAt cannot be later than the server cursor.",
			)
		}

		for (const [collectionName, changes] of Object.entries(input.changes)) {
			if (!syncCollectionByName.has(collectionName)) {
				throw invalidSyncRequest(`Unknown sync collection '${collectionName}'.`)
			}
			assertUniqueIds(collectionName, changes)
		}
		if (
			input.lastPulledAt === null &&
			Object.values(input.changes).some(
				(changes) => changes.updated.length > 0 || changes.deleted.length > 0,
			)
		) {
			throw invalidSyncRequest(
				"A client must pull the initial snapshot before updating or deleting records.",
			)
		}

		const totalChanges = Object.values(input.changes).reduce(
			(total, changes) =>
				total +
				changes.created.length +
				changes.updated.length +
				changes.deleted.length,
			0,
		)
		if (totalChanges === 0) return

		const lastPulledAt =
			input.lastPulledAt === null ? null : BigInt(input.lastPulledAt)
		for (const [collectionName, changes] of Object.entries(input.changes)) {
			for (const record of changes.updated) {
				await syncRepository.assertNoRemoteConflict(
					client,
					userId,
					collectionName,
					record.id as string,
					lastPulledAt,
				)
			}
			for (const id of changes.deleted) {
				await syncRepository.assertNoRemoteConflict(
					client,
					userId,
					collectionName,
					id,
					lastPulledAt,
				)
			}
		}

		const timestamp = await syncRepository.updateSyncTimestamp(
			client,
			userId,
			currentTimestamp,
		)
		for (const [collectionName, changes] of Object.entries(input.changes)) {
			for (const record of changes.created) {
				await syncRepository.pushRecord(
					client,
					userId,
					collectionName,
					"created",
					record,
					timestamp,
				)
			}
		}
		for (const [collectionName, changes] of Object.entries(input.changes)) {
			for (const record of changes.updated) {
				await syncRepository.pushRecord(
					client,
					userId,
					collectionName,
					"updated",
					record,
					timestamp,
				)
			}
		}
		for (const collection of [...syncCollections].reverse()) {
			const changes = input.changes[collection.name]
			if (!changes) continue
			for (const id of changes.deleted) {
				await syncRepository.deleteRecord(
					client,
					userId,
					collection.name,
					id,
					timestamp,
				)
			}
		}
	})

export const syncService = { pullChanges, pushChanges }
