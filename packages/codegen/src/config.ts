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
});

export const localPackageSchema = z.object({
	path: z.string(),
	package: z.string(),
	packageName: z.string().optional(),
	generate: packageGenerateSchema.optional(),
});

export const packageConfigSchema = z.union([onChainPackageSchema, localPackageSchema]);

export const importExtensionSchema = z.union([z.literal('.js'), z.literal('.ts'), z.literal('')]);
export type ImportExtension = z.infer<typeof importExtensionSchema>;

export type GenerateBase = z.infer<typeof globalGenerateSchema>;
export type PackageGenerate = z.infer<typeof packageGenerateSchema>;
export type FunctionsOption = z.infer<typeof functionsOptionSchema>;
export type TypesOption = z.infer<typeof typesOptionSchema>;

export const configSchema = z.object({
	output: z.string(),
	prune: z.boolean().optional().default(true),
	generateSummaries: z.boolean().optional().default(true),
	packages: z.array(packageConfigSchema),
	generate: globalGenerateSchema.optional(),
	/** @deprecated Use `generate: { functions: { private: 'entry' } }` instead */
	privateMethods: z.union([z.literal('none'), z.literal('entry'), z.literal('all')]).optional(),
	importExtension: importExtensionSchema.optional().default('.js'),
	includePhantomTypeParameters: z.boolean().optional().default(false),
});

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
