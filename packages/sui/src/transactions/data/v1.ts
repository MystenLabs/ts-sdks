// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64, toBase64 } from '@mysten/bcs';
import type { GenericSchema, InferInput, InferOutput } from 'valibot';
import {
	array,
	bigint,
	boolean,
	check,
	integer,
	is,
	lazy,
	literal,
	nullable,
	nullish,
	number,
	object,
	optional,
	parse,
	pipe,
	string,
	union,
	unknown,
} from 'valibot';

import { TypeTagSerializer } from '../../bcs/index.js';
import type { StructTag as StructTagType, TypeTag as TypeTagType } from '../../bcs/types.js';
import { JsonU64, ObjectID, safeEnum, TransactionDataSchema } from './internal.js';
import type { Argument, ArgumentSchema, TransactionData } from './internal.js';

export type ObjectRefV1 = { digest: string; objectId: string; version: number | string | bigint };
export const ObjectRef: GenericSchema<ObjectRefV1, ObjectRefV1> = object({
	digest: string(),
	objectId: string(),
	version: union([pipe(number(), integer()), string(), bigint()]),
}) as GenericSchema<ObjectRefV1, ObjectRefV1>;

const ObjectArg = safeEnum({
	ImmOrOwned: ObjectRef,
	Shared: object({
		objectId: ObjectID,
		initialSharedVersion: JsonU64,
		mutable: boolean(),
	}),
	Receiving: ObjectRef,
});

type NormalizedCallArgInputV1 =
	| {
			Object:
				| { ImmOrOwned: ObjectRefV1 }
				| { Shared: { objectId: string; initialSharedVersion: string | number; mutable: boolean } }
				| { Receiving: ObjectRefV1 };
	  }
	| { Pure: number[] };
type NormalizedCallArgObjectV1 = {
	$kind: 'ImmOrOwned' | 'Shared' | 'Receiving';
	ImmOrOwned?: ObjectRefV1;
	Shared?: { objectId: string; initialSharedVersion: string; mutable: boolean };
	Receiving?: ObjectRefV1;
};
type NormalizedCallArgV1 = {
	$kind: 'Object' | 'Pure';
	Object?: NormalizedCallArgObjectV1;
	Pure?: number[];
};
export const NormalizedCallArg: GenericSchema<NormalizedCallArgInputV1, NormalizedCallArgV1> =
	safeEnum({
		Object: ObjectArg,
		Pure: array(pipe(number(), integer())),
	}) as GenericSchema<NormalizedCallArgInputV1, NormalizedCallArgV1>;

type TransactionInputV1 =
	| { kind: 'Input'; index: number; value: unknown; type?: 'object' }
	| { kind: 'Input'; index: number; value: unknown; type: 'pure' };
const TransactionInput: GenericSchema<TransactionInputV1, TransactionInputV1> = union([
	object({
		kind: literal('Input'),
		index: pipe(number(), integer()),
		value: unknown(),
		type: optional(literal('object')),
	}),
	object({
		kind: literal('Input'),
		index: pipe(number(), integer()),
		value: unknown(),
		type: literal('pure'),
	}),
]) as GenericSchema<TransactionInputV1, TransactionInputV1>;

const TransactionExpiration = union([
	object({ Epoch: pipe(number(), integer()) }),
	object({ None: nullable(literal(true)) }),
]);

const StringEncodedBigint = pipe(
	union([number(), string(), bigint()]),
	check((val) => {
		if (!['string', 'number', 'bigint'].includes(typeof val)) return false;

		try {
			BigInt(val as string);
			return true;
		} catch {
			return false;
		}
	}),
);

export const TypeTag: GenericSchema<TypeTagType> = union([
	object({ bool: nullable(literal(true)) }),
	object({ u8: nullable(literal(true)) }),
	object({ u64: nullable(literal(true)) }),
	object({ u128: nullable(literal(true)) }),
	object({ address: nullable(literal(true)) }),
	object({ signer: nullable(literal(true)) }),
	object({ vector: lazy(() => TypeTag) }),
	object({ struct: lazy(() => StructTag) }),
	object({ u16: nullable(literal(true)) }),
	object({ u32: nullable(literal(true)) }),
	object({ u256: nullable(literal(true)) }),
]);

