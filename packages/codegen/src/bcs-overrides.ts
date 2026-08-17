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

/**
 * How a rule selects the Move type it replaces: an exact canonical identity (primitives, vectors,
 * and datatypes written with type arguments), or a datatype base that matches every instantiation
 * (a generic written bare).
 */
export type BcsOverrideMatch =
	| { kind: 'identity'; identity: string }
	| { kind: 'datatype'; address: string; module: string; name: string };

/** One parsed `bcsOverrides` entry. Internal: the config shape stays `{ type, fields?, source }`. */
export interface BcsOverrideRule {
	match: BcsOverrideMatch;
	/** Compiled `fields` glob, tested against a field's site path, or `null` to match every site. */
	where: RegExp | null;
	/** `module` is an absolute path (relative sources) or a bare specifier. */
	source: { module: string; exportName: string };
	/** Set when the rule replaces a generated declaration instead of substituting at use sites. */
	declaration: { address: string; module: string; name: string } | null;
}

export interface BcsOverridesContext {
	/** Identifier (from the `packages` config) and resolved address of the package being generated. */
	package: { id: string; address: string };
	/** Identities of the other packages in the codegen run, keyed by their `packages` identifier. */
	packageIdentities?: Record<string, PackageIdentity>;
	/** Directory relative `source` specifiers resolve against (the config file's directory). */
	configDir: string;
}

/** Export names are TypeScript identifiers, which allow `$` unlike Move identifiers. */
const JS_IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

