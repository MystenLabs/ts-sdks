// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64, toBase58, toBase64 } from '@mysten/bcs';
import { bcs, TypeTagSerializer } from '@mysten/sui/bcs';
import type { TypeTag } from '@mysten/sui/bcs';
import type { SuiClientTypes } from '@mysten/sui/client';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import type { SuiJsonRpcTypes } from '@mysten/wallet-standard';

import { readMoveModuleName } from './move-bytecode.js';

type CallArg = SuiClientTypes.TransactionData['inputs'][number];
type Command = SuiClientTypes.TransactionData['commands'][number];
type Argument = Extract<Command, { MoveCall: unknown }>['MoveCall']['arguments'][number];
type PureInputType = 'address' | 'bool' | 'u8' | 'u16' | 'u32' | 'u64' | 'u128' | 'u256';

const digestFilledWith = (byte: number) => toBase58(new Uint8Array(32).fill(byte));
const OBJECT_DIGEST_MIN = digestFilledWith(0);
const OBJECT_DIGEST_DELETED = digestFilledWith(99);
const OBJECT_DIGEST_WRAPPED = digestFilledWith(88);
const OBJECT_DIGEST_CANCELLED = digestFilledWith(77);

// The addresses sui_serde shortens inside struct types.
const SYSTEM_ADDRESSES = new Set(
	['0x0', '0x1', '0x2', '0x3', '0x5', '0x6', '0xdee9'].map((address) =>
		normalizeSuiAddress(address),
	),
);

/** A Core API transaction parsed with every `include` section the mappers read. */
export type MappableTransaction = SuiClientTypes.Transaction<{
	balanceChanges: true;
	effects: true;
	events: true;
	objectTypes: true;
	transaction: true;
}>;

/** The response of the JSON-RPC `sui_dryRunTransactionBlock` method. */
export interface DryRunTransactionBlockResponse {
	balanceChanges: SuiJsonRpcTypes.BalanceChange[];
	effects: SuiJsonRpcTypes.TransactionEffects;
	events: SuiJsonRpcTypes.SuiEvent[];
	executionErrorSource?: string | null;
	input: SuiJsonRpcTypes.TransactionBlockData;
	objectChanges: SuiJsonRpcTypes.SuiObjectChange[];
	suggestedGasPrice?: string | null;
}

/**
 * Builds the JSON-RPC `DryRunTransactionBlockResponse` from a `simulateTransaction` result, for
 * wallet code that still reads the dry-run shape.
 *
 * Simulate with `include: { balanceChanges: true, effects: true, events: true, objectTypes: true,
 * transaction: true }`. Throws if a section cannot be mapped.
 */
export function dryRunFromSimulation(
	transaction: MappableTransaction,
): DryRunTransactionBlockResponse {
	return {
		balanceChanges: transaction.balanceChanges.map(mapBalanceChange),
		effects: mapTransactionEffects(transaction),
		events: mapEvents(transaction),
		executionErrorSource: transaction.status.error?.message ?? null,
		input: mapTransactionDataToInput(transaction.transaction),
		objectChanges: mapObjectChanges(transaction),
	};
}

export function mapBalanceChange(
	change: SuiClientTypes.BalanceChange,
): SuiJsonRpcTypes.BalanceChange {
	return {
		amount: change.amount,
		coinType: toSuiTypeTagString(change.coinType),
		owner: { AddressOwner: change.address },
	};
}

export function mapEvents(
	transaction: Pick<MappableTransaction, 'digest' | 'events'>,
): SuiJsonRpcTypes.SuiEvent[] {
	return transaction.events.map((event, index) => ({
		bcs: toBase64(event.bcs),
		bcsEncoding: 'base64',
		id: { txDigest: transaction.digest, eventSeq: String(index) },
		packageId: event.packageId,
		parsedJson: event.json,
		sender: event.sender,
		transactionModule: event.module,
		type: toSuiTypeTagString(event.eventType),
	}));
}

