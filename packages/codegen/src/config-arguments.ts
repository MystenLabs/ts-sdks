// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { isValidNamedPackage, normalizeSuiAddress } from '@mysten/sui/utils';
import type { ConfigArguments } from './config.js';
import type { ModuleRegistry } from './module-registry.js';
import type { Parameter, Type } from './types/summary.js';

/** A parsed type tag from a `configArguments` matcher. Always fully concrete. */
export type ParsedTypeTag =
	| { prim: string }
	| { vector: ParsedTypeTag }
	| { datatype: { address: string; module: string; name: string; typeArguments: ParsedTypeTag[] } };

/** Whether an entry came from the shared global block or a package-scoped block. */
export type ConfigArgumentSource = 'global' | 'package';

export interface TypeConfigArgument {
	kind: 'type';
	key: string;
	source: ConfigArgumentSource;
	address: string;
	module: string;
	name: string;
	/** `null` when the matcher is written without type arguments (matches every instantiation). */
	typeArguments: ParsedTypeTag[] | null;
	parameterName?: string;
	/**
	 * Whether the matched Move type is generic. Uninstantiated matchers on generic types require a
	 * resolver function as the config value (a static id cannot be correct across instantiations).
	 */
	isGeneric: boolean;
}

export interface PackageConfigArgument {
	kind: 'package';
	key: string;
	source: ConfigArgumentSource;
	package: string;
}

export type ParsedConfigArgument = TypeConfigArgument | PackageConfigArgument;

const PRIMITIVES = new Set(['bool', 'u8', 'u16', 'u32', 'u64', 'u128', 'u256', 'address']);
const MOVE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const HEX_ADDRESS = /^0x[0-9a-fA-F]{1,64}$/;

function assertBalancedBrackets(tag: string) {
	let depth = 0;
	for (const char of tag) {
		if (char === '<') depth++;
		if (char === '>') depth--;
		if (depth < 0) {
			throw new Error(`Invalid type in configArguments matcher: "${tag}" (unbalanced '>')`);
		}
	}
	if (depth !== 0) {
		throw new Error(`Invalid type in configArguments matcher: "${tag}" (unbalanced '<')`);
	}
}

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
	parts.push(current.trim());
	return parts;
}

