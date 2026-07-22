// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { splitGenericParameters } from '@mysten/bcs';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import type { ConfigArguments } from './config.js';
import type { ModuleRegistry } from './module-registry.js';
import type { Parameter, Type } from './types/summary.js';
import { isWellKnownObjectParameter } from './utils.js';

/** Whether an entry came from the shared global block or a package-scoped block. */
export type ConfigArgumentSource = 'global' | 'package';

export interface TypeConfigArgument {
	kind: 'type';
	key: string;
	source: ConfigArgumentSource;
	address: string;
	module: string;
	name: string;
	/**
	 * Canonical identities of the matcher's type arguments, or `null` when the matcher is written
	 * without type arguments (matches every instantiation).
	 */
	typeArguments: string[] | null;
	parameterName?: string;
	/**
	 * Whether the matched Move type is generic. Uninstantiated matchers on generic types require a
	 * resolver function as the config value (a static id cannot be correct across instantiations).
	 */
	isGeneric: boolean;
	/**
	 * Canonical identity of the concrete type this entry binds, or `null` when it can bind many
	 * (an uninstantiated generic). A key whose entries span multiple identities (or any `null`)
	 * must be a resolver function.
	 */
	boundType: string | null;
}

export interface FunctionConfigArgument {
	kind: 'function';
	key: string;
	source: ConfigArgumentSource;
	address: string;
	module: string;
	functionName: string;
	parameterName?: string;
	/** Position in the generated function's arguments (TxContext/well-known excluded). */
	parameterIndex?: number;
	/** See `TypeConfigArgument.boundType`. */
	boundType: string | null;
}

export interface PackageConfigArgument {
	kind: 'package';
	key: string;
	source: ConfigArgumentSource;
	package: string;
}

export type ParsedConfigArgument =
	| TypeConfigArgument
	| FunctionConfigArgument
	| PackageConfigArgument;

/**
 * How a package in the codegen run is identified inside other packages' summaries: by its named
 * address label (local packages) and/or its root address (published/on-chain packages).
 */
export interface PackageIdentity {
	label?: string;
	address?: string;
}

export interface ConfigArgumentsContext {
	/** Identifier (from the `packages` config) and resolved address of the package being generated. */
	package: { id: string; address: string };
	/**
	 * Identities of the other packages in the codegen run, keyed by their `packages` identifier.
	 * Matchers can reference any of these packages' types. The CLI builds this via
	 * `resolvePackageIdentity`.
	 */
	packageIdentities?: Record<string, PackageIdentity>;
}

const PRIMITIVES = new Set(['bool', 'u8', 'u16', 'u32', 'u64', 'u128', 'u256', 'address']);
const MOVE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const HEX_ADDRESS = /^0x[0-9a-fA-F]{1,64}$/;
/** The only packages with chain-stable addresses. Everything else must use a package identifier. */
const FRAMEWORK_ADDRESS = /^0x0*[123]$/;
const ZERO_ADDRESS = normalizeSuiAddress('0x0');

function normalizeAddress(address: string) {
	return HEX_ADDRESS.test(address) ? normalizeSuiAddress(address) : address;
}

interface ParseContext {
	/**
	 * Address a bare `module::Type` resolves against, or `null` when there is no ambient package
	 * (global block), which makes the qualifier required.
	 */
	scopeAddress: string | null;
	registry: ModuleRegistry;
	currentPackage: { id: string; address: string };
	packageIdentities: Record<string, PackageIdentity>;
	root: string;
}

/**
 * Resolve the package part of a matcher to an address within the current package's dependency
 * closure. Returns `null` when the referenced run package is not part of this closure — the
 * matcher can't match anything here and is skipped (it is validated when its own package is
 * generated).
 *
 * Cross-package references are resolved through the consuming package's own address mapping (by
 * the referenced package's named-address label), falling back to its published root address.
 * Unpublished placeholder addresses (0x0) are never used for cross-package identity — multiple
 * unpublished local packages would otherwise be indistinguishable.
 */
