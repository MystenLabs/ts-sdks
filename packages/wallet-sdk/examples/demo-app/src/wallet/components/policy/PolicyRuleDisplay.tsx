// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

interface PolicyRuleProps {
	rule: any;
	context?: string;
}

export function PolicyRule({ rule, context }: PolicyRuleProps) {
	const getCoinName = (coinType: string) => {
		const parts = coinType.split('::');
		return parts.length >= 3 ? parts[2].toUpperCase() : 'Unknown Coin';
	};

	const getObjectName = (objectType: string) => {
		const parts = objectType.split('::');
		if (parts.length >= 3) {
			return parts[2].replace(/([A-Z])/g, ' $1').trim();
		}
		return 'Unknown Object';
	};

	// Coin Balance Rule
	if (rule.$kind === 'CoinBalanceRule') {
		if (!rule.coinType || typeof rule.coinType !== 'string') {
			throw new Error(`Invalid coin type in CoinBalanceRule`);
		}
		const coinName = getCoinName(rule.coinType);
		const riskLevel = `MEDIUM RISK - Can spend ${coinName} from your balance`;
		return (
			<div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
				<div className="text-sm text-gray-900">
					<strong>• Spend {coinName} coins from your balance</strong>
				</div>
				<div className="text-xs text-orange-700 mt-1 font-medium">{riskLevel}</div>
				<div className="text-xs text-gray-600 mt-1">Coin Type: {rule.coinType}</div>
				{rule.description && (
					<div className="text-xs text-gray-500 mt-1 italic">App description: "{rule.description}"</div>
				)}
			</div>
		);
	}

	// All Balances Rule
	if (rule.$kind === 'AllBalancesRule') {
		return (
			<div className="bg-red-50 border border-red-200 rounded-lg p-3">
				<div className="text-sm text-gray-900">
					<strong>• Spend any coin type from your balance</strong>
				</div>
				<div className="text-xs text-red-700 mt-1 font-medium">
					HIGH RISK - Can spend all coin types from your balance
				</div>
				{rule.description && (
					<div className="text-xs text-gray-500 mt-1 italic">App description: "{rule.description}"</div>
				)}
			</div>
		);
	}

	// Object Type Rule
	if (rule.$kind === 'ObjectTypeRule') {
		if (!rule.objectType || typeof rule.objectType !== 'string') {
			throw new Error(`Invalid object type in ObjectTypeRule`);
		}
		if (!['read', 'mutate', 'transfer'].includes(rule.accessLevel)) {
			throw new Error(`Invalid access level: ${rule.accessLevel}`);
		}

		const accessText =
			rule.accessLevel === 'read' ? 'Read' : rule.accessLevel === 'mutate' ? 'Modify' : 'Transfer';
		const riskLevel =
			rule.accessLevel === 'read'
				? 'MEDIUM RISK - Read-only access'
				: rule.accessLevel === 'mutate'
					? 'MEDIUM RISK - Can modify objects'
					: 'HIGH RISK - Can transfer objects';
		const contextText =
			context === 'sessionCreated' ? 'objects created in this session' : 'objects you own';

		const bgColor = rule.accessLevel === 'transfer' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200';
		const textColor = rule.accessLevel === 'transfer' ? 'text-red-700' : 'text-orange-700';
		
		return (
			<div className={`${bgColor} border rounded-lg p-3`}>
				<div className="text-sm text-gray-900">
					<strong>
						• {accessText} {getObjectName(rule.objectType)} {contextText}
					</strong>
				</div>
				<div className={`text-xs ${textColor} mt-1 font-medium`}>{riskLevel}</div>
				<div className="text-xs text-gray-600 mt-1">Object Type: {rule.objectType}</div>
				{rule.description && (
					<div className="text-xs text-gray-500 mt-1 italic">App description: "{rule.description}"</div>
				)}
			</div>
		);
	}

	// Unknown rule type - throw error
	throw new Error(`Unknown rule type: ${rule.$kind}`);
}
