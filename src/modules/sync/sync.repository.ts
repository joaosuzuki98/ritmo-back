import { Prisma } from "@prisma/client"

import { prisma } from "../shared/database.js"
import { AppError, problemTypeUri } from "../shared/errors.js"
import { syncCollectionByName, syncCollections } from "./sync.collections.js"

type SyncRecord = Record<string, unknown> & { id: string }
type SyncDelegate = {
	findFirst: (args: Record<string, unknown>) => Promise<SyncRecord | null>
	findMany: (args: Record<string, unknown>) => Promise<SyncRecord[]>
	create: (args: Record<string, unknown>) => Promise<SyncRecord>
	update: (args: Record<string, unknown>) => Promise<SyncRecord>
	delete: (args: Record<string, unknown>) => Promise<SyncRecord>
}
type ModelField = {
	name: string
	dbName: string | null
	kind: string
	type: string
	isRequired: boolean
	hasDefaultValue: boolean
}
type ModelInfo = { name: string; fields: ModelField[] }

const modelInfos = Prisma.dmmf.datamodel.models as unknown as ModelInfo[]

const getModelInfo = (modelName: string) => {
	const info = modelInfos.find((model) => model.name === modelName)
	if (!info) throw new Error(`Unknown sync model: ${modelName}`)
	return info
}

const getDelegate = (
	client: Prisma.TransactionClient,
	modelName: string,
): SyncDelegate => {
	const delegateName = `${modelName[0]?.toLowerCase()}${modelName.slice(1)}`
	const delegate = (client as unknown as Record<string, SyncDelegate>)[
		delegateName
	]
	if (!delegate) throw new Error(`Missing Prisma delegate: ${delegateName}`)
	return delegate
}

const fieldBySyncName = (modelName: string, syncName: string) =>
	getModelInfo(modelName).fields.find(
		(field) =>
			field.kind === "scalar" && (field.dbName ?? field.name) === syncName,
	) ??
	getModelInfo(modelName).fields.find(
		(field) => field.kind === "scalar" && field.name === syncName,
	)

const getSyncFieldName = (modelName: string, fieldName: string) => {
	const field = getModelInfo(modelName).fields.find(
		(candidate) => candidate.name === fieldName,
	)
	return field?.dbName ?? field?.name
}

const invalidSyncData = (detail: string) =>
	new AppError({
		statusCode: 422,
		type: problemTypeUri("invalid-sync-data"),
		detail,
		code: "INVALID_SYNC_DATA",
	})

const withSyncConflict = async <T>(
	operation: () => Promise<T>,
	detail: string,
) => {
	try {
		return await operation()
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			["P2002", "P2003", "P2025"].includes(error.code)
		) {
			throw new AppError({
				statusCode: 409,
				type: problemTypeUri("sync-conflict"),
				detail,
				code: "SYNC_CONFLICT",
			})
		}
		throw error
	}
}

const getRecordId = (record: Record<string, unknown>) => {
	if (
		typeof record.id !== "string" ||
		record.id.length === 0 ||
		record.id.length > 255
	) {
		throw invalidSyncData("Every synced record must have a valid string id.")
	}
	return record.id
}

const getDelegateForCollection = (
	client: Prisma.TransactionClient,
	collectionName: string,
) => {
	const collection = syncCollectionByName.get(collectionName)
	if (!collection)
		throw invalidSyncData(`Unknown sync collection: ${collectionName}.`)
	return { collection, delegate: getDelegate(client, collection.modelName) }
}

const ownerWhere = (collectionName: string, userId: string) => {
	const collection = syncCollectionByName.get(collectionName)
	if (!collection)
		throw invalidSyncData(`Unknown sync collection: ${collectionName}.`)
	return collection.whereForOwner(userId)
}

const serializeValue = (value: unknown): unknown => {
	if (typeof value === "bigint") return Number(value)
	if (Array.isArray(value)) return value.map(serializeValue)
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([key, nested]) => [
				key,
				serializeValue(nested),
			]),
		)
	}
	return value
}

