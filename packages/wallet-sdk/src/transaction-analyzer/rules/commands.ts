// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Argument, Command } from '@mysten/sui/transactions';
import type { SuiClientTypes } from '@mysten/sui/client';
import { inputs } from './inputs.js';
import type { AnalyzedCommandInput } from './inputs.js';
import type { TransactionAnalysisIssue } from '../analyzer.js';
import { createAnalyzer } from '../analyzer.js';
import { data } from './core.js';
import { moveFunctions } from './functions.js';

export type AnalyzedCommandArgument =
	| AnalyzedCommandInput
	| {
			$kind: 'Unknown';
			accessLevel: 'read' | 'mutate' | 'transfer';
	  }
	| {
			$kind: 'GasCoin';
			accessLevel: 'read' | 'mutate' | 'transfer';
	  }
	| {
			$kind: 'Result';
			index: [number, number];
			accessLevel: 'read' | 'mutate' | 'transfer';
	  };

export type AnalyzedCommand =
	| {
			$kind: 'MoveCall';
			index: number;
			arguments: AnalyzedCommandArgument[];
			function: SuiClientTypes.FunctionResponse;
			command: Extract<Command, { $kind: 'MoveCall' }>['MoveCall'];
	  }
	| {
			$kind: 'TransferObjects';
			index: number;
			objects: AnalyzedCommandArgument[];
			address: AnalyzedCommandArgument;
			command: Extract<Command, { $kind: 'TransferObjects' }>['TransferObjects'];
	  }
	| {
			$kind: 'MergeCoins';
			index: number;
			sources: AnalyzedCommandArgument[];
			destination: AnalyzedCommandArgument;
			command: Extract<Command, { $kind: 'MergeCoins' }>['MergeCoins'];
	  }
	| {
			$kind: 'SplitCoins';
			index: number;
			coin: AnalyzedCommandArgument;
			amounts: AnalyzedCommandArgument[];
			command: Extract<Command, { $kind: 'SplitCoins' }>['SplitCoins'];
	  }
	| {
			$kind: 'MakeMoveVec';
			index: number;
			elements: AnalyzedCommandArgument[];
			command: Extract<Command, { $kind: 'MakeMoveVec' }>['MakeMoveVec'];
	  }
	| {
			$kind: 'Upgrade';
			index: number;
			ticket: AnalyzedCommandArgument;
			command: Extract<Command, { $kind: 'Upgrade' }>['Upgrade'];
	  }
	| {
			$kind: 'Publish';
			index: number;
			command: Extract<Command, { $kind: 'Publish' }>['Publish'];
	  }
	| {
			$kind: 'Unknown';
			index: number;
			command: Extract<Command, { $kind: 'Unknown' }>['Unknown'];
	  };

export const commands = createAnalyzer({
	dependencies: {
		data,
		moveFunctions,
		inputs,
	},
	analyze:
		() =>
		({ data, moveFunctions, inputs }) => {
			const issues: TransactionAnalysisIssue[] = [];
			const commands: AnalyzedCommand[] = [];

			const mapInput = (
				arg: Argument,
				accessLevel: 'read' | 'mutate' | 'transfer' = 'transfer',
			): AnalyzedCommandArgument => {
				switch (arg.$kind) {
					case 'Input':
						break;
					case 'GasCoin':
						return { $kind: 'GasCoin', accessLevel };
					case 'Result':
						return { $kind: 'Result', index: [arg.Result, 0], accessLevel };
					case 'NestedResult':
						return { $kind: 'Result', index: arg.NestedResult, accessLevel };
					default:
						issues.push({ message: `Unexpected input type: ${JSON.stringify(arg)}` });
						return { $kind: 'Unknown', accessLevel };
				}

				const input = inputs[arg.Input];

				if (!input) {
					issues.push({ message: `Missing input for index ${arg.Input}` });
					return { $kind: 'Unknown', accessLevel };
				}

				return { ...input, accessLevel };
			};

			for (let index = 0; index < data.commands.length; index++) {
				const command = data.commands[index];
				switch (command.$kind) {
					case '$Intent':
						issues.push({ message: `Unexpected $Intent command: ${JSON.stringify(command)}` });
						break;
					case 'MakeMoveVec':
						commands.push({
							$kind: 'MakeMoveVec',
							index,
							elements: command.MakeMoveVec.elements.map((el) => mapInput(el)),
							command: command.MakeMoveVec,
						});
						break;
					case 'TransferObjects':
						commands.push({
							$kind: 'TransferObjects',
							index,
							address: mapInput(command.TransferObjects.address),
							objects: command.TransferObjects.objects.map((obj) => mapInput(obj)),
							command: command.TransferObjects,
						});
						break;
					case 'MergeCoins':
						commands.push({
							$kind: 'MergeCoins',
							index,
							sources: command.MergeCoins.sources.map((src) => mapInput(src)),
							destination: mapInput(command.MergeCoins.destination, 'mutate'),
							command: command.MergeCoins,
						});
						break;
					case 'SplitCoins':
						commands.push({
							$kind: 'SplitCoins',
							index,
							coin: mapInput(command.SplitCoins.coin, 'mutate'),
							amounts: command.SplitCoins.amounts.map((amt) => mapInput(amt, 'transfer')),
							command: command.SplitCoins,
						});
						break;
					case 'MoveCall': {
						const func = moveFunctions.find(
							(fn) =>
								fn.packageId === command.MoveCall.package &&
								fn.moduleName === command.MoveCall.module &&
								fn.name === command.MoveCall.function,
						)!;
						commands.push({
							$kind: 'MoveCall',
							index,
							arguments: command.MoveCall.arguments.map((arg, i) => {
								let accessLevel: 'read' | 'mutate' | 'transfer' = 'transfer';
								switch (func.parameters[i].reference) {
									case 'mutable':
										accessLevel = 'mutate';
										break;
									case 'immutable':
										accessLevel = 'read';
										break;
								}

								return mapInput(arg, accessLevel);
							}),
							command: command.MoveCall,
							function: func,
						});
						break;
					}
					case 'Publish':
						commands.push({
							$kind: 'Publish',
							index,
							command: command.Publish,
						});
						break;
					case 'Upgrade':
						commands.push({
							$kind: 'Upgrade',
							index,
							ticket: mapInput(command.Upgrade.ticket),
							command: command.Upgrade,
						});
						break;
					default:
						throw new Error('Unknown command type: ' + (command as { $kind: string }).$kind);
				}
			}

			if (issues.length) {
				return { issues };
			}

			return { result: commands };
		},
});