export function mapTransactionEffects(
	transaction: Pick<MappableTransaction, 'effects' | 'epoch' | 'transaction'>,
): SuiJsonRpcTypes.TransactionEffects {
	const { effects } = transaction;
	const lamportVersion = required(effects.lamportVersion, 'lamport version');
	const modifiedAtVersions: SuiJsonRpcTypes.TransactionBlockEffectsModifiedAtVersions[] = [];
	const created: SuiJsonRpcTypes.OwnedObjectRef[] = [];
	const mutated: SuiJsonRpcTypes.OwnedObjectRef[] = [];
	const unwrapped: SuiJsonRpcTypes.OwnedObjectRef[] = [];
	const deleted: SuiJsonRpcTypes.SuiObjectRef[] = [];
	const unwrappedThenDeleted: SuiJsonRpcTypes.SuiObjectRef[] = [];
	const wrapped: SuiJsonRpcTypes.SuiObjectRef[] = [];
	const removedRef = (objectId: string, digest: string) => ({
		objectId,
		version: asJsonNumber(lamportVersion),
		digest,
	});

	for (const change of effects.changedObjects) {
		const existed = change.inputState === 'Exists';
		if (existed) {
			modifiedAtVersions.push({
				objectId: change.objectId,
				sequenceNumber: required(change.inputVersion, 'input version'),
			});
		}

		if (change.outputState === 'ObjectWrite' || change.outputState === 'PackageWrite') {
			const ref = { reference: outputObjectRef(change), owner: mapOutputOwner(change) };
			if (existed) {
				mutated.push(ref);
			} else if (change.idOperation === 'Created') {
				created.push(ref);
			} else {
				unwrapped.push(ref);
			}
		} else if (change.outputState === 'DoesNotExist') {
			if (change.idOperation === 'Deleted') {
				(existed ? deleted : unwrappedThenDeleted).push(
					removedRef(change.objectId, OBJECT_DIGEST_DELETED),
				);
			} else if (existed) {
				wrapped.push(removedRef(change.objectId, OBJECT_DIGEST_WRAPPED));
			}
		}
	}

	// Consensus objects the transaction wrote come first, as in the node's effects.
	const sharedObjects = [
		...effects.changedObjects
			.filter((change) => change.inputState === 'Exists' && isConsensusOwner(change.inputOwner))
			.map((change) => ({
				objectId: change.objectId,
				version: asJsonNumber(required(change.inputVersion, 'input version')),
				digest: required(change.inputDigest, 'input digest'),
			})),
		...effects.unchangedConsensusObjects.flatMap(mapUnchangedConsensusObject),
	];
	const abortError = mapAbortError(effects.status);

	return {
		messageVersion: 'v1',
		status: effects.status.success
			? { status: 'success' }
			: { status: 'failure', error: effects.status.error.message },
		executedEpoch: required(transaction.epoch, 'epoch'),
		gasUsed: effects.gasUsed,
		transactionDigest: effects.transactionDigest,
		gasObject: mapGasObject(transaction),
		...(effects.eventsDigest ? { eventsDigest: effects.eventsDigest } : {}),
		...(abortError ? { abortError } : {}),
		// The node leaves empty lists out.
		...withoutEmptyLists({
			modifiedAtVersions,
			sharedObjects,
			created,
			mutated,
			unwrapped,
			deleted,
			unwrappedThenDeleted,
			wrapped,
			dependencies: effects.dependencies,
		}),
	};
}