const serializeRecord = (modelName: string, record: SyncRecord) => {
	const model = getModelInfo(modelName)
	return Object.fromEntries(
		model.fields
			.filter((field) => field.kind === "scalar" && field.name in record)
			.map((field) => [
				field.dbName ?? field.name,
				serializeValue(record[field.name]),
			]),
	)
}

const toPrismaData = (
	collectionName: string,
	userId: string,
	record: Record<string, unknown>,
	operation: "created" | "updated",
) => {
	const collection = syncCollectionByName.get(collectionName)
	if (!collection)
		throw invalidSyncData(`Unknown sync collection: ${collectionName}.`)
	const model = getModelInfo(collection.modelName)
	const data: Record<string, unknown> = {}
	for (const [syncName, value] of Object.entries(record)) {
		const field = fieldBySyncName(collection.modelName, syncName)
		if (!field)
			throw invalidSyncData(
				`Unknown field '${syncName}' for '${collectionName}'.`,
			)
		if (field.name === "id" || field.name === "updatedAt") continue
		if (operation === "updated" && field.name === "createdAt") continue
		if (
			collection.writeFields &&
			!collection.writeFields.includes(field.dbName ?? field.name)
		) {
			continue
		}
		if (field.name === "userId") {
			if (value !== undefined && value !== userId) {
				throw new AppError({
					statusCode: 403,
					type: problemTypeUri("forbidden-sync-record"),
					detail: "A sync record cannot belong to another user.",
					code: "FORBIDDEN_SYNC_RECORD",
				})
			}
			continue
		}
		if (field.type === "BigInt" && value !== null) {
			if (typeof value !== "number" || !Number.isSafeInteger(value)) {
				throw invalidSyncData(`Field '${syncName}' must be a safe integer.`)
			}
			data[field.name] = BigInt(value)
			continue
		}
		data[field.name] = value
	}
	if (
		model.fields.some((field) => field.name === "userId") &&
		collection.modelName !== "User"
	) {
		data.userId = userId
	}
	if (operation === "created") {
		const missingRequiredField = model.fields.find(
			(field) =>
				field.kind === "scalar" &&
				field.isRequired &&
				!field.hasDefaultValue &&
				field.name !== "id" &&
				field.name !== "updatedAt" &&
				!(field.name in data),
		)
		if (missingRequiredField) {
			throw invalidSyncData(
				`Field '${missingRequiredField.dbName ?? missingRequiredField.name}' is required for '${collectionName}'.`,
			)
		}
	}
	return data
}

const verifyReferences = async (
	client: Prisma.TransactionClient,
	collectionName: string,
	userId: string,
	data: Record<string, unknown>,
) => {
	const collection = syncCollectionByName.get(collectionName)
	if (!collection?.references) return
	for (const reference of collection.references) {
		const fieldName = getSyncFieldName(collection.modelName, reference.field)
		if (!fieldName || !(fieldName in data)) continue
		const referencedId = data[fieldName]
		if (referencedId === null && reference.optional) continue
		if (typeof referencedId !== "string") {
			throw invalidSyncData(
				`Field '${reference.field}' must reference a valid record.`,
			)
		}
		const { delegate } = getDelegateForCollection(client, reference.collection)
		const referencedRecord = await delegate.findFirst({
			where: {
				AND: [ownerWhere(reference.collection, userId), { id: referencedId }],
			},
			select: { id: true },
		})
		if (!referencedRecord) {
			throw new AppError({
				statusCode: 409,
				type: problemTypeUri("sync-reference-conflict"),
				detail: `Referenced record '${referencedId}' is unavailable to this user.`,
				code: "SYNC_REFERENCE_CONFLICT",
			})
		}
	}
}

const lockSyncState = async (
	client: Prisma.TransactionClient,
	userId: string,
) => {
	await client.syncState.upsert({
		where: { userId },
		create: { userId, timestamp: BigInt(Date.now()) },
		update: {},
	})
	const rows = await client.$queryRaw<{ timestamp: bigint }[]>`
		SELECT "timestamp" FROM "sync_states" WHERE "user_id" = ${userId} FOR UPDATE
	`
	const state = rows[0]
	if (!state) throw new Error("Could not lock sync state.")
	return state.timestamp
}

