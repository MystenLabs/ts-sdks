// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { BcsType, TypeTag } from '@mysten/sui/bcs';
import { bcs, TypeTagSerializer, BcsStruct, BcsEnum, BcsTuple } from '@mysten/sui/bcs';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import type { TransactionArgument } from '@mysten/sui/transactions';
import { isArgument } from '@mysten/sui/transactions';
import { ValidationError, ErrorMessages } from '../../utils/errors.js';

const MOVE_STDLIB_ADDRESS = normalizeSuiAddress('0x1');
const SUI_FRAMEWORK_ADDRESS = normalizeSuiAddress('0x2');
const SUI_SYSTEM_ADDRESS = normalizeSuiAddress('0x3');

export type RawTransactionArgument<T> = T | TransactionArgument;

/**
 * @description Get the BCS schema for a given type tag
 * @param {string | TypeTag} typeTag - The Move type tag to get the schema for
 * @returns {BcsType<any> | null} The BCS schema if found, null otherwise
 */
export function getPureBcsSchema(typeTag: string | TypeTag): BcsType<any> | null {
	const parsedTag = typeof typeTag === 'string' ? TypeTagSerializer.parseFromStr(typeTag) : typeTag;

	if ('u8' in parsedTag) {
		return bcs.U8;
	} else if ('u16' in parsedTag) {
		return bcs.U16;
	} else if ('u32' in parsedTag) {
		return bcs.U32;
	} else if ('u64' in parsedTag) {
		return bcs.U64;
	} else if ('u128' in parsedTag) {
		return bcs.U128;
	} else if ('u256' in parsedTag) {
		return bcs.U256;
	} else if ('address' in parsedTag) {
		return bcs.Address;
	} else if ('bool' in parsedTag) {
		return bcs.Bool;
	} else if ('vector' in parsedTag) {
		const type = getPureBcsSchema(parsedTag.vector);
		return type ? bcs.vector(type) : null;
	} else if ('struct' in parsedTag) {
		const structTag = parsedTag.struct;
		const pkg = normalizeSuiAddress(parsedTag.struct.address);

		if (pkg === MOVE_STDLIB_ADDRESS) {
			if (
				(structTag.module === 'ascii' || structTag.module === 'string') &&
				structTag.name === 'String'
			) {
				return bcs.String;
			}

			if (structTag.module === 'option' && structTag.name === 'Option') {
				const type = getPureBcsSchema(structTag.typeParams[0]!);
				return type ? bcs.vector(type) : null;
			}
		}

		if (pkg === SUI_FRAMEWORK_ADDRESS && structTag.module === 'Object' && structTag.name === 'ID') {
			return bcs.Address;
		}
	}

	return null;
}

/**
 * @description Normalize Move function arguments to TransactionArguments
 * @param {unknown[] | object} args - The arguments to normalize
 * @param {string[]} argTypes - The expected Move type strings for each argument
 * @param {string[]} [parameterNames] - Optional parameter names when args is an object
 * @returns {TransactionArgument[]} Array of normalized transaction arguments
 * @throws {Error} If arguments are invalid or don't match expected types
 */
export function normalizeMoveArguments(
	args: unknown[] | object,
	argTypes: string[],
	parameterNames?: string[],
): TransactionArgument[] {
	const argLen = Array.isArray(args) ? args.length : Object.keys(args).length;
	if (parameterNames && argLen !== parameterNames.length) {
		throw new ValidationError(ErrorMessages.INVALID_ARGUMENT_COUNT(parameterNames.length, argLen));
	}

	const normalizedArgs: TransactionArgument[] = [];

	let index = 0;
	for (const [i, argType] of argTypes.entries()) {
		if (argType === `${SUI_FRAMEWORK_ADDRESS}::deny_list::DenyList`) {
			normalizedArgs.push((tx) => tx.object.denyList());
			continue;
		}

		if (argType === `${SUI_FRAMEWORK_ADDRESS}::random::Random`) {
			normalizedArgs.push((tx) => tx.object.random());
			continue;
		}

		if (argType === `${SUI_FRAMEWORK_ADDRESS}::clock::Clock`) {
			normalizedArgs.push((tx) => tx.object.clock());
			continue;
		}

		if (argType === `${SUI_SYSTEM_ADDRESS}::sui_system::SuiSystemState`) {
			normalizedArgs.push((tx) => tx.object.system());
			continue;
		}

		let arg;
		if (Array.isArray(args)) {
			if (index >= args.length) {
				throw new ValidationError(ErrorMessages.INVALID_ARGUMENT_COUNT(index + 1, args.length));
			}
			arg = args[index];
		} else {
			if (!parameterNames) {
				throw new ValidationError(`Expected arguments to be passed as an array`);
			}
			const name = parameterNames[index];
			arg = args[name as keyof typeof args];

			if (arg == null) {
				throw new ValidationError(ErrorMessages.PARAMETER_REQUIRED(name));
			}
		}

		index += 1;

		if (typeof arg === 'function' || isArgument(arg)) {
			normalizedArgs.push(arg as TransactionArgument);
			continue;
		}

		const type = argTypes[i]!;
		const bcsType = getPureBcsSchema(type);

		if (bcsType) {
			const bytes = bcsType.serialize(arg as never);
			normalizedArgs.push((tx) => tx.pure(bytes));
			continue;
		} else if (typeof arg === 'string') {
			normalizedArgs.push((tx) => tx.object(arg));
			continue;
		}

		throw new ValidationError(ErrorMessages.INVALID_ARGUMENT(stringify(arg) as string, type));
	}

	return normalizedArgs;
}

export class MoveStruct<
	T extends Record<string, BcsType<any>>,
	const Name extends string = string,
> extends BcsStruct<T, Name> {}

export class MoveEnum<
	T extends Record<string, BcsType<any> | null>,
	const Name extends string,
> extends BcsEnum<T, Name> {}

export class MoveTuple<
	T extends readonly BcsType<any>[],
	const Name extends string,
> extends BcsTuple<T, Name> {}

/**
 * @description Convert a value to string representation for error messages
 * @param {unknown} val - The value to stringify
 * @returns {unknown} String representation of the value
 * @private
 */
function stringify(val: unknown): unknown {
	if (typeof val === 'object') {
		return JSON.stringify(val, (val: unknown) => val);
	}
	if (typeof val === 'bigint') {
		return val.toString();
	}

	return val;
}
