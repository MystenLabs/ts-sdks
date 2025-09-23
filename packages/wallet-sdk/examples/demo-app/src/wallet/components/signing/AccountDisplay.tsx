// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ReadonlyWalletAccount } from '@mysten/wallet-standard';

interface AccountDisplayProps {
	account: ReadonlyWalletAccount;
}

export function AccountDisplay({ account }: AccountDisplayProps) {
	// Show account label/name if available, otherwise show truncated address
	const displayName = account.label || account.address;
	const isAddress = !account.label;

	// Truncate address to show first 6 and last 4 characters
	const truncatedAddress = isAddress
		? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
		: displayName;

	return (
		<div className="flex items-center space-x-3">
			<div className="flex-shrink-0">
				<div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
					<svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
						<path
							fillRule="evenodd"
							d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
							clipRule="evenodd"
						/>
					</svg>
				</div>
			</div>
			<div className="flex-1 min-w-0">
				<div className="text-sm font-medium text-gray-900 truncate">
					{isAddress ? 'Wallet Account' : displayName}
				</div>
				<div className="text-sm text-gray-500 font-mono">
					{isAddress
						? truncatedAddress
						: `${account.address.slice(0, 6)}...${account.address.slice(-4)}`}
				</div>
			</div>
		</div>
	);
}