const updateSyncTimestamp = async (
	client: Prisma.TransactionClient,
	userId: string,
	previousTimestamp: bigint,
) => {
	const timestamp = BigInt(Math.max(Date.now(), Number(previousTimestamp) + 1))
	await client.syncState.update({ where: { userId }, data: { timestamp } })
	return timestamp
}

const assertNoRemoteConflict = async (
	client: Prisma.TransactionClient,
	userId: string,
	collectionName: string,
	recordId: string,
	lastPulledAt: bigint | null,
) => {
	if (lastPulledAt === null) return
	const conflict = await client.syncChange.findFirst({
		where: {
			userId,
			tableName: collectionName,
			recordId,
			changedAt: { gt: lastPulledAt },
		},
		select: { id: true },
	})
	if (conflict) {
		throw new AppError({
			statusCode: 409,
			type: problemTypeUri("sync-conflict"),
			detail: `Record '${recordId}' changed on the server after the last pull.`,
			code: "SYNC_CONFLICT",
		})
	}
}

const findAllForUser = async (
	client: Prisma.TransactionClient,
	userId: string,
) => {
	const changes: Record<
		string,
		{ created: unknown[]; updated: unknown[]; deleted: string[] }
	> = {}
	for (const collection of syncCollections) {
		const delegate = getDelegate(client, collection.modelName)
		const records = await delegate.findMany({
			where: collection.whereForOwner(userId),
			orderBy: { id: "asc" },
		})
		changes[collection.name] = {
			created: records.map((record) =>
				serializeRecord(collection.modelName, record),
			),
			updated: [],
			deleted: [],
		}
	}
	return changes
}

const findChangesSince = async (
	client: Prisma.TransactionClient,
	userId: string,
	lastPulledAt: bigint,
) => {
	const logs = await client.syncChange.findMany({
		where: { userId, changedAt: { gt: lastPulledAt } },
		orderBy: { changedAt: "asc" },
	})
	const latestByRecord = new Map<string, (typeof logs)[number]>()
	for (const log of logs)
		latestByRecord.set(`${log.tableName}:${log.recordId}`, log)

	const changes: Record<
		string,
		{ created: unknown[]; updated: unknown[]; deleted: string[] }
	> = {}
	for (const collection of syncCollections) {
		const collectionLogs = [...latestByRecord.values()].filter(
			(log) => log.tableName === collection.name,
		)
		const deleted = collectionLogs
			.filter((log) => log.operation === "deleted")
			.map((log) => log.recordId)
		const upsertLogs = collectionLogs.filter(
			(log) => log.operation !== "deleted",
		)
		const ids = upsertLogs.map((log) => log.recordId)
		const records = ids.length
			? await getDelegate(client, collection.modelName).findMany({
					where: {
						AND: [collection.whereForOwner(userId), { id: { in: ids } }],
					},
				})
			: []
		const recordsById = new Map(records.map((record) => [record.id, record]))
		const created: unknown[] = []
		const updated: unknown[] = []
		for (const log of upsertLogs) {
			const record = recordsById.get(log.recordId)
			if (!record) {
				deleted.push(log.recordId)
			} else if (log.operation === "created") {
				created.push(serializeRecord(collection.modelName, record))
			} else {
				updated.push(serializeRecord(collection.modelName, record))
			}
		}
		changes[collection.name] = { created, updated, deleted }
	}
	return changes
}

