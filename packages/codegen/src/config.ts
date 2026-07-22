// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { isValidNamedPackage, isValidSuiObjectId } from '@mysten/sui/utils';
import { cosmiconfig } from 'cosmiconfig';
import * as z from 'zod/v4';

export const globalFunctionsOptionSchema = z.union([
	z.boolean(),
	z.object({
		private: z.union([z.boolean(), z.literal('entry')]).optional(),
	}),
]);

export const functionsOptionSchema = z.union([
	z.boolean(),
	z.array(z.string()),
	z.object({
		private: z.union([z.boolean(), z.literal('entry')]).optional(),
	}),
]);

export const typesOptionSchema = z.union([z.boolean(), z.array(z.string())]);

export const globalGenerateSchema = z.object({
	functions: globalFunctionsOptionSchema.optional(),
	types: z.boolean().optional(),
});

export const moduleGenerateSchema = z.object({
	functions: functionsOptionSchema.optional(),
	types: typesOptionSchema.optional(),
});

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
/** Keys that would collide with `Object.prototype` or mutate prototypes on plain objects. */
const FORBIDDEN_CONFIG_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const typeMatcherSchema = z.strictObject({
	/**
	 * Move type to match function parameters against, written network-agnostically as
	 * `module::TypeName`. In a package's own `configArguments` block a bare `module::TypeName`
	 * refers to that package's type; other packages in the run are referenced by their
	 * `packages` identifier (`@myapp/core::pool::Pool`), and the chain-stable framework
	 * packages by address (`0x2::sui::SUI`). A generic type written without type arguments
	 * matches every instantiation and requires a resolver function as the config value; a
	 * fully instantiated generic (e.g. `pool::Pool<0x2::sui::SUI>`) only matches parameters
	 * concretely typed with that exact instantiation.
	 */
	type: z.string(),
	/**
	 * Optional Move parameter-name refinement, for signatures with two parameters of the same
	 * matched type. Only supported for summaries generated from local packages (bytecode
	 * summaries do not include parameter names).
	 */
	parameterName: z.string().optional(),
});

const functionMatcherSchema = z.strictObject({
	/**
	 * A Move function whose parameter is configured directly, written `module::function_name`
	 * (scoped like type matchers: bare form in a package's own block, `@pkg::module::fn`
	 * otherwise). The parameter's type is derived from the signature.
	 */
	function: z.string(),
	/** The Move name of the parameter to configure. */
	parameterName: z.string().optional(),
	/**
	 * The position of the parameter to configure, in the generated function's arguments (the
	 * same positions as the tuple form of `arguments` — `TxContext` and auto-injected well-known
	 * objects are excluded). Use for summaries without parameter names. When both this and
	 * `parameterName` are omitted, the function must have exactly one argument.
	 */
	parameterIndex: z.number().int().nonnegative().optional(),
});

const packageMatcherSchema = z.strictObject({
	/**
	 * Package entry, keyed by the package's name/MVR name from the `packages` config. Adds an
	 * optional config key that overrides the package address used for generated calls.
	 */
	package: z.string(),
});

export const configArgumentMatcherSchema = z.union([
	typeMatcherSchema,
	functionMatcherSchema,
	packageMatcherSchema,
]);

export const configArgumentsSchema = z.record(
	z
		.string()
		.regex(IDENTIFIER, {
			message:
				'configArguments keys become properties of the generated config interface and must be valid identifiers',
		})
		.refine((key) => !FORBIDDEN_CONFIG_KEYS.has(key), {
			message: 'configArguments keys must not be prototype property names',
		}),
	z.union([
		configArgumentMatcherSchema,
		// One key may resolve multiple types/parameters; its config value must then be a
		// resolver function.
		z.array(z.union([typeMatcherSchema, functionMatcherSchema])),
	]),
);

export type ConfigArgumentMatcher = z.infer<typeof configArgumentMatcherSchema>;
export type ConfigArguments = z.infer<typeof configArgumentsSchema>;

export const packageGenerateSchema = globalGenerateSchema.extend({
	modules: z
		.union([
			z.array(z.string()),
			z.record(z.string(), z.union([z.literal(true), moduleGenerateSchema])),
		])
		.optional(),
});

export const onChainPackageSchema = z.object({
	package: z.string().refine((name) => isValidNamedPackage(name) || isValidSuiObjectId(name), {
		message: 'Invalid package name or package ID',
	}),
	packageName: z.string(),
	path: z.never().optional(),
	network: z.enum(['mainnet', 'testnet']),
	generate: packageGenerateSchema.optional(),
	configArguments: configArgumentsSchema.optional(),
});

export const localPackageSchema = z.object({
	path: z.string(),
	package: z.string(),
	packageName: z.string().optional(),
	generate: packageGenerateSchema.optional(),
	configArguments: configArgumentsSchema.optional(),
});

export const packageConfigSchema = z.union([onChainPackageSchema, localPackageSchema]);

export const importExtensionSchema = z.union([z.literal('.js'), z.literal('.ts'), z.literal('')]);
export type ImportExtension = z.infer<typeof importExtensionSchema>;

export type GenerateBase = z.infer<typeof globalGenerateSchema>;
export type PackageGenerate = z.infer<typeof packageGenerateSchema>;
export type FunctionsOption = z.infer<typeof functionsOptionSchema>;
export type TypesOption = z.infer<typeof typesOptionSchema>;

export const errorClassSchema = z.object({
	name: z.string().regex(IDENTIFIER, {
		message: 'errorClass.name must start with a letter, $ or _ and contain only [A-Za-z0-9_$]',
	}),
	/** Import specifier resolved relative to the generated `<output>/utils/index.ts`. */
	source: z.string(),
});

export const configSchema = z.object({
	output: z.string(),
	prune: z.boolean().optional().default(true),
	generateSummaries: z.boolean().optional().default(true),
	packages: z.array(packageConfigSchema),
	generate: globalGenerateSchema.optional(),
	/**
	 * Maps config-object keys to Move type (or package) matchers. Matched function parameters are
	 * resolved from a runtime config object instead of being required arguments. Per-package
	 * `configArguments` entries are merged over these global entries.
	 */
	configArguments: configArgumentsSchema.optional(),
	/** @deprecated Use `generate: { functions: { private: 'entry' } }` instead */
	privateMethods: z.union([z.literal('none'), z.literal('entry'), z.literal('all')]).optional(),
	importExtension: importExtensionSchema.optional().default('.js'),
	includePhantomTypeParameters: z.boolean().optional().default(false),
	/**
	 * Custom error class for `normalizeMoveArguments` in the generated `utils/index.ts`.
	 * Defaults to the built-in `Error`.
	 */
	errorClass: errorClassSchema.optional(),
});

export type ErrorClassConfig = z.infer<typeof errorClassSchema>;

export type PackageConfig = z.infer<typeof packageConfigSchema>;
export type SuiCodegenConfig = z.input<typeof configSchema>;
export type ParsedSuiCodegenConfig = z.infer<typeof configSchema>;

export async function loadConfig(): Promise<ParsedSuiCodegenConfig> {
	const config = await cosmiconfig('sui-codegen').search();

	if (!config) {
		return {
			output: './generated',
			packages: [],
			prune: true,
			generateSummaries: true,
			importExtension: '.js',
			includePhantomTypeParameters: false,
		};
	}

	return configSchema.parse(config.config);
}
