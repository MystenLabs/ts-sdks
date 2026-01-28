// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { EnumInputShape, EnumOutputShape } from '@mysten/bcs';
import type { GenericSchema, InferInput, InferOutput, ObjectEntries, ObjectSchema } from 'valibot';
import {
	array,
	boolean,
	check,
	integer,
	lazy,
	literal,
	nullable,
	nullish,
	number,
	object,
	optional,
	pipe,
	record,
	string,
	transform,
	tuple,
	union,
	unknown,
} from 'valibot';

import { isValidSuiAddress, normalizeSuiAddress } from '../../utils/sui-types.js';
import type { Simplify } from '@mysten/utils';
import type { SuiClientTypes } from '../../client/types.js';

type EnumSchemaInput<T extends Record<string, GenericSchema<any>>> = EnumInputShape<
	Simplify<{
		[K in keyof T]: InferInput<T[K]>;
	}>
>;

type EnumSchemaOutput<T extends Record<string, GenericSchema<any>>> = EnumOutputShape<
	Simplify<{
		[K in keyof T]: InferOutput<T[K]>;
	}>
>;

type EnumSchema<T extends Record<string, GenericSchema<any>>> = GenericSchema<
	EnumSchemaInput<T>,
	EnumSchemaOutput<T>
>;

export function safeEnum<T extends Record<string, GenericSchema<any>>>(options: T): EnumSchema<T> {
	return union(
		Object.keys(options).map(
			(key) =>
				withKind(
					key,
					object({
						[key]: options[key],
					}),
				) as GenericSchema<EnumOutputShape<T>>,
		),
	) as EnumSchema<T>;
}

function withKind<K extends string, TEntries extends ObjectEntries>(
	key: K,
	schema: ObjectSchema<TEntries, undefined>,
) {
	return pipe(
		object({
			...schema.entries,
			$kind: optional(literal(key)),
		}),
		transform((value) => ({ ...value, $kind: key })),
	) as GenericSchema<
		Simplify<InferInput<ObjectSchema<TEntries, undefined>> & { $kind?: K }>,
		Simplify<InferOutput<ObjectSchema<TEntries, undefined>> & { $kind: K }>
	>;
}

export const SuiAddress = pipe(
	string(),
	transform((value) => normalizeSuiAddress(value)),
	check(isValidSuiAddress),
);
export const ObjectID = SuiAddress;
export const BCSBytes = string();
export const JsonU64 = pipe(
	union([string(), pipe(number(), integer())]),

	check((val) => {
		try {
			BigInt(val);
			return BigInt(val) >= 0 && BigInt(val) <= 18446744073709551615n;
		} catch {
			return false;
		}
	}, 'Invalid u64'),
);

export const U32 = pipe(
	number(),
	integer(),
	check((val) => val >= 0 && val < 2 ** 32, 'Invalid u32'),
);

// https://github.com/MystenLabs/sui/blob/df41d5fa8127634ff4285671a01ead00e519f806/crates/sui-types/src/base_types.rs#L138
// Implemented as a tuple in rust
export const ObjectRefSchema = object({
	objectId: SuiAddress,
	version: JsonU64,
	digest: string(),
});
export type ObjectRef = InferOutput<typeof ObjectRefSchema>;

// https://github.com/MystenLabs/sui/blob/df41d5fa8127634ff4285671a01ead00e519f806/crates/sui-types/src/transaction.rs#L690-L702
export const ArgumentSchema = union([
	withKind('GasCoin', object({ GasCoin: literal(true) })),
	withKind(
		'Input',
		object({
			Input: pipe(number(), integer()),
			type: optional(union([literal('pure'), literal('object'), literal('withdrawal')])),
		}),
	),
	withKind('Result', object({ Result: pipe(number(), integer()) })),
	withKind(
		'NestedResult',
		object({ NestedResult: tuple([pipe(number(), integer()), pipe(number(), integer())]) }),
	),
]);

export type Argument = InferOutput<typeof ArgumentSchema>;