export function mapObjectChanges(
	transaction: Pick<MappableTransaction, 'effects' | 'objectTypes' | 'transaction'>,
): SuiJsonRpcTypes.SuiObjectChange[] {
	const { effects, objectTypes } = transaction;
	const sender = required(transaction.transaction.sender, 'sender');
	const version = (value: string | null) => required(value, 'object version');
	const mutated: SuiJsonRpcTypes.SuiObjectChange[] = [];
	const created: SuiJsonRpcTypes.SuiObjectChange[] = [];
	const deleted: SuiJsonRpcTypes.SuiObjectChange[] = [];
	const wrapped: SuiJsonRpcTypes.SuiObjectChange[] = [];

	for (const change of effects.changedObjects) {
		const existed = change.inputState === 'Exists';

		if (change.outputState === 'PackageWrite') {
			if (!existed && change.idOperation === 'Created') {
				created.push({
					type: 'published',
					digest: required(change.outputDigest, 'output digest'),
					modules: publishedModuleNames(transaction.transaction),
					packageId: change.objectId,
					version: version(change.outputVersion),
				});
			}
			continue;
		}

		// The node skips objects whose type it cannot load.
		const type = objectTypes[change.objectId];
		if (!type) {
			continue;
		}
		const objectType = toSuiTypeTagString(type);

		if (change.outputState === 'ObjectWrite') {
			const written = {
				digest: required(change.outputDigest, 'output digest'),
				objectId: change.objectId,
				objectType,
				owner: mapOwner(change.outputOwner),
				sender,
				version: version(change.outputVersion),
			};
			if (existed) {
				mutated.push({
					type: 'mutated',
					...written,
					previousVersion: version(change.inputVersion),
				});
			} else if (change.idOperation === 'Created') {
				created.push({ type: 'created', ...written });
			}
		} else if (change.outputState === 'DoesNotExist' && existed) {
			const removed = {
				objectId: change.objectId,
				objectType,
				sender,
				version: version(effects.lamportVersion),
			};
			if (change.idOperation === 'Deleted') {
				deleted.push({ type: 'deleted', ...removed });
			} else {
				wrapped.push({ type: 'wrapped', ...removed });
			}
		}
	}

	return [...mutated, ...created, ...deleted, ...wrapped];
}

export function mapTransactionDataToInput(
	transaction: SuiClientTypes.TransactionData,
): SuiJsonRpcTypes.TransactionBlockData {
	const pureInputTypes = pureInputTypeHints(transaction);
	const { gasData } = transaction;

	return {
		gasData: {
			budget: String(required(gasData.budget, 'gas budget')),
			owner: required(gasData.owner, 'gas owner'),
			payment: (gasData.payment ?? []).map((payment) => ({
				objectId: payment.objectId,
				version: asJsonNumber(payment.version),
				digest: payment.digest,
			})),
			price: String(required(gasData.price, 'gas price')),
		},
		messageVersion: 'v1',
		sender: required(transaction.sender, 'sender'),
		transaction: {
			inputs: transaction.inputs.map((input, index) =>
				mapCallArg(input, pureInputTypes.get(index)),
			),
			kind: 'ProgrammableTransaction',
			transactions: transaction.commands.map(mapCommand),
		},
	};
}

function mapOwner(owner: SuiClientTypes.ObjectOwner | null): SuiJsonRpcTypes.ObjectOwner {
	switch (owner?.$kind) {
		case 'AddressOwner':
			return { AddressOwner: owner.AddressOwner };
		case 'ObjectOwner':
			return { ObjectOwner: owner.ObjectOwner };
		case 'Shared':
			return {
				Shared: { initial_shared_version: asJsonNumber(owner.Shared.initialSharedVersion) },
			};
		case 'Immutable':
			return 'Immutable';
		case 'ConsensusAddressOwner':
			return {
				ConsensusAddressOwner: {
					owner: owner.ConsensusAddressOwner.owner,
					start_version: asJsonNumber(owner.ConsensusAddressOwner.startVersion),
				},
			};
		default:
			throw new Error(`Cannot map object owner ${owner?.$kind ?? 'null'} to JSON-RPC`);
	}
}

