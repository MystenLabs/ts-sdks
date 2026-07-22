// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { LocalContext } from '../../context.js';
import { generateFromPackageSummary, resolvePackageIdentity } from '../../../index.js';
import type { PackageIdentity } from '../../../config-arguments.js';
import { loadConfig, type GenerateBase, type PackageGenerate } from '../../../config.js';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { isValidNamedPackage, isValidSuiObjectId } from '@mysten/sui/utils';
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
	fullnodeUrl: string,
) {
	if (isValidSuiObjectId(packageNameOrId)) {
		return packageNameOrId;
	}

	const client = new SuiGrpcClient({
		network,
		baseUrl: fullnodeUrl,
	});
	const { package: packageId } = await client.mvr.resolvePackage({ package: packageNameOrId });

	return packageId;
}

export function getOnChainSummaryArgs(
	packageId: string,
	clientConfig: string,
	outputDirectory: string,
) {
	return [
		'move',
		'--client.config',
		clientConfig,
		'--client.env',
		'codegen',
		'summary',
		'--package-id',
		packageId,
		'--output-directory',
		outputDirectory,
	];
}

export function writeSuiClientConfig(directory: string, fullnodeUrl: string) {
	const configPath = join(directory, 'client.json');
	writeFileSync(
		configPath,
		JSON.stringify(
			{
				keystore: { File: join(directory, 'sui.keystore') },
				external_keys: null,
				envs: [
					{
						alias: 'codegen',
						rpc: fullnodeUrl,
						ws: null,
						basic_auth: null,
					},
				],
				active_env: 'codegen',
				active_address: null,
			},
			null,
			2,
		),
	);

	return configPath;
}

export async function withTemporaryDirectory<T>(
	callback: (directory: string) => T | Promise<T>,
): Promise<T> {
	const directory = mkdtempSync(join(tmpdir(), 'sui-codegen-'));

	try {
		return await callback(directory);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
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
							sourcePackageId: isValidSuiObjectId(trimmed) ? trimmed : undefined,
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

	await withTemporaryDirectory(async (temporaryRoot) => {
		// First ensure summaries exist for every package, then resolve each package's identity so
		// configArguments matchers can reference any package in the run by its identifier.
		for (const [index, pkg] of normalizedPackages.entries()) {
			const isOnChainPackage = 'network' in pkg && !('path' in pkg);

			if (isOnChainPackage) {
				const packageNameOrId =
					'sourcePackageId' in pkg && pkg.sourcePackageId ? pkg.sourcePackageId : pkg.package;
				const fullnodeUrl = config.fullnodeUrls[pkg.network];
				const packageId = await resolveOnChainPackageId(packageNameOrId, pkg.network, fullnodeUrl);
				const packageTempDir = join(temporaryRoot, String(index));
				const summaryDir = join(packageTempDir, 'summary');
				mkdirSync(summaryDir, { recursive: true });
				const clientConfig = writeSuiClientConfig(packageTempDir, fullnodeUrl);
				console.log(`Generating summary for on-chain package ${packageId} to ${summaryDir}`);

				execFileSync('sui', getOnChainSummaryArgs(packageId, clientConfig, summaryDir), {
					stdio: 'inherit',
				});
				(pkg as { path?: string }).path = summaryDir;
			} else if (generateSummaries && pkg.path) {
				if (!existsSync(pkg.path)) {
					throw new Error(`Package path does not exist: ${pkg.path}`);
				}

				execSync('sui move summary', {
					cwd: pkg.path,
					stdio: 'inherit',
				});
			}
		}

		const packageIdentities: Record<string, PackageIdentity> = {};
		for (const pkg of normalizedPackages) {
			if (!pkg.path) continue;
			const identity = await resolvePackageIdentity(
				pkg.path,
				'packageName' in pkg ? pkg.packageName : undefined,
			);
			if (identity !== undefined) {
				packageIdentities[pkg.package] = identity;
			}
		}

		for (const pkg of normalizedPackages) {
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
				packageIdentities,
			});
		}
	});
}
