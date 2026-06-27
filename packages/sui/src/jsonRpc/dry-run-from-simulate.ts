// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64, toBase58, toBase64 } from '@mysten/bcs';

import type {
	BalanceChange,
	DryRunTransactionBlockResponse,
	MoveCallSuiTransaction,
	ObjectOwner,
	OwnedObjectRef,
	SuiArgument,
	SuiCallArg,
	SuiEvent,
	SuiObjectChange,
	SuiObjectRef,
	SuiTransaction,
	TransactionBlockData,
	TransactionEffects,
} from './types/generated.js';
import type { SuiClientTypes } from '../client/types.js';
import { bcs } from '../bcs/index.js';
import { readMoveModuleName } from './move-bytecode.js';

const DRY_RUN_FROM_SIMULATE_INCLUDE = {
	balanceChanges: true,
	effects: true,
	events: true,
	objectTypes: true,
	transaction: true,
} as const satisfies SuiClientTypes.SimulateTransactionInclude;

type DryRunSimulationResult = SuiClientTypes.SimulateTransactionResult<
	typeof DRY_RUN_FROM_SIMULATE_INCLUDE
>;
type DryRunSimulationTransaction = SuiClientTypes.Transaction<typeof DRY_RUN_FROM_SIMULATE_INCLUDE>;
type PureInputType = 'address' | 'bool' | 'string' | 'u8' | 'u16' | 'u32' | 'u64' | 'u128' | 'u256';

const OBJECT_DIGEST_DELETED = toBase58(Uint8Array.from({ length: 32 }, () => 99));
const OBJECT_DIGEST_WRAPPED = toBase58(Uint8Array.from({ length: 32 }, () => 88));

/**
 * Convert a fully-included Core simulation response to the legacy JSON-RPC
 * `dryRunTransactionBlock` shape.
 *
 * The simulation result must be produced with `DRY_RUN_FROM_SIMULATE_INCLUDE`.
 *
 * This is a best-effort, purely synchronous transform — it never fetches package
 * ABIs or makes network calls. Because a Core simulation response carries less
 * type/context information than the fullnode has when it builds a real dry-run
 * response, the output is *not* byte-for-byte identical to JSON-RPC. The known
 * divergences are listed below; everything else is intended to match exactly.
 *
 * Known divergences from a real `dryRunTransactionBlock` response:
 *
 * 1. Pure input value decoding is heuristic. JSON-RPC decodes every pure input
 *    to a typed `{ value, valueType }` because the fullnode resolves each input
 *    against the called function's signature. Simulate only returns raw BCS
 *    bytes, so this helper recovers the type via (a) structural hints from how an
 *    input is consumed (`TransferObjects` recipient → `address`, `SplitCoins`
 *    amounts → `u64`, `MakeMoveVec` elements → the vec's element type), then
 *    (b) a byte-length guess (1→`u8`, 2→`u16`, 4→`u32`, 8→`u64`, 16→`u128`,
 *    32→`address`), and otherwise (c) falls back to a raw `number[]` byte array
 *    with no `valueType`. Consequences: `bool` decodes as `u8` (both 1 byte);
 *    `u256`/object IDs decode as `address` (all 32 bytes); and variable-length
 *    types (`string`, `vector<T>`) never length-match, so they emit raw bytes.
 *    `MoveCall` pure arguments get no structural hint at all and rely entirely on
 *    the byte-length guess.
 *
 * 2. `balanceChanges[].owner` is always reported as `AddressOwner`. The Core
 *    `BalanceChange` only exposes an address, so balance changes that JSON-RPC
 *    attributes to an `ObjectOwner` or shared owner are misreported.
 *
 * 3. `suggestedGasPrice` is always `null`. The Core simulation response does not
 *    expose the network reference gas price that JSON-RPC returns here.
 *
 * 4. Object-change wrapping detection is heuristic (`isJsonRpcWrappedWrite`). An
 *    object that is still written but moves from `AddressOwner` to `ObjectOwner`
 *    is reported as `wrapped`; in some cases JSON-RPC may instead report this as
 *    `mutated`. Genuine wraps (object removed from the store) are detected
 *    reliably via the `DoesNotExist` output state.
 *
 * 5. Event `transactionModule` and `packageId` are derived from the event type's
 *    own module rather than the originating PTB command's module (with a special
 *    case for `0x2::display` events). For an event whose type is defined in a
 *    different module from the one that emits it, these fields can differ.
 *
 * 6. Array ordering is not guaranteed to match. Effects arrays (`created`,
 *    `mutated`, `deleted`, `wrapped`, `sharedObjects`, `modifiedAtVersions`) and
 *    `objectChanges` are emitted in the simulation's `changedObjects` iteration
 *    order, which need not match the fullnode's ordering. Element *contents*
 *    match; only their order may differ.
 *
 * 7. Object-reference versions (`SuiObjectRef.version` in the effects object
 *    references, `sharedObjects`, gas payment, and a `Shared` owner's
 *    `initial_shared_version`) are emitted as runtime numbers even though the
 *    declared type is `string`. This matches legacy dry-run's actual wire output:
 *    the fullnode serializes these from a plain `SequenceNumber(u64)` with no
 *    string adapter, so they are JSON numbers despite the schema saying string.
 *    Versions that the fullnode *does* serialize as strings (object-change
 *    `version`/`previousVersion`, `modifiedAtVersions`) are kept as strings.
 *    Consumers doing a strict `===` against a string for the numeric fields will
 *    not match — but this is exactly what `dryRunTransactionBlock` returns.
 *
 * Note on transfers: an owner-changing transfer is intentionally reported as
 * `mutated` (with the new owner), not `transferred`. This matches the fullnode,
 * whose object-change derivation never emits the `transferred` variant.
 */
