// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Experimental_SuiClientTypes } from '@mysten/sui/experimental';
import type { Analyzer } from '../analyzer.js';

export const moveFunctionAnalyzer: Analyzer<Experimental_SuiClientTypes.FunctionResponse[]> =
	(_tx, client) =>
	async ({ get }) => {
		const data = await get('data');
		const functions = new Set(
			data.commands
				.filter((cmd) => cmd.$kind === 'MoveCall')
				.map((cmd) => `${cmd.MoveCall.package}::${cmd.MoveCall.module}::${cmd.MoveCall.function}`),
		);

		const results = await Promise.allSettled(
			Array.from(functions).map(async (functionId) => {
				const [packageId, moduleName, name] = functionId.split('::');
				try {
					const res = await client.core.getMoveFunction({ packageId, moduleName, name });
					return res.function;
				} catch {
					// Return null for functions that don't exist
					return null;
				}
			}),
		);

		return results
			.map((result) => (result.status === 'fulfilled' ? result.value : null))
			.filter((fn): fn is Experimental_SuiClientTypes.FunctionResponse => fn !== null);
	};
