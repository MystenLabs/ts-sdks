// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { normalizeSuiAddress } from '@mysten/sui/utils';
import type { ConfigArguments } from './config.js';
import type { ModuleRegistry } from './module-registry.js';
import type { Parameter, Type } from './types/summary.js';

/** A parsed type tag from a `configArguments` matcher. Always fully concrete. */
export type ParsedTypeTag =
	| { prim: string }
	| { vector: ParsedTypeTag }
	| { datatype: { address: string; module: string; name: string; typeArguments: ParsedTypeTag[] } };

export interface TypeConfigArgument {
	kind: 'type';
	key: string;
	address: string;
	module: string;
	name: string;
	/** `null` when the matcher is written without type arguments (matches every instantiation). */
	typeArguments: ParsedTypeTag[] | null;
	paramName?: string;
	/**
	 * Whether the matched Move type is generic. Uninstantiated matchers on generic types require a
	 * resolver function as the config value (a static id cannot be correct across instantiations).
	 */
	isGeneric: boolean;
}

export interface PackageConfigArgument {
	kind: 'package';
	key: string;
	package: string;
}

export type ParsedConfigArgument = TypeConfigArgument | PackageConfigArgument;

const PRIMITIVES = new Set(['bool', 'u8', 'u16', 'u32', 'u64', 'u128', 'u256', 'address']);

function splitTopLevelTypeArgs(inner: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let current = '';
	for (const char of inner) {
		if (char === ',' && depth === 0) {
			parts.push(current.trim());
			current = '';
			continue;
		}
		if (char === '<') depth++;
		if (char === '>') depth--;
		current += char;
	}
	if (current.trim()) parts.push(current.trim());
	return parts;
}

function parseTypeTag(tag: string, resolveAddress: (address: string) => string): ParsedTypeTag {
	const trimmed = tag.trim();

	if (PRIMITIVES.has(trimmed)) {
		return { prim: trimmed };
	}

	if (trimmed.startsWith('vector<') && trimmed.endsWith('>')) {
		return { vector: parseTypeTag(trimmed.slice('vector<'.length, -1), resolveAddress) };
	}

	const lt = trimmed.indexOf('<');
	const base = lt === -1 ? trimmed : trimmed.slice(0, lt);
	const parts = base.split('::');

	if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
		throw new Error(
			`Invalid type in configArguments matcher: "${tag}". Expected a fully-qualified Move type like "0x2::sui::SUI".`,
		);
	}

	if (lt !== -1 && !trimmed.endsWith('>')) {
		throw new Error(`Invalid type in configArguments matcher: "${tag}"`);
	}

	const typeArguments =
		lt === -1
			? []
			: splitTopLevelTypeArgs(trimmed.slice(lt + 1, -1)).map((arg) =>
					parseTypeTag(arg, resolveAddress),
				);

	return {
		datatype: {
			address: resolveMatcherAddress(parts[0], resolveAddress),
			module: parts[1],
			name: parts[2],
			typeArguments,
		},
	};
}

const HEX_ADDRESS = /^0x[0-9a-fA-F]{1,64}$/;

function resolveMatcherAddress(address: string, resolveAddress: (address: string) => string) {
	const resolved = resolveAddress(address);
	return HEX_ADDRESS.test(resolved) ? normalizeSuiAddress(resolved) : resolved;
}

/**
 * Parse and validate a `configArguments` record against the modules loaded in `registry`.
 * All addresses (in matchers and during matching) are resolved through the registry's address
 * mapping and normalized, so matchers can use named addresses from `address_mapping.json`.
 *
 * Type matchers referencing types that don't exist in this package's summaries are returned in
 * `unresolvedKeys` instead of the entry list — a shared global `configArguments` block may span
 * multiple packages in one codegen run, and entries for other packages can't match anything here.
 */
export function parseConfigArguments(
	configArguments: ConfigArguments,
	registry: ModuleRegistry,
): { entries: ParsedConfigArgument[]; unresolvedKeys: string[] } {
	const resolveAddress = (address: string) => registry.resolveAddress(address);
	const entries: ParsedConfigArgument[] = [];
	const unresolvedKeys: string[] = [];

	for (const [key, matcher] of Object.entries(configArguments)) {
		if ('package' in matcher) {
			entries.push({ kind: 'package', key, package: matcher.package });
			continue;
		}

		const parsed = parseTypeTag(matcher.type, resolveAddress);

		if (!('datatype' in parsed)) {
			throw new Error(
				`configArguments.${key}: matcher type "${matcher.type}" must be a Move datatype`,
			);
		}

		const { address, module, name, typeArguments } = parsed.datatype;
		const summary = registry.getSummaryByResolvedAddress(address, module);
		const datatype = summary?.structs[name] ?? summary?.enums[name];

		if (!datatype) {
			unresolvedKeys.push(key);
			continue;
		}

		const arity = datatype.type_parameters.length;
		const isGeneric = arity > 0;
		// A generic type written without `<...>` matches every instantiation.
		const uninstantiated = isGeneric && !matcher.type.includes('<');

		if (!uninstantiated && typeArguments.length !== arity) {
			throw new Error(
				`configArguments.${key}: type "${matcher.type}" expects ${arity} type argument(s), got ${typeArguments.length}`,
			);
		}

		entries.push({
			kind: 'type',
			key,
			address,
			module,
			name,
			typeArguments: uninstantiated ? null : typeArguments,
			paramName: matcher.name,
			isGeneric,
		});
	}

	return { entries, unresolvedKeys };
}