export function dryRunFromSimulate(result: DryRunSimulationResult): DryRunTransactionBlockResponse {
	const transaction =
		result.$kind === 'Transaction' ? result.Transaction : result.FailedTransaction;

	return {
		balanceChanges: transaction.balanceChanges.map(mapBalanceChange),
		effects: mapTransactionEffects(transaction),
		events: mapEvents(transaction),
		executionErrorSource: transaction.status.error?.message ?? null,
		input: mapTransactionDataToInput(transaction.transaction),
		objectChanges: mapObjectChanges(transaction),
		suggestedGasPrice: null,
	};
}

function mapBalanceChange(change: SuiClientTypes.BalanceChange): BalanceChange {
	return {
		amount: change.amount,
		coinType: toJsonRpcStructTag(change.coinType),
		owner: {
			AddressOwner: change.address,
		},
	};
}

function mapEvents(transaction: DryRunSimulationTransaction): SuiEvent[] {
	const digest = transaction.effects.transactionDigest || transaction.digest;

	return transaction.events.map((event, index) => {
		const location = getJsonRpcEventLocation(event);

		return {
			bcs: toBase64(event.bcs),
			bcsEncoding: 'base64',
			id: {
				txDigest: digest,
				eventSeq: String(index),
			},
			packageId: location.packageId,
			parsedJson: event.json,
			sender: event.sender,
			transactionModule: location.module,
			type: toJsonRpcStructTag(event.eventType),
		};
	});
}