// https://github.com/MystenLabs/sui/blob/df41d5fa8127634ff4285671a01ead00e519f806/crates/sui-types/src/transaction.rs#L1387-L1392
export const GasDataSchema = object({
	budget: nullable(JsonU64),
	price: nullable(JsonU64),
	owner: nullable(SuiAddress),
	payment: nullable(array(ObjectRefSchema)),
});
export type GasData = InferOutput<typeof GasDataSchema>;

// https://github.com/MystenLabs/sui/blob/df41d5fa8127634ff4285671a01ead00e519f806/external-crates/move/crates/move-core-types/src/language_storage.rs#L140-L147
export const StructTagSchema = object({
	address: string(),
	module: string(),
	name: string(),
	// type_params in rust, should be updated to use camelCase
	typeParams: array(string()),
});
export type StructTag = InferOutput<typeof StructTagSchema>;

export const OpenSignatureBodySchema: GenericSchema<SuiClientTypes.OpenSignatureBody> = union([
	object({ $kind: literal('address') }),
	object({ $kind: literal('bool') }),
	object({ $kind: literal('u8') }),
	object({ $kind: literal('u16') }),
	object({ $kind: literal('u32') }),
	object({ $kind: literal('u64') }),
	object({ $kind: literal('u128') }),
	object({ $kind: literal('u256') }),
	object({ $kind: literal('unknown') }),
	object({ $kind: literal('vector'), vector: lazy(() => OpenSignatureBodySchema) }),
	object({
		$kind: literal('datatype'),
		datatype: object({
			typeName: string(),
			typeParameters: array(lazy(() => OpenSignatureBodySchema)),
		}),
	}),
	object({ $kind: literal('typeParameter'), index: pipe(number(), integer()) }),
]);

export const OpenSignatureSchema = object({
	reference: nullable(union([literal('mutable'), literal('immutable'), literal('unknown')])),
	body: OpenSignatureBodySchema,
});

// https://github.com/MystenLabs/sui/blob/df41d5fa8127634ff4285671a01ead00e519f806/crates/sui-types/src/transaction.rs#L707-L718
const ProgrammableMoveCallSchema = object({
	package: ObjectID,
	module: string(),
	function: string(),
	// snake case in rust
	typeArguments: array(string()),
	arguments: array(ArgumentSchema),
	_argumentTypes: optional(nullable(array(OpenSignatureSchema))),
});
export type ProgrammableMoveCall = InferOutput<typeof ProgrammableMoveCallSchema>;

export const $Intent = object({
	name: string(),
	inputs: record(string(), union([ArgumentSchema, array(ArgumentSchema)])),
	data: record(string(), unknown()),
});

// https://github.com/MystenLabs/sui/blob/df41d5fa8127634ff4285671a01ead00e519f806/crates/sui-types/src/transaction.rs#L657-L685
export const CommandSchema = safeEnum({
	MoveCall: ProgrammableMoveCallSchema,
	TransferObjects: object({
		objects: array(ArgumentSchema),
		address: ArgumentSchema,
	}),
	SplitCoins: object({
		coin: ArgumentSchema,
		amounts: array(ArgumentSchema),
	}),
	MergeCoins: object({
		destination: ArgumentSchema,
		sources: array(ArgumentSchema),
	}),
	Publish: object({
		modules: array(BCSBytes),
		dependencies: array(ObjectID),
	}),
	MakeMoveVec: object({
		type: nullable(string()),
		elements: array(ArgumentSchema),
	}),
	Upgrade: object({
		modules: array(BCSBytes),
		dependencies: array(ObjectID),
		package: ObjectID,
		ticket: ArgumentSchema,
	}),
	$Intent,
});

