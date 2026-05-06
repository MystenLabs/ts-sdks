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

type WithKindResult<K extends string, TEntries extends ObjectEntries> = GenericSchema<
	Simplify<InferInput<ObjectSchema<TEntries, undefined>> & { $kind?: K }>,
	Simplify<InferOutput<ObjectSchema<TEntries, undefined>> & { $kind: K }>
>;

function withKind<K extends string, TEntries extends ObjectEntries>(
	key: K,
	schema: ObjectSchema<TEntries, undefined>,
): WithKindResult<K, TEntries> {
	return pipe(
		object({
			...schema.entries,
			$kind: optional(literal(key)),
		}),
		transform((value) => ({ ...value, $kind: key })),
	) as WithKindResult<K, TEntries>;
}

export const SuiAddress: GenericSchema<string, string> = pipe(
	string(),
	transform((value) => normalizeSuiAddress(value)),
	check(isValidSuiAddress),
) as GenericSchema<string, string>;
export const ObjectID: GenericSchema<string, string> = SuiAddress;
export const BCSBytes: GenericSchema<string, string> = string();
export const JsonU64: GenericSchema<string | number, string | number> = pipe(
	union([string(), pipe(number(), integer())]),

	check((val) => {
		try {
			BigInt(val);
			return BigInt(val) >= 0 && BigInt(val) <= 18446744073709551615n;
		} catch {
			return false;
		}
	}, 'Invalid u64'),
) as GenericSchema<string | number, string | number>;

export const U32: GenericSchema<number, number> = pipe(
	number(),
	integer(),
	check((val) => val >= 0 && val < 2 ** 32, 'Invalid u32'),
) as GenericSchema<number, number>;

// https://github.com/MystenLabs/sui/blob/df41d5fa8127634ff4285671a01ead00e519f806/crates/sui-types/src/base_types.rs#L138
// Implemented as a tuple in rust
export type ObjectRef = {
	objectId: string;
	version: string | number;
	digest: string;
};
export const ObjectRefSchema: GenericSchema<ObjectRef, ObjectRef> = object({
	objectId: SuiAddress,
	version: JsonU64,
	digest: string(),
}) as GenericSchema<ObjectRef, ObjectRef>;

// https://github.com/MystenLabs/sui/blob/df41d5fa8127634ff4285671a01ead00e519f806/crates/sui-types/src/transaction.rs#L690-L702
export type Argument =
	| { $kind: 'GasCoin'; GasCoin: true }
	| { $kind: 'Input'; Input: number; type?: 'pure' | 'object' | 'withdrawal' }
	| { $kind: 'Result'; Result: number }
	| { $kind: 'NestedResult'; NestedResult: [number, number] };

export type ArgumentInput =
	| { $kind?: 'GasCoin'; GasCoin: true }
	| { $kind?: 'Input'; Input: number; type?: 'pure' | 'object' | 'withdrawal' }
	| { $kind?: 'Result'; Result: number }
	| { $kind?: 'NestedResult'; NestedResult: [number, number] };

export const ArgumentSchema: GenericSchema<ArgumentInput, Argument> = union([
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
]) as GenericSchema<ArgumentInput, Argument>;

// https://github.com/MystenLabs/sui/blob/df41d5fa8127634ff4285671a01ead00e519f806/crates/sui-types/src/transaction.rs#L1387-L1392
export type GasData = {
	budget: string | number | null;
	price: string | number | null;
	owner: string | null;
	payment: ObjectRef[] | null;
};
export const GasDataSchema: GenericSchema<GasData, GasData> = object({
	budget: nullable(JsonU64),
	price: nullable(JsonU64),
	owner: nullable(SuiAddress),
	payment: nullable(array(ObjectRefSchema)),
}) as GenericSchema<GasData, GasData>;

