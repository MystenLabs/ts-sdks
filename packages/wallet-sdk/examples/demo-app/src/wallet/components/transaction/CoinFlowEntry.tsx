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
		<div
			style={{
				display: 'flex',
				alignItems: 'flex-start',
				justifyContent: 'space-between',
				padding: '8px 0',
				gap: '12px',
			}}
		>
			<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
				{/* Simple coin icon placeholder */}
				<div
					style={{
						width: '24px',
						height: '24px',
						borderRadius: '50%',
						backgroundColor: isRecognized ? '#1976d2' : '#666',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						color: 'white',
						fontSize: '10px',
						fontWeight: 'bold',
					}}
				>
					{symbol.slice(0, 2)}
				</div>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div style={{ fontWeight: '500', fontSize: '14px' }}>
						{isRecognized ? symbol : `${symbol} (Unrecognized)`}
					</div>
					{!isRecognized && (
						<div
							style={{
								fontSize: '11px',
								color: '#666',
								fontFamily: 'monospace',
								wordBreak: 'break-all',
								lineHeight: '1.3',
							}}
							title={coinType}
						>
							{formatCoinType(coinType)}
						</div>
					)}
				</div>
				{!isRecognized && (
					<div
						style={{
							fontSize: '10px',
							color: '#f57c00',
							backgroundColor: '#fff3e0',
							padding: '2px 6px',
							borderRadius: '4px',
							fontWeight: '500',
						}}
					>
						⚠️ UNKNOWN
					</div>
				)}
			</div>
			<div
				style={{
					fontSize: '14px',
					fontWeight: '500',
					color: isPositive ? '#4caf50' : '#f44336',
					flexShrink: 0,
					textAlign: 'right',
				}}
			>
				{isPositive ? '+' : ''}
				{formattedAmount} {symbol}
			</div>
		</div>
	);
}