function parseTypeTag(
	tag: string,
	resolveAddress: (address: string) => string,
	{ isTypeArgument = false, root = tag }: { isTypeArgument?: boolean; root?: string } = {},
): ParsedTypeTag {
	const trimmed = tag.trim();

	if (!isTypeArgument) {
		assertBalancedBrackets(trimmed);
	}

	if (PRIMITIVES.has(trimmed)) {
		return { prim: trimmed };
	}

	if (trimmed.startsWith('vector<') && trimmed.endsWith('>')) {
		return {
			vector: parseTypeTag(trimmed.slice('vector<'.length, -1), resolveAddress, {
				isTypeArgument: true,
				root,
			}),
		};
	}

	// A bare identifier in type-argument position is a type-parameter placeholder like `Pool<T>`.
	if (isTypeArgument && MOVE_IDENTIFIER.test(trimmed)) {
		throw new Error(
			`configArguments matcher "${root}" contains the type parameter "${trimmed}" — partially ` +
				`instantiated matchers are not supported. Use an uninstantiated matcher (no type ` +
				`arguments) with a resolver function instead.`,
		);
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

	const [addressPart, modulePart, namePart] = parts;

	if (!MOVE_IDENTIFIER.test(modulePart) || !MOVE_IDENTIFIER.test(namePart)) {
		throw new Error(
			`Invalid type in configArguments matcher: "${tag}" ("${modulePart}::${namePart}" is not a valid module::type pair)`,
		);
	}

	if (isValidNamedPackage(addressPart)) {
		throw new Error(
			`Invalid address "${addressPart}" in configArguments matcher "${tag}": MVR names cannot be ` +
				`matched against package summaries. Use the package's named address from ` +
				`address_mapping.json or its hex address instead.`,
		);
	}

	if (!HEX_ADDRESS.test(addressPart) && !MOVE_IDENTIFIER.test(addressPart)) {
		throw new Error(`Invalid address "${addressPart}" in configArguments matcher "${tag}"`);
	}

	const typeArguments =
		lt === -1
			? []
			: splitTopLevelTypeArgs(trimmed.slice(lt + 1, -1)).map((arg) => {
					if (arg.length === 0) {
						throw new Error(
							`Invalid type in configArguments matcher: "${tag}" (empty type argument)`,
						);
					}
					return parseTypeTag(arg, resolveAddress, { isTypeArgument: true, root });
				});

	return {
		datatype: {
			address: resolveMatcherAddress(addressPart, resolveAddress),
			module: modulePart,
			name: namePart,
			typeArguments,
		},
	};
}

function resolveMatcherAddress(address: string, resolveAddress: (address: string) => string) {
	const resolved = resolveAddress(address);
	return HEX_ADDRESS.test(resolved) ? normalizeSuiAddress(resolved) : resolved;
}

/**
 * Check that every datatype nested in an instantiated matcher is itself fully instantiated,
 * as far as the summaries can tell (unknown types are skipped).
 */
function assertFullyInstantiated(
	tag: ParsedTypeTag,
	registry: ModuleRegistry,
	matcherType: string,
) {
	if ('prim' in tag) return;
	if ('vector' in tag) {
		assertFullyInstantiated(tag.vector, registry, matcherType);
		return;
	}

	const { address, module, name, typeArguments } = tag.datatype;
	const summary = registry.getSummaryByResolvedAddress(address, module);
	const arity = (summary?.structs[name] ?? summary?.enums[name])?.type_parameters.length;

	if (arity !== undefined && arity !== typeArguments.length) {
		throw new Error(
			`configArguments matcher "${matcherType}": ${module}::${name} expects ${arity} type ` +
				`argument(s), got ${typeArguments.length}. Partially instantiated matchers are not ` +
				`supported — use an uninstantiated matcher (no type arguments) with a resolver function instead.`,
		);
	}

	for (const argument of typeArguments) {
		assertFullyInstantiated(argument, registry, matcherType);
	}
}

/**
 * Parse and validate `configArguments` blocks against the modules loaded in `registry`.
 * Per-package entries are merged over global entries (per key). All addresses (in matchers and
 * during matching) are resolved through the registry's address mapping and normalized, so
 * matchers can use named addresses from `address_mapping.json`.
 *
 * Type matchers referencing types that don't exist in this package's summaries are a hard error
 * when declared in a package-scoped block (they can only refer to this package's summaries), and
 * are returned in `unresolvedKeys` when declared globally — a shared global block may span
 * multiple packages in one codegen run, and entries for other packages can't match anything here.
 */
export function parseConfigArguments(
	blocks: { global?: ConfigArguments; package?: ConfigArguments },
	registry: ModuleRegistry,
): { entries: ParsedConfigArgument[]; unresolvedKeys: string[] } {
	const resolveAddress = (address: string) => registry.resolveAddress(address);
	const entries: ParsedConfigArgument[] = [];
	const unresolvedKeys: string[] = [];

	const merged = new Map<
		string,
		{ matcher: NonNullable<ConfigArguments[string]>; source: ConfigArgumentSource }
	>();
	for (const [key, matcher] of Object.entries(blocks.global ?? {})) {
		merged.set(key, { matcher, source: 'global' });
	}
	for (const [key, matcher] of Object.entries(blocks.package ?? {})) {
		merged.set(key, { matcher, source: 'package' });
	}

	for (const [key, { matcher, source }] of merged) {
		if ('package' in matcher) {
			entries.push({ kind: 'package', key, source, package: matcher.package });
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
			if (source === 'package') {
				throw new Error(
					`configArguments.${key}: type "${matcher.type}" was not found in this package's ` +
						`summaries. Package-scoped configArguments can only reference types reachable from ` +
						`this package — fix the type, or move the entry to the global configArguments block ` +
						`if it targets another package.`,
				);
			}
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

		for (const argument of typeArguments) {
			assertFullyInstantiated(argument, registry, matcher.type);
		}

		entries.push({
			kind: 'type',
			key,
			source,
			address,
			module,
			name,
			typeArguments: uninstantiated ? null : typeArguments,
			parameterName: matcher.parameterName,
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
 * uninstantiated one, and a `parameterName`-refined matcher beats a bare one at the same level.
 * Ties are a hard generation-time error.
 *
 * A `parameterName`-refined matcher never matches a parameter without a name — but if such a
 * matcher would otherwise apply (type and instantiation match) and nothing else matches the
 * parameter, that is a hard error: the matcher clearly targets this parameter's type and only the
 * missing parameter names (bytecode summaries don't include them) prevent matching it.
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
	const blockedNameMatchers: TypeConfigArgument[] = [];

	for (const entry of entries) {
		if (entry.kind !== 'type') continue;
		if (
			entry.address !== paramAddress ||
			entry.module !== Datatype.module.name ||
			entry.name !== Datatype.name
		) {
			continue;
		}

		let specificity = 0;

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
			specificity += 2;
		}

		if (entry.parameterName) {
			if (param.name === undefined) {
				blockedNameMatchers.push(entry);
				continue;
			}
			if (entry.parameterName !== param.name) {
				continue;
			}
			specificity += 1;
		}

		candidates.push({ entry, specificity });
	}

	if (candidates.length === 0) {
		if (blockedNameMatchers.length > 0) {
			throw new Error(
				`configArguments ${blockedNameMatchers.map((entry) => entry.key).join(', ')} use ` +
					`parameterName matchers that would apply to a parameter of ${functionLabel}, but its ` +
					`parameters have no names (bytecode summaries do not include parameter names). Remove ` +
					`the parameterName refinement, or exclude this package from the matcher's scope.`,
			);
		}
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
