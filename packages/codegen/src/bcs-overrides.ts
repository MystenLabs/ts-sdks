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
	MOVE_IDENTIFIER,
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

/** Replaces a datatype's generated declaration: every generated layout referencing it uses the custom type. */
export interface TypeBcsOverride {
	kind: 'type';
	/** The entry's original `type` string, for diagnostics. */
	label: string;
	address: string;
	module: string;
	name: string;
	source: BcsOverrideSource;
}

/**
 * The `type` filter of a `fields` entry: an exact canonical identity (primitives, vectors, and
 * instantiated datatypes), or a datatype base that matches every instantiation (a generic written
 * without type arguments).
 */
export type BcsFieldTypeFilter =
	| { match: 'identity'; identity: string }
	| { match: 'datatype'; address: string; module: string; name: string };

/** Replaces the BCS expression of matching field sites. */
export interface FieldBcsOverride {
	kind: 'field';
	/** `type` and `fields` of the entry, for diagnostics. */
	label: string;
	/** Resolved address of the field pattern's scope. */
	address: string;
	modulePattern: RegExp;
	datatypePattern: RegExp;
	fieldPattern: RegExp;
	fieldType: BcsFieldTypeFilter;
	source: BcsOverrideSource;
}

export type ParsedBcsOverride = TypeBcsOverride | FieldBcsOverride;

export interface BcsOverridesContext {
	/** Identifier (from the `packages` config) and resolved address of the package being generated. */
	package: { id: string; address: string };
	/** Identities of the other packages in the codegen run, keyed by their `packages` identifier. */
	packageIdentities?: Record<string, PackageIdentity>;
	/** Directory relative `source` specifiers resolve against (the config file's directory). */
	configDir: string;
}

const GLOB_SEGMENT = /^[A-Za-z0-9_*]+$/;

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
			`bcsOverrides entry for "${label}": add "#ExportName" to the source — pure types have no ` +
				`default export name`,
		);
	}
	if (!MOVE_IDENTIFIER.test(exportName)) {
		throw new Error(
			`bcsOverrides entry for "${label}": "${exportName}" is not a valid export name`,
		);
	}

	return {
		module: specifier.startsWith('.') ? resolve(configDir, specifier) : specifier,
		exportName,
	};
}

/**
 * Parse a `fields` entry's `type` into its match filter, plus the Move type name used as the
 * default import name (`null` for pure types, which have no natural export name).
 */
function parseFieldTypeFilter(
	type: string,
	ctx: ParseContext,
): { filter: BcsFieldTypeFilter; defaultExportName: string | null } {
	if (PRIMITIVES.has(type)) {
		return { filter: { match: 'identity', identity: type }, defaultExportName: null };
	}
	if (type.startsWith('vector<')) {
		return {
			filter: { match: 'identity', identity: matcherArgumentIdentity(type, ctx) },
			defaultExportName: null,
		};
	}

	const parsed = parseMatcherType(type, ctx);
	const summary = ctx.registry.getSummaryByResolvedAddress(parsed.address, parsed.module);
	const arity = (summary?.structs[parsed.name] ?? summary?.enums[parsed.name])?.type_parameters
		.length;

	// A generic written without type arguments matches every instantiation.
	if (arity !== undefined && arity > 0 && !type.includes('<')) {
		return {
			filter: {
				match: 'datatype',
				address: parsed.address,
				module: parsed.module,
				name: parsed.name,
			},
			defaultExportName: parsed.name,
		};
	}
	if (arity !== undefined && arity !== parsed.typeArguments.length) {
		throw new Error(
			`bcsOverrides entry for "${type}": ${parsed.module}::${parsed.name} expects ${arity} type ` +
				`argument(s), got ${parsed.typeArguments.length}`,
		);
	}

	return {
		filter: {
			match: 'identity',
			identity: datatypeIdentity(parsed.address, parsed.module, parsed.name, parsed.typeArguments),
		},
		defaultExportName: parsed.name,
	};
}

function parseFieldsPattern(
	fields: string,
	label: string,
	ctx: ParseContext,
): Pick<FieldBcsOverride, 'address' | 'modulePattern' | 'datatypePattern' | 'fieldPattern'> {
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

	const scope = segments.length === 3 ? segments[0] : undefined;
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
		scope === undefined
			? ctx.scopeAddress
			: parseMatcherType(`${scope}::module::Type`, { ...ctx, root: fields }).address;

	return {
		address,
		modulePattern: globToRegExp(moduleGlob),
		datatypePattern: globToRegExp(typeGlob),
		fieldPattern: globToRegExp(fieldGlob),
	};
}

