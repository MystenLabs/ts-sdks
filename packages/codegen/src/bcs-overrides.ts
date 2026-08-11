// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { resolve } from 'node:path';
import type { BcsOverrides } from './config.js';
import type { ModuleRegistry } from './module-registry.js';
import type { PackageIdentity, ParseContext } from './config-arguments.js';
import {
	canonicalTypeIdentity,
	datatypeIdentity,
	matcherArgumentIdentity,
	normalizeAddress,
	parseMatcherType,
	PRIMITIVES,
} from './config-arguments.js';
import { isBcsInlinedDatatype } from './render-types.js';
import type { Type } from './types/summary.js';

/** The import a replacement resolves to. `module` is an absolute path or a bare specifier. */
export interface BcsOverrideSource {
	module: string;
	exportName: string;
}

/**
 * Replaces a datatype's generated declaration. Uses need no special handling: they already
 * reference the declaration, which is now the custom type.
 */
export interface DeclarationBcsOverride {
	kind: 'declaration';
	/** The entry's original `type` string, for diagnostics. */
	label: string;
	address: string;
	module: string;
	name: string;
	source: BcsOverrideSource;
}

/**
 * The Move type an override replaces: an exact canonical identity (primitives, vectors, and
 * instantiated datatypes), or a datatype base that matches every instantiation (a generic written
 * without type arguments).
 */
export type BcsOverrideTarget =
	| { match: 'identity'; identity: string }
	| { match: 'datatype'; address: string; module: string; name: string };

/** Restricts a use override to matching field sites. */
export interface BcsOverrideScope {
	/** Resolved address of the pattern's package scope. */
	address: string;
	modulePattern: RegExp;
	datatypePattern: RegExp;
	fieldPattern: RegExp;
}

/**
 * Replaces the BCS expression emitted for a Move type wherever that type is rendered. Because the
 * type renderer recurses, this applies at any depth — an override on `u64` reaches the `u64` inside
 * `vector<u64>` and `Option<u64>` without any extra machinery.
 */
export interface UseBcsOverride {
	kind: 'use';
	/** `type` and `fields` of the entry, for diagnostics. */
	label: string;
	target: BcsOverrideTarget;
	/** `null` applies the override anywhere the type is rendered. */
	scope: BcsOverrideScope | null;
	/**
	 * How narrowly the entry targets a site: the number of `module`/`type`/`field` glob segments
	 * naming something concrete. When several entries match, the most specific wins, so a broad
	 * rule can be given narrower exceptions.
	 */
	specificity: number;
	source: BcsOverrideSource;
}

export type ParsedBcsOverride = DeclarationBcsOverride | UseBcsOverride;

export interface BcsOverridesContext {
	/** Identifier (from the `packages` config) and resolved address of the package being generated. */
	package: { id: string; address: string };
	/** Identities of the other packages in the codegen run, keyed by their `packages` identifier. */
	packageIdentities?: Record<string, PackageIdentity>;
	/** Directory relative `source` specifiers resolve against (the config file's directory). */
	configDir: string;
}

const GLOB_SEGMENT = /^[A-Za-z0-9_*]+$/;
/** Export names are TypeScript identifiers, which allow `$` unlike Move identifiers. */
const JS_IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

function globToRegExp(glob: string): RegExp {
	return new RegExp(`^${glob.replaceAll(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*')}$`);
}

function parseSource(
	source: string,
	configDir: string,
	defaultExportName: string | null,
	label: string,
): BcsOverrideSource {
	const hash = source.lastIndexOf('#');
	const specifier = hash === -1 ? source : source.slice(0, hash);
	const exportName = hash === -1 ? defaultExportName : source.slice(hash + 1);

	if (specifier.length === 0) {
		throw new Error(`bcsOverrides entry for "${label}": source has an empty import specifier`);
	}
	if (exportName === null) {
		throw new Error(
			`bcsOverrides entry for "${label}": add "#ExportName" to the source — primitives and ` +
				`vectors have no default export name`,
		);
	}
	if (!JS_IDENTIFIER.test(exportName)) {
		throw new Error(
			`bcsOverrides entry for "${label}": "${exportName}" is not a valid export name`,
		);
	}

	return {
		module: specifier.startsWith('.') ? resolve(configDir, specifier) : specifier,
		exportName,
	};
}

/** A datatype entry's identity, and whether it was written with explicit type arguments. */
interface TargetDatatype {
	address: string;
	module: string;
	name: string;
	instantiated: boolean;
}

/**
 * Parse an entry's `type` into the target it matches, the Move type name used as the default import
 * name (`null` for primitives and vectors, which have no natural export name), and — for datatypes
 * — the identity used to decide whether the declaration itself can be replaced.
 */
