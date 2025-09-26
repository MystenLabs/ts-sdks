// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { AutoApprovalAnalysis } from '@mysten/wallet-sdk';
import { formatAddress } from '@mysten/sui/utils';

interface InputsTabProps {
	analysis: AutoApprovalAnalysis;
}

export function InputsTab({ analysis }: InputsTabProps) {
	const { results } = analysis;
	const { inputs, coins, commands } = results;

	// Map command indexes to which inputs they use
	const inputUsage = new Map<number, number[]>();
	commands.forEach((cmd, cmdIndex) => {
		// Get arguments based on command type
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

		args.forEach((arg: any) => {
			if (
				arg &&
				typeof arg.$kind === 'string' &&
				(arg.$kind === 'Pure' || arg.$kind === 'Object')
			) {
				const current = inputUsage.get(arg.index) || [];
				current.push(cmdIndex);
				inputUsage.set(arg.index, current);
			}
		});
	});

	return (
		<div className="space-y-4">
			<h3 className="text-sm font-semibold text-gray-900">Transaction Inputs</h3>
			{inputs.length === 0 ? (
				<div className="text-center py-4 text-sm text-gray-500">No inputs for this transaction</div>
			) : (
				<div className="space-y-2">
					{inputs.map((input, index) => {
						const usage = inputUsage.get(index) || [];

						if (input.$kind === 'Pure') {
							return (
								<div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
									<div className="flex justify-between items-start">
										<div className="flex-1">
											<div className="text-xs font-medium text-gray-500 uppercase">
												Input #{index} - Pure Value
											</div>
											<div className="text-xs text-gray-600 mt-1 font-mono">
												Bytes: {input.bytes || 'Unknown'}
											</div>
											{usage.length > 0 && (
												<div className="text-xs text-gray-500 mt-1">
													Used in command{usage.length > 1 ? 's' : ''}: {usage.join(', ')}
												</div>
											)}
										</div>
									</div>
								</div>
							);
						} else if (input.$kind === 'Object') {
							const objId =
								(input.object as any).data?.objectId || (input.object as any).objectId || 'unknown';
							const obj = input.object;
							const access = input.accessLevel;
							const coin = coins[objId];

							const accessColor =
								access === 'transfer'
									? 'text-red-600 bg-red-50'
									: access === 'mutate'
										? 'text-yellow-600 bg-yellow-50'
										: 'text-blue-600 bg-blue-50';

							return (
								<div
									key={index}
									className={`border rounded-lg p-3 ${
										access === 'transfer'
											? 'bg-red-50 border-red-200'
											: access === 'mutate'
												? 'bg-yellow-50 border-yellow-200'
												: 'bg-blue-50 border-blue-200'
									}`}
								>
									<div className="flex justify-between items-start">
										<div className="flex-1">
											<div className="flex items-center gap-2">
												<span className="text-xs font-medium text-gray-500 uppercase">
													Input #{index}
												</span>
												<span className={`text-xs px-2 py-0.5 rounded font-medium ${accessColor}`}>
													{access || 'read'}
												</span>
											</div>

											<div className="text-sm font-medium text-gray-900 mt-1">
												{objId && objId !== 'unknown' ? formatAddress(objId) : 'Unknown Object ID'}
											</div>

											{coin ? (
												<>
													<div className="text-xs text-gray-600 mt-1">
														<span className="font-medium">Coin:</span> {formatCoinType(coin.type)}
													</div>
													<div className="text-xs text-gray-600">
														<span className="font-medium">Balance:</span>{' '}
														{formatBalance(coin.balance.toString(), coin.type)}
													</div>
												</>
											) : obj ? (
												<>
													<div className="text-xs text-gray-600 mt-1">
														<span className="font-medium">Type:</span> {formatObjectType(obj.type)}
													</div>
													{obj.version && (
														<div className="text-xs text-gray-600">
															<span className="font-medium">Version:</span> {obj.version}
														</div>
													)}
												</>
											) : (
												<div className="text-xs text-gray-500 italic mt-1">
													Object details not available
												</div>
											)}

											{usage.length > 0 && (
												<div className="text-xs text-gray-500 mt-2">
													Used in command{usage.length > 1 ? 's' : ''}: {usage.join(', ')}
												</div>
											)}
										</div>
									</div>
								</div>
							);
						}
						return null;
					})}
				</div>
			)}
		</div>
	);
}

function formatCoinType(type: string): string {
	const match = type.match(/0x2::coin::Coin<(.+)>/);
	if (match) {
		const innerType = match[1];
		if (innerType.includes('::sui::SUI')) return 'SUI';
		if (innerType.includes('::usdc::USDC')) return 'USDC';
		if (innerType.includes('::usdt::USDT')) return 'USDT';
		const parts = innerType.split('::');
		return parts[parts.length - 1];
	}
	return type;
}

function formatObjectType(type: string): string {
	const parts = type.split('::');
	return parts.slice(-2).join('::');
}

function formatBalance(balance: string, type: string): string {
	const isSui = type.includes('::sui::SUI');
	const decimals = isSui ? 9 : 6; // Default to 6 for other coins
	const amount = BigInt(balance);
	const divisor = BigInt(10 ** decimals);
	const whole = amount / divisor;
	const fractional = amount % divisor;

	if (fractional === 0n) {
		return whole.toString();
	}

	const fractionalStr = fractional.toString().padStart(decimals, '0').replace(/0+$/, '');
	return `${whole}.${fractionalStr}`;
}
