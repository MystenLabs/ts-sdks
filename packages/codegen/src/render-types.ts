// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { normalizeSuiAddress } from '@mysten/sui/utils';

import type {
	Datatype,
	DatatypeParameter,
	ModuleSummary,
	Type,
	TypeParameter,
} from './types/summary.js';

export const MOVE_STDLIB_ADDRESS = normalizeSuiAddress('0x1');
export const SUI_FRAMEWORK_ADDRESS = normalizeSuiAddress('0x2');
export const SUI_SYSTEM_ADDRESS = normalizeSuiAddress('0x3');

type TypeSignatureFormat = 'typescriptArg' | 'bcs' | 'typeTag';
interface RenderTypeSignatureOptions {
	format: TypeSignatureFormat;
	summary: ModuleSummary;
	typeParameters?: TypeParameter[];
	onDependency?: (address: string, module: string, type: string) => string | undefined;
	bcsImport?: () => string;
	onTypeParameter?: (typeParameter: number | string) => void;
	resolveAddress: (address: string) => string;
	includePhantomTypeParameters: boolean;
}

function getFilteredTypeParameterIndex(
	originalIndex: number,
	typeParameters: TypeParameter[] | undefined,
	includePhantom: boolean,
): number {
	if (includePhantom || !typeParameters) return originalIndex;

	let filteredIndex = 0;
	for (let i = 0; i < originalIndex; i++) {
		const param = typeParameters[i] as DatatypeParameter | undefined;
		if (!param?.phantom) {
			filteredIndex++;
		}
	}
	return filteredIndex;
}

export function renderTypeSignature(type: Type, options: RenderTypeSignatureOptions): string {
	let bcs = 'bcs';
	if (options.bcsImport && usesBcs(type, options)) {
		bcs = options.bcsImport();
	}

	switch (type) {
		case 'address':
			switch (options.format) {
				case 'typescriptArg':
					return 'string';
				case 'typeTag':
					return `address`;
				case 'bcs':
					return `${bcs}.Address`;
				default:
					throw new Error(`Unknown format: ${options.format}`);
			}
		case 'bool':
			switch (options.format) {
				case 'typescriptArg':
					return 'boolean';
				case 'typeTag':
					return `bool`;
				case 'bcs':
					return `${bcs}.bool()`;
				default:
					throw new Error(`Unknown format: ${options.format}`);
			}
		case 'u8':
		case 'u16':
		case 'u32':
			switch (options.format) {
				case 'typescriptArg':
					return 'number';
				case 'typeTag':
					return type.toLowerCase();
				case 'bcs':
					return `${bcs}.${type.toLowerCase()}()`;
				default:
					throw new Error(`Unknown format: ${options.format}`);
			}
		case 'u64':
		case 'u128':
		case 'u256':
			switch (options.format) {
				case 'typescriptArg':
					return `number | bigint`;
				case 'typeTag':
					return type.toLowerCase();
				case 'bcs':
					return `${bcs}.${type.toLowerCase()}()`;
				default:
					throw new Error(`Unknown format: ${options.format}`);
			}
		case 'signer':
			throw new Error('Signer is not supported');
		case '_':
			throw new Error('Macro placeholder is not supported');
	}

	if ('Datatype' in type) {
		return renderDataType(type.Datatype, options);
	}

	if ('Reference' in type) {
		return renderTypeSignature(type.Reference[1], options);
	}

	if ('vector' in type) {
		switch (options.format) {
			case 'typescriptArg':
				return `${renderTypeSignature(type.vector, options)}[]`;
			case 'typeTag':
				return `vector<${renderTypeSignature(type.vector, options)}>`;
			case 'bcs':
				return `${bcs}.vector(${renderTypeSignature(type.vector, options)})`;
			default:
				throw new Error(`Unknown format: ${options.format}`);
		}
	}

	if ('TypeParameter' in type) {
		options.onTypeParameter?.(type.TypeParameter);
		const originalIndex = type.TypeParameter;
		const filteredIndex = getFilteredTypeParameterIndex(
			originalIndex,
			options.typeParameters,
			options.includePhantomTypeParameters,
		);
		switch (options.format) {
			case 'typescriptArg':
				return options.typeParameters?.[originalIndex]?.name ?? `T${originalIndex}`;
			case 'typeTag':
				return `\${options.typeArguments[${originalIndex}]}`;
			case 'bcs':
				return `typeParameters[${filteredIndex}]`;
			default:
				throw new Error(`Unknown format: ${options.format}`);
		}
	}

	if ('NamedTypeParameter' in type) {
		options.onTypeParameter?.(type.NamedTypeParameter);
		const originalIndex =
			options.typeParameters?.findIndex((p) => p.name === type.NamedTypeParameter) ?? -1;

		if (originalIndex === -1) {
			throw new Error(`Named type parameter ${type.NamedTypeParameter} not found`);
		}

		const filteredIndex = getFilteredTypeParameterIndex(
			originalIndex,
			options.typeParameters,
			options.includePhantomTypeParameters,
		);

		switch (options.format) {
			case 'typescriptArg':
				return type.NamedTypeParameter;
			case 'typeTag':
				return `\${options.typeArguments[${originalIndex}]}`;
			case 'bcs':
				return `typeParameters[${filteredIndex}]`;
			default:
				throw new Error(`Unknown format: ${options.format}`);
		}
	}

	throw new Error(`Unknown type signature: ${JSON.stringify(type, null, 2)}`);
}

export function usesBcs(type: Type, options: RenderTypeSignatureOptions): boolean {
	if (typeof type === 'string') {
		return true;
	}

	if ('Reference' in type) {
		return usesBcs(type.Reference[1], options);
	}

	if ('Datatype' in type) {
		return isPureDataType(type.Datatype, options);
	}

	if ('vector' in type) {
		return true;
	}

	return false;
}