function mapTransactionEffects(transaction: DryRunSimulationTransaction): TransactionEffects {
	const effects = transaction.effects;
	const inputVersions = getTransactionInputVersions(transaction.transaction);
	const created: OwnedObjectRef[] = [];
	const mutated: OwnedObjectRef[] = [];
	const unwrapped: OwnedObjectRef[] = [];
	const deleted: SuiObjectRef[] = [];
	const unwrappedThenDeleted: SuiObjectRef[] = [];
	const wrapped: SuiObjectRef[] = [];

	for (const change of effects.changedObjects) {
		if (change.outputState === 'AccumulatorWriteV1') {
			continue;
		}

		if (change.inputState === 'DoesNotExist') {
			if (change.outputState === 'ObjectWrite' || change.outputState === 'PackageWrite') {
				const reference = outputObjectRef(change);
				if (change.idOperation === 'Created') {
					created.push({ reference, owner: mapOwner(change.outputOwner) });
				} else {
					unwrapped.push({ reference, owner: mapOwner(change.outputOwner) });
				}
			} else if (change.outputState === 'DoesNotExist' && change.idOperation === 'Deleted') {
				unwrappedThenDeleted.push(deletedObjectRef(change, effects.lamportVersion));
			}
			continue;
		}

		if (change.inputState === 'Exists') {
			if (isJsonRpcWrappedWrite(change)) {
				wrapped.push(outputObjectRef(change));
				continue;
			}

			if (change.outputState === 'ObjectWrite' || change.outputState === 'PackageWrite') {
				mutated.push({ reference: outputObjectRef(change), owner: mapOwner(change.outputOwner) });
			} else if (change.outputState === 'DoesNotExist') {
				if (change.idOperation === 'Deleted') {
					deleted.push(deletedObjectRef(change, effects.lamportVersion));
				} else {
					wrapped.push(wrappedObjectRef(change, effects.lamportVersion));
				}
			}
		}
	}

	const gasObject = effects.gasObject
		? {
				reference: outputObjectRef(effects.gasObject),
				owner: mapOwner(effects.gasObject.outputOwner),
			}
		: null;

	if (!gasObject) {
		throw new Error('Dry-run compatibility conversion requires gas object effects');
	}

	const modifiedAtVersions = effects.changedObjects
		.filter((change) => change.inputState === 'Exists' && change.inputVersion != null)
		.map((change) => ({
			objectId: change.objectId,
			sequenceNumber: inputVersions.get(change.objectId) ?? change.inputVersion!,
		}));

	const sharedObjects = [
		...effects.unchangedConsensusObjects
			.filter((object) => object.version != null && object.digest != null)
			.map((object) => ({
				objectId: object.objectId,
				version: toJsonRpcEffectVersion(object.version!),
				digest: object.digest!,
			})),
		...effects.changedObjects
			.filter(
				(change) =>
					change.inputOwner?.$kind === 'Shared' &&
					change.inputVersion != null &&
					change.inputDigest != null,
			)
			.map((change) => ({
				objectId: change.objectId,
				version: toJsonRpcEffectVersion(change.inputVersion!),
				digest: change.inputDigest!,
			})),
	];

	return {
		created,
		deleted,
		dependencies: effects.dependencies,
		eventsDigest: effects.eventsDigest ?? undefined,
		executedEpoch: transaction.epoch ?? '0',
		gasObject,
		gasUsed: effects.gasUsed,
		messageVersion: 'v1',
		modifiedAtVersions,
		mutated,
		sharedObjects,
		status: effects.status.success
			? { status: 'success' }
			: { status: 'failure', error: effects.status.error.message },
		transactionDigest: effects.transactionDigest,
		unwrapped,
		unwrappedThenDeleted,
		wrapped,
	};
}

function mapObjectChanges(transaction: DryRunSimulationTransaction): SuiObjectChange[] {
	const effects = transaction.effects;
	const objectTypes = transaction.objectTypes;
	const transactionData = transaction.transaction;
	const sender = transactionData.sender ?? transactionData.gasData.owner ?? '';
	const publishModuleNames = getPublishedModuleNames(transactionData);
	const changes: SuiObjectChange[] = [];

	for (const change of effects.changedObjects) {
		const objectType = toJsonRpcStructTag(objectTypes[change.objectId] ?? '');

		if (change.inputState === 'DoesNotExist') {
			if (change.outputState === 'PackageWrite') {
				changes.push({
					type: 'published',
					digest: change.outputDigest!,
					modules: publishModuleNames,
					packageId: change.objectId,
					version: toJsonRpcObjectChangeVersion(change.outputVersion),
				});
			} else if (change.outputState === 'ObjectWrite') {
				changes.push({
					type: 'created',
					digest: change.outputDigest!,
					objectId: change.objectId,
					objectType,
					owner: mapOwner(change.outputOwner),
					sender,
					version: toJsonRpcObjectChangeVersion(change.outputVersion),
				});
			}

			continue;
		}

		if (change.inputState !== 'Exists') {
			continue;
		}

		if (isJsonRpcWrappedWrite(change)) {
			changes.push({
				type: 'wrapped',
				objectId: change.objectId,
				objectType,
				sender,
				version: toJsonRpcObjectChangeVersion(
					change.outputVersion ?? effects.lamportVersion ?? change.inputVersion,
				),
			});
			continue;
		}

		if (change.outputState === 'ObjectWrite' || change.outputState === 'PackageWrite') {
			const outputOwner = mapOwner(change.outputOwner);

			changes.push({
				type: 'mutated',
				digest: change.outputDigest!,
				objectId: change.objectId,
				objectType,
				owner: outputOwner,
				previousVersion: toJsonRpcObjectChangeVersion(change.inputVersion),
				sender,
				version: toJsonRpcObjectChangeVersion(change.outputVersion),
			});

			continue;
		}

		if (change.outputState === 'DoesNotExist') {
			if (change.idOperation === 'Deleted') {
				changes.push({
					type: 'deleted',
					objectId: change.objectId,
					objectType,
					sender,
					version: toJsonRpcObjectChangeVersion(
						change.outputVersion ?? effects.lamportVersion ?? change.inputVersion,
					),
				});
			} else {
				changes.push({
					type: 'wrapped',
					objectId: change.objectId,
					objectType,
					sender,
					version: toJsonRpcObjectChangeVersion(
						change.outputVersion ?? effects.lamportVersion ?? change.inputVersion,
					),
				});
			}
		}
	}

	return changes;
}

