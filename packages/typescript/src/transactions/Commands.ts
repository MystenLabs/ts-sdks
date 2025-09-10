// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase64 } from '@mysten/bcs';
import type { InferInput } from 'valibot';
import { parse } from 'valibot';

import { normalizeSuiObjectId } from '../utils/sui-types.js';
import type { Argument, CallArg, Command } from './data/internal.js';
import { ArgumentSchema } from './data/internal.js';
import type { AsyncTransactionThunk, Transaction } from './Transaction.js';

export type TransactionArgument =
	| InferInput<typeof ArgumentSchema>
	| ((tx: Transaction) => InferInput<typeof ArgumentSchema>)
	| AsyncTransactionThunk;
export type TransactionInput = CallArg;

// Keep in sync with constants in
// crates/sui-framework/packages/sui-framework/sources/package.move
export enum UpgradePolicy {
	COMPATIBLE = 0,
	ADDITIVE = 128,
	DEP_ONLY = 192,
}

type TransactionShape<T extends Command['$kind']> = { $kind: T } & {
	[K in T]: Extract<Command, { [K in T]: any }>[T];
};

/**
 * Simple helpers used to construct transactions:
 */
export const Commands = {
	MoveCall(
		input:
			| {
					package: string;
					module: string;
					function: string;
					arguments?: Argument[];
					typeArguments?: string[];
			  }
			| {
					target: string;
					arguments?: Argument[];
					typeArguments?: string[];
			  },
	): TransactionShape<'MoveCall'> {
		const [pkg, mod = '', fn = ''] =
			'target' in input ? input.target.split('::') : [input.package, input.module, input.function];

		return {
			$kind: 'MoveCall',
			MoveCall: {
				package: pkg,
				module: mod,
				function: fn,
				typeArguments: input.typeArguments ?? [],
				arguments: input.arguments ?? [],
			},
		};
	},

	TransferObjects(
		objects: InferInput<typeof ArgumentSchema>[],
		address: InferInput<typeof ArgumentSchema>,
	): TransactionShape<'TransferObjects'> {
		return {
			$kind: 'TransferObjects',
			TransferObjects: {
				objects: objects.map((o) => parse(ArgumentSchema, o)),
				address: parse(ArgumentSchema, address),
			},
		};
	},
	SplitCoins(
		coin: InferInput<typeof ArgumentSchema>,
		amounts: InferInput<typeof ArgumentSchema>[],
	): TransactionShape<'SplitCoins'> {
		return {
			$kind: 'SplitCoins',
			SplitCoins: {
				coin: parse(ArgumentSchema, coin),
				amounts: amounts.map((o) => parse(ArgumentSchema, o)),
			},
		};
	},
	MergeCoins(
		destination: InferInput<typeof ArgumentSchema>,
		sources: InferInput<typeof ArgumentSchema>[],
	): TransactionShape<'MergeCoins'> {
		return {
			$kind: 'MergeCoins',
			MergeCoins: {
				destination: parse(ArgumentSchema, destination),
				sources: sources.map((o) => parse(ArgumentSchema, o)),
			},
		};
	},
	Publish({
		modules,
		dependencies,
	}: {
		modules: number[][] | string[];
		dependencies: string[];
	}): TransactionShape<'Publish'> {
		return {
			$kind: 'Publish',
			Publish: {
				modules: modules.map((module) =>
					typeof module === 'string' ? module : toBase64(new Uint8Array(module)),
				),
				dependencies: dependencies.map((dep) => normalizeSuiObjectId(dep)),
			},
		};
	},
	Upgrade({
		modules,
		dependencies,
		package: packageId,
		ticket,
	}: {
		modules: number[][] | string[];
		dependencies: string[];
		package: string;
		ticket: InferInput<typeof ArgumentSchema>;
	}): TransactionShape<'Upgrade'> {
		return {
			$kind: 'Upgrade',
			Upgrade: {
				modules: modules.map((module) =>
					typeof module === 'string' ? module : toBase64(new Uint8Array(module)),
				),
				dependencies: dependencies.map((dep) => normalizeSuiObjectId(dep)),
				package: packageId,
				ticket: parse(ArgumentSchema, ticket),
			},
		};
	},
	MakeMoveVec({
		type,
		elements,
	}: {
		type?: string;
		elements: InferInput<typeof ArgumentSchema>[];
	}): TransactionShape<'MakeMoveVec'> {
		return {
			$kind: 'MakeMoveVec',
			MakeMoveVec: {
				type: type ?? null,
				elements: elements.map((o) => parse(ArgumentSchema, o)),
			},
		};
	},
	Intent({
		name,
		inputs = {},
		data = {},
	}: {
		name: string;
		inputs?: Record<
			string,
			InferInput<typeof ArgumentSchema> | InferInput<typeof ArgumentSchema>[]
		>;
		data?: Record<string, unknown>;
	}): TransactionShape<'$Intent'> {
		return {
			$kind: '$Intent',
			$Intent: {
				name,
				inputs: Object.fromEntries(
					Object.entries(inputs).map(([key, value]) => [
						key,
						Array.isArray(value)
							? value.map((o) => parse(ArgumentSchema, o))
							: parse(ArgumentSchema, value),
					]),
				),
				data,
			},
		};
	},
};