// https://github.com/MystenLabs/sui/blob/cea8742e810142a8145fd83c4c142d61e561004a/external-crates/move/crates/move-core-types/src/language_storage.rs#L140-L147
export const StructTag: GenericSchema<StructTagType> = object({
	address: string(),
	module: string(),
	name: string(),
	typeParams: array(TypeTag),
});

type GasConfigInput = {
	budget?: number | string | bigint;
	price?: number | string | bigint;
	payment?: ObjectRefV1[];
	owner?: string;
};
type GasConfigOutput = GasConfigInput;
const GasConfig: GenericSchema<GasConfigInput, GasConfigOutput> = object({
	budget: optional(StringEncodedBigint),
	price: optional(StringEncodedBigint),
	payment: optional(array(ObjectRef)),
	owner: optional(string()),
}) as GenericSchema<GasConfigInput, GasConfigOutput>;

const TransactionArgumentTypes = [
	TransactionInput,
	object({ kind: literal('GasCoin') }),
	object({ kind: literal('Result'), index: pipe(number(), integer()) }),
	object({
		kind: literal('NestedResult'),
		index: pipe(number(), integer()),
		resultIndex: pipe(number(), integer()),
	}),
] as const;

// Generic transaction argument
export type TransactionArgumentV1 =
	| InferOutput<typeof TransactionInput>
	| { kind: 'GasCoin' }
	| { kind: 'Result'; index: number }
	| { kind: 'NestedResult'; index: number; resultIndex: number };
type TransactionArgumentV1Input =
	| InferInput<typeof TransactionInput>
	| { kind: 'GasCoin' }
	| { kind: 'Result'; index: number }
	| { kind: 'NestedResult'; index: number; resultIndex: number };
export const TransactionArgument: GenericSchema<TransactionArgumentV1Input, TransactionArgumentV1> =
	union([...TransactionArgumentTypes]) as GenericSchema<
		TransactionArgumentV1Input,
		TransactionArgumentV1
	>;

type MoveCallTransactionV1 = {
	kind: 'MoveCall';
	target: `${string}::${string}::${string}`;
	typeArguments: string[];
	arguments: TransactionArgumentV1[];
};
type MoveCallTransactionV1Input = {
	kind: 'MoveCall';
	target: `${string}::${string}::${string}`;
	typeArguments: string[];
	arguments: TransactionArgumentV1Input[];
};
const MoveCallTransaction: GenericSchema<MoveCallTransactionV1Input, MoveCallTransactionV1> =
	object({
		kind: literal('MoveCall'),
		target: pipe(
			string(),
			check((target) => target.split('::').length === 3),
		) as GenericSchema<`${string}::${string}::${string}`>,
		typeArguments: array(string()),
		arguments: array(TransactionArgument),
	}) as GenericSchema<MoveCallTransactionV1Input, MoveCallTransactionV1>;

type TransferObjectsTransactionV1 = {
	kind: 'TransferObjects';
	objects: TransactionArgumentV1[];
	address: TransactionArgumentV1;
};
type TransferObjectsTransactionV1Input = {
	kind: 'TransferObjects';
	objects: TransactionArgumentV1Input[];
	address: TransactionArgumentV1Input;
};
const TransferObjectsTransaction: GenericSchema<
	TransferObjectsTransactionV1Input,
	TransferObjectsTransactionV1
> = object({
	kind: literal('TransferObjects'),
	objects: array(TransactionArgument),
	address: TransactionArgument,
}) as GenericSchema<TransferObjectsTransactionV1Input, TransferObjectsTransactionV1>;