const pushRecord = async (
	client: Prisma.TransactionClient,
	userId: string,
	collectionName: string,
	operation: "created" | "updated",
	record: Record<string, unknown>,
	timestamp: bigint,
) => {
	const { collection, delegate } = getDelegateForCollection(
		client,
		collectionName,
	)
	if (
		collection.readOnly ||
		(operation === "created" && collection.createDisabled)
	) {
		throw invalidSyncData(`Writes are not allowed for '${collectionName}'.`)
	}
	const id = getRecordId(record)
	const data = toPrismaData(collectionName, userId, record, operation)
	await verifyReferences(client, collectionName, userId, data)
	const where = { AND: [collection.whereForOwner(userId), { id }] }

	if (operation === "created") {
		const existing = await delegate.findFirst({
			where: { id },
			select: { id: true },
		})
		if (existing) {
			throw new AppError({
				statusCode: 409,
				type: problemTypeUri("sync-conflict"),
				detail: `Record '${id}' already exists.`,
				code: "SYNC_CONFLICT",
			})
		}
		await withSyncConflict(
			() => delegate.create({ data: { ...data, id, updatedAt: timestamp } }),
			`Could not create record '${id}' because it conflicts with existing data.`,
		)
	} else {
		const existing = await delegate.findFirst({ where, select: { id: true } })
		if (!existing) {
			throw new AppError({
				statusCode: 409,
				type: problemTypeUri("sync-conflict"),
				detail: `Record '${id}' does not exist or is not owned by this user.`,
				code: "SYNC_CONFLICT",
			})
		}
		await withSyncConflict(
			() =>
				delegate.update({
					where: { id },
					data: { ...data, updatedAt: timestamp },
				}),
			`Could not update record '${id}' because it conflicts with current data.`,
		)
	}
	await client.syncChange.create({
		data: {
			userId,
			tableName: collectionName,
			recordId: id,
			operation,
			changedAt: timestamp,
		},
	})
}

const updateNullifiedDependents = async (
	client: Prisma.TransactionClient,
	userId: string,
	collectionName: string,
	modelName: string,
	where: Record<string, unknown>,
	data: Record<string, unknown>,
	timestamp: bigint,
) => {
	const delegate = getDelegate(client, modelName)
	const records = await delegate.findMany({ where, select: { id: true } })
	for (const record of records) {
		await delegate.update({
			where: { id: record.id },
			data: { ...data, updatedAt: timestamp },
		})
		await client.syncChange.create({
			data: {
				userId,
				tableName: collectionName,
				recordId: record.id,
				operation: "updated",
				changedAt: timestamp,
			},
		})
	}
}

const deleteRecord = async (
	client: Prisma.TransactionClient,
	userId: string,
	collectionName: string,
	id: string,
	timestamp: bigint,
) => {
	const { collection, delegate } = getDelegateForCollection(
		client,
		collectionName,
	)
	if (collection.readOnly || collection.createDisabled) {
		throw invalidSyncData(`Deletes are not allowed for '${collectionName}'.`)
	}
	const existing = await delegate.findFirst({
		where: { AND: [collection.whereForOwner(userId), { id }] },
		select: { id: true },
	})
	if (!existing) return
	if (collectionName === "categories") {
		await updateNullifiedDependents(
			client,
			userId,
			"habits",
			"Habit",
			{ userId, categoryId: id },
			{ categoryId: null },
			timestamp,
		)
	}
	if (collectionName === "goals") {
		await updateNullifiedDependents(
			client,
			userId,
			"rewards",
			"Reward",
			{ userId, goalId: id },
			{ goalId: null },
			timestamp,
		)
	}
	if (collectionName === "habits" || collectionName === "events") {
		const foreignKey = collectionName === "habits" ? "habitId" : "eventId"
		const relation = collectionName === "habits" ? "habit" : "event"
		await updateNullifiedDependents(
			client,
			userId,
			"reminders",
			"Reminder",
			{ [foreignKey]: id, [relation]: { is: { userId } } },
			{ [foreignKey]: null },
			timestamp,
		)
	}
	await withSyncConflict(
		() => delegate.delete({ where: { id } }),
		`Could not delete record '${id}' because related data still exists.`,
	)
	await client.syncChange.create({
		data: {
			userId,
			tableName: collectionName,
			recordId: id,
			operation: "deleted",
			changedAt: timestamp,
		},
	})
}

const syncRepository = {
	transaction: <T>(
		callback: (client: Prisma.TransactionClient) => Promise<T>,
	) => prisma.$transaction(callback),
	lockSyncState,
	updateSyncTimestamp,
	assertNoRemoteConflict,
	findAllForUser,
	findChangesSince,
	pushRecord,
	deleteRecord,
}

export { syncCollections, syncRepository }
