// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { LocalContext } from '../../context.js';
import { generateFromPackageSummary } from '../../../index.js';
import { basename } from 'node:path';

interface SubdirCommandFlags {
	outputDir: string;
	summary?: string[];
	noPrune?: boolean;
}

export default async function generate(
	this: LocalContext,
	flags: SubdirCommandFlags,
): Promise<void> {
	for (const path of flags.summary ?? []) {
		await generateFromPackageSummary({
			source: path,
			destination: flags.outputDir,
			name: basename(path),
			noPrune: flags.noPrune,
		});
	}
}