type SplitCoinsTransactionV1 = {
	kind: 'SplitCoins';
	coin: TransactionArgumentV1;
	amounts: TransactionArgumentV1[];
};
type SplitCoinsTransactionV1Input = {
	kind: 'SplitCoins';
	coin: TransactionArgumentV1Input;
	amounts: TransactionArgumentV1Input[];
};
const SplitCoinsTransaction: GenericSchema<SplitCoinsTransactionV1Input, SplitCoinsTransactionV1> =
	object({
		kind: literal('SplitCoins'),
		coin: TransactionArgument,
		amounts: array(TransactionArgument),
	}) as GenericSchema<SplitCoinsTransactionV1Input, SplitCoinsTransactionV1>;

type MergeCoinsTransactionV1 = {
	kind: 'MergeCoins';
	destination: TransactionArgumentV1;
	sources: TransactionArgumentV1[];
};
type MergeCoinsTransactionV1Input = {
	kind: 'MergeCoins';
	destination: TransactionArgumentV1Input;
	sources: TransactionArgumentV1Input[];
};
const MergeCoinsTransaction: GenericSchema<MergeCoinsTransactionV1Input, MergeCoinsTransactionV1> =
	object({
		kind: literal('MergeCoins'),
		destination: TransactionArgument,
		sources: array(TransactionArgument),
	}) as GenericSchema<MergeCoinsTransactionV1Input, MergeCoinsTransactionV1>;

type MakeMoveVecTransactionV1 = {
	kind: 'MakeMoveVec';
	type: { Some: TypeTagType } | { None: true | null };
	objects: TransactionArgumentV1[];
};
type MakeMoveVecTransactionV1Input = {
	kind: 'MakeMoveVec';
	type: { Some: TypeTagType } | { None: true | null };
	objects: TransactionArgumentV1Input[];
};
const MakeMoveVecTransaction: GenericSchema<
	MakeMoveVecTransactionV1Input,
	MakeMoveVecTransactionV1
> = object({
	kind: literal('MakeMoveVec'),
	type: union([object({ Some: TypeTag }), object({ None: nullable(literal(true)) })]),
	objects: array(TransactionArgument),
}) as GenericSchema<MakeMoveVecTransactionV1Input, MakeMoveVecTransactionV1>;

type PublishTransactionV1 = {
	kind: 'Publish';
	modules: number[][];
	dependencies: string[];
};
const PublishTransaction: GenericSchema<PublishTransactionV1, PublishTransactionV1> = object({
	kind: literal('Publish'),
	modules: array(array(pipe(number(), integer()))),
	dependencies: array(string()),
}) as GenericSchema<PublishTransactionV1, PublishTransactionV1>;

type UpgradeTransactionV1 = {
	kind: 'Upgrade';
	modules: number[][];
	dependencies: string[];
	packageId: string;
	ticket: TransactionArgumentV1;
};
type UpgradeTransactionV1Input = {
	kind: 'Upgrade';
	modules: number[][];
	dependencies: string[];
	packageId: string;
	ticket: TransactionArgumentV1Input;
};
const UpgradeTransaction: GenericSchema<UpgradeTransactionV1Input, UpgradeTransactionV1> = object({
	kind: literal('Upgrade'),
	modules: array(array(pipe(number(), integer()))),
	dependencies: array(string()),
	packageId: string(),
	ticket: TransactionArgument,
}) as GenericSchema<UpgradeTransactionV1Input, UpgradeTransactionV1>;

const TransactionTypes = [
	MoveCallTransaction,
	TransferObjectsTransaction,
	SplitCoinsTransaction,
	MergeCoinsTransaction,
	PublishTransaction,
	UpgradeTransaction,
	MakeMoveVecTransaction,
] as const;

type TransactionTypeV1 =
	| InferOutput<typeof MoveCallTransaction>
	| InferOutput<typeof TransferObjectsTransaction>
	| InferOutput<typeof SplitCoinsTransaction>
	| InferOutput<typeof MergeCoinsTransaction>
	| InferOutput<typeof PublishTransaction>
	| InferOutput<typeof UpgradeTransaction>
	| InferOutput<typeof MakeMoveVecTransaction>;