function resolveQualifier(
	packagePart: string | undefined,
	unqualified: string,
	tag: string,
	ctx: ParseContext,
): string | null {
	if (packagePart === undefined) {
		if (ctx.scopeAddress === null) {
			throw new Error(
				`configArguments matcher "${ctx.root}": "${unqualified}" must be qualified ` +
					`with a package in the global configArguments block (e.g. ` +
					`"@pkg/name::${unqualified}"). Bare matchers are only supported in a package's own ` +
					`configArguments block.`,
			);
		}
		return ctx.scopeAddress;
	}
	if (FRAMEWORK_ADDRESS.test(packagePart)) {
		return normalizeSuiAddress(packagePart);
	}
	if (HEX_ADDRESS.test(packagePart)) {
		throw new Error(
			`Invalid package "${packagePart}" in configArguments matcher "${tag}": package addresses ` +
				`are network-specific and cannot be used in matchers (only the framework addresses ` +
				`0x1-0x3 are chain-stable). Reference the package by its identifier from the codegen ` +
				`config instead (e.g. "@pkg/name::${unqualified}").`,
		);
	}

	if (packagePart === ctx.currentPackage.id) {
		return normalizeAddress(ctx.currentPackage.address);
	}

	const identity = ctx.packageIdentities[packagePart];
	if (identity === undefined) {
		throw new Error(
			`Unknown package "${packagePart}" in configArguments matcher "${tag}". Known packages in ` +
				`this codegen run: ${[ctx.currentPackage.id, ...Object.keys(ctx.packageIdentities)].join(', ')}`,
		);
	}

	if (identity.label !== undefined && ctx.registry.addressMappings[identity.label] !== undefined) {
		return normalizeAddress(ctx.registry.addressMappings[identity.label]);
	}

	if (identity.address !== undefined) {
		const address = normalizeAddress(identity.address);
		if (address !== ZERO_ADDRESS && ctx.registry.hasResolvedAddress(address)) {
			return address;
		}
	}

	return null;
}

/** Signals that a matcher references a package outside this package's dependency closure. */
class OutOfClosureError extends Error {}

/**
 * Parse a matcher type into `{ address, module, name, typeArguments }`, resolving the package
 * qualifier and canonicalizing type arguments with the same identity encoding used for Move
 * parameter types (so matcher-side and signature-side identities are directly comparable).
 */
function parseMatcherType(
	tag: string,
	ctx: ParseContext,
): { address: string; module: string; name: string; typeArguments: string[] } {
	const trimmed = tag.trim();
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

	const address = resolveQualifier(packagePart, `${modulePart}::${namePart}`, tag, ctx);
	if (address === null) {
		throw new OutOfClosureError(tag);
	}

	const typeArguments =
		lt === -1
			? []
			: splitGenericParameters(trimmed.slice(lt + 1, -1)).map((argument) =>
					matcherArgumentIdentity(argument.trim(), ctx),
				);

	return { address, module: modulePart, name: namePart, typeArguments };
}

/** Canonical identity of a matcher type argument (recursive). */
function matcherArgumentIdentity(argument: string, ctx: ParseContext): string {
	if (argument.length === 0) {
		throw new Error(`Invalid type in configArguments matcher: "${ctx.root}" (empty type argument)`);
	}

	if (PRIMITIVES.has(argument)) {
		return argument;
	}

	if (argument.startsWith('vector<') && argument.endsWith('>')) {
		return `vector<${matcherArgumentIdentity(argument.slice('vector<'.length, -1).trim(), ctx)}>`;
	}

	// A bare identifier in type-argument position is a type-parameter placeholder like `Pool<T>`.
	if (MOVE_IDENTIFIER.test(argument)) {
		throw new Error(
			`configArguments matcher "${ctx.root}" contains the type parameter "${argument}" — partially ` +
				`instantiated matchers are not supported. Use an uninstantiated matcher (no type ` +
				`arguments) with a resolver function instead.`,
		);
	}

	const parsed = parseMatcherType(argument, ctx);

	// Nested datatypes must themselves be fully instantiated, as far as the summaries can tell.
	const summary = ctx.registry.getSummaryByResolvedAddress(parsed.address, parsed.module);
	const arity = (summary?.structs[parsed.name] ?? summary?.enums[parsed.name])?.type_parameters
		.length;
	if (arity !== undefined && arity !== parsed.typeArguments.length) {
		throw new Error(
			`configArguments matcher "${ctx.root}": ${parsed.module}::${parsed.name} expects ${arity} ` +
				`type argument(s), got ${parsed.typeArguments.length}. Partially instantiated matchers ` +
				`are not supported — use an uninstantiated matcher (no type arguments) with a resolver ` +
				`function instead.`,
		);
	}

	return datatypeIdentity(parsed.address, parsed.module, parsed.name, parsed.typeArguments);
}

