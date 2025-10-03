// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi, Experimental_SuiClientTypes } from '@mysten/sui/experimental';
import type { TransactionAnalysisIssue } from '../analyzer.js';
import { createAnalyzer } from '../analyzer.js';
import { data } from '../core.js';

export const moveFunctions = createAnalyzer({
	cacheKey: 'moveFunctions@1.0.0',
	dependencies: { data },
	analyze:
		({ client }: { client: ClientWithCoreApi }) =>
		async ({ data }) => {
			if (data.issues) {
				return { issues: data.issues };
			}

			const issues: TransactionAnalysisIssue[] = [];

			const functions = new Set(
				data.result.commands
					.filter((cmd) => cmd.$kind === 'MoveCall')
					.map(
						(cmd) => `${cmd.MoveCall.package}::${cmd.MoveCall.module}::${cmd.MoveCall.function}`,
					),
			);

			const results = await Promise.all(
				Array.from(functions).map(async (functionId) => {
					const [packageId, moduleName, name] = functionId.split('::');
					try {
						const res = await client.core.getMoveFunction({ packageId, moduleName, name });
						return res.function;
					} catch {
						issues.push({ message: `Failed to fetch Move function: ${functionId}` });
						return null;
					}
				}),
			);

			if (issues.length) {
				return { issues };
			}

			return {
				result: results.filter(
					(fn): fn is Experimental_SuiClientTypes.FunctionResponse => fn !== null,
				),
			};
		},
});
