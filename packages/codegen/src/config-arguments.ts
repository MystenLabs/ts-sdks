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

export interface ConfigArgumentsContext {
	/** Identifier (from the `packages` config) and resolved address of the package being generated. */
	package: { id: string; address: string };
	/**
	 * Resolved root addresses of the other packages in the codegen run, keyed by their `packages`
	 * identifier. Matchers can reference any of these packages' types.
	 */
	packageAddresses?: Record<string, string>;
}

const PRIMITIVES = new Set(['bool', 'u8', 'u16', 'u32', 'u64', 'u128', 'u256', 'address']);
const MOVE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const HEX_ADDRESS = /^0x[0-9a-fA-F]{1,64}$/;
/** The only packages with chain-stable addresses. Everything else must use a package identifier. */
const FRAMEWORK_ADDRESS = /^0x0*[123]$/;

function normalizeAddress(address: string) {
	return HEX_ADDRESS.test(address) ? normalizeSuiAddress(address) : address;
}

interface ParseContext {
	/**
	 * Address a bare `module::Type` resolves against, or `null` when there is no ambient package
	 * (global block), which makes the qualifier required.
	 */
	scopeAddress: string | null;
	/** Resolved addresses by package identifier from the `packages` config. */
	packageAddresses: Record<string, string>;
	root: string;
	isTypeArgument?: boolean;
}

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

function parseTypeTag(tag: string, ctx: ParseContext): ParsedTypeTag {
	const trimmed = tag.trim();

	if (!ctx.isTypeArgument) {
		assertBalancedBrackets(trimmed);
	}

	if (PRIMITIVES.has(trimmed)) {
		return { prim: trimmed };
	}

	if (trimmed.startsWith('vector<') && trimmed.endsWith('>')) {
		return {
			vector: parseTypeTag(trimmed.slice('vector<'.length, -1), {
				...ctx,
				isTypeArgument: true,
			}),
		};
	}

	// A bare identifier in type-argument position is a type-parameter placeholder like `Pool<T>`.
	if (ctx.isTypeArgument && MOVE_IDENTIFIER.test(trimmed)) {
		throw new Error(
			`configArguments matcher "${ctx.root}" contains the type parameter "${trimmed}" — partially ` +
				`instantiated matchers are not supported. Use an uninstantiated matcher (no type ` +
				`arguments) with a resolver function instead.`,
		);
	}

	const lt = trimmed.indexOf('<');
	const base = lt === -1 ? trimmed : trimmed.slice(0, lt);
	const parts = base.split('::');

	if ((parts.length !== 2 && parts.length !== 3) || parts.some((part) => part.length === 0)) {
		throw new Error(
			`Invalid type in configArguments matcher: "${tag}". Expected "module::Type", optionally ` +
				`qualified with a package from the codegen config ("@pkg/name::module::Type") or a Sui ` +
				`framework address ("0x2::module::Type").`,
		);
	}

	if (lt !== -1 && !trimmed.endsWith('>')) {
		throw new Error(`Invalid type in configArguments matcher: "${tag}"`);
	}

	const packagePart = parts.length === 3 ? parts[0] : undefined;
	const modulePart = parts[parts.length - 2];
	const namePart = parts[parts.length - 1];

	if (!MOVE_IDENTIFIER.test(modulePart) || !MOVE_IDENTIFIER.test(namePart)) {
		throw new Error(
			`Invalid type in configArguments matcher: "${tag}" ("${modulePart}::${namePart}" is not a valid module::type pair)`,
		);
	}

	let address: string;

	if (packagePart === undefined) {
		// Codegen output is network-agnostic: a bare `module::Type` refers to the package whose
		// configArguments block declares it.
		if (ctx.scopeAddress === null) {
			throw new Error(
				`configArguments matcher "${ctx.root}": "${modulePart}::${namePart}" must be qualified ` +
					`with a package in the global configArguments block (e.g. ` +
					`"@pkg/name::${modulePart}::${namePart}"). Bare module::Type matchers are only ` +
					`supported in a package's own configArguments block.`,
			);
		}
		address = ctx.scopeAddress;
	} else if (FRAMEWORK_ADDRESS.test(packagePart)) {
		address = normalizeSuiAddress(packagePart);
	} else if (HEX_ADDRESS.test(packagePart)) {
		throw new Error(
			`Invalid package "${packagePart}" in configArguments matcher "${tag}": package addresses ` +
				`are network-specific and cannot be used in matchers (only the framework addresses ` +
				`0x1-0x3 are chain-stable). Reference the package by its identifier from the codegen ` +
				`config instead (e.g. "@pkg/name::${modulePart}::${namePart}").`,
		);
	} else {
		const resolved = ctx.packageAddresses[packagePart];
		if (resolved === undefined) {
			throw new Error(
				`Unknown package "${packagePart}" in configArguments matcher "${tag}". Known packages in ` +
					`this codegen run: ${Object.keys(ctx.packageAddresses).join(', ')}`,
			);
		}
		address = resolved;
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
					return parseTypeTag(arg, { ...ctx, isTypeArgument: true });
				});

	return {
		datatype: {
			address: normalizeAddress(address),
			module: modulePart,
			name: namePart,
			typeArguments,
		},
	};
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
 * Per-package entries are merged over global entries (per key).
 *
 * Matchers identify packages network-agnostically: by the package identifiers from the codegen
 * config (resolved through `context.packageAddresses`), by the ambient package for bare
 * `module::Type` matchers in a package-scoped block, or by the chain-stable framework addresses
 * 0x1-0x3. If a matcher's package is part of this package's summaries, the matched type must
 * exist there (typos fail generation); matchers referencing run packages that aren't part of this
 * dependency closure can't match anything here and are skipped.
 */