function mapOutputOwner(change: SuiClientTypes.ChangedObject): SuiJsonRpcTypes.ObjectOwner {
	// Packages have no owner in effects; the node reports them as immutable.
	return change.outputState === 'PackageWrite' ? 'Immutable' : mapOwner(change.outputOwner);
}

function isConsensusOwner(owner: SuiClientTypes.ObjectOwner | null): boolean {
	return owner?.$kind === 'Shared' || owner?.$kind === 'ConsensusAddressOwner';
}

function mapUnchangedConsensusObject(
	object: SuiClientTypes.UnchangedConsensusObject,
): SuiJsonRpcTypes.SuiObjectRef[] {
	const ref = (digest: string | null) => [
		{
			objectId: object.objectId,
			version: asJsonNumber(required(object.version, 'consensus object version')),
			digest: required(digest, 'consensus object digest'),
		},
	];

	switch (object.kind) {
		case 'ReadOnlyRoot':
			return ref(object.digest);
		case 'MutateConsensusStreamEnded':
		case 'ReadConsensusStreamEnded':
			return ref(OBJECT_DIGEST_DELETED);
		case 'Cancelled':
			return ref(OBJECT_DIGEST_CANCELLED);
		default:
			// The node does not list the per-epoch config object.
			return [];
	}
}

/**
 * The gas coin's reference. Gas paid from an address balance has no gas coin: the node then
 * reported a zero reference owned by `0x0`, but this reports the payer as the owner, which old
 * wallet UIs read.
 */
function mapGasObject(
	transaction: Pick<MappableTransaction, 'effects' | 'transaction'>,
): SuiJsonRpcTypes.OwnedObjectRef {
	const gasObject = transaction.effects.gasObject;

	if (gasObject?.outputState === 'ObjectWrite') {
		return { reference: outputObjectRef(gasObject), owner: mapOwner(gasObject.outputOwner) };
	}

	const { gasData, sender } = transaction.transaction;
	return {
		reference: {
			objectId: normalizeSuiAddress('0x0'),
			version: asJsonNumber(0),
			digest: OBJECT_DIGEST_MIN,
		},
		owner: { AddressOwner: required(gasData.owner ?? sender, 'gas owner') },
	};
}

function mapAbortError(
	status: SuiClientTypes.ExecutionStatus,
): SuiJsonRpcTypes.SuiMoveAbort | undefined {
	if (status.success || status.error.$kind !== 'MoveAbort') {
		return undefined;
	}

	const { abortCode, location, cleverError } = status.error.MoveAbort;
	// A clever error's abort code packs its error code and line, which the node unpacked.
	const errorCode = cleverError ? cleverError.errorCode : abortCode;
	const abortError: SuiJsonRpcTypes.SuiMoveAbort = {};

	if (location?.package && location.module) {
		abortError.module_id = `${normalizeSuiAddress(location.package)}::${location.module}`;
	}
	if (location?.functionName) {
		abortError.function = location.functionName;
	}
	if (cleverError?.lineNumber != null) {
		abortError.line = cleverError.lineNumber;
	}
	if (errorCode != null) {
		abortError.error_code = asJsonNumber(errorCode);
	}

	return abortError;
}

function outputObjectRef(change: SuiClientTypes.ChangedObject): SuiJsonRpcTypes.SuiObjectRef {
	return {
		objectId: change.objectId,
		version: asJsonNumber(required(change.outputVersion, 'output version')),
		digest: required(change.outputDigest, 'output digest'),
	};
}

/** Module names of every published or upgraded package, sorted as the node lists them. */
function publishedModuleNames(transaction: SuiClientTypes.TransactionData): string[] {
	return transaction.commands
		.flatMap((command) =>
			'Publish' in command
				? command.Publish.modules
				: 'Upgrade' in command
					? command.Upgrade.modules
					: [],
		)
		.map((module) => readMoveModuleName(fromBase64(module)))
		.sort();
}