export function isPureSignature(type: Type, options: RenderTypeSignatureOptions): boolean {
	if (typeof type === 'string') {
		return true;
	}

	if ('Reference' in type) {
		return isPureSignature(type.Reference[1], options);
	}

	if ('Datatype' in type) {
		return isPureDataType(type.Datatype, options);
	}

	if ('vector' in type) {
		return isPureSignature(type.vector, options);
	}

	if ('TypeParameter' in type) {
		return false;
	}

	if ('NamedTypeParameter' in type) {
		return false;
	}

	throw new Error(`Unknown type signature: ${JSON.stringify(type, null, 2)}`);
}

function isPureDataType(type: Datatype, options: RenderTypeSignatureOptions) {
	const address = options.resolveAddress(type.module.address);

	if (address === MOVE_STDLIB_ADDRESS) {
		if ((type.module.name === 'ascii' || type.module.name === 'string') && type.name === 'String') {
			return true;
		}

		if (type.module.name === 'option' && type.name === 'Option') {
			return true;
		}
	}

	if (address === SUI_FRAMEWORK_ADDRESS) {
		if (type.module.name === 'object' && (type.name === 'ID' || type.name === 'UID')) {
			return true;
		}
	}

	return false;
}

function renderDataType(type: Datatype, options: RenderTypeSignatureOptions): string {
	const address = options.resolveAddress(type.module.address);

	if (options.format === 'typeTag') {
		if (address === SUI_FRAMEWORK_ADDRESS) {
			if (type.module.name === 'clock' && type.name === 'Clock') return '0x2::clock::Clock';
			if (type.module.name === 'random' && type.name === 'Random') return '0x2::random::Random';
			if (type.module.name === 'deny_list' && type.name === 'DenyList')
				return '0x2::deny_list::DenyList';
			if (type.module.name === 'object' && (type.name === 'ID' || type.name === 'UID'))
				return '0x2::object::ID';
		}
		if (address === SUI_SYSTEM_ADDRESS) {
			if (type.module.name === 'sui_system' && type.name === 'SuiSystemState')
				return '0x3::sui_system::SuiSystemState';
		}

		if (address === MOVE_STDLIB_ADDRESS) {
			if (
				(type.module.name === 'ascii' || type.module.name === 'string') &&
				type.name === 'String'
			) {
				return '0x1::string::String';
			}
			if (type.module.name === 'option' && type.name === 'Option') {
				const innerType = renderTypeSignature(type.type_arguments[0].argument, options);
				return `0x1::option::Option<${innerType}>`;
			}
		}

		return 'null';
	}

	if (address === MOVE_STDLIB_ADDRESS) {
		if ((type.module.name === 'ascii' || type.module.name === 'string') && type.name === 'String') {
			switch (options.format) {
				case 'typescriptArg':
					return 'string';
				case 'bcs':
					return `${options.bcsImport?.() ?? 'bcs'}.string()`;
				default:
					throw new Error(`Unknown format: ${options.format}`);
			}
		}

		if (type.module.name === 'option' && type.name === 'Option') {
			switch (options.format) {
				case 'typescriptArg':
					if (isPureDataType(type, options)) {
						return `${renderTypeSignature(type.type_arguments[0].argument, options)} | null`;
					}
					break;
				case 'bcs':
					return `${options.bcsImport?.() ?? 'bcs'}.option(${renderTypeSignature(type.type_arguments[0].argument, options)})`;
				default:
					throw new Error(`Unknown format: ${options.format}`);
			}
		}
	}

	if (address === SUI_FRAMEWORK_ADDRESS) {
		if (type.module.name === 'object' && (type.name === 'ID' || type.name === 'UID')) {
			switch (options.format) {
				case 'typescriptArg':
					return 'string';
				case 'bcs':
					return `${options.bcsImport?.() ?? 'bcs'}.Address`;
				default:
					throw new Error(`Unknown format: ${options.format}`);
			}
		}
	}

	const isCurrentModule =
		address === options.resolveAddress(options.summary.id.address) &&
		type.module.name === options.summary.id.name;

	const importName = options.onDependency?.(type.module.address, type.module.name, type.name);

	const typeNameRef = isCurrentModule
		? type.name
		: `${importName ?? getSafeName(type.module.name)}.${getSafeName(type.name)}`;

	const filteredTypeArguments = type.type_arguments.filter((arg) => !arg.phantom);

	switch (options.format) {
		case 'typescriptArg':
			return 'string';
		case 'bcs':
			if (filteredTypeArguments.length === 0) {
				return typeNameRef;
			}

			return `${typeNameRef}(
                ${filteredTypeArguments.map((type) => renderTypeSignature(type.argument, options)).join(', ')})`;
		default:
			throw new Error(`Unknown format: ${options.format}`);
	}
}

const JS_RESERVED_NAMES = [
	'new',
	'delete',
	'class',
	'function',
	'import',
	'export',
	'return',
	'this',
	'super',
	'arguments',
	'eval',
	'void',
	'typeof',
	'instanceof',
	'delete',
	'in',
	'from',
	'of',
	'as',
	'async',
	'await',
	'break',
	'case',
	'catch',
	'continue',
	'debugger',
	'default',
	'do',
	'else',
	'finally',
	'for',
	'function',
	'if',
	'import',
	'in',
	'instanceof',
	'new',
	'return',
	'switch',
	'throw',
	'try',
	'typeof',
	'var',
	'void',
	'while',
	'with',
	'yield',
	'package',
];

export function getSafeName(name: string) {
	return JS_RESERVED_NAMES.includes(name) ? `_${name}` : name;
}