type TransactionTypeV1Input =
	| InferInput<typeof MoveCallTransaction>
	| InferInput<typeof TransferObjectsTransaction>
	| InferInput<typeof SplitCoinsTransaction>
	| InferInput<typeof MergeCoinsTransaction>
	| InferInput<typeof PublishTransaction>
	| InferInput<typeof UpgradeTransaction>
	| InferInput<typeof MakeMoveVecTransaction>;
const TransactionType: GenericSchema<TransactionTypeV1Input, TransactionTypeV1> = union([
	...TransactionTypes,
]) as GenericSchema<TransactionTypeV1Input, TransactionTypeV1>;

export type SerializedTransactionDataV1 = {
	version: 1;
	sender?: string;
	expiration?: { Epoch: number } | { None: true | null } | null;
	gasConfig: InferOutput<typeof GasConfig>;
	inputs: TransactionInputV1[];
	transactions: InferOutput<typeof TransactionType>[];
};
type SerializedTransactionDataV1Input = {
	version: 1;
	sender?: string;
	expiration?: { Epoch: number } | { None: true | null } | null;
	gasConfig: InferInput<typeof GasConfig>;
	inputs: TransactionInputV1[];
	transactions: InferInput<typeof TransactionType>[];
};
export const SerializedTransactionDataV1: GenericSchema<
	SerializedTransactionDataV1Input,
	SerializedTransactionDataV1
> = object({
	version: literal(1),
	sender: optional(string()),
	expiration: nullish(TransactionExpiration),
	gasConfig: GasConfig,
	inputs: array(TransactionInput),
	transactions: array(TransactionType),
}) as GenericSchema<SerializedTransactionDataV1Input, SerializedTransactionDataV1>;

