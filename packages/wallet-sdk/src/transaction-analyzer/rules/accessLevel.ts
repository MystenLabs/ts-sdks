// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { TransactionAnalysisIssue } from '../analyzer.js';
import { createAnalyzer } from '../analyzer.js';
import { gasCoins } from './coins.js';
import type { AnalyzedCommandArgument } from './commands.js';
import { commands } from './commands.js';
import { objects } from './objects.js';

export const accessLevel = createAnalyzer({
	dependencies: { commands, objects, gasCoins },
	analyze:
		() =>
		async ({ commands, objects, gasCoins }) => {
			const issues: TransactionAnalysisIssue[] = [];

			const gasCoinIds = new Set(gasCoins.map((g) => g.objectId));

			const accessLevels: Record<string, 'read' | 'mutate' | 'transfer'> = Object.fromEntries(
				objects.map((obj) => [obj.objectId, 'read' as const]),
			);

			for (const id of gasCoinIds) {
				accessLevels[id] = 'mutate';
			}

			for (const command of commands) {
				switch (command.$kind) {
					case 'TransferObjects':
						for (const obj of command.objects) {
							updateFromArgument(obj);
						}
						break;
					case 'MoveCall':
						for (const arg of command.arguments) {
							updateFromArgument(arg);
						}
						break;
					case 'SplitCoins':
						updateFromArgument(command.coin);
						break;
					case 'MergeCoins':
						updateFromArgument(command.destination);
						for (const src of command.sources) {
							updateFromArgument(src);
						}
						break;
					case 'MakeMoveVec':
						for (const el of command.elements) {
							updateFromArgument(el);
						}
						break;
					case 'Upgrade':
						updateFromArgument(command.ticket);
						break;
					case 'Publish':
						break;
					default:
						issues.push({ message: `Unknown command type: ${JSON.stringify(command)}` });
				}
			}

			if (issues.length) {
				return { issues };
			}

			return {
				result: accessLevels,
			};

			function updateFromArgument(arg: AnalyzedCommandArgument) {
				switch (arg.$kind) {
					case 'GasCoin':
						for (const id of gasCoinIds) {
							updateAccessLevel(id, arg.accessLevel);
						}
						break;
					case 'Object':
						updateAccessLevel(arg.object.objectId, arg.accessLevel);
						break;
				}
			}

			function updateAccessLevel(id: string, level: 'read' | 'mutate' | 'transfer') {
				const current = accessLevels[id];
				if (current === 'transfer') {
					return;
				} else if (current === 'mutate') {
					if (level === 'transfer') {
						accessLevels[id] = 'transfer';
					}
				} else {
					accessLevels[id] = level;
				}
			}
		},
});
