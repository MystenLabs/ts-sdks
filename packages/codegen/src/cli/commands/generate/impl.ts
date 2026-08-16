// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { LocalContext } from '../../context.js';
import { generateFromPackageSummary } from '../../../index.js';
import { loadConfig, type GenerateBase, type PackageGenerate } from '../../../config.js';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { isValidNamedPackage, isValidSuiObjectId } from '@mysten/sui/utils';
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

export interface SubdirCommandFlags {
	outputDir?: string;
	noPrune?: boolean;
	noSummaries?: boolean;
	network?: 'mainnet' | 'testnet';
	importExtension?: '.js' | '.ts' | 'none';
	modules?: string[];
	noTypes?: boolean;
	noFunctions?: boolean;
	private?: 'none' | 'entry' | 'all';
}

export async function resolveOnChainPackageId(
	packageNameOrId: string,
	network: 'mainnet' | 'testnet',
) {
	if (isValidSuiObjectId(packageNameOrId)) {
		return packageNameOrId;
	}

	const client = new SuiGrpcClient({
		network,
		baseUrl: `https://fullnode.${network}.sui.io:443`,
	});
	const { package: packageId } = await client.mvr.resolvePackage({ package: packageNameOrId });

	return packageId;
}

export function getOnChainSummaryArgs(
	packageId: string,
	network: 'mainnet' | 'testnet',
	outputDirectory: string,
) {
	return [
		'move',
		'--client.env',
		network,
		'summary',
		'--package-id',
		packageId,
		'--output-directory',
		outputDirectory,
	];
}

export default async function generate(
	this: LocalContext,
	flags: SubdirCommandFlags,
	...packages: string[]
): Promise<void> {
	const config = await loadConfig();

	const normalizedPackages =
		packages.length > 0
			? packages.map((p) => {
					const trimmed = p.trim();
					if (isValidSuiObjectId(trimmed) || isValidNamedPackage(trimmed)) {
						return {
							network: flags.network ?? 'testnet',
							packageName: isValidSuiObjectId(trimmed) ? trimmed : trimmed.split('/')[1],
							package: trimmed,
							packageId: isValidSuiObjectId(trimmed) ? trimmed : undefined,
						};
					} else {
						return {
							package: '@local-pkg/' + basename(trimmed),
							path: trimmed,
						};
					}
				})
			: config.packages;

	const generateSummaries =
		flags.noSummaries === undefined ? config.generateSummaries : !flags.noSummaries;

	const cliPrivate =
		flags.private !== undefined
			? flags.private === 'all'
				? true
				: flags.private === 'none'
					? false
					: 'entry'
			: undefined;

	const cliGenerate: PackageGenerate | undefined =
		flags.modules !== undefined ||
		flags.noTypes !== undefined ||
		flags.noFunctions !== undefined ||
		flags.private !== undefined
			? {
					...(flags.modules !== undefined && { modules: flags.modules }),
					...(flags.noTypes !== undefined && { types: !flags.noTypes as boolean }),
					...(flags.noFunctions !== undefined || flags.private !== undefined
						? {
								functions: flags.noFunctions
									? false
									: cliPrivate !== undefined
										? { private: cliPrivate }
										: true,
							}
						: {}),
				}
			: undefined;

	for (const pkg of normalizedPackages) {
		// Detect on-chain packages: they have 'network' field and no 'path'
		const isOnChainPackage =
			('packageId' in pkg && pkg.packageId) || ('network' in pkg && !('path' in pkg));

		// Generate summaries for on-chain packages using --package-id
		if (isOnChainPackage) {
			const packageNameOrId = 'packageId' in pkg && pkg.packageId ? pkg.packageId : pkg.package;
			const packageId = await resolveOnChainPackageId(packageNameOrId, pkg.network);
			const tempDir = mkdtempSync(join(tmpdir(), 'sui-codegen-'));
			console.log(`Generating summary for on-chain package ${packageId} to ${tempDir}`);

			execFileSync('sui', getOnChainSummaryArgs(packageId, pkg.network, tempDir), {
				stdio: 'inherit',
			});

			// Set the path to use the generated summary directory
			(pkg as { path?: string }).path = tempDir;
		} else if (generateSummaries && pkg.path) {
			if (!existsSync(pkg.path)) {
				throw new Error(`Package path does not exist: ${pkg.path}`);
			}

			execSync('sui move summary', {
				cwd: pkg.path,
				stdio: 'inherit',
			});
		}
		const importExtension =
			flags.importExtension === undefined
				? config.importExtension
				: flags.importExtension === 'none'
					? ''
					: flags.importExtension;

		const pkgWithOverrides = cliGenerate
			? {
					...pkg,
					generate: {
						...('generate' in pkg ? pkg.generate : {}),
						...cliGenerate,
					},
				}
			: pkg;

		// Fold deprecated privateMethods into globalGenerate
		const globalGenerate: GenerateBase | undefined =
			config.privateMethods && !config.generate?.functions
				? {
						...config.generate,
						functions: {
							private:
								config.privateMethods === 'all'
									? true
									: config.privateMethods === 'none'
										? false
										: 'entry',
						},
					}
				: config.generate;

		await generateFromPackageSummary({
			package: pkgWithOverrides,
			prune: flags.noPrune === undefined ? config.prune : !flags.noPrune,
			outputDir: flags.outputDir ?? config.output,
			globalGenerate,
			importExtension,
			includePhantomTypeParameters: config.includePhantomTypeParameters,
			errorClass: config.errorClass,
		});
	}
}