// https://github.com/MystenLabs/sui/blob/df41d5fa8127634ff4285671a01ead00e519f806/external-crates/move/crates/move-core-types/src/language_storage.rs#L140-L147
export type StructTag = {
	address: string;
	module: string;
	name: string;
	typeParams: string[];
};
export const StructTagSchema: GenericSchema<StructTag, StructTag> = object({
	address: string(),
	module: string(),
	name: string(),
	// type_params in rust, should be updated to use camelCase
	typeParams: array(string()),
}) as GenericSchema<StructTag, StructTag>;

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

export const OpenSignatureSchema: GenericSchema<
	SuiClientTypes.OpenSignature,
	SuiClientTypes.OpenSignature
> = object({
	reference: nullable(union([literal('mutable'), literal('immutable'), literal('unknown')])),
	body: OpenSignatureBodySchema,
}) as GenericSchema<SuiClientTypes.OpenSignature, SuiClientTypes.OpenSignature>;

// https://github.com/MystenLabs/sui/blob/df41d5fa8127634ff4285671a01ead00e519f806/crates/sui-types/src/transaction.rs#L707-L718
export type ProgrammableMoveCall = {
	package: string;
	module: string;
	function: string;
	typeArguments: string[];
	arguments: Argument[];
	_argumentTypes?: SuiClientTypes.OpenSignature[] | null;
};
type ProgrammableMoveCallInput = {
	package: string;
	module: string;
	function: string;
	typeArguments: string[];
	arguments: ArgumentInput[];
	_argumentTypes?: SuiClientTypes.OpenSignature[] | null;
};
const ProgrammableMoveCallSchema: GenericSchema<ProgrammableMoveCallInput, ProgrammableMoveCall> =
	object({
		package: ObjectID,
		module: string(),
		function: string(),
		// snake case in rust
		typeArguments: array(string()),
		arguments: array(ArgumentSchema),
		_argumentTypes: optional(nullable(array(OpenSignatureSchema))),
	}) as GenericSchema<ProgrammableMoveCallInput, ProgrammableMoveCall>;

export const $Intent: GenericSchema<
	{ name: string; inputs: Record<string, Argument | Argument[]>; data: Record<string, unknown> },
	{ name: string; inputs: Record<string, Argument | Argument[]>; data: Record<string, unknown> }
> = object({
	name: string(),
	inputs: record(string(), union([ArgumentSchema, array(ArgumentSchema)])),
	data: record(string(), unknown()),
}) as GenericSchema<
	{ name: string; inputs: Record<string, Argument | Argument[]>; data: Record<string, unknown> },
	{ name: string; inputs: Record<string, Argument | Argument[]>; data: Record<string, unknown> }
>;

// https://github.com/MystenLabs/sui/blob/df41d5fa8127634ff4285671a01ead00e519f806/crates/sui-types/src/transaction.rs#L657-L685
export type CommandInput =
	| { MoveCall: ProgrammableMoveCallInput }
	| { TransferObjects: { objects: ArgumentInput[]; address: ArgumentInput } }
	| { SplitCoins: { coin: ArgumentInput; amounts: ArgumentInput[] } }
	| { MergeCoins: { destination: ArgumentInput; sources: ArgumentInput[] } }
	| { Publish: { modules: string[]; dependencies: string[] } }
	| { MakeMoveVec: { type: string | null; elements: ArgumentInput[] } }
	| {
			Upgrade: {
				modules: string[];
				dependencies: string[];
				package: string;
				ticket: ArgumentInput;
			};
	  }
	| {
			$Intent: {
				name: string;
				inputs: Record<string, ArgumentInput | ArgumentInput[]>;
				data: Record<string, unknown>;
			};
	  };