/**
 * Parse and validate a package's `bcsOverrides` against the modules loaded in `registry`.
 *
 * Matchers use the `configArguments` package scoping, extended with named-address labels from the
 * summaries so entries can target dependency packages (`fixed_math::i64::I64`). Datatype entries
 * without `fields` must name an existing type; pure types require `fields`.
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

		if (override.fields !== undefined) {
			const label = `${override.type} at ${override.fields}`;
			const { filter, defaultExportName } = parseFieldTypeFilter(override.type, ctx);
			entries.push({
				kind: 'field',
				label,
				...parseFieldsPattern(override.fields, label, ctx),
				fieldType: filter,
				source: parseSource(override.source, context.configDir, defaultExportName, label),
			});
			continue;
		}

		if (PRIMITIVES.has(override.type) || override.type.startsWith('vector<')) {
			throw new Error(
				`bcsOverrides entry for "${override.type}": pure types can only be replaced at specific ` +
					`field sites — add a "fields" pattern`,
			);
		}

		if (override.type.includes('<')) {
			throw new Error(
				`bcsOverrides entry for "${override.type}": a replaced declaration applies to every ` +
					`instantiation — write the type without type arguments`,
			);
		}

		const parsed = parseMatcherType(override.type, ctx);

		// Generated layouts inline these as `bcs.string()` / `bcs.option(...)` / `bcs.Address`
		// instead of referencing the declaration, so replacing the declaration would silently do
		// nothing.
		if (isBcsInlinedDatatype(parsed.address, parsed.module, parsed.name)) {
			throw new Error(
				`bcsOverrides entry for "${override.type}": generated layouts serialize this type ` +
					`inline rather than referencing its declaration, so it can only be replaced at ` +
					`specific field sites — add a "fields" pattern`,
			);
		}

		const summary = registry.getSummaryByResolvedAddress(parsed.address, parsed.module);
		const datatype = summary?.structs[parsed.name] ?? summary?.enums[parsed.name];
		if (!datatype) {
			throw new Error(
				`bcsOverrides entry for "${override.type}": the type was not found in this package's summaries`,
			);
		}

		const identity = datatypeIdentity(parsed.address, parsed.module, parsed.name, []);
		const existing = declarationTargets.get(identity);
		if (existing !== undefined) {
			throw new Error(
				`bcsOverrides entries "${existing}" and "${override.type}" both replace the declaration ` +
					`of ${parsed.module}::${parsed.name}`,
			);
		}
		declarationTargets.set(identity, override.type);

		entries.push({
			kind: 'type',
			label: override.type,
			address: parsed.address,
			module: parsed.module,
			name: parsed.name,
			source: parseSource(override.source, context.configDir, parsed.name, override.type),
		});
	}

	return { entries };
}

export function findBcsTypeOverride(
	entries: ParsedBcsOverride[],
	resolvedAddress: string,
	module: string,
	name: string,
): TypeBcsOverride | null {
	const normalized = normalizeAddress(resolvedAddress);
	for (const entry of entries) {
		if (
			entry.kind === 'type' &&
			entry.address === normalized &&
			entry.module === module &&
			entry.name === name
		) {
			return entry;
		}
	}
	return null;
}

export interface BcsFieldSite {
	/** Resolved address of the module declaring the field's containing datatype. */
	moduleAddress: string;
	moduleName: string;
	datatypeName: string;
	fieldName: string;
	/** Set for enum variant fields; the field glob also matches `variant.field`. */
	variantName?: string;
	fieldType: Type;
	resolveAddress: (address: string) => string;
}

function fieldTypeMatches(filter: BcsFieldTypeFilter, site: BcsFieldSite): boolean {
	if (filter.match === 'identity') {
		return canonicalTypeIdentity(site.fieldType, site.resolveAddress) === filter.identity;
	}

	let type = site.fieldType;
	while (typeof type !== 'string' && 'Reference' in type) {
		type = type.Reference[1];
	}
	if (typeof type === 'string' || !('Datatype' in type)) return false;
	return (
		normalizeAddress(site.resolveAddress(type.Datatype.module.address)) === filter.address &&
		type.Datatype.module.name === filter.module &&
		type.Datatype.name === filter.name
	);
}

/**
 * Find the field override matching a field site, or `null`. Two distinct entries matching the same
 * field is a hard generation-time error — refine the patterns instead of relying on order.
 */
export function findBcsFieldOverride(
	entries: ParsedBcsOverride[],
	site: BcsFieldSite,
): FieldBcsOverride | null {
	const normalized = normalizeAddress(site.moduleAddress);
	const matches: FieldBcsOverride[] = [];

	for (const entry of entries) {
		if (entry.kind !== 'field') continue;
		if (
			entry.address !== normalized ||
			!entry.modulePattern.test(site.moduleName) ||
			!entry.datatypePattern.test(site.datatypeName)
		) {
			continue;
		}
		if (
			!entry.fieldPattern.test(site.fieldName) &&
			!(
				site.variantName !== undefined &&
				entry.fieldPattern.test(`${site.variantName}.${site.fieldName}`)
			)
		) {
			continue;
		}
		if (!fieldTypeMatches(entry.fieldType, site)) {
			continue;
		}
		matches.push(entry);
	}

	if (matches.length > 1) {
		throw new Error(
			`Field ${site.datatypeName}.${
				site.variantName !== undefined ? `${site.variantName}.` : ''
			}${site.fieldName} in module ${site.moduleName} is matched by multiple bcsOverrides ` +
				`entries: ${matches.map((entry) => `"${entry.label}"`).join(', ')}. Refine the field ` +
				`patterns so a single entry applies.`,
		);
	}

	return matches[0] ?? null;
}