function mapOwner(owner: SuiClientTypes.ObjectOwner | null): ObjectOwner {
	switch (owner?.$kind) {
		case 'AddressOwner':
			return { AddressOwner: owner.AddressOwner };
		case 'ObjectOwner':
			return { ObjectOwner: owner.ObjectOwner };
		case 'Shared':
			return {
				Shared: {
					initial_shared_version: toJsonRpcEffectVersion(owner.Shared.initialSharedVersion),
				},
			};
		case 'Immutable':
			return 'Immutable';
		case 'ConsensusAddressOwner':
			return {
				ConsensusAddressOwner: {
					owner: owner.ConsensusAddressOwner.owner,
					start_version: owner.ConsensusAddressOwner.startVersion,
				},
			};
		default:
			return 'Immutable';
	}
}

function getJsonRpcEventLocation(event: SuiClientTypes.Event): {
	packageId: string;
	module: string;
} {
	const displayTarget = event.eventType.match(/^0x0*2::display::[^<]+<([^:>]+)::([^:>]+)::/);
	if (displayTarget) {
		return {
			packageId: displayTarget[1]!,
			module: displayTarget[2]!,
		};
	}

	return {
		packageId: toJsonRpcAddress(event.packageId),
		module: event.module,
	};
}

function toJsonRpcStructTag(type: string): string {
	return type.replace(/0x[0-9a-fA-F]+/g, (address) => toJsonRpcAddress(address));
}

function toJsonRpcInputTypeTag(type: string): string {
	return type.replace(/0x[0-9a-fA-F]+/g, (address) =>
		address.replace(/^0x0*([0-9a-fA-F]+)$/, '0x$1'),
	);
}

function toJsonRpcAddress(address: string): string {
	// Legacy dry-run shortens framework addresses in struct tags and event
	// locations, but preserves leading zeros on arbitrary package IDs.
	return address.replace(/^0x0*([0-2])$/i, '0x$1');
}

function toJsonRpcEffectVersion(version: string): string {
	// Generated types say effect reference versions are strings, but legacy
	// dry-run returns numbers at runtime for these specific fields.
	return Number(version) as unknown as string;
}

function toJsonRpcObjectChangeVersion(version: string | number | null | undefined): string {
	if (version == null) {
		throw new Error('Missing object change version');
	}

	return String(version);
}

function outputObjectRef(change: SuiClientTypes.ChangedObject): SuiObjectRef {
	if (!change.outputVersion || !change.outputDigest) {
		throw new Error(`Missing output reference for ${change.objectId}`);
	}

	return {
		objectId: change.objectId,
		version: toJsonRpcEffectVersion(change.outputVersion),
		digest: change.outputDigest,
	};
}

function deletedObjectRef(
	change: SuiClientTypes.ChangedObject,
	lamportVersion: string | null,
): SuiObjectRef {
	return {
		objectId: change.objectId,
		version: toJsonRpcEffectVersion(
			change.outputVersion ?? lamportVersion ?? change.inputVersion ?? '0',
		),
		digest: change.outputDigest ?? OBJECT_DIGEST_DELETED,
	};
}

function wrappedObjectRef(
	change: SuiClientTypes.ChangedObject,
	lamportVersion: string | null,
): SuiObjectRef {
	return {
		objectId: change.objectId,
		version: toJsonRpcEffectVersion(
			change.outputVersion ?? lamportVersion ?? change.inputVersion ?? '0',
		),
		digest: change.outputDigest ?? OBJECT_DIGEST_WRAPPED,
	};
}

function isJsonRpcWrappedWrite(change: SuiClientTypes.ChangedObject): boolean {
	return (
		change.inputState === 'Exists' &&
		change.outputState === 'ObjectWrite' &&
		change.idOperation === 'None' &&
		change.inputOwner?.$kind === 'AddressOwner' &&
		change.outputOwner?.$kind === 'ObjectOwner'
	);
}

