// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Argument, Command } from '@mysten/sui/transactions';
import type { Experimental_SuiClientTypes } from '@mysten/sui/experimental';
import type { AnalyzedCommandInput } from './inputs.js';
import type { Analyzer } from '../analyzer.js';

// SPDX-License-Identifier: Apache-2.0
export type AnalyzedCommandArgument =
	| AnalyzedCommandInput
	| {
			$kind: 'Unknown';
	  }
	| {
			$kind: 'GasCoin';
	  }
	| {
			$kind: 'Result';
			index: [number, number];
	  };

export type AnalyzedCommand =
	| {
			$kind: 'MoveCall';
			index: number;
			arguments: AnalyzedCommandArgument[];
			function: Experimental_SuiClientTypes.FunctionResponse;
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

export const commandAnalyzer: Analyzer<AnalyzedCommand[]> =
	() =>
	async ({ getAll, addIssue }) => {
		const [data, moveFunctions, inputs] = await getAll('data', 'moveFunctions', 'inputs');
		const commands: AnalyzedCommand[] = [];

		for (let index = 0; index < data.commands.length; index++) {
			const command = data.commands[index];
			switch (command.$kind) {
				case '$Intent':
					addIssue({ message: `Unexpected $Intent command: ${JSON.stringify(command)}` });
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
						destination: mapInput(command.MergeCoins.destination),
						command: command.MergeCoins,
					});
					break;
				case 'SplitCoins':
					commands.push({
						$kind: 'SplitCoins',
						index,
						coin: mapInput(command.SplitCoins.coin),
						amounts: command.SplitCoins.amounts.map((amt) => mapInput(amt)),
						command: command.SplitCoins,
					});
					break;
				case 'MoveCall':
					commands.push({
						$kind: 'MoveCall',
						index,
						arguments: command.MoveCall.arguments.map((arg) => mapInput(arg)),
						command: command.MoveCall,
						function: moveFunctions.find(
							(fn) =>
								fn.packageId === command.MoveCall.package &&
								fn.moduleName === command.MoveCall.module &&
								fn.name === command.MoveCall.function,
						)!,
					});
					break;
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

		function mapInput(arg: Argument): AnalyzedCommandArgument {
			switch (arg.$kind) {
				case 'Input':
					break;
				case 'GasCoin':
					return { $kind: 'GasCoin' };
				case 'Result':
					return { $kind: 'Result', index: [arg.Result, 0] };
				case 'NestedResult':
					return { $kind: 'Result', index: arg.NestedResult };
				default:
					addIssue({ message: `Unexpected input type: ${JSON.stringify(arg)}` });
					return { $kind: 'Unknown' };
			}

			const input = inputs[arg.Input];

			if (!input) {
				addIssue({ message: `Missing input for index ${arg.Input}` });
				return { $kind: 'Unknown' };
			}

			return input;
		}

		return commands;
	};
