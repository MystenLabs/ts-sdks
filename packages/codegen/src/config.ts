// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { isValidNamedPackage, isValidSuiObjectId } from '@mysten/sui/utils';
import { cosmiconfig } from 'cosmiconfig';
import * as z from 'zod/v4';

export const onChainPackageSchema = z.object({
	package: z.string().refine((name) => isValidNamedPackage(name) || isValidSuiObjectId(name), {
		message: 'Invalid package name or package ID',
	}),
	packageName: z.string(),
	path: z.never().optional(),
	network: z.enum(['mainnet', 'testnet']),
});

export const localPackageSchema = z.object({
	path: z.string(),
	package: z.string(),
	packageName: z.string().optional(),
});

export const packageConfigSchema = z.union([onChainPackageSchema, localPackageSchema]);

export const importExtensionSchema = z.union([z.literal('.js'), z.literal('.ts'), z.literal('')]);
export type ImportExtension = z.infer<typeof importExtensionSchema>;

export const configSchema = z.object({
	output: z.string(),
	prune: z.boolean().optional().default(true),
	generateSummaries: z.boolean().optional().default(true),
	packages: z.array(packageConfigSchema),
	privateMethods: z
		.union([z.literal('none'), z.literal('entry'), z.literal('all')])
		.optional()
		.default('entry'),
	importExtension: importExtensionSchema.optional().default('.js'),
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
			privateMethods: 'entry',
			importExtension: '.js',
		};
	}

	return configSchema.parse(config.config);
}
