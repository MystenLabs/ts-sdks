// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { LocalContext } from '../../context.js';
import { generateFromPackageSummary } from '../../../index.js';
import { loadConfig } from '../../../config.js';
import { isValidNamedPackage, isValidSuiObjectId } from '@mysten/sui/utils';

interface SubdirCommandFlags {
	outputDir?: string;
	noPrune?: boolean;
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

	for (const pkg of normalizedPackages) {
		await generateFromPackageSummary({
			package: pkg,
			prune: !flags.noPrune,
			outputDir: flags.outputDir ?? config.output,
		});
	}
}
