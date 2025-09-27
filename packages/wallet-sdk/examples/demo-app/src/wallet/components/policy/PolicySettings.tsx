// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect } from 'react';
import type { AutoApprovalPolicy } from '@mysten/wallet-sdk';
import { Input } from '../../../app/components/ui/Input.js';

interface CoinBudgetConfig {
	coinType: string;
	useSharedBudget: boolean;
	customBudget: string;
}

interface PolicySettingsProps {
	policy: AutoApprovalPolicy;
	selectedOperations: string[];
	remainingTransactions: number | null;
	sharedBudget: number | null;
	coinBudgets: Record<string, string>;
	expirationHours: number;
	onRemainingTransactionsChange: (value: number | null) => void;
	onSharedBudgetChange: (value: number | null) => void;
	onCoinBudgetsChange: (budgets: Record<string, string>) => void;
	onExpirationHoursChange: (hours: number) => void;
}

export function PolicySettings({
	policy,
	selectedOperations,
	remainingTransactions,
	sharedBudget,
	coinBudgets,
	expirationHours,
	onRemainingTransactionsChange,
	onSharedBudgetChange,
	onCoinBudgetsChange,
	onExpirationHoursChange,
}: PolicySettingsProps) {
	// Extract coin types from selected operations
	const [coinBudgetConfigs, setCoinBudgetConfigs] = useState<CoinBudgetConfig[]>([]);

	useEffect(() => {
		const coinTypesSet = new Set<string>();

		// Get coin types from selected operations
		selectedOperations.forEach((opId) => {
			const operation = policy.operations.find((op) => op.id === opId);
			if (operation?.permissions?.balances) {
				operation.permissions.balances.forEach((balance) => {
					if (balance.coinType) {
						coinTypesSet.add(balance.coinType);
					}
				});
			}
		});

		// Create budget configs for each coin type
		const configs = Array.from(coinTypesSet).map((coinType) => {
			// Check if policy has suggested settings for this coin
			const suggestedBudget = policy.suggestedSettings?.coinBudgets?.[coinType];
			const existingBudget = coinBudgets[coinType];

			return {
				coinType,
				useSharedBudget: !existingBudget && !suggestedBudget,
				customBudget: existingBudget || suggestedBudget || '0',
			};
		});

		setCoinBudgetConfigs(configs);
	}, [selectedOperations, policy, coinBudgets]);

	const handleCoinBudgetToggle = (coinType: string) => {
		setCoinBudgetConfigs((prev) =>
			prev.map((config) =>
				config.coinType === coinType
					? { ...config, useSharedBudget: !config.useSharedBudget }
					: config,
			),
		);

		// Update coin budgets
		const newBudgets = { ...coinBudgets };
		const config = coinBudgetConfigs.find((c) => c.coinType === coinType);
		if (config?.useSharedBudget) {
			// Switching to custom budget - add default or suggested value
			const suggestedBudget = policy.suggestedSettings?.coinBudgets?.[coinType];
			newBudgets[coinType] = suggestedBudget || '1000000000'; // Default 1 SUI in MIST
		} else {
			// Switching to shared budget - remove custom budget
			delete newBudgets[coinType];
		}
		onCoinBudgetsChange(newBudgets);
	};

	const handleCoinBudgetChange = (coinType: string, value: string) => {
		setCoinBudgetConfigs((prev) =>
			prev.map((config) =>
				config.coinType === coinType ? { ...config, customBudget: value } : config,
			),
		);

		onCoinBudgetsChange({
			...coinBudgets,
			[coinType]: value,
		});
	};

	const getCoinInfo = (type: string) => {
		// Try to extract the coin name from the type string
		let coinName = 'UNKNOWN';

		if (type.includes('::coin::Coin<')) {
			// Extract the coin name from Coin<...> format
			const match = type.match(/Coin<[^:]+::([^:]+)::/);
			if (match) {
				coinName = match[1];
			}
		} else if (type.includes('::')) {
			// Format: 0xaddress::module::CoinName
			const parts = type.split('::');
			if (parts.length >= 3) {
				// Get the last part (coin name)
				coinName = parts[parts.length - 1].replace(/[<>]/g, '');
			}
		}

		return { name: coinName.toUpperCase() };
	};

	const getCoinIcon = (coinInfo: { name: string }) => {
		const isSuiCoin = coinInfo.name === 'SUI';

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

		// Default fallback for unknown coins
		return (
			<div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
				{coinInfo.name.charAt(0)}
			</div>
		);
	};

	// Check if any coins use shared budget
	const hasCoinsUsingSharedBudget = coinBudgetConfigs.some((config) => config.useSharedBudget);

	return (
		<div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
			<div className="flex items-center space-x-3 mb-4">
				<div className="flex-shrink-0">
					<div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
						<svg
							className="w-4 h-4 text-blue-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
							/>
						</svg>
					</div>
				</div>
				<div>
					<h3 className="text-lg font-semibold text-gray-900">Policy Settings</h3>
					<p className="text-sm text-gray-600">
						Set limits to control how much this policy can spend and how long it remains active
					</p>
				</div>
			</div>

			<div className="space-y-4">
				{/* Basic Settings */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<Input
						label="Max Transactions"
						type="number"
						min="1"
						max="1000"
						value={remainingTransactions || ''}
						onChange={(e) => {
							const value = e.target.value ? Number.parseInt(e.target.value) : null;
							onRemainingTransactionsChange(value);
						}}
						placeholder="10"
						variant="compact"
					/>

					<Input
						label="Expiration (hours)"
						type="number"
						min="1"
						max="720"
						value={expirationHours}
						onChange={(e) => onExpirationHoursChange(Number.parseInt(e.target.value))}
						placeholder="24"
						variant="compact"
					/>
				</div>

				{/* Shared Budget - Only show if any coins use it */}
				{hasCoinsUsingSharedBudget && (
					<div className="border-t pt-4">
						<div className="mb-2">
							<h4 className="text-sm font-medium text-gray-900">Shared Budget (USD)</h4>
							<p className="text-xs text-gray-500">Applies to all coins without custom budgets</p>
						</div>
						<Input
							label=""
							type="number"
							min="0"
							step="0.01"
							value={sharedBudget || ''}
							onChange={(e) => {
								const value = e.target.value ? Number.parseFloat(e.target.value) : null;
								onSharedBudgetChange(value);
							}}
							placeholder="10.00"
							prefix="$"
							variant="compact"
						/>
					</div>
				)}

				{/* Coin Budgets */}
				{coinBudgetConfigs.length > 0 && (
					<div className="border-t pt-4">
						<div className="mb-3">
							<h4 className="text-sm font-medium text-gray-900">
								Coin Budgets
								{coinBudgetConfigs.some(
									(config) => config.useSharedBudget && (!sharedBudget || sharedBudget <= 0),
								) && <span className="ml-2 text-xs text-red-600">(Missing shared budget)</span>}
							</h4>
							<p className="text-xs text-gray-500">
								Set specific limits for each coin type or use the shared budget
							</p>
						</div>
						<div className="space-y-3">
							{coinBudgetConfigs.map((config) => {
								const coinInfo = getCoinInfo(config.coinType);
								const suggestedBudget = policy.suggestedSettings?.coinBudgets?.[config.coinType];

								const needsBudget = config.useSharedBudget && (!sharedBudget || sharedBudget <= 0);

								return (
									<div
										key={config.coinType}
										className={`border rounded-lg p-3 ${needsBudget ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}
									>
										<div className="flex items-start gap-3">
											<div className="flex-1">
												<div className="mb-2">
													<div className="flex items-center gap-2 mb-1">
														{getCoinIcon(coinInfo)}
														<label className="text-sm font-medium text-gray-700">
															{coinInfo.name}
														</label>
														{needsBudget && (
															<span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded">
																Needs budget
															</span>
														)}
														{suggestedBudget && !needsBudget && (
															<span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
																Recommended: {(Number(suggestedBudget) / 1_000_000_000).toFixed(2)}{' '}
																{coinInfo.name}
															</span>
														)}
													</div>
													<div className="text-xs text-gray-500 font-mono break-all">
														{config.coinType}
													</div>
												</div>
												<div className="flex items-center gap-4">
													<label className="flex items-center gap-2 text-sm cursor-pointer">
														<input
															type="radio"
															checked={config.useSharedBudget}
															onChange={() => handleCoinBudgetToggle(config.coinType)}
															className="text-blue-600"
														/>
														Use shared budget
													</label>
													<label className="flex items-center gap-2 text-sm cursor-pointer">
														<input
															type="radio"
															checked={!config.useSharedBudget}
															onChange={() => handleCoinBudgetToggle(config.coinType)}
															className="text-blue-600"
														/>
														Custom budget
													</label>
												</div>
											</div>
											{!config.useSharedBudget && (
												<div className="w-40">
													<Input
														label=""
														type="number"
														min="0"
														step="0.1"
														value={(Number(config.customBudget) / 1_000_000_000).toString()}
														onChange={(e) => {
															const valueInMist = BigInt(
																Math.floor(parseFloat(e.target.value) * 1_000_000_000),
															).toString();
															handleCoinBudgetChange(config.coinType, valueInMist);
														}}
														placeholder="1"
														suffix={coinInfo.name}
														variant="compact"
													/>
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
