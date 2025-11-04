// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { is } from 'valibot';

import type { SuiMoveNormalizedType } from '../client/index.js';
import { normalizeSuiAddress } from '../utils/sui-types.js';
import { ArgumentSchema } from './data/internal.js';
import type { Argument, CallArg, Command } from './data/internal.js';

export function extractMutableReference(
	normalizedType: SuiMoveNormalizedType,
): SuiMoveNormalizedType | undefined {
	return typeof normalizedType === 'object' && 'MutableReference' in normalizedType
		? normalizedType.MutableReference
		: undefined;
}

export function extractReference(
	normalizedType: SuiMoveNormalizedType,
): SuiMoveNormalizedType | undefined {
	return typeof normalizedType === 'object' && 'Reference' in normalizedType
		? normalizedType.Reference
		: undefined;
}

export function extractStructTag(
	normalizedType: SuiMoveNormalizedType,
): Extract<SuiMoveNormalizedType, { Struct: unknown }> | undefined {
	if (typeof normalizedType === 'object' && 'Struct' in normalizedType) {
		return normalizedType;
	}

	const ref = extractReference(normalizedType);
	const mutRef = extractMutableReference(normalizedType);

	if (typeof ref === 'object' && 'Struct' in ref) {
		return ref;
	}

	if (typeof mutRef === 'object' && 'Struct' in mutRef) {
		return mutRef;
	}
	return undefined;
}

export function getIdFromCallArg(arg: string | CallArg) {
	if (typeof arg === 'string') {
		return normalizeSuiAddress(arg);
	}

	if (arg.Object) {
		if (arg.Object.ImmOrOwnedObject) {
			return normalizeSuiAddress(arg.Object.ImmOrOwnedObject.objectId);
		}

		if (arg.Object.Receiving) {
			return normalizeSuiAddress(arg.Object.Receiving.objectId);
		}

		return normalizeSuiAddress(arg.Object.SharedObject.objectId);
	}

	if (arg.UnresolvedObject) {
		return normalizeSuiAddress(arg.UnresolvedObject.objectId);
	}

	return undefined;
}

export function isArgument(value: unknown): value is Argument {
	return is(ArgumentSchema, value);
}

export function remapCommandArguments(
	command: Command,
	inputMapping: Map<number, number>,
	commandMapping: Map<number, number>,
) {
	const remapArg = (arg: Argument): Argument => {
		switch (arg.$kind) {
			case 'Input': {
				const newInputIndex = inputMapping.get(arg.Input);
				if (newInputIndex === undefined) {
					throw new Error(`Input ${arg.Input} not found in input mapping`);
				}
				return { ...arg, Input: newInputIndex };
			}
			case 'Result': {
				const newCommandIndex = commandMapping.get(arg.Result);
				if (newCommandIndex !== undefined) {
					return { ...arg, Result: newCommandIndex };
				}
				return arg;
			}
			case 'NestedResult': {
				const newCommandIndex = commandMapping.get(arg.NestedResult[0]);
				if (newCommandIndex !== undefined) {
					return { ...arg, NestedResult: [newCommandIndex, arg.NestedResult[1]] };
				}
				return arg;
			}
			default:
				return arg;
		}
	};

	switch (command.$kind) {
		case 'MoveCall':
			command.MoveCall.arguments = command.MoveCall.arguments.map(remapArg);
			break;
		case 'TransferObjects':
			command.TransferObjects.objects = command.TransferObjects.objects.map(remapArg);
			command.TransferObjects.address = remapArg(command.TransferObjects.address);
			break;
		case 'SplitCoins':
			command.SplitCoins.coin = remapArg(command.SplitCoins.coin);
			command.SplitCoins.amounts = command.SplitCoins.amounts.map(remapArg);
			break;
		case 'MergeCoins':
			command.MergeCoins.destination = remapArg(command.MergeCoins.destination);
			command.MergeCoins.sources = command.MergeCoins.sources.map(remapArg);
			break;
		case 'MakeMoveVec':
			command.MakeMoveVec.elements = command.MakeMoveVec.elements.map(remapArg);
			break;
		case 'Upgrade':
			command.Upgrade.ticket = remapArg(command.Upgrade.ticket);
			break;
		case '$Intent': {
			const inputs = command.$Intent.inputs;
			command.$Intent.inputs = {};

			for (const [key, value] of Object.entries(inputs)) {
				command.$Intent.inputs[key] = Array.isArray(value) ? value.map(remapArg) : remapArg(value);
			}
			break;
		}
		case 'Publish':
			break;
	}
}
