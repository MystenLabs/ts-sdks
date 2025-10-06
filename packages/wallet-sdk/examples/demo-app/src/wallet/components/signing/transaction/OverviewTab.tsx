// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { AutoApprovalState } from '../../../hooks/useAutoApproval.js';
import { CopyableText } from '../../../../components/CopyableText.js';
import type { WalletTransactionAnalysis } from '../../../hooks/useAnalysis.js';

interface OverviewTabProps {
	analysis: WalletTransactionAnalysis;
	autoApprovalState?: AutoApprovalState;
}

export function OverviewTab({ analysis, autoApprovalState }: OverviewTabProps) {
	const { data, autoApproval } = analysis;

	// Get operation description from policy if available
	const operation = autoApprovalState?.manager
		?.getState()
		.policy?.operations.find((op: { id: string }) => op.id === autoApproval?.result?.operationType);

	// Calculate USD values with hardcoded prices since analyzer doesn't have pricing
	const coinFlowsWithUSD = autoApproval.result?.coinFlows.outflows.map((flow) => {
		let price = 0;
		const coinType = flow.coinType.toLowerCase();

		if (coinType.includes('::sui::sui')) {
			price = 3.5; // SUI price
		} else if (coinType.includes('::wal::wal')) {
			price = 0.5; // WAL price
		}

		// All coin flows are outflows, so we negate them for display
		const displayAmount = -Math.abs(Number(flow.amount));
		const decimals = coinType.includes('::sui::sui') ? 9 : coinType.includes('::wal::wal') ? 9 : 6;
		const humanAmount = Math.abs(displayAmount) / Math.pow(10, decimals);
		const usdValue = humanAmount * price;

		return {
			...flow,
			displayAmount,
			humanAmount,
			price,
			usdValue,
			decimals,
		};
	});

	const totalUSDValue = coinFlowsWithUSD?.reduce((acc, flow) => acc + flow.usdValue, 0) ?? 0;

	return (
		<div className="space-y-3">
			{/* Operation Type - Compact */}
			{operation && (
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
					<div className="flex items-start justify-between">
						<div>
							<div className="text-xs text-blue-700 font-medium uppercase tracking-wider">
								{operation.id}
							</div>
							<div className="text-sm text-blue-900 mt-1">{operation.description}</div>
						</div>
					</div>
				</div>
			)}

			{/* Main Coin Flows */}
			{coinFlowsWithUSD && coinFlowsWithUSD.length > 0 ? (
				<div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
					<div className="px-4 py-3 border-b border-gray-200 bg-gray-100">
						<h3 className="text-sm font-semibold text-gray-900">Coin Outflows</h3>
					</div>
					<div className="p-4 space-y-3">
						{coinFlowsWithUSD.map((flow, index) => (
							<div key={`${flow.coinType}-${index}`} className="flex justify-between items-center">
								<div className="flex items-center gap-3">
									{getCoinIcon(flow.coinType)}
									<div>
										<div className="text-sm font-medium text-gray-900">
											{formatCoinType(flow.coinType)}
										</div>
									</div>
								</div>
								<div className="text-right">
									<div className="text-base font-semibold text-red-600">
										-{flow.humanAmount.toFixed(flow.decimals === 9 ? 4 : 2)}{' '}
										{formatCoinType(flow.coinType)}
									</div>
									{flow.price > 0 && (
										<div className="text-xs text-red-500">≈ ${flow.usdValue.toFixed(2)} USD</div>
									)}
								</div>
							</div>
						))}

						{/* Total if multiple coins */}
						{coinFlowsWithUSD.length > 1 && totalUSDValue > 0 && (
							<div className="pt-3 border-t border-gray-200">
								<div className="flex justify-between items-center">
									<span className="text-sm font-bold text-gray-800">Total USD Value</span>
									<span className="text-base font-bold text-red-600">
										≈ ${totalUSDValue.toFixed(2)} USD
									</span>
								</div>
							</div>
						)}

						{/* Coins without pricing */}
						{coinFlowsWithUSD.some((flow) => flow.price === 0) && (
							<div className="text-xs text-gray-500 italic pt-2 border-t border-gray-200">
								Some coins without USD pricing available
							</div>
						)}
					</div>
				</div>
			) : (autoApproval.result?.coinFlows?.outflows?.length ?? 0) > 0 ? (
				<div className="space-y-2">
					<h3 className="text-sm font-semibold text-gray-900">Coin Transfers</h3>
					{autoApproval.result!.coinFlows.outflows.map((flow, index) => {
						// All flows are outflows, so display them as negative red
						return (
							<div
								key={`${flow.coinType}-${index}`}
								className="border rounded-lg p-3 bg-red-50 border-red-200"
							>
								<div className="flex justify-between items-center">
									<span className="text-sm font-medium">{formatCoinType(flow.coinType)}</span>
									<span className="text-sm font-medium text-red-700">
										-{Math.abs(Number(flow.amount)).toString()}
									</span>
								</div>
							</div>
						);
					})}
				</div>
			) : (
				<div className="text-center py-4 text-sm text-gray-500">
					No coin transfers in this transaction
				</div>
			)}

			{/* Gas Fee */}
			{BigInt(data.result?.gasData.budget ?? 0) > 0n && (
				<div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
					<div className="flex justify-between items-center text-xs">
						<span className="text-gray-600">Estimated Gas Fee</span>
						<span className="font-medium text-gray-900">
							{(Number(data.result?.gasData.budget ?? 0) / 1e9).toFixed(4)} SUI
						</span>
					</div>
				</div>
			)}

			{/* Transaction Digest */}
			<div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
				<div className="text-xs text-gray-600 mb-1">Transaction Digest</div>
				<CopyableText text={analysis.autoApproval.result?.digest ?? ''} className="text-gray-900" />
			</div>
		</div>
	);
}

function getCoinIcon(coinType: string) {
	const isSuiCoin = coinType.toLowerCase().includes('::sui::sui');
	const isWalCoin = coinType.toLowerCase().includes('::wal::wal');

	if (isSuiCoin) {
		// Use the official SUI icon
		return (
			<img
				src="https://strapi-dev.scand.app/uploads/sui_c07df05f00.png"
				alt="SUI"
				width="24"
				height="24"
				className="rounded-full"
			/>
		);
	}

	if (isWalCoin) {
		// Use a walrus emoji for WAL token since it's Walrus-related
		return <div className="w-6 h-6 flex items-center justify-center text-lg">🐋</div>;
	}

	// Default fallback for unknown coins
	return (
		<div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
			{formatCoinType(coinType).charAt(0)}
		</div>
	);
}

function formatCoinType(type: string): string {
	const match = type.match(/0x2::coin::Coin<(.+)>/);
	if (match) {
		const innerType = match[1];
		if (innerType.toLowerCase().includes('::sui::sui')) return 'SUI';
		if (innerType.toLowerCase().includes('::wal::wal')) return 'WAL';
		if (innerType.includes('::usdc::USDC')) return 'USDC';
		if (innerType.includes('::usdt::USDT')) return 'USDT';
		const parts = innerType.split('::');
		return parts[parts.length - 1];
	}
	const parts = type.split('::');
	return parts[parts.length - 1];
}