export function serializeV1TransactionData(
	transactionData: TransactionData,
): SerializedTransactionDataV1 {
	const inputs: InferOutput<typeof TransactionInput>[] = transactionData.inputs.map(
		(input, index) => {
			if (input.Object) {
				return {
					kind: 'Input',
					index,
					value: {
						Object: input.Object.ImmOrOwnedObject
							? {
									ImmOrOwned: input.Object.ImmOrOwnedObject,
								}
							: input.Object.Receiving
								? {
										Receiving: {
											digest: input.Object.Receiving.digest,
											version: input.Object.Receiving.version,
											objectId: input.Object.Receiving.objectId,
										},
									}
								: {
										Shared: {
											mutable: input.Object.SharedObject.mutable,
											initialSharedVersion: input.Object.SharedObject.initialSharedVersion,
											objectId: input.Object.SharedObject.objectId,
										},
									},
					},
					type: 'object',
				};
			}
			if (input.Pure) {
				return {
					kind: 'Input',
					index,
					value: {
						Pure: Array.from(fromBase64(input.Pure.bytes)),
					},
					type: 'pure',
				};
			}

			if (input.UnresolvedPure) {
				return {
					kind: 'Input',
					type: 'pure',
					index,
					value: input.UnresolvedPure.value,
				};
			}

			if (input.UnresolvedObject) {
				return {
					kind: 'Input',
					type: 'object',
					index,
					value: input.UnresolvedObject.objectId,
				};
			}

			throw new Error('Invalid input');
		},
	);

	return {
		version: 1,
		sender: transactionData.sender ?? undefined,
		expiration:
			transactionData.expiration?.$kind === 'Epoch'
				? { Epoch: Number(transactionData.expiration.Epoch) }
				: transactionData.expiration
					? { None: true }
					: null,
		gasConfig: {
			owner: transactionData.gasData.owner ?? undefined,
			budget: transactionData.gasData.budget ?? undefined,
			price: transactionData.gasData.price ?? undefined,
			payment: transactionData.gasData.payment ?? undefined,
		},
		inputs,
		transactions: transactionData.commands.map((command): InferOutput<typeof TransactionType> => {
			if (command.MakeMoveVec) {
				return {
					kind: 'MakeMoveVec',
					type:
						command.MakeMoveVec.type === null
							? { None: true }
							: { Some: TypeTagSerializer.parseFromStr(command.MakeMoveVec.type) },
					objects: command.MakeMoveVec.elements.map((arg) =>
						convertTransactionArgument(arg, inputs),
					),
				};
			}
			if (command.MergeCoins) {
				return {
					kind: 'MergeCoins',
					destination: convertTransactionArgument(command.MergeCoins.destination, inputs),
					sources: command.MergeCoins.sources.map((arg) => convertTransactionArgument(arg, inputs)),
				};
			}
			if (command.MoveCall) {
				return {
					kind: 'MoveCall',
					target: `${command.MoveCall.package}::${command.MoveCall.module}::${command.MoveCall.function}`,
					typeArguments: command.MoveCall.typeArguments,
					arguments: command.MoveCall.arguments.map((arg) =>
						convertTransactionArgument(arg, inputs),
					),
				};
			}
			if (command.Publish) {
				return {
					kind: 'Publish',
					modules: command.Publish.modules.map((mod) => Array.from(fromBase64(mod))),
					dependencies: command.Publish.dependencies,
				};
			}
			if (command.SplitCoins) {
				return {
					kind: 'SplitCoins',
					coin: convertTransactionArgument(command.SplitCoins.coin, inputs),
					amounts: command.SplitCoins.amounts.map((arg) => convertTransactionArgument(arg, inputs)),
				};
			}
			if (command.TransferObjects) {
				return {
					kind: 'TransferObjects',
					objects: command.TransferObjects.objects.map((arg) =>
						convertTransactionArgument(arg, inputs),
					),
					address: convertTransactionArgument(command.TransferObjects.address, inputs),
				};
			}

			if (command.Upgrade) {
				return {
					kind: 'Upgrade',
					modules: command.Upgrade.modules.map((mod) => Array.from(fromBase64(mod))),
					dependencies: command.Upgrade.dependencies,
					packageId: command.Upgrade.package,
					ticket: convertTransactionArgument(command.Upgrade.ticket, inputs),
				};
			}

			throw new Error(`Unknown transaction ${Object.keys(command)}`);
		}),
	};
}

function convertTransactionArgument(
	arg: Argument,
	inputs: InferOutput<typeof TransactionInput>[],
): InferOutput<typeof TransactionArgument> {
	if (arg.$kind === 'GasCoin') {
		return { kind: 'GasCoin' };
	}
	if (arg.$kind === 'Result') {
		return { kind: 'Result', index: arg.Result };
	}
	if (arg.$kind === 'NestedResult') {
		return { kind: 'NestedResult', index: arg.NestedResult[0], resultIndex: arg.NestedResult[1] };
	}
	if (arg.$kind === 'Input') {
		return inputs[arg.Input];
	}

	throw new Error(`Invalid argument ${Object.keys(arg)}`);
}

