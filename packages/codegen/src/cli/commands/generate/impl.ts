// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { LocalContext } from '../../context.js';
import { generateFromPackageSummary } from '../../../index.js';
import { loadConfig } from '../../../config.js';
import { isValidNamedPackage, isValidSuiObjectId } from '@mysten/sui/utils';
import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface SubdirCommandFlags {
	outputDir?: string;
	noPrune?: boolean;
	noSummaries?: boolean;
	network?: 'mainnet' | 'testnet';
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
							package: '@local-pkg/' + trimmed,
							packageName: trimmed,
							path: trimmed,
						};
					}
				})
			: config.packages;

	const generateSummaries =
		flags.noSummaries === undefined ? config.generateSummaries : !flags.noSummaries;

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
		await generateFromPackageSummary({
			package: pkg,
			prune: flags.noPrune === undefined ? config.prune : !flags.noPrune,
			outputDir: flags.outputDir ?? config.output,
			privateMethods: config.privateMethods,
		});
	}
}