export const CommandSchema: GenericSchema<CommandInput, Command> = safeEnum({
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
}) as GenericSchema<CommandInput, Command>;

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
type SharedObjectInner = {
	objectId: string;
	initialSharedVersion: string | number;
	mutable: boolean;
};
export type ObjectArg =
	| {
			$kind: 'ImmOrOwnedObject';
			ImmOrOwnedObject: ObjectRef;
			SharedObject?: never;
			Receiving?: never;
	  }
	| {
			$kind: 'SharedObject';
			ImmOrOwnedObject?: never;
			SharedObject: SharedObjectInner;
			Receiving?: never;
	  }
	| {
			$kind: 'Receiving';
			ImmOrOwnedObject?: never;
			SharedObject?: never;
			Receiving: ObjectRef;
	  };
export type ObjectArgInput =
	| { ImmOrOwnedObject: ObjectRef }
	| { SharedObject: SharedObjectInner }
	| { Receiving: ObjectRef };
export const ObjectArgSchema: GenericSchema<ObjectArgInput, ObjectArg> = safeEnum({
	ImmOrOwnedObject: ObjectRefSchema,
	SharedObject: object({
		objectId: ObjectID,
		// snake case in rust
		initialSharedVersion: JsonU64,
		mutable: boolean(),
	}),
	Receiving: ObjectRefSchema,
}) as GenericSchema<ObjectArgInput, ObjectArg>;

// Rust: crates/sui-types/src/transaction.rs
export type Reservation = { $kind: 'MaxAmountU64'; MaxAmountU64: string | number };
export const ReservationSchema: GenericSchema<Reservation, Reservation> = safeEnum({
	MaxAmountU64: JsonU64,
}) as GenericSchema<Reservation, Reservation>;

// Rust: crates/sui-types/src/transaction.rs
export type WithdrawalTypeArg = { $kind: 'Balance'; Balance: string };
export const WithdrawalTypeArgSchema: GenericSchema<WithdrawalTypeArg, WithdrawalTypeArg> =
	safeEnum({
		Balance: string(),
	}) as GenericSchema<WithdrawalTypeArg, WithdrawalTypeArg>;

// Rust: crates/sui-types/src/transaction.rs
export type WithdrawFrom =
	| { $kind: 'Sender'; Sender: true; Sponsor?: never }
	| { $kind: 'Sponsor'; Sender?: never; Sponsor: true };
export const WithdrawFromSchema: GenericSchema<WithdrawFrom, WithdrawFrom> = safeEnum({
	Sender: literal(true),
	Sponsor: literal(true),
}) as GenericSchema<WithdrawFrom, WithdrawFrom>;

// Rust: crates/sui-types/src/transaction.rs
export type FundsWithdrawalArg = {
	reservation: Reservation;
	typeArg: WithdrawalTypeArg;
	withdrawFrom: WithdrawFrom;
};
export const FundsWithdrawalArgSchema: GenericSchema<FundsWithdrawalArg, FundsWithdrawalArg> =
	object({
		reservation: ReservationSchema,
		typeArg: WithdrawalTypeArgSchema,
		withdrawFrom: WithdrawFromSchema,
	}) as GenericSchema<FundsWithdrawalArg, FundsWithdrawalArg>;

// https://github.com/MystenLabs/sui/blob/df41d5fa8127634ff4285671a01ead00e519f806/crates/sui-types/src/transaction.rs#L75-L80
export type CallArg =
	| ({ $kind: 'Object'; Object: ObjectArg } & {
			Pure?: never;
			UnresolvedPure?: never;
			UnresolvedObject?: never;
			FundsWithdrawal?: never;
	  })
	| ({ $kind: 'Pure'; Pure: { bytes: string } } & {
			Object?: never;
			UnresolvedPure?: never;
			UnresolvedObject?: never;
			FundsWithdrawal?: never;
	  })
	| ({ $kind: 'UnresolvedPure'; UnresolvedPure: { value: unknown } } & {
			Object?: never;
			Pure?: never;
			UnresolvedObject?: never;
			FundsWithdrawal?: never;
	  })
	| ({
			$kind: 'UnresolvedObject';
			UnresolvedObject: {
				objectId: string;
				version?: string | number | null;
				digest?: string | null;
				initialSharedVersion?: string | number | null;
				mutable?: boolean | null;
			};
	  } & { Object?: never; Pure?: never; UnresolvedPure?: never; FundsWithdrawal?: never })
	| ({ $kind: 'FundsWithdrawal'; FundsWithdrawal: FundsWithdrawalArg } & {
			Object?: never;
			Pure?: never;
			UnresolvedPure?: never;
			UnresolvedObject?: never;
	  });