function parseTarget(
	type: string,
	ctx: ParseContext,
): {
	target: BcsOverrideTarget;
	defaultExportName: string | null;
	datatype: TargetDatatype | null;
} {
	if (PRIMITIVES.has(type)) {
		return {
			target: { match: 'identity', identity: type },
			defaultExportName: null,
			datatype: null,
		};
	}
	if (type.startsWith('vector<')) {
		return {
			target: { match: 'identity', identity: matcherArgumentIdentity(type, ctx) },
			defaultExportName: null,
			datatype: null,
		};
	}

	const parsed = parseMatcherType(type, ctx);
	const summary = ctx.registry.getSummaryByResolvedAddress(parsed.address, parsed.module);
	const declaration = summary?.structs[parsed.name] ?? summary?.enums[parsed.name];

	if (!declaration) {
		throw new Error(
			`bcsOverrides entry for "${type}": the type was not found in this package's summaries`,
		);
	}

	const arity = declaration.type_parameters.length;
	const instantiated = type.includes('<');
	const datatype = {
		address: parsed.address,
		module: parsed.module,
		name: parsed.name,
		instantiated,
	};

	// A generic written without type arguments matches every instantiation.
	if (arity > 0 && !instantiated) {
		return {
			target: {
				match: 'datatype',
				address: parsed.address,
				module: parsed.module,
				name: parsed.name,
			},
			defaultExportName: parsed.name,
			datatype,
		};
	}
	if (arity !== parsed.typeArguments.length) {
		throw new Error(
			`bcsOverrides entry for "${type}": ${parsed.module}::${parsed.name} expects ${arity} type ` +
				`argument(s), got ${parsed.typeArguments.length}`,
		);
	}

	return {
		target: {
			match: 'identity',
			identity: datatypeIdentity(parsed.address, parsed.module, parsed.name, parsed.typeArguments),
		},
		defaultExportName: parsed.name,
		datatype,
	};
}

function parseScope(
	fields: string,
	label: string,
	ctx: ParseContext,
): { scope: BcsOverrideScope; specificity: number } {
	const dot = fields.indexOf('.', fields.lastIndexOf('::'));
	const typePath = dot === -1 ? fields : fields.slice(0, dot);
	const fieldGlob = dot === -1 ? '' : fields.slice(dot + 1);
	const segments = typePath.split('::');

	if (
		fieldGlob.length === 0 ||
		(segments.length !== 2 && segments.length !== 3) ||
		segments.some((segment) => segment.length === 0)
	) {
		throw new Error(
			`bcsOverrides entry for "${label}": invalid fields pattern "${fields}". Expected ` +
				`"module::TypeName.field" (with optional "*" wildcards), optionally qualified with a ` +
				`package or named-address label.`,
		);
	}

	const scopePart = segments.length === 3 ? segments[0] : undefined;
	const moduleGlob = segments[segments.length - 2];
	const typeGlob = segments[segments.length - 1];

	if (!GLOB_SEGMENT.test(moduleGlob) || !GLOB_SEGMENT.test(typeGlob)) {
		throw new Error(
			`bcsOverrides entry for "${label}": invalid fields pattern "${fields}" ` +
				`("${moduleGlob}::${typeGlob}" is not a valid module::type glob)`,
		);
	}

	// Reuse the matcher qualifier resolution by parsing a placeholder type path.
	const address =
		scopePart === undefined
			? ctx.scopeAddress
			: parseMatcherType(`${scopePart}::module::Type`, { ...ctx, root: fields }).address;

	return {
		scope: {
			address,
			modulePattern: globToRegExp(moduleGlob),
			datatypePattern: globToRegExp(typeGlob),
			fieldPattern: globToRegExp(fieldGlob),
		},
		specificity: [moduleGlob, typeGlob, fieldGlob].filter((glob) => glob !== '*').length,
	};
}

/**
 * Parse and validate a package's `bcsOverrides` against the modules loaded in `registry`.
 *
 * Matchers use the `configArguments` package scoping, extended with named-address labels from the
 * summaries so entries can target dependency packages (`fixed_math::i64::I64`).
 *
 * An entry replaces a datatype's generated declaration when the type has one and no `fields`
 * pattern narrows it. Otherwise it replaces the type wherever it is rendered — which covers types
 * that have no declaration to replace (primitives, `vector`, `String`, `Option`, `ID`/`UID`).
 */