export type Command<Arg = Argument> = EnumOutputShape<{
	MoveCall: {
		package: string;
		module: string;
		function: string;
		typeArguments: string[];
		arguments: Arg[];
		_argumentTypes?: SuiClientTypes.OpenSignature[] | null;
	};
	TransferObjects: {
		objects: Arg[];
		address: Arg;
	};
	SplitCoins: {
		coin: Arg;
		amounts: Arg[];
	};
	MergeCoins: {
		destination: Arg;
		sources: Arg[];
	};
	Publish: {
		modules: string[];
		dependencies: string[];
	};
	MakeMoveVec: {
		type: string | null;
		elements: Arg[];
	};
	Upgrade: {
		modules: string[];
		dependencies: string[];
		package: string;
		ticket: Arg;
	};
	$Intent: {
		name: string;
		inputs: Record<string, Argument | Argument[]>;
		data: Record<string, unknown>;
	};
}>;

// https://github.com/MystenLabs/sui/blob/df41d5fa8127634ff4285671a01ead00e519f806/crates/sui-types/src/transaction.rs#L102-L114
export const ObjectArgSchema = safeEnum({
	ImmOrOwnedObject: ObjectRefSchema,
	SharedObject: object({
		objectId: ObjectID,
		// snake case in rust
		initialSharedVersion: JsonU64,
		mutable: boolean(),
	}),
	Receiving: ObjectRefSchema,
});

// Rust: crates/sui-types/src/transaction.rs
export const ReservationSchema = safeEnum({
	MaxAmountU64: JsonU64,
});
export type Reservation = InferOutput<typeof ReservationSchema>;

// Rust: crates/sui-types/src/transaction.rs
export const WithdrawalTypeArgSchema = safeEnum({
	Balance: string(),
});
export type WithdrawalTypeArg = InferOutput<typeof WithdrawalTypeArgSchema>;

// Rust: crates/sui-types/src/transaction.rs
export const WithdrawFromSchema = safeEnum({
	Sender: literal(true),
	Sponsor: literal(true),
});
export type WithdrawFrom = InferOutput<typeof WithdrawFromSchema>;

// Rust: crates/sui-types/src/transaction.rs
export const FundsWithdrawalArgSchema = object({
	reservation: ReservationSchema,
	typeArg: WithdrawalTypeArgSchema,
	withdrawFrom: WithdrawFromSchema,
});
export type FundsWithdrawalArg = InferOutput<typeof FundsWithdrawalArgSchema>;

// https://github.com/MystenLabs/sui/blob/df41d5fa8127634ff4285671a01ead00e519f806/crates/sui-types/src/transaction.rs#L75-L80
const CallArgSchema = safeEnum({
	Object: ObjectArgSchema,
	Pure: object({
		bytes: BCSBytes,
	}),
	UnresolvedPure: object({
		value: unknown(),
	}),
	UnresolvedObject: object({
		objectId: ObjectID,
		version: optional(nullable(JsonU64)),
		digest: optional(nullable(string())),
		initialSharedVersion: optional(nullable(JsonU64)),
		mutable: optional(nullable(boolean())),
	}),
	FundsWithdrawal: FundsWithdrawalArgSchema,
});
export type CallArg = InferOutput<typeof CallArgSchema>;

export const NormalizedCallArg = safeEnum({
	Object: ObjectArgSchema,
	Pure: object({
		bytes: BCSBytes,
	}),
});

// Rust: crates/sui-types/src/transaction.rs
export const ValidDuringSchema = object({
	minEpoch: nullable(JsonU64),
	maxEpoch: nullable(JsonU64),
	minTimestamp: nullable(JsonU64),
	maxTimestamp: nullable(JsonU64),
	chain: string(),
	nonce: U32,
});
export type ValidDuring = InferOutput<typeof ValidDuringSchema>;

export const TransactionExpiration = safeEnum({
	None: literal(true),
	Epoch: JsonU64,
	ValidDuring: ValidDuringSchema,
});

export type TransactionExpiration = InferOutput<typeof TransactionExpiration>;

export const TransactionDataSchema = object({
	version: literal(2),
	sender: nullish(SuiAddress),
	expiration: nullish(TransactionExpiration),
	gasData: GasDataSchema,
	inputs: array(CallArgSchema),
	commands: array(CommandSchema),
});

export type TransactionData = InferOutput<typeof TransactionDataSchema>;
