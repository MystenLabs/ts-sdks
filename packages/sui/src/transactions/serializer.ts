// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { BcsType } from '@mysten/bcs';

import { bcs } from '../bcs/index.js';
import type { SuiMoveNormalizedType } from '../jsonRpc/index.js';
import { MOVE_STDLIB_ADDRESS, SUI_FRAMEWORK_ADDRESS } from '../utils/index.js';
import { normalizeSuiAddress } from '../utils/sui-types.js';
import type { SuiClientTypes } from '../client/types.js';

/**
 * Parses a type name like "0x2::tx_context::TxContext" into package, module, and name parts.
 */
function parseTypeName(typeName: string): { package: string; module: string; name: string } {
	const parts = typeName.split('::');
	if (parts.length !== 3) {
		throw new Error(`Invalid type name format: ${typeName}`);
	}
	return { package: parts[0], module: parts[1], name: parts[2] };
}

export function isTxContext(param: SuiClientTypes.OpenSignature): boolean {
	if (param.body.$kind !== 'datatype') {
		return false;
	}

	const { package: pkg, module, name } = parseTypeName(param.body.datatype.typeName);

	return (
		normalizeSuiAddress(pkg) === SUI_FRAMEWORK_ADDRESS &&
		module === 'tx_context' &&
		name === 'TxContext'
	);
}

export function getPureBcsSchema(
	typeSignature: SuiClientTypes.OpenSignatureBody,
): BcsType<any> | null {
	switch (typeSignature.$kind) {
		case 'address':
			return bcs.Address;
		case 'bool':
			return bcs.Bool;
		case 'u8':
			return bcs.U8;
		case 'u16':
			return bcs.U16;
		case 'u32':
			return bcs.U32;
		case 'u64':
			return bcs.U64;
		case 'u128':
			return bcs.U128;
		case 'u256':
			return bcs.U256;
		case 'vector': {
			if (typeSignature.vector.$kind === 'u8') {
				return bcs.byteVector().transform({
					input: (val: string | Uint8Array) =>
						typeof val === 'string' ? new TextEncoder().encode(val) : val,
					output: (val) => val,
				});
			}
			const type = getPureBcsSchema(typeSignature.vector);
			return type ? bcs.vector(type) : null;
		}
		case 'datatype': {
			const { package: pkg, module, name } = parseTypeName(typeSignature.datatype.typeName);
			const normalizedPkg = normalizeSuiAddress(pkg);

			if (normalizedPkg === MOVE_STDLIB_ADDRESS) {
				if (module === 'ascii' && name === 'String') {
					return bcs.String;
				}
				if (module === 'string' && name === 'String') {
					return bcs.String;
				}
				if (module === 'option' && name === 'Option') {
					const type = getPureBcsSchema(typeSignature.datatype.typeParameters[0]);
					return type ? bcs.vector(type) : null;
				}
			}

			if (normalizedPkg === SUI_FRAMEWORK_ADDRESS) {
				if (module === 'object' && name === 'ID') {
					return bcs.Address;
				}
			}

			return null;
		}
		case 'typeParameter':
		case 'unknown':
			return null;
	}
}

export function normalizedTypeToMoveTypeSignature(
	type: SuiMoveNormalizedType,
): SuiClientTypes.OpenSignature {
	if (typeof type === 'object' && 'Reference' in type) {
		return {
			reference: 'immutable',
			body: normalizedTypeToMoveTypeSignatureBody(type.Reference),
		};
	}
	if (typeof type === 'object' && 'MutableReference' in type) {
		return {
			reference: 'mutable',
			body: normalizedTypeToMoveTypeSignatureBody(type.MutableReference),
		};
	}

	return {
		reference: null,
		body: normalizedTypeToMoveTypeSignatureBody(type),
	};
}

function normalizedTypeToMoveTypeSignatureBody(
	type: SuiMoveNormalizedType,
): SuiClientTypes.OpenSignatureBody {
	if (typeof type === 'string') {
		switch (type) {
			case 'Address':
				return { $kind: 'address' };
			case 'Bool':
				return { $kind: 'bool' };
			case 'U8':
				return { $kind: 'u8' };
			case 'U16':
				return { $kind: 'u16' };
			case 'U32':
				return { $kind: 'u32' };
			case 'U64':
				return { $kind: 'u64' };
			case 'U128':
				return { $kind: 'u128' };
			case 'U256':
				return { $kind: 'u256' };
			default:
				throw new Error(`Unexpected type ${type}`);
		}
	}

	if ('Vector' in type) {
		return { $kind: 'vector', vector: normalizedTypeToMoveTypeSignatureBody(type.Vector) };
	}

	if ('Struct' in type) {
		return {
			$kind: 'datatype',
			datatype: {
				typeName: `${type.Struct.address}::${type.Struct.module}::${type.Struct.name}`,
				typeParameters: type.Struct.typeArguments.map(normalizedTypeToMoveTypeSignatureBody),
			},
		};
	}

	if ('TypeParameter' in type) {
		return { $kind: 'typeParameter', index: type.TypeParameter };
	}

	throw new Error(`Unexpected type ${JSON.stringify(type)}`);
}

export function pureBcsSchemaFromOpenSignatureBody(
	typeSignature: SuiClientTypes.OpenSignatureBody,
): BcsType<any> {
	switch (typeSignature.$kind) {
		case 'address':
			return bcs.Address;
		case 'bool':
			return bcs.Bool;
		case 'u8':
			return bcs.U8;
		case 'u16':
			return bcs.U16;
		case 'u32':
			return bcs.U32;
		case 'u64':
			return bcs.U64;
		case 'u128':
			return bcs.U128;
		case 'u256':
			return bcs.U256;
		case 'vector':
			return bcs.vector(pureBcsSchemaFromOpenSignatureBody(typeSignature.vector));
		default:
			throw new Error(`Expected pure typeSignature, but got ${JSON.stringify(typeSignature)}`);
	}
}