function getTransactionInputVersions(
	transaction: SuiClientTypes.TransactionData,
): Map<string, string> {
	const versions = new Map<string, string>();

	for (const input of transaction.inputs) {
		if (!hasKey(input, 'Object')) {
			continue;
		}

		const object = asRecord(input.Object, 'object input');
		if ('ImmOrOwnedObject' in object) {
			const ref = asRecord(object.ImmOrOwnedObject, 'immOrOwnedObject input');
			versions.set(asString(ref.objectId, 'object id'), String(ref.version));
		}
		if ('Receiving' in object) {
			const ref = asRecord(object.Receiving, 'receiving input');
			versions.set(asString(ref.objectId, 'receiving object id'), String(ref.version));
		}
	}

	return versions;
}

function mapTransactionDataToInput(
	transaction: SuiClientTypes.TransactionData,
): TransactionBlockData {
	const pureInputTypes = getPureInputTypes(transaction);

	return {
		gasData: {
			budget: transaction.gasData.budget == null ? '' : String(transaction.gasData.budget),
			owner: transaction.gasData.owner ?? '',
			payment:
				transaction.gasData.payment?.map((payment) => ({
					objectId: payment.objectId,
					version: toJsonRpcEffectVersion(String(payment.version)),
					digest: payment.digest,
				})) ?? [],
			price: transaction.gasData.price == null ? '' : String(transaction.gasData.price),
		},
		messageVersion: 'v1',
		sender: transaction.sender ?? '',
		transaction: {
			inputs: transaction.inputs.map((input, index) =>
				mapCallArg(input, pureInputTypes.get(index)),
			),
			kind: 'ProgrammableTransaction',
			transactions: transaction.commands.map(mapCommand),
		},
	};
}

function mapCallArg(input: unknown, pureInputType?: PureInputType): SuiCallArg {
	const callArg = asRecord(input, 'transaction input');

	if ('Pure' in callArg) {
		const pure = asRecord(callArg.Pure, 'pure input');
		return mapPureCallArg(fromBase64(asString(pure.bytes, 'pure input bytes')), pureInputType);
	}

	if ('Object' in callArg) {
		const object = asRecord(callArg.Object, 'object input');
		if ('ImmOrOwnedObject' in object) {
			const ref = asRecord(object.ImmOrOwnedObject, 'immOrOwnedObject input');
			return {
				type: 'object',
				digest: asString(ref.digest, 'object digest'),
				objectId: asString(ref.objectId, 'object id'),
				objectType: 'immOrOwnedObject',
				version: String(ref.version),
			};
		}
		if ('SharedObject' in object) {
			const shared = asRecord(object.SharedObject, 'sharedObject input');
			return {
				type: 'object',
				initialSharedVersion: String(shared.initialSharedVersion),
				mutable: asBoolean(shared.mutable, 'shared object mutability'),
				objectId: asString(shared.objectId, 'shared object id'),
				objectType: 'sharedObject',
			};
		}
		if ('Receiving' in object) {
			const receiving = asRecord(object.Receiving, 'receiving input');
			return {
				type: 'object',
				digest: asString(receiving.digest, 'receiving object digest'),
				objectId: asString(receiving.objectId, 'receiving object id'),
				objectType: 'receiving',
				version: String(receiving.version),
			};
		}
	}

	if ('FundsWithdrawal' in callArg) {
		const withdrawal = asRecord(callArg.FundsWithdrawal, 'fundsWithdrawal input');
		const reservation = asRecord(withdrawal.reservation, 'fundsWithdrawal reservation');
		const typeArg = asRecord(withdrawal.typeArg, 'fundsWithdrawal typeArg');
		const withdrawFrom = asRecord(withdrawal.withdrawFrom, 'fundsWithdrawal withdrawFrom');
		return {
			type: 'fundsWithdrawal',
			reservation: {
				maxAmountU64: String(reservation.MaxAmountU64),
			},
			typeArg: {
				balance: asString(typeArg.Balance, 'fundsWithdrawal balance type'),
			},
			withdrawFrom: 'Sender' in withdrawFrom ? 'sender' : 'sponsor',
		};
	}

	throw new Error(`Unsupported transaction input ${JSON.stringify(input)}`);
}