type CallArgInput =
	| { Object: ObjectArgInput }
	| { Pure: { bytes: string } }
	| { UnresolvedPure: { value: unknown } }
	| {
			UnresolvedObject: {
				objectId: string;
				version?: string | number | null;
				digest?: string | null;
				initialSharedVersion?: string | number | null;
				mutable?: boolean | null;
			};
	  }
	| { FundsWithdrawal: FundsWithdrawalArg };

const CallArgSchema: GenericSchema<CallArgInput, CallArg> = safeEnum({
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
}) as GenericSchema<CallArgInput, CallArg>;

type NormalizedCallArgValue =
	| ({ $kind: 'Object'; Object: ObjectArg } & { Pure?: never })
	| ({ $kind: 'Pure'; Pure: { bytes: string } } & { Object?: never });
type NormalizedCallArgInput = { Object: ObjectArgInput } | { Pure: { bytes: string } };
export const NormalizedCallArg: GenericSchema<NormalizedCallArgInput, NormalizedCallArgValue> =
	safeEnum({
		Object: ObjectArgSchema,
		Pure: object({
			bytes: BCSBytes,
		}),
	}) as GenericSchema<NormalizedCallArgInput, NormalizedCallArgValue>;

// Rust: crates/sui-types/src/transaction.rs
export type ValidDuring = {
	minEpoch: string | number | null;
	maxEpoch: string | number | null;
	minTimestamp: string | number | null;
	maxTimestamp: string | number | null;
	chain: string;
	nonce: number;
};
export const ValidDuringSchema: GenericSchema<ValidDuring, ValidDuring> = object({
	minEpoch: nullable(JsonU64),
	maxEpoch: nullable(JsonU64),
	minTimestamp: nullable(JsonU64),
	maxTimestamp: nullable(JsonU64),
	chain: string(),
	nonce: U32,
}) as GenericSchema<ValidDuring, ValidDuring>;

export type TransactionExpiration =
	| ({ $kind: 'None'; None: true } & { Epoch?: never; ValidDuring?: never })
	| ({ $kind: 'Epoch'; Epoch: string | number } & { None?: never; ValidDuring?: never })
	| ({ $kind: 'ValidDuring'; ValidDuring: ValidDuring } & { None?: never; Epoch?: never });
type TransactionExpirationInput =
	| { None: true }
	| { Epoch: string | number }
	| { ValidDuring: ValidDuring };
export const TransactionExpiration: GenericSchema<
	TransactionExpirationInput,
	TransactionExpiration
> = safeEnum({
	None: literal(true),
	Epoch: JsonU64,
	ValidDuring: ValidDuringSchema,
}) as GenericSchema<TransactionExpirationInput, TransactionExpiration>;

export type TransactionData = {
	version: 2;
	sender?: string | null;
	expiration?: TransactionExpiration | null;
	gasData: GasData;
	inputs: CallArg[];
	commands: Command[];
};
type TransactionDataInput = {
	version: 2;
	sender?: string | null;
	expiration?: TransactionExpirationInput | null;
	gasData: GasData;
	inputs: CallArgInput[];
	commands: CommandInput[];
};
export const TransactionDataSchema: GenericSchema<TransactionDataInput, TransactionData> = object({
	version: literal(2),
	sender: nullish(SuiAddress),
	expiration: nullish(TransactionExpiration),
	gasData: GasDataSchema,
	inputs: array(CallArgSchema),
	commands: array(CommandSchema),
}) as GenericSchema<TransactionDataInput, TransactionData>;