function mapCallArg(input: CallArg, pureInputType?: PureInputType): SuiJsonRpcTypes.SuiCallArg {
	if ('Pure' in input) {
		return mapPureCallArg(fromBase64(input.Pure.bytes), pureInputType);
	}

	if ('Object' in input) {
		const object = input.Object;
		if ('ImmOrOwnedObject' in object) {
			const { objectId, version, digest } = object.ImmOrOwnedObject;
			return {
				type: 'object',
				objectType: 'immOrOwnedObject',
				objectId,
				version: String(version),
				digest,
			};
		}
		if ('SharedObject' in object) {
			const { objectId, initialSharedVersion, mutable } = object.SharedObject;
			return {
				type: 'object',
				objectType: 'sharedObject',
				objectId,
				initialSharedVersion: String(initialSharedVersion),
				mutable,
			};
		}
		const { objectId, version, digest } = object.Receiving;
		return { type: 'object', objectType: 'receiving', objectId, version: String(version), digest };
	}

	if ('FundsWithdrawal' in input) {
		const { reservation, typeArg, withdrawFrom } = input.FundsWithdrawal;
		return {
			type: 'fundsWithdrawal',
			reservation: { maxAmountU64: String(reservation.MaxAmountU64) },
			typeArg: { balance: toTypeDisplayString(typeArg.Balance) },
			withdrawFrom: mapWithdrawFrom(withdrawFrom),
		};
	}

	throw new Error(`Unsupported transaction input ${Object.keys(input)[0]}`);
}

function mapWithdrawFrom(
	withdrawFrom: Extract<CallArg, { FundsWithdrawal: unknown }>['FundsWithdrawal']['withdrawFrom'],
): SuiJsonRpcTypes.SuiWithdrawFrom {
	if ('Sender' in withdrawFrom) {
		return 'sender';
	}
	if ('Sponsor' in withdrawFrom) {
		return 'sponsor';
	}
	if ('SenderAllowance' in withdrawFrom) {
		return { senderAllowance: withdrawFrom.SenderAllowance };
	}
	throw new Error(`Unsupported fundsWithdrawal source ${JSON.stringify(withdrawFrom)}`);
}

/** The pure input types the node could tell from the commands alone. */
function pureInputTypeHints(
	transaction: SuiClientTypes.TransactionData,
): Map<number, PureInputType> {
	const hints = new Map<number, PureInputType>();
	const hint = (argument: Argument, type: PureInputType) => {
		if ('Input' in argument && 'Pure' in (transaction.inputs[argument.Input] ?? {})) {
			hints.set(argument.Input, type);
		}
	};

	for (const command of transaction.commands) {
		if ('TransferObjects' in command) {
			hint(command.TransferObjects.address, 'address');
		} else if ('SplitCoins' in command) {
			command.SplitCoins.amounts.forEach((amount) => hint(amount, 'u64'));
		} else if ('MakeMoveVec' in command && isPureInputType(command.MakeMoveVec.type)) {
			const type = command.MakeMoveVec.type;
			command.MakeMoveVec.elements.forEach((element) => hint(element, type));
		}
	}

	return hints;
}

function isPureInputType(type: string | null): type is PureInputType {
	return ['address', 'bool', 'u8', 'u16', 'u32', 'u64', 'u128', 'u256'].includes(type ?? '');
}

function mapPureCallArg(bytes: Uint8Array, type?: PureInputType): SuiJsonRpcTypes.SuiCallArg {
	if (type) {
		try {
			return { type: 'pure', value: bcs[typeToBcs[type]].parse(bytes), valueType: type };
		} catch {
			// Bytes that do not decode as the hinted type stay raw, as on the node.
		}
	}

	return { type: 'pure', value: Array.from(bytes) };
}

const typeToBcs = {
	address: 'Address',
	bool: 'Bool',
	u8: 'U8',
	u16: 'U16',
	u32: 'U32',
	u64: 'U64',
	u128: 'U128',
	u256: 'U256',
} as const;

