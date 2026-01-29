// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { WalletWithRequiredFeatures } from '@mysten/wallet-standard';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { useCurrentAccount } from '../hooks/wallet/useCurrentAccount.js';
import { AccountDropdownMenu } from './AccountDropdownMenu.js';
import { ConnectModal } from './connect-modal/ConnectModal.js';
import { StyleMarker } from './styling/StyleMarker.js';
import { Button } from './ui/Button.js';
import { IconButton } from './ui/IconButton.js';

type ConnectButtonProps = {
	connectText?: ReactNode;
	/** Filter the wallets shown in the connect modal */
	walletFilter?: (wallet: WalletWithRequiredFeatures) => boolean;
	/** Optional icon to show before the text */
	iconBefore?: ReactNode;
	/** Optional icon to show after the text */
	iconAfter?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function ConnectButton({
	connectText = 'Connect Wallet',
	walletFilter,
	iconBefore,
	iconAfter,
	...buttonProps
}: ConnectButtonProps) {
	const currentAccount = useCurrentAccount();

	return currentAccount ? (
		<AccountDropdownMenu currentAccount={currentAccount} />
	) : (
		<ConnectModal
			walletFilter={walletFilter}
			trigger={
				<StyleMarker>
					<Button {...buttonProps}>
						{/* Icon before */}
						{iconBefore && (
							<IconButton asChild aria-label="Icon before">
								{iconBefore}
							</IconButton>
						)}

						{connectText}

						{/* Icon after */}
						{iconAfter && (
							<IconButton asChild aria-label="Icon after">
								{iconAfter}
							</IconButton>
						)}
					</Button>
				</StyleMarker>
			}
		/>
	);
}