function getPureInputTypes(
	transaction: SuiClientTypes.TransactionData,
): Map<number, PureInputType> {
	const pureInputTypes = new Map<number, PureInputType>();
	const setPureInputType = (argument: unknown, type: PureInputType) => {
		const index = getInputArgumentIndex(argument);
		if (index != null && hasKey(transaction.inputs[index], 'Pure')) {
			pureInputTypes.set(index, type);
		}
	};

	for (const command of transaction.commands) {
		if (hasKey(command, 'TransferObjects')) {
			const transfer = asRecord(command.TransferObjects, 'transferObjects command');
			setPureInputType(transfer.address, 'address');
		}

		if (hasKey(command, 'SplitCoins')) {
			const split = asRecord(command.SplitCoins, 'splitCoins command');
			for (const amount of asArray(split.amounts, 'splitCoins amounts')) {
				setPureInputType(amount, 'u64');
			}
		}

		if (hasKey(command, 'MakeMoveVec')) {
			const makeMoveVec = asRecord(command.MakeMoveVec, 'makeMoveVec command');
			const elementType =
				makeMoveVec.type == null
					? null
					: typeTagToPureInputType(asString(makeMoveVec.type, 'makeMoveVec type'));
			if (elementType) {
				for (const element of asArray(makeMoveVec.elements, 'makeMoveVec elements')) {
					setPureInputType(element, elementType);
				}
			}
		}
	}

	return pureInputTypes;
}

function getInputArgumentIndex(argument: unknown): number | null {
	if (!hasKey(argument, 'Input')) {
		return null;
	}

	return asNumber(argument.Input, 'input argument');
}

function typeTagToPureInputType(type: string): PureInputType | null {
	switch (type) {
		case 'address':
		case 'bool':
		case 'string':
		case 'u8':
		case 'u16':
		case 'u32':
		case 'u64':
		case 'u128':
		case 'u256':
			return type;
		default:
			return null;
	}
}

function mapPureCallArg(bytes: Uint8Array, hint?: PureInputType): SuiCallArg {
	const type = hint ?? inferPureInputType(bytes);
	if (type) {
		try {
			return {
				type: 'pure',
				value: parsePureValue(bytes, type),
				valueType: type,
			};
		} catch {
			// Fall through to the raw-byte representation used when simulate does
			// not include enough type information for JSON-RPC's decoded display.
		}
	}

	return {
		type: 'pure',
		value: Array.from(bytes),
	};
}

function inferPureInputType(bytes: Uint8Array): PureInputType | null {
	switch (bytes.length) {
		case 1:
			return 'u8';
		case 2:
			return 'u16';
		case 4:
			return 'u32';
		case 8:
			return 'u64';
		case 16:
			return 'u128';
		case 32:
			return 'address';
		default:
			return null;
	}
}

function parsePureValue(bytes: Uint8Array, type: PureInputType): unknown {
	switch (type) {
		case 'address':
			return bcs.Address.parse(bytes);
		case 'bool':
			return bcs.Bool.parse(bytes);
		case 'string':
			return bcs.String.parse(bytes);
		case 'u8':
			return bcs.U8.parse(bytes);
		case 'u16':
			return bcs.U16.parse(bytes);
		case 'u32':
			return bcs.U32.parse(bytes);
		case 'u64':
			return bcs.U64.parse(bytes);
		case 'u128':
			return bcs.U128.parse(bytes);
		case 'u256':
			return bcs.U256.parse(bytes);
	}
}