function parseSource(
	source: string,
	configDir: string,
	defaultExportName: string | null,
	label: string,
): BcsOverrideRule['source'] {
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

/**
 * Compile a `fields` glob into the single RegExp tested against a field's site path
 * (`module::Type.field`, or `module::Type.variant.field` for enum variant fields). `*` matches any
 * run of characters. A glob that names no module matches the `Type.field` suffix in every module,
 * so `Order.*_price` works without repeating the module name.
 */
function compileFields(fields: string, label: string): RegExp {
	const glob = fields.trim();
	if (glob.length === 0) {
		throw new Error(`bcsOverrides entry for "${label}": "fields" is empty`);
	}
	const body = glob.replace(/[.*+?^${}()|[\]\\]/g, (char) =>
		char === '*' ? '[\\s\\S]*' : `\\${char}`,
	);
	const modulePrefix = glob.includes('::') ? '' : '(?:[A-Za-z_][A-Za-z0-9_]*::)?';
	return new RegExp(`^${modulePrefix}${body}$`);
}

/**
 * Parse an entry's `type` into what it matches and the Move type name used as the default import
 * name (`null` for primitives and vectors, which have no natural export name).
 */
function parseType(
	type: string,
	ctx: ParseContext,
): { match: BcsOverrideMatch; exportName: string | null } {
	const trimmed = type.trim();

	if (PRIMITIVES.has(trimmed)) {
		return { match: { kind: 'identity', identity: trimmed }, exportName: null };
	}
	if (trimmed.startsWith('vector<')) {
		return {
			match: { kind: 'identity', identity: matcherArgumentIdentity(trimmed, ctx) },
			exportName: null,
		};
	}

	const { address, module, name, typeArguments } = parseMatcherType(trimmed, ctx);

	// A datatype written bare matches every instantiation; one written with type arguments matches
	// only that exact instantiation, which no single declaration can express.
	return trimmed.includes('<')
		? {
				match: {
					kind: 'identity',
					identity: datatypeIdentity(address, module, name, typeArguments),
				},
				exportName: name,
			}
		: { match: { kind: 'datatype', address, module, name }, exportName: name };
}

/**
 * Parse a package's `bcsOverrides` into rules, in config declaration order (first match wins).
 *
 * `type` uses the `configArguments` package scoping, extended with named-address labels from the
 * summaries so entries can target dependency packages (`fixed_math::i64::I64`). Validation is
 * deliberately minimal: a rule that matches nothing is not an error, so only genuinely unusable
 * input fails.
 */
export function parseBcsOverrides(
	overrides: BcsOverrides,
	registry: ModuleRegistry,
	context: BcsOverridesContext,
): BcsOverrideRule[] {
	const currentIdentity = context.packageIdentities?.[context.package.id];
	const currentAddress =
		normalizeAddress(context.package.address) === normalizeAddress('0x0') && currentIdentity?.label
			? currentIdentity.label
			: normalizeAddress(context.package.address);

	return overrides.map((override) => {
		const ctx: ParseContext = {
			scopeAddress: currentAddress,
			registry,
			currentPackage: context.package,
			packageIdentities: context.packageIdentities ?? {},
			root: override.type,
			allowAddressLabels: true,
		};

		const { match, exportName } = parseType(override.type, ctx);
		const where =
			override.fields === undefined ? null : compileFields(override.fields, override.type);

		// A datatype codegen emits a declaration for is replaced there, so every use picks it up for
		// free — which is exactly the `datatype` (base) match. A field-restricted rule can't be: it
		// only applies at some of those uses. Everything else is substituted where it is rendered:
		// primitives and vectors have no declaration, and neither do the stdlib types generated
		// layouts serialize inline.
		const declaration =
			match.kind === 'datatype' &&
			!where &&
			!isBcsInlinedDatatype(match.address, match.module, match.name)
				? { address: match.address, module: match.module, name: match.name }
				: null;

		return {
			match,
			where,
			source: parseSource(override.source, context.configDir, exportName, override.type),
			declaration,
		};
	});
}

/** The rule replacing a datatype's generated declaration, or `null`. */
export function findBcsDeclarationRule(
	rules: BcsOverrideRule[],
	resolvedAddress: string,
	module: string,
	name: string,
	symbolicAddress?: string,
): BcsOverrideRule | null {
	const address = normalizeAddress(resolvedAddress);
	for (const rule of rules) {
		if (rule.match.kind !== 'datatype') continue;
		if (
			(rule.match.address === address ||
				(symbolicAddress !== undefined && rule.match.address === symbolicAddress)) &&
			rule.match.module === module &&
			rule.match.name === name
		) {
			// A field-specific rule that appears first owns this datatype's ordering decision. A
			// later declaration rule cannot be installed globally without making that field use a
			// different codec from the datatype declaration.
			return rule.declaration ? rule : null;
		}
	}

	return null;
}

function typeMatches(
	match: BcsOverrideMatch,
	type: Type,
	resolveAddress: (address: string) => string,
	resolveSymbolicAddress?: (address: string) => string,
): boolean {
	if (match.kind === 'identity') {
		return (
			canonicalTypeIdentity(type, resolveAddress) === match.identity ||
			(resolveSymbolicAddress !== undefined &&
				canonicalTypeIdentity(type, resolveSymbolicAddress) === match.identity)
		);
	}

	let inner = type;
	while (typeof inner !== 'string' && 'Reference' in inner) {
		inner = inner.Reference[1];
	}
	if (typeof inner === 'string' || !('Datatype' in inner)) return false;
	return (
		(normalizeAddress(resolveAddress(inner.Datatype.module.address)) === match.address ||
			(resolveSymbolicAddress !== undefined &&
				normalizeAddress(resolveSymbolicAddress(inner.Datatype.module.address)) ===
					match.address)) &&
		inner.Datatype.module.name === match.module &&
		inner.Datatype.name === match.name
	);
}

/**
 * Find the rule to substitute for a type being rendered, or `null`. Called for every type the
 * renderer visits, so nesting needs no special handling: `vector<u64>` consults the whole vector
 * first, then consults `u64` when rendering the element. `sitePath` is the field the render started
 * from and stays fixed as the renderer recurses.
 */
export function resolveBcsOverride(
	rules: BcsOverrideRule[],
	type: Type,
	sitePath: string | undefined,
	resolveAddress: (address: string) => string,
	resolveSymbolicAddress?: (address: string) => string,
): BcsOverrideRule | null {
	for (const rule of rules) {
		if (!typeMatches(rule.match, type, resolveAddress, resolveSymbolicAddress)) continue;
		if (rule.where && (sitePath === undefined || !rule.where.test(sitePath))) continue;

		// Declaration replacements are emitted once, at the declaration, and use sites keep
		// referencing that declaration. Stop here so a later field-specific rule cannot override the
		// earlier declaration rule and give the same Move type two incompatible BCS layouts.
		return rule.declaration ? null : rule;
	}

	return null;
}
