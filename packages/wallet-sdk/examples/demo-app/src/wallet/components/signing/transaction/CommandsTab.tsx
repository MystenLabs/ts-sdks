// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { formatAddress } from '@mysten/sui/utils';
import { useState } from 'react';
import type { WalletTransactionAnalysis } from '../../../hooks/useAnalysis.js';

interface CommandsTabProps {
	analysis: WalletTransactionAnalysis;
}

export function CommandsTab({ analysis }: CommandsTabProps) {
	const { commands, moveFunctions } = analysis;
	const [expandedCommands, setExpandedCommands] = useState<Set<number>>(new Set());

	const toggleCommand = (index: number) => {
		const newExpanded = new Set(expandedCommands);
		if (newExpanded.has(index)) {
			newExpanded.delete(index);
		} else {
			newExpanded.add(index);
		}
		setExpandedCommands(newExpanded);
	};

	// Map package/module/function to move function details
	const functionMap = new Map<string, NonNullable<typeof moveFunctions.result>[0]>();
	moveFunctions.result?.forEach((func) => {
		const key = `${func.packageId}::${func.moduleName}::${func.name}`;
		functionMap.set(key, func);
	});

	return (
		<div className="space-y-4">
			<h3 className="text-sm font-semibold text-gray-900">Transaction Commands</h3>
			{!commands.result || commands.result.length === 0 ? (
				<div className="text-center py-4 text-sm text-gray-500">
					No commands in this transaction
				</div>
			) : (
				<div className="space-y-2">
					{commands.result.map((cmd, index) => {
						const isExpanded = expandedCommands.has(index);
						const type = cmd.$kind || 'Unknown';

						// Get command-specific details
						let commandDetails: React.ReactNode = null;
						let commandIcon: React.ReactNode = null;
						let commandColor = 'gray';

						if (type === 'MoveCall' && cmd.$kind === 'MoveCall') {
							const moveCall = cmd.command;
							const funcKey = `${moveCall.package}::${moveCall.module}::${moveCall.function}`;
							const funcDetails = functionMap.get(funcKey);

							commandColor = 'blue';
							commandIcon = <span className="font-bold text-blue-600">M</span>;
							commandDetails = (
								<div className="text-xs space-y-1">
									<div>
										<span className="text-gray-600">Function:</span>{' '}
										<span className="font-mono text-gray-800">
											{moveCall.module}::{moveCall.function}
										</span>
									</div>
									<div>
										<span className="text-gray-600">Package:</span>{' '}
										<span className="font-mono text-gray-700">
											{formatAddress(moveCall.package)}
										</span>
									</div>
									{funcDetails && funcDetails.parameters.length > 0 && (
										<div>
											<span className="text-gray-600">Parameters:</span>{' '}
											<span className="text-gray-700">{funcDetails.parameters.length}</span>
										</div>
									)}
								</div>
							);
						} else if (type === 'TransferObjects') {
							commandColor = 'green';
							commandIcon = <span className="font-bold text-green-600">T</span>;
							commandDetails = (
								<div className="text-xs">
									<span className="text-gray-600">Transferring </span>
									<span className="font-medium">
										{cmd.$kind === 'TransferObjects' ? cmd.objects.length : 0}
									</span>
									<span className="text-gray-600"> object(s) to </span>
									<span className="font-mono">
										{cmd.$kind === 'TransferObjects' ? formatArgument(cmd.address) : 'Unknown'}
									</span>
								</div>
							);
						} else if (type === 'SplitCoins') {
							commandColor = 'yellow';
							commandIcon = <span className="font-bold text-yellow-600">S</span>;
							commandDetails = (
								<div className="text-xs">
									<span className="text-gray-600">Splitting coin into </span>
									<span className="font-medium">
										{cmd.$kind === 'SplitCoins' ? cmd.amounts.length : 0}
									</span>
									<span className="text-gray-600"> parts</span>
								</div>
							);
						} else if (type === 'MergeCoins') {
							commandColor = 'purple';
							commandIcon = <span className="font-bold text-purple-600">M</span>;
							commandDetails = (
								<div className="text-xs">
									<span className="text-gray-600">Merging </span>
									<span className="font-medium">
										{cmd.$kind === 'MergeCoins' ? cmd.sources.length : 0}
									</span>
									<span className="text-gray-600"> coin(s)</span>
								</div>
							);
						} else {
							commandIcon = <span className="font-bold text-gray-600">?</span>;
						}

						const bgColor =
							commandColor === 'blue'
								? 'bg-blue-50 border-blue-200'
								: commandColor === 'green'
									? 'bg-green-50 border-green-200'
									: commandColor === 'yellow'
										? 'bg-yellow-50 border-yellow-200'
										: commandColor === 'purple'
											? 'bg-purple-50 border-purple-200'
											: 'bg-gray-50 border-gray-200';

						return (
							<div key={index} className={`rounded-lg border ${bgColor} overflow-hidden`}>
								<button
									onClick={() => toggleCommand(index)}
									className="w-full px-3 py-2 text-left hover:bg-white/50 transition-colors"
								>
									<div className="flex items-start gap-3">
										<div
											className={`w-6 h-6 rounded flex items-center justify-center bg-white text-xs`}
										>
											{commandIcon}
										</div>
										<div className="flex-1">
											<div className="flex items-center justify-between">
												<div>
													<span className="text-sm font-medium text-gray-900">
														Command #{index}: {type}
													</span>
												</div>
												<svg
													className={`w-4 h-4 text-gray-500 transform transition-transform ${
														isExpanded ? 'rotate-90' : ''
													}`}
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth="2"
														d="M9 5l7 7-7 7"
													/>
												</svg>
											</div>
											{!isExpanded && commandDetails && (
												<div className="mt-1">{commandDetails}</div>
											)}
										</div>
									</div>
								</button>
								{isExpanded && (
									<div className="px-3 pb-3 bg-white/50 border-t">
										<div className="mt-2">{commandDetails}</div>
										{/* Show command-specific arguments */}
										{(() => {
											let args: any[] = [];
											if (cmd.$kind === 'MoveCall') {
												args = cmd.arguments;
											} else if (cmd.$kind === 'TransferObjects') {
												args = [...cmd.objects, cmd.address];
											} else if (cmd.$kind === 'SplitCoins') {
												args = [cmd.coin, ...cmd.amounts];
											} else if (cmd.$kind === 'MergeCoins') {
												args = [cmd.destination, ...cmd.sources];
											}
											return args.length > 0 ? (
												<div className="mt-3">
													<div className="text-xs font-medium text-gray-700 mb-1">Arguments:</div>
													<div className="space-y-1">
														{args.map((arg, argIndex) => (
															<div key={argIndex} className="text-xs bg-white rounded p-2">
																<span className="text-gray-600">Arg {argIndex}:</span>{' '}
																<span className="font-mono text-gray-800">
																	{formatArgument(arg)}
																</span>
															</div>
														))}
													</div>
												</div>
											) : null;
										})()}
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

function formatArgument(arg: any): string {
	if (!arg) return 'undefined';

	if (arg.$kind === 'Pure' || arg.$kind === 'Object') {
		if (arg.$kind === 'Object') {
			const objId = (arg.object as any)?.data?.objectId || (arg.object as any)?.objectId;
			return `Input #${arg.index} (Object: ${objId ? formatAddress(objId) : 'unknown'})`;
		}
		return `Input #${arg.index} (Pure Value)`;
	} else if (arg.$kind === 'GasCoin') {
		return 'Gas Coin';
	} else if (arg.$kind === 'Result') {
		return `Result of Command #${arg.index?.[0] ?? 'unknown'}`;
	} else if (arg.$kind === 'NestedResult') {
		return `Nested Result [${arg.index?.join(', ') ?? 'unknown'}]`;
	}

	return JSON.stringify(arg);
}