export function parseConfigArguments(
	blocks: { global?: ConfigArguments; package?: ConfigArguments },
	registry: ModuleRegistry,
	context: ConfigArgumentsContext,
): { entries: ParsedConfigArgument[] } {
	const entries: ParsedConfigArgument[] = [];
	const currentAddress = normalizeAddress(context.package.address);
	const packageAddresses: Record<string, string> = Object.fromEntries(
		Object.entries({
			...context.packageAddresses,
			[context.package.id]: context.package.address,
		}).map(([id, address]) => [id, normalizeAddress(address)]),
	);

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

		const parsed = parseTypeTag(matcher.type, {
			scopeAddress: source === 'package' ? currentAddress : null,
			packageAddresses,
			root: matcher.type,
		});

		if (!('datatype' in parsed)) {
			throw new Error(
				`configArguments.${key}: matcher type "${matcher.type}" must be a Move datatype`,
			);
		}

		const { address, module, name, typeArguments } = parsed.datatype;
		const summary = registry.getSummaryByResolvedAddress(address, module);
		const datatype = summary?.structs[name] ?? summary?.enums[name];

		if (!datatype) {
			if (registry.hasResolvedAddress(address)) {
				// The matcher's package is part of this dependency closure, so the type has to
				// exist — this is a typo.
				throw new Error(
					`configArguments.${key}: type "${matcher.type}" was not found in its package's summaries`,
				);
			}
			// The matcher references a run package that isn't part of this package's dependency
			// closure — it can't match anything here. It is validated when its own package is
			// generated.
			if (source === 'package') {
				console.warn(
					`configArguments.${key}: type "${matcher.type}" is not part of ${context.package.id}'s ` +
						`dependencies and will never match — consider moving it to the global block or the ` +
						`package it belongs to.`,
				);
			}
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

	return { entries };
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
			normalizeAddress(resolveAddress(Datatype.module.address)) === tag.datatype.address &&
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
	const paramAddress = normalizeAddress(resolveAddress(Datatype.module.address));

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
