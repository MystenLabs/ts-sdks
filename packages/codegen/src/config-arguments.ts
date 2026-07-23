// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { splitGenericParameters } from '@mysten/bcs';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import type { ConfigArguments } from './config.js';
import type { ModuleRegistry } from './module-registry.js';
import type { Parameter, Type } from './types/summary.js';
import { isWellKnownObjectParameter } from './utils.js';

export interface TypeConfigArgument {
	kind: 'type';
	key: string;
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
const ZERO_ADDRESS = normalizeSuiAddress('0x0');

function normalizeAddress(address: string) {
	return HEX_ADDRESS.test(address) ? normalizeSuiAddress(address) : address;
}

interface ParseContext {
	/** Address a bare `module::Type` resolves against: the declaring package. */
	scopeAddress: string;
	registry: ModuleRegistry;
	currentPackage: { id: string; address: string };
	packageIdentities: Record<string, PackageIdentity>;
	root: string;
}

/**
 * Resolve the package part of a matcher to an address. Explicit hex addresses are used as-is —
 * it's up to the author to only use them for packages whose address is the same on every network
 * the generated code targets. Cross-package identifier references are resolved through the
 * consuming package's own address mapping (by the referenced package's named-address label),
 * falling back to its published root address. Unpublished placeholder addresses (0x0) are never
 * used for cross-package identity — multiple unpublished local packages would otherwise be
 * indistinguishable. Referencing a run package outside the closure is a hard error: matchers only
 * affect the declaring package's generated functions.
 */
function resolveQualifier(packagePart: string | undefined, tag: string, ctx: ParseContext): string {
	if (packagePart === undefined) {
		return ctx.scopeAddress;
	}
	if (HEX_ADDRESS.test(packagePart)) {
		return normalizeSuiAddress(packagePart);
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
		const labelAddress = normalizeAddress(ctx.registry.addressMappings[identity.label]);
		const knownAddress =
			identity.address !== undefined ? normalizeAddress(identity.address) : undefined;
		// A published address that contradicts the label means this closure's label belongs to a
		// different package — don't trust the label.
		if (
			knownAddress === undefined ||
			knownAddress === ZERO_ADDRESS ||
			knownAddress === labelAddress
		) {
			return labelAddress;
		}
	}

	if (identity.address !== undefined) {
		const address = normalizeAddress(identity.address);
		if (address !== ZERO_ADDRESS && ctx.registry.hasResolvedAddress(address)) {
			return address;
		}
	}

	// A package's configArguments only affect its own generated functions, so referencing a run
	// package that isn't part of this dependency closure can never match anything — a mistake.
	throw new Error(
		`configArguments matcher "${tag}": package "${packagePart}" is not part of this package's ` +
			`dependencies, so the matcher can never match. Declare it in a package that depends on ` +
			`"${packagePart}" (or on "${packagePart}" itself).`,
	);
}

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
				`qualified with a package from the codegen config ("@pkg/name::module::Type") or an ` +
				`address ("0x2::module::Type").`,
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

	const address = resolveQualifier(packagePart, tag, ctx);

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

const STDLIB_ADDRESS = normalizeSuiAddress('0x1');
const FRAMEWORK_ADDR = normalizeSuiAddress('0x2');

/** Is this a pure (BCS-serialized) type rather than an object? Config values supply objects. */
function isPureParameterType(identity: string | null): boolean {
	if (identity === null) return false;
	if (PRIMITIVES.has(identity) || identity.startsWith('vector<')) return true;
	// Well-known pure datatypes are BCS-serialized, never object arguments.
	return (
		identity.startsWith(`${STDLIB_ADDRESS}::string::String`) ||
		identity.startsWith(`${STDLIB_ADDRESS}::ascii::String`) ||
		identity.startsWith(`${STDLIB_ADDRESS}::option::Option`) ||
		identity.startsWith(`${FRAMEWORK_ADDR}::object::ID`)
	);
}

function parseFunctionMatcher(
	key: string,
	matcher: { function: string; parameterName?: string; parameterIndex?: number },
	ctx: ParseContext,
): FunctionConfigArgument {
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

	const address = resolveQualifier(packagePart, matcher.function, ctx);

	const registry = ctx.registry;
	const summary = registry.getSummaryByResolvedAddress(address, modulePart);
	const func = summary?.functions[functionPart];

	if (!func) {
		throw new Error(
			`configArguments.${key}: function "${matcher.function}" was not found in its package's summaries`,
		);
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
		address,
		module: modulePart,
		functionName: functionPart,
		parameterName: matcher.parameterName,
		parameterIndex,
		boundType,
	};
}

/**
 * Parse and validate a package's `configArguments` against the modules loaded in `registry`.
 *
 * Matchers identify packages by scope: bare `module::Type` refers to the declaring package, other
 * run packages are referenced by their `packages` identifier (resolved through
 * `context.packageIdentities`), and explicit addresses (e.g. `0x2`) are used as-is — authors are
 * responsible for only using addresses that are valid on every network their generated code
 * targets.
 * Matched types and functions must exist in the referenced package's summaries — typos fail
 * generation.
 */
export function parseConfigArguments(
	configArguments: ConfigArguments,
	registry: ModuleRegistry,
	context: ConfigArgumentsContext,
): { entries: ParsedConfigArgument[] } {
	const entries: ParsedConfigArgument[] = [];
	const currentAddress = normalizeAddress(context.package.address);

	for (const [key, matcher] of Object.entries(configArguments)) {
		if (!Array.isArray(matcher) && 'package' in matcher) {
			// A package entry only affects the declaring package's generated calls.
			if (matcher.package !== context.package.id) {
				throw new Error(
					`configArguments.${key}: package entries must reference the package declaring them ` +
						`("${context.package.id}"), got "${matcher.package}"`,
				);
			}
			entries.push({ kind: 'package', key, package: matcher.package });
			continue;
		}

		// One key may declare several matchers (e.g. several functions sharing one config value).
		const matchers = Array.isArray(matcher) ? matcher : [matcher];

		for (const single of matchers) {
			const ctx: ParseContext = {
				scopeAddress: currentAddress,
				registry,
				currentPackage: context.package,
				packageIdentities: context.packageIdentities ?? {},
				root: 'function' in single ? single.function : single.type,
			};

			if ('function' in single) {
				entries.push(parseFunctionMatcher(key, single, ctx));
				continue;
			}

			const parsed = parseMatcherType(single.type, ctx);

			const { address, module, name, typeArguments } = parsed;
			const summary = registry.getSummaryByResolvedAddress(address, module);
			const datatype = summary?.structs[name] ?? summary?.enums[name];

			if (!datatype) {
				throw new Error(
					`configArguments.${key}: type "${single.type}" was not found in its package's summaries`,
				);
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

			if (
				isPureParameterType(
					uninstantiated ? null : datatypeIdentity(address, module, name, typeArguments),
				)
			) {
				throw new Error(
					`configArguments.${key}: "${single.type}" is a pure (BCS-serialized) type — config ` +
						`values supply objects, not pure values`,
				);
			}

			entries.push({
				kind: 'type',
				key,
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