function typeEqualsTag(
	type: Type,
	tag: ParsedTypeTag,
	resolveAddress: (address: string) => string,
): boolean {
	if (typeof type === 'string') {
		return 'prim' in tag && tag.prim === type;
	}

	if ('Reference' in type) {
		return typeEqualsTag(type.Reference[1], tag, resolveAddress);
	}

	if ('vector' in type) {
		return 'vector' in tag && typeEqualsTag(type.vector, tag.vector, resolveAddress);
	}

	if ('Datatype' in type) {
		if (!('datatype' in tag)) return false;
		const { Datatype } = type;
		return (
			resolveMatcherAddress(Datatype.module.address, resolveAddress) === tag.datatype.address &&
			Datatype.module.name === tag.datatype.module &&
			Datatype.name === tag.datatype.name &&
			Datatype.type_arguments.length === tag.datatype.typeArguments.length &&
			Datatype.type_arguments.every((arg, i) =>
				typeEqualsTag(arg.argument, tag.datatype.typeArguments[i], resolveAddress),
			)
		);
	}

	// TypeParameter / NamedTypeParameter / tuple / fun never match a concrete tag.
	return false;
}

/**
 * Find the config entry matching a function parameter, or `null`.
 *
 * Most-specific matcher wins, decided statically: a fully instantiated matcher beats an
 * uninstantiated one, and a `name`-refined matcher beats a bare one at the same level. Ties are a
 * hard generation-time error.
 */
export function findConfigArgumentMatch(
	param: Parameter,
	entries: ParsedConfigArgument[],
	{
		resolveAddress,
		functionLabel,
	}: {
		resolveAddress: (address: string) => string;
		functionLabel: string;
	},
): TypeConfigArgument | null {
	let type = param.type_;
	while (typeof type !== 'string' && 'Reference' in type) {
		type = type.Reference[1];
	}

	if (typeof type === 'string' || !('Datatype' in type)) {
		return null;
	}

	const { Datatype } = type;
	const paramAddress = resolveMatcherAddress(Datatype.module.address, resolveAddress);

	const candidates: { entry: TypeConfigArgument; specificity: number }[] = [];

	for (const entry of entries) {
		if (entry.kind !== 'type') continue;
		if (
			entry.address !== paramAddress ||
			entry.module !== Datatype.module.name ||
			entry.name !== Datatype.name
		) {
			continue;
		}

		if (entry.paramName && param.name === undefined) {
			throw new Error(
				`configArguments.${entry.key} uses a parameter-name matcher, but parameters of ${functionLabel} have no names. ` +
					`Name matchers are only supported for summaries generated from local packages.`,
			);
		}

		if (entry.paramName && entry.paramName !== param.name) {
			continue;
		}

		if (entry.typeArguments !== null) {
			// Fully instantiated matcher: only matches parameters concretely typed with that
			// exact instantiation in the Move signature.
			if (
				Datatype.type_arguments.length !== entry.typeArguments.length ||
				!Datatype.type_arguments.every((arg, i) =>
					typeEqualsTag(arg.argument, entry.typeArguments![i], resolveAddress),
				)
			) {
				continue;
			}
			candidates.push({ entry, specificity: 2 + (entry.paramName ? 1 : 0) });
		} else {
			candidates.push({ entry, specificity: entry.paramName ? 1 : 0 });
		}
	}

	if (candidates.length === 0) {
		return null;
	}

	const best = Math.max(...candidates.map((c) => c.specificity));
	const winners = candidates.filter((c) => c.specificity === best);

	if (winners.length > 1) {
		throw new Error(
			`Parameter ${param.name ?? '<unnamed>'} of ${functionLabel} is matched by multiple configArguments entries with equal specificity: ${winners
				.map((c) => c.entry.key)
				.join(', ')}. Refine the matchers with type arguments or a parameter name.`,
		);
	}

	return winners[0].entry;
}
