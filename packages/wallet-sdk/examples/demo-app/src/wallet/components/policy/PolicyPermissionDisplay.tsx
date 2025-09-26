// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { PolicyPermission } from '@mysten/wallet-sdk';

interface PolicyPermissionProps {
	permission: PolicyPermission;
	context?: string;
}

export function PolicyPermission({ permission, context }: PolicyPermissionProps) {
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
	if (permission.$kind === 'CoinBalance') {
		if (!permission.coinType || typeof permission.coinType !== 'string') {
			throw new Error(`Invalid coin type in CoinBalanceRule`);
		}
		const coinName = getCoinName(permission.coinType);
		const riskLevel = `MEDIUM RISK - Can spend ${coinName} from your balance`;
		return (
			<div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
				<div className="text-sm text-gray-900">
					<strong>• Spend {coinName} coins from your balance</strong>
				</div>
				<div className="text-xs text-orange-700 mt-1 font-medium">{riskLevel}</div>
				<div className="text-xs text-gray-600 mt-1">Coin Type: {permission.coinType}</div>
				{permission.description && (
					<div className="text-xs text-gray-500 mt-1 italic">
						App description: "{permission.description}"
					</div>
				)}
			</div>
		);
	}

	// All Balances Rule
	if (permission.$kind === 'AnyBalance') {
		return (
			<div className="bg-red-50 border border-red-200 rounded-lg p-3">
				<div className="text-sm text-gray-900">
					<strong>• Spend any coin type from your balance</strong>
				</div>
				<div className="text-xs text-red-700 mt-1 font-medium">
					HIGH RISK - Can spend all coin types from your balance
				</div>
				{permission.description && (
					<div className="text-xs text-gray-500 mt-1 italic">
						App description: "{permission.description}"
					</div>
				)}
			</div>
		);
	}

	// Object Type Rule
	if (permission.$kind === 'ObjectType') {
		if (!permission.objectType || typeof permission.objectType !== 'string') {
			throw new Error(`Invalid object type in ObjectTypeRule`);
		}
		if (!['read', 'mutate', 'transfer'].includes(permission.accessLevel)) {
			throw new Error(`Invalid access level: ${permission.accessLevel}`);
		}

		const accessText =
			permission.accessLevel === 'read'
				? 'Read'
				: permission.accessLevel === 'mutate'
					? 'Modify'
					: 'Transfer';
		const riskLevel =
			permission.accessLevel === 'read'
				? 'MEDIUM RISK - Read-only access'
				: permission.accessLevel === 'mutate'
					? 'MEDIUM RISK - Can modify objects'
					: 'HIGH RISK - Can transfer objects';
		const contextText =
			context === 'sessionCreated' ? 'objects created in this session' : 'objects you own';

		const bgColor =
			permission.accessLevel === 'transfer'
				? 'bg-red-50 border-red-200'
				: 'bg-orange-50 border-orange-200';
		const textColor = permission.accessLevel === 'transfer' ? 'text-red-700' : 'text-orange-700';

		return (
			<div className={`${bgColor} border rounded-lg p-3`}>
				<div className="text-sm text-gray-900">
					<strong>
						• {accessText} {getObjectName(permission.objectType)} {contextText}
					</strong>
				</div>
				<div className={`text-xs ${textColor} mt-1 font-medium`}>{riskLevel}</div>
				<div className="text-xs text-gray-600 mt-1">Object Type: {permission.objectType}</div>
				{permission.description && (
					<div className="text-xs text-gray-500 mt-1 italic">
						App description: "{permission.description}"
					</div>
				)}
			</div>
		);
	}

	// Unknown rule type - throw error
	throw new Error(`Unknown rule type: ${(permission as { $kind: string }).$kind}`);
}