function mapCommand(command: Command): SuiJsonRpcTypes.SuiTransaction {
	if ('MoveCall' in command) {
		const {
			package: packageId,
			module,
			function: fn,
			typeArguments,
			arguments: args,
		} = command.MoveCall;
		return {
			MoveCall: {
				package: packageId,
				module,
				function: fn,
				...(typeArguments.length > 0 && {
					type_arguments: typeArguments.map(toTypeDisplayString),
				}),
				...(args.length > 0 && { arguments: args.map(mapArgument) }),
			},
		};
	}
	if ('TransferObjects' in command) {
		const { objects, address } = command.TransferObjects;
		return { TransferObjects: [objects.map(mapArgument), mapArgument(address)] };
	}
	if ('SplitCoins' in command) {
		const { coin, amounts } = command.SplitCoins;
		return { SplitCoins: [mapArgument(coin), amounts.map(mapArgument)] };
	}
	if ('MergeCoins' in command) {
		const { destination, sources } = command.MergeCoins;
		return { MergeCoins: [mapArgument(destination), sources.map(mapArgument)] };
	}
	if ('Publish' in command) {
		return { Publish: command.Publish.dependencies };
	}
	if ('MakeMoveVec' in command) {
		const { type, elements } = command.MakeMoveVec;
		return {
			MakeMoveVec: [type === null ? null : toTypeDisplayString(type), elements.map(mapArgument)],
		};
	}
	if ('Upgrade' in command) {
		const { dependencies, package: packageId, ticket } = command.Upgrade;
		return { Upgrade: [dependencies, packageId, mapArgument(ticket)] };
	}

	throw new Error(`Unsupported transaction command ${Object.keys(command)[0]}`);
}

function mapArgument(argument: Argument): SuiJsonRpcTypes.SuiArgument {
	if ('GasCoin' in argument) {
		return 'GasCoin';
	}
	if ('Input' in argument) {
		return { Input: argument.Input };
	}
	if ('Result' in argument) {
		return { Result: argument.Result };
	}
	return { NestedResult: argument.NestedResult };
}

/** A type as sui_serde writes struct types: system addresses short, others in full. */
function toSuiTypeTagString(type: string): string {
	return formatTypeTag(TypeTagSerializer.parseFromStr(type, true), (address) =>
		SYSTEM_ADDRESSES.has(address) ? shortAddress(address) : address,
	);
}

/** A type as Move's `TypeTag` Display writes it, with every address short. */
function toTypeDisplayString(type: string): string {
	return formatTypeTag(TypeTagSerializer.parseFromStr(type, true), shortAddress);
}

function formatTypeTag(tag: TypeTag, formatAddress: (address: string) => string): string {
	if ('vector' in tag) {
		return `vector<${formatTypeTag(tag.vector, formatAddress)}>`;
	}
	if ('struct' in tag) {
		const { address, module, name, typeParams } = tag.struct;
		const params = typeParams.map((param) => formatTypeTag(param, formatAddress));
		return `${formatAddress(address)}::${module}::${name}${params.length ? `<${params.join(', ')}>` : ''}`;
	}
	return TypeTagSerializer.tagToString(tag);
}

function shortAddress(address: string): string {
	return `0x${address.slice(2).replace(/^0+(?=.)/, '')}`;
}

/**
 * The node wrote these as JSON numbers, though the vendored JSON-RPC types declare strings.
 */
function asJsonNumber(value: string | number): string {
	return Number(value) as unknown as string;
}

function withoutEmptyLists<T extends Record<string, unknown[]>>(lists: T): Partial<T> {
	return Object.fromEntries(
		Object.entries(lists).filter(([, list]) => list.length > 0),
	) as Partial<T>;
}

function required<T>(value: T | null | undefined, name: string): T {
	if (value == null) {
		throw new Error(`Missing ${name}`);
	}
	return value;
}