export function transactionDataFromV1(data: SerializedTransactionDataV1): TransactionData {
	return parse(TransactionDataSchema, {
		version: 2,
		sender: data.sender ?? null,
		expiration: data.expiration
			? 'Epoch' in data.expiration
				? { Epoch: data.expiration.Epoch }
				: { None: true }
			: null,
		gasData: {
			owner: data.gasConfig.owner ?? null,
			budget: data.gasConfig.budget?.toString() ?? null,
			price: data.gasConfig.price?.toString() ?? null,
			payment:
				data.gasConfig.payment?.map((ref) => ({
					digest: ref.digest,
					objectId: ref.objectId,
					version: ref.version.toString(),
				})) ?? null,
		},
		inputs: data.inputs.map((input) => {
			if (input.kind === 'Input') {
				if (is(NormalizedCallArg, input.value)) {
					const value = parse(NormalizedCallArg, input.value);

					if (value.Object) {
						if (value.Object.ImmOrOwned) {
							return {
								Object: {
									ImmOrOwnedObject: {
										objectId: value.Object.ImmOrOwned.objectId,
										version: String(value.Object.ImmOrOwned.version),
										digest: value.Object.ImmOrOwned.digest,
									},
								},
							};
						}
						if (value.Object.Shared) {
							return {
								Object: {
									SharedObject: {
										mutable: value.Object.Shared.mutable ?? null,
										initialSharedVersion: value.Object.Shared.initialSharedVersion,
										objectId: value.Object.Shared.objectId,
									},
								},
							};
						}
						if (value.Object.Receiving) {
							return {
								Object: {
									Receiving: {
										digest: value.Object.Receiving.digest,
										version: String(value.Object.Receiving.version),
										objectId: value.Object.Receiving.objectId,
									},
								},
							};
						}

						throw new Error('Invalid object input');
					}

					return {
						Pure: {
							bytes: toBase64(new Uint8Array(value.Pure!)),
						},
					};
				}

				if (input.type === 'object') {
					return {
						UnresolvedObject: {
							objectId: input.value as string,
						},
					};
				}

				return {
					UnresolvedPure: {
						value: input.value,
					},
				};
			}

			throw new Error('Invalid input');
		}),
		commands: data.transactions.map((transaction) => {
			switch (transaction.kind) {
				case 'MakeMoveVec':
					return {
						MakeMoveVec: {
							type:
								'Some' in transaction.type
									? TypeTagSerializer.tagToString(transaction.type.Some)
									: null,
							elements: transaction.objects.map((arg) => parseV1TransactionArgument(arg)),
						},
					};
				case 'MergeCoins': {
					return {
						MergeCoins: {
							destination: parseV1TransactionArgument(transaction.destination),
							sources: transaction.sources.map((arg) => parseV1TransactionArgument(arg)),
						},
					};
				}
				case 'MoveCall': {
					const [pkg, mod, fn] = transaction.target.split('::');
					return {
						MoveCall: {
							package: pkg,
							module: mod,
							function: fn,
							typeArguments: transaction.typeArguments,
							arguments: transaction.arguments.map((arg) => parseV1TransactionArgument(arg)),
						},
					};
				}
				case 'Publish': {
					return {
						Publish: {
							modules: transaction.modules.map((mod) => toBase64(Uint8Array.from(mod))),
							dependencies: transaction.dependencies,
						},
					};
				}
				case 'SplitCoins': {
					return {
						SplitCoins: {
							coin: parseV1TransactionArgument(transaction.coin),
							amounts: transaction.amounts.map((arg) => parseV1TransactionArgument(arg)),
						},
					};
				}
				case 'TransferObjects': {
					return {
						TransferObjects: {
							objects: transaction.objects.map((arg) => parseV1TransactionArgument(arg)),
							address: parseV1TransactionArgument(transaction.address),
						},
					};
				}
				case 'Upgrade': {
					return {
						Upgrade: {
							modules: transaction.modules.map((mod) => toBase64(Uint8Array.from(mod))),
							dependencies: transaction.dependencies,
							package: transaction.packageId,
							ticket: parseV1TransactionArgument(transaction.ticket),
						},
					};
				}
			}

			throw new Error(`Unknown transaction ${Object.keys(transaction)}`);
		}),
	} satisfies InferInput<typeof TransactionDataSchema>);
}

function parseV1TransactionArgument(
	arg: InferOutput<typeof TransactionArgument>,
): InferInput<typeof ArgumentSchema> {
	switch (arg.kind) {
		case 'GasCoin': {
			return { GasCoin: true };
		}
		case 'Result':
			return { Result: arg.index };
		case 'NestedResult': {
			return { NestedResult: [arg.index, arg.resultIndex] };
		}
		case 'Input': {
			return { Input: arg.index };
		}
	}
}
