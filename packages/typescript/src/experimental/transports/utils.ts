// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '../../bcs/index.js';
import { TransactionDataBuilder } from '../../transactions/TransactionData.js';
import type { Experimental_SuiClientTypes } from '../types.js';

export function parseTransactionBcs(
	bytes: Uint8Array,
): Experimental_SuiClientTypes.TransactionResponse['transaction'] {
	return {
		...TransactionDataBuilder.fromBytes(bytes).snapshot(),
		bcs: bytes,
	};
}

export function parseTransactionEffectsBcs(
	effects: Uint8Array,
): Experimental_SuiClientTypes.TransactionEffects {
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
}): Experimental_SuiClientTypes.TransactionEffects {
	throw new Error('V1 effects are not supported yet');
}

function parseTransactionEffectsV2({
	bytes,
	effects,
}: {
	bytes: Uint8Array;
	effects: NonNullable<(typeof bcs.TransactionEffects.$inferType)['V2']>;
}): Experimental_SuiClientTypes.TransactionEffects {
	const changedObjects = effects.changedObjects.map(
		([id, change]): Experimental_SuiClientTypes.ChangedObject => {
			return {
				id,
				inputState: change.inputState.$kind === 'Exist' ? 'Exists' : 'DoesNotExist',
				inputVersion: change.inputState.Exist?.[0][0] ?? null,
				inputDigest: change.inputState.Exist?.[0][1] ?? null,
				inputOwner: change.inputState.Exist?.[1] ?? null,
				outputState:
					change.outputState.$kind === 'NotExist' ? 'DoesNotExist' : change.outputState.$kind,
				outputVersion:
					change.outputState.$kind === 'PackageWrite'
						? change.outputState.PackageWrite?.[0]
						: change.outputState.ObjectWrite
							? effects.lamportVersion
							: null,
				outputDigest:
					change.outputState.$kind === 'PackageWrite'
						? change.outputState.PackageWrite?.[1]
						: (change.outputState.ObjectWrite?.[0] ?? null),
				outputOwner: change.outputState.ObjectWrite ? change.outputState.ObjectWrite[1] : null,
				idOperation: change.idOperation.$kind,
			};
		},
	);

	return {
		bcs: bytes,
		digest: effects.transactionDigest,
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
						error: effects.status.Failed.error.$kind,
					},
		gasUsed: effects.gasUsed,
		transactionDigest: effects.transactionDigest,
		gasObject:
			effects.gasObjectIndex === null ? null : (changedObjects[effects.gasObjectIndex] ?? null),
		eventsDigest: effects.eventsDigest,
		dependencies: effects.dependencies,
		lamportVersion: effects.lamportVersion,
		changedObjects,
		unchangedConsensusObjects: effects.unchangedSharedObjects.map(
			([objectId, object]): Experimental_SuiClientTypes.UnchangedConsensusObject => {
				return {
					kind:
						object.$kind === 'MutateDeleted'
							? 'MutateConsensusStreamEnded'
							: object.$kind === 'ReadDeleted'
								? 'ReadConsensusStreamEnded'
								: object.$kind,
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