function datatypeIdentity(
	address: string,
	module: string,
	name: string,
	typeArguments: string[],
): string {
	const base = `${address}::${module}::${name}`;
	return typeArguments.length ? `${base}<${typeArguments.join(',')}>` : base;
}

/**
 * Canonical identity of a Move parameter type, or `null` when it references function type
 * parameters (it then has no single concrete identity). The same encoding as matcher identities.
 */
export function canonicalTypeIdentity(
	type: Type,
	resolveAddress: (address: string) => string,
): string | null {
	if (typeof type === 'string') return type === 'signer' || type === '_' ? null : type;
	if ('Reference' in type) return canonicalTypeIdentity(type.Reference[1], resolveAddress);
	if ('vector' in type) {
		const inner = canonicalTypeIdentity(type.vector, resolveAddress);
		return inner === null ? null : `vector<${inner}>`;
	}
	if ('Datatype' in type) {
		const args = type.Datatype.type_arguments.map((argument) =>
			canonicalTypeIdentity(argument.argument, resolveAddress),
		);
		if (args.some((argument) => argument === null)) return null;
		return datatypeIdentity(
			normalizeAddress(resolveAddress(type.Datatype.module.address)),
			type.Datatype.module.name,
			type.Datatype.name,
			args as string[],
		);
	}
	return null;
}

export function isContextParameter(
	type: Type,
	resolveAddress: (address: string) => string,
): boolean {
	if (typeof type === 'string') return false;
	if ('Reference' in type) return isContextParameter(type.Reference[1], resolveAddress);
	if ('Datatype' in type) {
		return (
			normalizeAddress(resolveAddress(type.Datatype.module.address)) ===
				normalizeSuiAddress('0x2') &&
			type.Datatype.module.name === 'tx_context' &&
			type.Datatype.name === 'TxContext'
		);
	}
	return false;
}

/** Is this a pure (BCS-serialized) type rather than an object? Config values supply objects. */
function isPureParameterType(identity: string | null): boolean {
	if (identity === null) return false;
	return PRIMITIVES.has(identity) || identity.startsWith('vector<');
}

function parseFunctionMatcher(
	key: string,
	source: ConfigArgumentSource,
	matcher: { function: string; parameterName?: string; parameterIndex?: number },
	ctx: ParseContext,
): FunctionConfigArgument | null {
	const parts = matcher.function.split('::');
	if ((parts.length !== 2 && parts.length !== 3) || parts.some((part) => part.length === 0)) {
		throw new Error(
			`configArguments.${key}: invalid function "${matcher.function}". Expected ` +
				`"module::function_name", optionally qualified with a package from the codegen config.`,
		);
	}

	const packagePart = parts.length === 3 ? parts[0] : undefined;
	const modulePart = parts[parts.length - 2];
	const functionPart = parts[parts.length - 1];

	if (!MOVE_IDENTIFIER.test(modulePart) || !MOVE_IDENTIFIER.test(functionPart)) {
		throw new Error(`configArguments.${key}: invalid function "${matcher.function}"`);
	}

	if (matcher.parameterName !== undefined && matcher.parameterIndex !== undefined) {
		throw new Error(
			`configArguments.${key}: specify either parameterName or parameterIndex, not both`,
		);
	}

	const address = resolveQualifier(
		packagePart,
		`${modulePart}::${functionPart}`,
		matcher.function,
		ctx,
	);
	if (address === null) {
		if (source === 'package') {
			console.warn(
				`configArguments.${key}: function "${matcher.function}" is not part of ` +
					`${ctx.currentPackage.id}'s dependencies and will never match.`,
			);
		}
		return null;
	}

	const registry = ctx.registry;
	const summary = registry.getSummaryByResolvedAddress(address, modulePart);
	const func = summary?.functions[functionPart];

	if (!func) {
		if (registry.hasResolvedAddress(address)) {
			throw new Error(
				`configArguments.${key}: function "${matcher.function}" was not found in its package's summaries`,
			);
		}
		if (source === 'package') {
			console.warn(
				`configArguments.${key}: function "${matcher.function}" is not part of ` +
					`${ctx.currentPackage.id}'s dependencies and will never match.`,
			);
		}
		return null;
	}

	const resolveAddress = (target: string) => registry.resolveAddress(target);
	// The same positions the generated arguments use: TxContext and auto-injected well-known
	// objects are excluded.
	const parameters = func.parameters.filter(
		(param) =>
			!isContextParameter(param.type_, resolveAddress) &&
			!isWellKnownObjectParameter(param.type_, resolveAddress),
	);

	let bound: Parameter | undefined;
	let parameterIndex = matcher.parameterIndex;

	if (matcher.parameterName !== undefined) {
		bound = parameters.find((param) => param.name === matcher.parameterName);
		if (!bound) {
			throw new Error(
				`configArguments.${key}: function "${matcher.function}" has no parameter named ` +
					`"${matcher.parameterName}"${parameters.some((param) => param.name === undefined) ? " (this package's summaries do not include parameter names — use parameterIndex instead)" : ''}`,
			);
		}
		parameterIndex = undefined;
	} else if (parameterIndex !== undefined) {
		bound = parameters[parameterIndex];
		if (!bound) {
			throw new Error(
				`configArguments.${key}: function "${matcher.function}" has ${parameters.length} ` +
					`argument(s); parameterIndex ${parameterIndex} is out of range`,
			);
		}
	} else {
		if (parameters.length !== 1) {
			throw new Error(
				`configArguments.${key}: function "${matcher.function}" has ${parameters.length} ` +
					`argument(s) — specify parameterName or parameterIndex`,
			);
		}
		bound = parameters[0];
		parameterIndex = 0;
	}

	// A parameter typed with the function's own type parameters cannot be a single static id.
	const boundType = canonicalTypeIdentity(bound.type_, resolveAddress);

	if (isPureParameterType(boundType)) {
		throw new Error(
			`configArguments.${key}: parameter ${matcher.parameterName ?? `#${parameterIndex}`} of ` +
				`"${matcher.function}" has the pure type ${boundType} — config values supply objects, ` +
				`not pure values`,
		);
	}

	return {
		kind: 'function',
		key,
		source,
		address,
		module: modulePart,
		functionName: functionPart,
		parameterName: matcher.parameterName,
		parameterIndex,
		boundType,
	};
}