export function parseBcsOverrides(
	overrides: BcsOverrides,
	registry: ModuleRegistry,
	context: BcsOverridesContext,
): { entries: ParsedBcsOverride[] } {
	const entries: ParsedBcsOverride[] = [];
	const declarationTargets = new Map<string, string>();

	for (const override of overrides) {
		const ctx: ParseContext = {
			scopeAddress: normalizeAddress(context.package.address),
			registry,
			currentPackage: context.package,
			packageIdentities: context.packageIdentities ?? {},
			root: override.type,
			allowAddressLabels: true,
		};

		const { target, defaultExportName, datatype } = parseTarget(override.type, ctx);

		// A datatype with a generated declaration is replaced at the declaration, so every use
		// picks it up for free. Everything else is replaced where it is rendered: primitives and
		// vectors (no declaration exists), the stdlib types generated layouts serialize inline,
		// a specific instantiation of a generic, and anything narrowed by `fields`.
		const replacesDeclaration =
			override.fields === undefined &&
			datatype !== null &&
			!datatype.instantiated &&
			!isBcsInlinedDatatype(datatype.address, datatype.module, datatype.name);

		if (replacesDeclaration) {
			const identity = datatypeIdentity(datatype.address, datatype.module, datatype.name, []);
			const existing = declarationTargets.get(identity);
			if (existing !== undefined) {
				throw new Error(
					`bcsOverrides entries "${existing}" and "${override.type}" both replace the ` +
						`declaration of ${datatype.module}::${datatype.name}`,
				);
			}
			declarationTargets.set(identity, override.type);

			entries.push({
				kind: 'declaration',
				label: override.type,
				address: datatype.address,
				module: datatype.module,
				name: datatype.name,
				source: parseSource(override.source, context.configDir, defaultExportName, override.type),
			});
			continue;
		}

		const label =
			override.fields === undefined ? override.type : `${override.type} at ${override.fields}`;
		const { scope, specificity } =
			override.fields === undefined
				? { scope: null, specificity: 0 }
				: parseScope(override.fields, label, ctx);

		entries.push({
			kind: 'use',
			label,
			target,
			scope,
			specificity,
			source: parseSource(override.source, context.configDir, defaultExportName, label),
		});
	}

	return { entries };
}

/** A non-generic datatype written without `fields` has its declaration replaced. */
export function findBcsDeclarationOverride(
	entries: ParsedBcsOverride[],
	resolvedAddress: string,
	module: string,
	name: string,
): DeclarationBcsOverride | null {
	const normalized = normalizeAddress(resolvedAddress);
	for (const entry of entries) {
		if (
			entry.kind === 'declaration' &&
			entry.address === normalized &&
			entry.module === module &&
			entry.name === name
		) {
			return entry;
		}
	}
	return null;
}

/** Where a type is being rendered, for scoping use overrides. */
export interface BcsRenderSite {
	/** Resolved address of the module declaring the containing datatype. */
	moduleAddress: string;
	moduleName: string;
	datatypeName: string;
	fieldName: string;
	/** Set for enum variant fields; the field glob also matches `variant.field`. */
	variantName?: string;
}

function targetMatches(
	target: BcsOverrideTarget,
	type: Type,
	resolveAddress: (address: string) => string,
): boolean {
	if (target.match === 'identity') {
		return canonicalTypeIdentity(type, resolveAddress) === target.identity;
	}

	let inner = type;
	while (typeof inner !== 'string' && 'Reference' in inner) {
		inner = inner.Reference[1];
	}
	if (typeof inner === 'string' || !('Datatype' in inner)) return false;
	return (
		normalizeAddress(resolveAddress(inner.Datatype.module.address)) === target.address &&
		inner.Datatype.module.name === target.module &&
		inner.Datatype.name === target.name
	);
}

function scopeMatches(scope: BcsOverrideScope, site: BcsRenderSite | null): boolean {
	if (site === null) return false;
	if (
		scope.address !== normalizeAddress(site.moduleAddress) ||
		!scope.modulePattern.test(site.moduleName) ||
		!scope.datatypePattern.test(site.datatypeName)
	) {
		return false;
	}
	return (
		scope.fieldPattern.test(site.fieldName) ||
		(site.variantName !== undefined &&
			scope.fieldPattern.test(`${site.variantName}.${site.fieldName}`))
	);
}

/**
 * Find the override for a type being rendered, or `null`. Called for every type the renderer
 * visits, so nesting needs no special handling: `vector<u64>` consults the whole vector first, then
 * consults `u64` when rendering the element.
 *
 * The most specific matching entry wins, so a broad rule (`{ type: 'u64' }`) can be given a
 * narrower exception (`{ type: 'u64', fields: 'order::Order.price' }`). Two entries matching
 * equally specifically are an error — the winner would otherwise depend on declaration order.
 */
export function findBcsUseOverride(
	entries: ParsedBcsOverride[],
	type: Type,
	resolveAddress: (address: string) => string,
	site: BcsRenderSite | null,
): UseBcsOverride | null {
	const matches = entries.filter(
		(entry): entry is UseBcsOverride =>
			entry.kind === 'use' &&
			(entry.scope === null || scopeMatches(entry.scope, site)) &&
			targetMatches(entry.target, type, resolveAddress),
	);

	if (matches.length === 0) {
		return null;
	}

	const best = Math.max(...matches.map((entry) => entry.specificity));
	const winners = matches.filter((entry) => entry.specificity === best);

	if (winners.length > 1 && !winners.every((entry) => entry.source === winners[0].source)) {
		throw new Error(
			`${
				site
					? `Field ${site.datatypeName}.${
							site.variantName !== undefined ? `${site.variantName}.` : ''
						}${site.fieldName} in module ${site.moduleName}`
					: 'A rendered type'
			} is matched by multiple bcsOverrides entries with equal specificity: ${winners
				.map((entry) => `"${entry.label}"`)
				.join(', ')}. Refine the field patterns so a single entry applies.`,
		);
	}

	return winners[0];
}
