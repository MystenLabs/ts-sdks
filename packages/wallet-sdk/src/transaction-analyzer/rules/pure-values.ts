// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from '@mysten/sui/client';
import { fromBase64 } from '@mysten/sui/utils';
import { pureBcsSchemaFromTypeName } from '@mysten/sui/bcs';
import type { PureTypeName } from '@mysten/sui/bcs';
import { createAnalyzer } from '../analyzer.js';
import { commands } from './commands.js';
import type { AnalyzedCommand } from './commands.js';

export interface ParsedPureValue {
	index: number;
	bytes: string;
	type: PureTypeName | null;
	value: unknown;
}

/**
 * Converts an OpenSignatureBody to a PureTypeName string that can be used
 * with pureBcsSchemaFromTypeName to decode BCS bytes.
 *
 * Returns null for types that are not pure values (e.g. datatypes, type parameters).
 */
function openSignatureBodyToPureTypeName(
	body: SuiClientTypes.OpenSignatureBody,
): PureTypeName | null {
	switch (body.$kind) {
		case 'u8':
		case 'u16':
		case 'u32':
		case 'u64':
		case 'u128':
		case 'u256':
		case 'bool':
		case 'address':
			return body.$kind;
		case 'vector': {
			const inner = openSignatureBodyToPureTypeName(body.vector);
			if (inner === null) return null;
			return `vector<${inner}>`;
		}
		case 'datatype': {
			// Handle well-known pure datatypes
			const { typeName, typeParameters } = body.datatype;
			if (typeName === '0x1::string::String' || typeName === '0x1::ascii::String') {
				return 'string';
			}
			if (typeName === '0x2::object::ID') {
				return 'id';
			}
			if (typeName === '0x1::option::Option' && typeParameters.length === 1) {
				const inner = openSignatureBodyToPureTypeName(typeParameters[0]);
				if (inner === null) return null;
				return `option<${inner}>`;
			}
			return null;
		}
		case 'typeParameter':
		case 'unknown':
		default:
			return null;
	}
}

/**
 * Infers the pure type for a given pure input index from the commands that use it.
 * For MoveCall commands, uses the function signature parameters.
 * For built-in commands (SplitCoins, TransferObjects), uses known types.
 */
function inferPureType(
	inputIndex: number,
	analyzedCommands: AnalyzedCommand[],
): PureTypeName | null {
	for (const cmd of analyzedCommands) {
		switch (cmd.$kind) {
			case 'MoveCall': {
				for (let i = 0; i < cmd.arguments.length; i++) {
					const arg = cmd.arguments[i];
					if (arg.$kind === 'Pure' && arg.index === inputIndex) {
						const param = cmd.function.parameters[i];
						if (param) {
							return openSignatureBodyToPureTypeName(param.body);
						}
					}
				}
				break;
			}
			case 'SplitCoins': {
				for (const amt of cmd.amounts) {
					if (amt.$kind === 'Pure' && amt.index === inputIndex) {
						return 'u64';
					}
				}
				break;
			}
			case 'TransferObjects': {
				if (cmd.address.$kind === 'Pure' && cmd.address.index === inputIndex) {
					return 'address';
				}
				break;
			}
			// MergeCoins, MakeMoveVec, Upgrade, Publish don't typically use pure inputs
		}
	}
	return null;
}

/**
 * Analyzes all pure inputs in a transaction and attempts to decode their BCS bytes
 * into JavaScript values using type information from the commands that reference them.
 */
export const pureValues = createAnalyzer({
	dependencies: { commands },
	analyze:
		() =>
		({ commands }) => {
			const results: ParsedPureValue[] = [];

			// Collect all unique pure inputs from all commands
			const seenIndices = new Set<number>();

			for (const cmd of commands) {
				const args = getPureArgsFromCommand(cmd);
				for (const arg of args) {
					if (arg.$kind === 'Pure' && !seenIndices.has(arg.index)) {
						seenIndices.add(arg.index);

						const type = inferPureType(arg.index, commands);
						let value: unknown = null;

						if (type !== null) {
							try {
								const schema = pureBcsSchemaFromTypeName(type);
								value = schema.parse(fromBase64(arg.bytes));
							} catch {
								// If parsing fails, leave value as null
							}
						}

						results.push({
							index: arg.index,
							bytes: arg.bytes,
							type,
							value,
						});
					}
				}
			}

			// Sort by input index for deterministic output
			results.sort((a, b) => a.index - b.index);

			return { result: results };
		},
});

function getPureArgsFromCommand(cmd: AnalyzedCommand) {
	switch (cmd.$kind) {
		case 'MoveCall':
			return cmd.arguments;
		case 'SplitCoins':
			return [cmd.coin, ...cmd.amounts];
		case 'TransferObjects':
			return [cmd.address, ...cmd.objects];
		case 'MergeCoins':
			return [cmd.destination, ...cmd.sources];
		case 'MakeMoveVec':
			return cmd.elements;
		case 'Upgrade':
			return [cmd.ticket];
		case 'Publish':
		case 'Unknown':
			return [];
	}
}