/**
 * Parse and validate `configArguments` blocks against the modules loaded in `registry`.
 * Per-package entries are merged over global entries (per key).
 *
 * Matchers identify packages network-agnostically: by the package identifiers from the codegen
 * config (resolved through `context.packageIdentities`), by the ambient package for bare
 * matchers in a package-scoped block, or by the chain-stable framework addresses 0x1-0x3. If a
 * matcher's package is part of this package's summaries, the matched type/function must exist
 * there (typos fail generation); matchers referencing run packages that aren't part of this
 * dependency closure can't match anything here and are skipped.
 */
export function parseConfigArguments(
	blocks: { global?: ConfigArguments; package?: ConfigArguments },
	registry: ModuleRegistry,
	context: ConfigArgumentsContext,
): { entries: ParsedConfigArgument[] } {
	const entries: ParsedConfigArgument[] = [];
	const currentAddress = normalizeAddress(context.package.address);

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
		if (!Array.isArray(matcher) && 'package' in matcher) {
			entries.push({ kind: 'package', key, source, package: matcher.package });
			continue;
		}

		// One key may declare several matchers (e.g. several functions sharing one config value).
		const matchers = Array.isArray(matcher) ? matcher : [matcher];

		for (const single of matchers) {
			const ctx: ParseContext = {
				scopeAddress: source === 'package' ? currentAddress : null,
				registry,
				currentPackage: context.package,
				packageIdentities: context.packageIdentities ?? {},
				root: 'function' in single ? single.function : single.type,
			};

			if ('function' in single) {
				const entry = parseFunctionMatcher(key, source, single, ctx);
				if (entry) {
					entries.push(entry);
				}
				continue;
			}

			let parsed: ReturnType<typeof parseMatcherType>;
			try {
				parsed = parseMatcherType(single.type, ctx);
			} catch (error) {
				if (error instanceof OutOfClosureError) {
					if (source === 'package') {
						console.warn(
							`configArguments.${key}: type "${single.type}" is not part of ` +
								`${context.package.id}'s dependencies and will never match — consider moving it ` +
								`to the global block or the package it belongs to.`,
						);
					}
					continue;
				}
				throw error;
			}

			const { address, module, name, typeArguments } = parsed;
			const summary = registry.getSummaryByResolvedAddress(address, module);
			const datatype = summary?.structs[name] ?? summary?.enums[name];

			if (!datatype) {
				if (registry.hasResolvedAddress(address)) {
					// The matcher's package is part of this dependency closure, so the type has to
					// exist — this is a typo.
					throw new Error(
						`configArguments.${key}: type "${single.type}" was not found in its package's summaries`,
					);
				}
				if (source === 'package') {
					console.warn(
						`configArguments.${key}: type "${single.type}" is not part of ${context.package.id}'s ` +
							`dependencies and will never match — consider moving it to the global block or the ` +
							`package it belongs to.`,
					);
				}
				continue;
			}

			const arity = datatype.type_parameters.length;
			const isGeneric = arity > 0;
			// A generic type written without `<...>` matches every instantiation.
			const uninstantiated = isGeneric && !single.type.includes('<');

			if (!uninstantiated && typeArguments.length !== arity) {
				throw new Error(
					`configArguments.${key}: type "${single.type}" expects ${arity} type argument(s), got ${typeArguments.length}`,
				);
			}

			entries.push({
				kind: 'type',
				key,
				source,
				address,
				module,
				name,
				typeArguments: uninstantiated ? null : typeArguments,
				parameterName: single.parameterName,
				isGeneric,
				boundType: uninstantiated ? null : datatypeIdentity(address, module, name, typeArguments),
			});
		}
	}

	return { entries };
}

