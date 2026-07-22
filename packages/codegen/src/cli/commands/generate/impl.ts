// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { LocalContext } from '../../context.js';
import { generateFromPackageSummary } from '../../../index.js';
import { loadConfig, type GenerateBase, type PackageGenerate } from '../../../config.js';
import { isValidNamedPackage, isValidSuiObjectId } from '@mysten/sui/utils';
import { execSync } from 'node:child_process';
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

	// Package entries in any configArguments block must reference a package in this run — a typo'd
	// name would otherwise silently never apply.
	const knownPackageNames = new Set(normalizedPackages.map((p) => p.package));
	const configArgumentBlocks = [
		config.configArguments ?? {},
		...normalizedPackages.map((p) => ('configArguments' in p ? (p.configArguments ?? {}) : {})),
	];
	for (const block of configArgumentBlocks) {
		for (const [key, matcher] of Object.entries(block)) {
			if ('package' in matcher && !knownPackageNames.has(matcher.package)) {
				throw new Error(
					`configArguments.${key} references package "${matcher.package}", which is not part of ` +
						`this codegen run (packages: ${[...knownPackageNames].join(', ')})`,
				);
			}
		}
	}

	const globalTypeConfigKeys = Object.entries(config.configArguments ?? {})
		.filter(([, matcher]) => 'type' in matcher)
		.map(([key]) => key);
	const unresolvedConfigKeysByPackage: Set<string>[] = [];
	const unusedConfigKeysByPackage: Set<string>[] = [];

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
			const packageId = 'packageId' in pkg ? pkg.packageId : pkg.package;
			const tempDir = mkdtempSync(join(tmpdir(), 'sui-codegen-'));
			console.log(`Generating summary for on-chain package ${packageId} to ${tempDir}`);

			execSync(`sui move summary --package-id ${packageId} --output-directory ${tempDir}`, {
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

		const result = await generateFromPackageSummary({
			package: pkgWithOverrides,
			prune: flags.noPrune === undefined ? config.prune : !flags.noPrune,
			outputDir: flags.outputDir ?? config.output,
			globalGenerate,
			importExtension,
			includePhantomTypeParameters: config.includePhantomTypeParameters,
			errorClass: config.errorClass,
			configArguments: config.configArguments,
		});

		unresolvedConfigKeysByPackage.push(new Set(result.unresolvedConfigKeys));
		unusedConfigKeysByPackage.push(new Set(result.unusedConfigKeys));
	}

	if (unresolvedConfigKeysByPackage.length === 0) {
		return;
	}

	// Per-package unresolved global keys are only warnings (they may belong to another package in
	// the run), but a global key that resolved nowhere — or matched nothing anywhere — is a
	// misconfiguration for the run as a whole.
	for (const key of globalTypeConfigKeys) {
		if (unresolvedConfigKeysByPackage.every((keys) => keys.has(key))) {
			throw new Error(
				`configArguments.${key} did not resolve in any package in this codegen run — check the matcher type for typos`,
			);
		}
		const usedSomewhere = unresolvedConfigKeysByPackage.some(
			(unresolved, i) => !unresolved.has(key) && !unusedConfigKeysByPackage[i].has(key),
		);
		if (!usedSomewhere) {
			console.warn(
				`configArguments.${key} matched no generated function parameters in any package in this codegen run`,
			);
		}
	}
}
