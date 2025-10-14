// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { LocalContext } from '../../context.js';
import { generateFromPackageSummary } from '../../../index.js';
import { loadConfig } from '../../../config.js';
import { isValidNamedPackage, isValidSuiObjectId } from '@mysten/sui/utils';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

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
		if (generateSummaries && pkg.path) {
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