/**
 * Find the config entry matching a function parameter, or `null`.
 *
 * Most-specific matcher wins, decided statically: function matchers beat type matchers, a fully
 * instantiated matcher beats an uninstantiated one, and a `parameterName`-refined matcher beats a
 * bare one at the same level. Ties across different keys are a hard generation-time error.
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
		functionRef,
		parameterIndex,
	}: {
		resolveAddress: (address: string) => string;
		functionLabel: string;
		/** The module and function the parameter belongs to, for function matchers. */
		functionRef: { moduleAddress: string; moduleName: string; functionName: string };
		/** The parameter's position in the generated arguments. */
		parameterIndex: number;
	},
): TypeConfigArgument | FunctionConfigArgument | null {
	let type = param.type_;
	while (typeof type !== 'string' && 'Reference' in type) {
		type = type.Reference[1];
	}

	const datatype = typeof type !== 'string' && 'Datatype' in type ? type.Datatype : null;
	const paramAddress = datatype ? normalizeAddress(resolveAddress(datatype.module.address)) : null;
	const moduleAddress = normalizeAddress(resolveAddress(functionRef.moduleAddress));

	const candidates: {
		entry: TypeConfigArgument | FunctionConfigArgument;
		specificity: number;
	}[] = [];
	const blockedNameMatchers: (TypeConfigArgument | FunctionConfigArgument)[] = [];

	for (const entry of entries) {
		if (entry.kind === 'function') {
			if (
				entry.address !== moduleAddress ||
				entry.module !== functionRef.moduleName ||
				entry.functionName !== functionRef.functionName
			) {
				continue;
			}
			if (entry.parameterName !== undefined) {
				if (param.name === undefined) {
					blockedNameMatchers.push(entry);
					continue;
				}
				if (entry.parameterName !== param.name) {
					continue;
				}
			} else if (entry.parameterIndex !== parameterIndex) {
				continue;
			}
			// Function matchers are the most specific form.
			candidates.push({ entry, specificity: 4 });
			continue;
		}

		if (entry.kind !== 'type' || !datatype) continue;
		if (
			entry.address !== paramAddress ||
			entry.module !== datatype.module.name ||
			entry.name !== datatype.name
		) {
			continue;
		}

		let specificity = 0;

		if (entry.typeArguments !== null) {
			// Fully instantiated matcher: only matches parameters concretely typed with that
			// exact instantiation in the Move signature.
			const argIdentities = datatype.type_arguments.map((argument) =>
				canonicalTypeIdentity(argument.argument, resolveAddress),
			);
			if (
				argIdentities.length !== entry.typeArguments.length ||
				argIdentities.some((identity, i) => identity !== entry.typeArguments![i])
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

	if (winners.length > 1 && !winners.every((c) => c.entry.key === winners[0].entry.key)) {
		throw new Error(
			`Parameter ${param.name ?? '<unnamed>'} of ${functionLabel} is matched by multiple configArguments entries with equal specificity: ${winners
				.map((c) => c.entry.key)
				.join(', ')}. Refine the matchers with type arguments or a parameter name.`,
		);
	}

	return winners[0].entry;
}