function mapCommand(command: unknown): SuiTransaction {
	const transaction = asRecord(command, 'transaction command');

	if ('MoveCall' in transaction) {
		const moveCall = asRecord(transaction.MoveCall, 'move call command');
		const typeArguments = asArray(moveCall.typeArguments ?? [], 'move call type arguments').map(
			(typeArgument) => toJsonRpcInputTypeTag(asString(typeArgument, 'move call type argument')),
		);
		const moveCallTransaction: MoveCallSuiTransaction = {
			arguments: asArray(moveCall.arguments, 'move call arguments').map(mapArgument),
			function: asString(moveCall.function, 'move call function'),
			module: asString(moveCall.module, 'move call module'),
			package: asString(moveCall.package, 'move call package'),
		};
		if (typeArguments.length > 0) {
			moveCallTransaction.type_arguments = typeArguments;
		}

		return {
			MoveCall: moveCallTransaction,
		};
	}

	if ('TransferObjects' in transaction) {
		const transfer = asRecord(transaction.TransferObjects, 'transferObjects command');
		return {
			TransferObjects: [
				asArray(transfer.objects, 'transferObjects objects').map(mapArgument),
				mapArgument(transfer.address),
			],
		};
	}

	if ('SplitCoins' in transaction) {
		const split = asRecord(transaction.SplitCoins, 'splitCoins command');
		return {
			SplitCoins: [
				mapArgument(split.coin),
				asArray(split.amounts, 'splitCoins amounts').map(mapArgument),
			],
		};
	}

	if ('MergeCoins' in transaction) {
		const merge = asRecord(transaction.MergeCoins, 'mergeCoins command');
		return {
			MergeCoins: [
				mapArgument(merge.destination),
				asArray(merge.sources, 'mergeCoins sources').map(mapArgument),
			],
		};
	}

	if ('Publish' in transaction) {
		const publish = asRecord(transaction.Publish, 'publish command');
		return {
			Publish: asArray(publish.dependencies, 'publish dependencies').map((dependency) =>
				asString(dependency, 'publish dependency'),
			),
		};
	}

	if ('MakeMoveVec' in transaction) {
		const makeMoveVec = asRecord(transaction.MakeMoveVec, 'makeMoveVec command');
		return {
			MakeMoveVec: [
				makeMoveVec.type == null
					? null
					: toJsonRpcInputTypeTag(asString(makeMoveVec.type, 'makeMoveVec type')),
				asArray(makeMoveVec.elements, 'makeMoveVec elements').map(mapArgument),
			],
		};
	}

	if ('Upgrade' in transaction) {
		const upgrade = asRecord(transaction.Upgrade, 'upgrade command');
		return {
			Upgrade: [
				asArray(upgrade.modules, 'upgrade modules').map((module) =>
					asString(module, 'upgrade module'),
				),
				asString(upgrade.package, 'upgrade package'),
				mapArgument(upgrade.ticket),
			],
		};
	}

	throw new Error(`Unsupported transaction command ${JSON.stringify(command)}`);
}

function mapArgument(arg: unknown): SuiArgument {
	const argument = asRecord(arg, 'transaction argument');

	if ('GasCoin' in argument) {
		return 'GasCoin';
	}
	if ('Input' in argument) {
		return { Input: asNumber(argument.Input, 'input argument') };
	}
	if ('Result' in argument) {
		return { Result: asNumber(argument.Result, 'result argument') };
	}
	if ('NestedResult' in argument) {
		const nested = asArray(argument.NestedResult, 'nested result argument');
		if (nested.length !== 2) {
			throw new Error('NestedResult argument must contain two indexes');
		}
		return {
			NestedResult: [
				asNumber(nested[0], 'nested result command index'),
				asNumber(nested[1], 'nested result result index'),
			],
		};
	}

	throw new Error(`Unsupported transaction argument ${JSON.stringify(arg)}`);
}

function getPublishedModuleNames(transaction: SuiClientTypes.TransactionData): string[] {
	return transaction.commands.flatMap((command) => {
		if (!hasKey(command, 'Publish')) {
			return [];
		}

		const publish = asRecord(command.Publish, 'publish command');
		return asArray(publish.modules, 'publish modules').map((module) =>
			readMoveModuleName(fromBase64(asString(module, 'publish module'))),
		);
	});
}

function hasKey<K extends string>(value: unknown, key: K): value is Record<K, unknown> {
	return typeof value === 'object' && value !== null && key in value;
}

function asRecord(value: unknown, name: string): Record<string, unknown> {
	if (typeof value !== 'object' || value === null) {
		throw new Error(`Expected ${name} to be an object`);
	}
	return value as Record<string, unknown>;
}

function asArray(value: unknown, name: string): unknown[] {
	if (!Array.isArray(value)) {
		throw new Error(`Expected ${name} to be an array`);
	}
	return value;
}

function asString(value: unknown, name: string): string {
	if (typeof value !== 'string') {
		throw new Error(`Expected ${name} to be a string`);
	}
	return value;
}

function asNumber(value: unknown, name: string): number {
	if (typeof value !== 'number') {
		throw new Error(`Expected ${name} to be a number`);
	}
	return value;
}

function asBoolean(value: unknown, name: string): boolean {
	if (typeof value !== 'boolean') {
		throw new Error(`Expected ${name} to be a boolean`);
	}
	return value;
}
