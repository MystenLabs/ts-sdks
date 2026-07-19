// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { WalletWithRequiredFeatures } from '@mysten/wallet-standard';
import { SLUSH_WALLET_NAME, SLUSH_WALLET_ICON } from '@mysten/slush-wallet';

import { getWalletUniqueIdentifier } from '../../../utils/walletUtils.js';
import * as styles from './WalletList.css.js';
import { WalletListItem } from './WalletListItem.js';

type WalletListProps = {
	selectedWalletName?: string;
	onPlaceholderClick: () => void;
	onSelect: (wallet: WalletWithRequiredFeatures) => void;
	wallets: WalletWithRequiredFeatures[];
};

export function WalletList({
	selectedWalletName,
	onPlaceholderClick,
	onSelect,
	wallets,
}: WalletListProps) {
	return (
		<ul className={styles.container}>
			{wallets.length > 0 ? (
				wallets.map((wallet) => (
					<WalletListItem
						key={getWalletUniqueIdentifier(wallet)}
						name={wallet.name}
						icon={wallet.icon}
						isSelected={getWalletUniqueIdentifier(wallet) === selectedWalletName}
						onClick={() => onSelect(wallet)}
					/>
				))
			) : (
				<WalletListItem
					name={SLUSH_WALLET_NAME}
					icon={SLUSH_WALLET_ICON}
					onClick={onPlaceholderClick}
					isSelected
				/>
			)}
		</ul>
	);
}
