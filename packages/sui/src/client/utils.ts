// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '../bcs/index.js';
import { ExecutionStatus } from '../bcs/effects.js';
import { TransactionDataBuilder } from '../transactions/TransactionData.js';
import type { SuiClientTypes } from './types.js';

// Minimal BCS types for extracting just the status from transaction effects.
// BCS fields are read sequentially, so we only need to define fields up to and including status.
// This avoids parsing the entire effects structure when we only need success/failure.

// First, try with the full ExecutionStatus to get detailed error info
const MinimalEffectsWithError = bcs.struct('MinimalEffectsWithError', {
	status: ExecutionStatus,
});

const MinimalTransactionEffectsWithError = bcs.enum('MinimalTransactionEffectsWithError', {
	V1: MinimalEffectsWithError,
	V2: MinimalEffectsWithError,
});

// Fallback version that doesn't parse error details - used when ExecutionFailureStatus has unknown variants
const MinimalExecutionStatusNoError = bcs.enum('MinimalExecutionStatusNoError', {
	Success: null,
	Failed: null, // Don't parse the error structure
});

const MinimalEffectsNoError = bcs.struct('MinimalEffectsNoError', {
	status: MinimalExecutionStatusNoError,
});

const MinimalTransactionEffectsNoError = bcs.enum('MinimalTransactionEffectsNoError', {
	V1: MinimalEffectsNoError,
	V2: MinimalEffectsNoError,
});

export function parseTransactionBcs(bytes: Uint8Array): SuiClientTypes.TransactionData {
	return {
		...TransactionDataBuilder.fromBytes(bytes).snapshot(),
		bcs: bytes,
	};
}

/**
 * Extracts just the status from transaction effects BCS without fully parsing.
 * This is optimized for cases where we only need the status (success/failure)
 * without parsing the entire effects structure.
 *
 * Uses a minimal BCS struct that only parses fields up to and including status,
 * since BCS fields are read sequentially. First tries to parse with full error details,
 * then falls back to a version without error parsing if the error enum has unknown variants.
 *
 * For errors with data, serializes the error as JSON to preserve all information.
 */
export function extractStatusFromEffectsBcs(
	effectsBytes: Uint8Array,
): SuiClientTypes.ExecutionStatus {
	// First try parsing with full error details
	let parsed: ReturnType<typeof MinimalTransactionEffectsWithError.parse> | null = null;
	try {
		parsed = MinimalTransactionEffectsWithError.parse(effectsBytes);
	} catch {
		// Fall back to parsing without error details if the error enum has unknown variants
		const parsedNoError = MinimalTransactionEffectsNoError.parse(effectsBytes);
		const status = (parsedNoError.V1 ?? parsedNoError.V2)!.status;

		if (status.$kind === 'Success') {
			return { success: true, error: null };
		}

		return {
			success: false,
			error: 'ExecutionFailed',
		};
	}

	const status = (parsed.V1 ?? parsed.V2)!.status;

	if (status.$kind === 'Success') {
		return { success: true, error: null };
	}

	const errorKind = status.Failure.error.$kind;
	const errorData = status.Failure.error[errorKind];

	const errorString =
		errorData !== null && errorData !== undefined && typeof errorData !== 'boolean'
			? `${errorKind}(${JSON.stringify(errorData, (_key, value) => (typeof value === 'bigint' ? value.toString() : value))})`
			: errorKind;

	return {
		success: false,
		error: errorString,
	};
}

export function parseTransactionEffectsBcs(effects: Uint8Array): SuiClientTypes.TransactionEffects {
	const parsed = bcs.TransactionEffects.parse(effects);

	switch (parsed.$kind) {
		case 'V1':
			return parseTransactionEffectsV1({ bytes: effects, effects: parsed.V1 });
		case 'V2':
			return parseTransactionEffectsV2({ bytes: effects, effects: parsed.V2 });
		default:
			throw new Error(
				`Unknown transaction effects version: ${(parsed as { $kind: string }).$kind}`,
			);
	}
}

function parseTransactionEffectsV1(_: {
	bytes: Uint8Array;
	effects: NonNullable<(typeof bcs.TransactionEffects.$inferType)['V1']>;
}): SuiClientTypes.TransactionEffects {
	throw new Error('V1 effects are not supported yet');
}

function parseTransactionEffectsV2({
	bytes,
	effects,
}: {
	bytes: Uint8Array;
	effects: NonNullable<(typeof bcs.TransactionEffects.$inferType)['V2']>;
}): SuiClientTypes.TransactionEffects {
	const changedObjects = effects.changedObjects.map(
		([id, change]): SuiClientTypes.ChangedObject => {
			return {
				objectId: id,
				inputState: change.inputState.$kind === 'Exist' ? 'Exists' : 'DoesNotExist',
				inputVersion: change.inputState.Exist?.[0][0] ?? null,
				inputDigest: change.inputState.Exist?.[0][1] ?? null,
				inputOwner: change.inputState.Exist?.[1] ?? null,
				outputState:
					change.outputState.$kind === 'NotExist' ? 'DoesNotExist' : change.outputState.$kind,
				outputVersion:
					change.outputState.$kind === 'PackageWrite'
						? change.outputState.PackageWrite?.[0]
						: change.outputState.$kind === 'ObjectWrite'
							? effects.lamportVersion
							: null,
				outputDigest:
					change.outputState.$kind === 'PackageWrite'
						? change.outputState.PackageWrite?.[1]
						: change.outputState.$kind === 'ObjectWrite'
							? (change.outputState.ObjectWrite?.[0] ?? null)
							: null,
				outputOwner:
					change.outputState.$kind === 'ObjectWrite' ? change.outputState.ObjectWrite[1] : null,
				idOperation: change.idOperation.$kind,
			};
		},
	);

	return {
		bcs: bytes,
		version: 2,
		status:
			effects.status.$kind === 'Success'
				? {
						success: true,
						error: null,
					}
				: {
						success: false,
						// TODO: add command
						error: effects.status.Failure.error.$kind,
					},
		gasUsed: effects.gasUsed,
		transactionDigest: effects.transactionDigest,
		gasObject:
			effects.gasObjectIndex === null ? null : (changedObjects[effects.gasObjectIndex] ?? null),
		eventsDigest: effects.eventsDigest,
		dependencies: effects.dependencies,
		lamportVersion: effects.lamportVersion,
		changedObjects,
		unchangedConsensusObjects: effects.unchangedConsensusObjects.map(
			([objectId, object]): SuiClientTypes.UnchangedConsensusObject => {
				return {
					kind: object.$kind,
					objectId: objectId,
					version:
						object.$kind === 'ReadOnlyRoot'
							? object.ReadOnlyRoot[0]
							: (object[object.$kind] as string | null),
					digest: object.$kind === 'ReadOnlyRoot' ? object.ReadOnlyRoot[1] : null,
				};
			},
		),
		auxiliaryDataDigest: effects.auxDataDigest,
	};
}
