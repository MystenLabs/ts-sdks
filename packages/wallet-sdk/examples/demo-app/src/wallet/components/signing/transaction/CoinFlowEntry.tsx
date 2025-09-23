// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export interface CoinFlowEntryProps {
	coinType: string;
	amount: string;
	decimals: number;
	symbol: string;
	isRecognized: boolean;
}

export function CoinFlowEntry({
	coinType,
	amount,
	decimals,
	symbol,
	isRecognized,
}: CoinFlowEntryProps) {
	// Safely determine if amount is positive
	let isPositive = false;
	try {
		if (amount && amount !== 'NaN' && amount !== 'undefined' && amount !== 'null') {
			isPositive = BigInt(amount) > 0n;
		}
	} catch (error) {
		// If BigInt conversion fails, default to false
		isPositive = false;
	}

	// Format the amount for display using actual decimals
	const formatAmount = (amount: string, decimals: number) => {
		// Validate input
		if (!amount || amount === 'NaN' || amount === 'undefined' || amount === 'null') {
			return '0';
		}

		// Validate decimals parameter
		if (typeof decimals !== 'number' || isNaN(decimals) || decimals < 0) {
			throw new Error(`Invalid decimals value: ${decimals}`);
		}

		let bigIntAmount: bigint;
		try {
			bigIntAmount = BigInt(amount);
		} catch (error) {
			return '0';
		}

		const divisor = BigInt(10 ** decimals);

		if (bigIntAmount === 0n) {
			return '0';
		}

		// Handle negative amounts by working with absolute value and adding sign back
		const isNegative = bigIntAmount < 0n;
		const absAmount = isNegative ? -bigIntAmount : bigIntAmount;

		const wholePart = absAmount / divisor;
		const fractionalPart = absAmount % divisor;

		let result: string;
		if (fractionalPart === 0n) {
			result = wholePart.toString();
		} else {
			const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
			const trimmedFractional = fractionalStr.replace(/0+$/, '');

			if (trimmedFractional === '') {
				result = wholePart.toString();
			} else {
				result = `${wholePart}.${trimmedFractional}`;
			}
		}

		return isNegative ? `-${result}` : result;
	};

	const formattedAmount = formatAmount(amount, decimals);

	// Format coin type for display - truncate long addresses
	const formatCoinType = (coinType: string) => {
		if (coinType === '0x2::sui::SUI') {
			return coinType;
		}

		// For long addresses, show first part + ... + last part
		if (coinType.length > 50) {
			const parts = coinType.split('::');
			if (parts.length >= 3) {
				const [address, module, name] = parts;
				if (address.length > 20) {
					const shortAddress = `${address.slice(0, 8)}...${address.slice(-6)}`;
					return `${shortAddress}::${module}::${name}`;
				}
			}
		}

		return coinType;
	};

	return (
		<div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
			<div className="flex items-center space-x-3">
				{/* Improved coin icon */}
				<div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
					<span className="text-white text-xs font-bold">{symbol.slice(0, 2).toUpperCase()}</span>
				</div>

				<div className="flex-1">
					<div className="flex items-center space-x-2">
						<span className="font-medium text-sm text-gray-900">
							{isRecognized ? symbol : symbol}
						</span>
						{!isRecognized && (
							<span className="text-xs text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full font-medium">
								UNRECOGNIZED
							</span>
						)}
					</div>
					{!isRecognized && (
						<div className="text-xs text-gray-500 mt-0.5 font-mono" title={coinType}>
							{formatCoinType(coinType)}
						</div>
					)}
				</div>
			</div>

			<div className="text-right">
				<div className={`text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
					{isPositive ? '+' : ''}
					{formattedAmount} {symbol}
				</div>
			</div>
		</div>
	);
}
