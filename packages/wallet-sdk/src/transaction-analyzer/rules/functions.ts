// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Experimental_SuiClientTypes } from '@mysten/sui/experimental';
import type { Analyzer } from '../analyzer.js';

export const moveFunctionAnalyzer: Analyzer<Experimental_SuiClientTypes.FunctionResponse[]> =
	(_tx, client) =>
	async ({ get, addIssue }) => {
		const data = await get('data');
		const functions = new Set(
			data.commands
				.filter((cmd) => cmd.$kind === 'MoveCall')
				.map((cmd) => `${cmd.MoveCall.package}::${cmd.MoveCall.module}::${cmd.MoveCall.function}`),
		);

		const results = await Promise.all(
			Array.from(functions).map(async (functionId) => {
				const [packageId, moduleName, name] = functionId.split('::');
				try {
					const res = await client.core.getMoveFunction({ packageId, moduleName, name });
					return res.function;
				} catch {
					addIssue({ message: `Failed to fetch Move function: ${functionId}` });
					return null;
				}
			}),
		);

		return results.filter((fn): fn is Experimental_SuiClientTypes.FunctionResponse => fn !== null);
	};
