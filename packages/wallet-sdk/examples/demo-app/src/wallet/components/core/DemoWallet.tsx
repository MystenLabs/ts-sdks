// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { WalletProvider } from '../../providers/WalletProvider.js';
import { DemoWalletUI } from './DemoWalletUI.js';

export function DemoWallet() {
	return (
		<WalletProvider>
			<DemoWalletUI />
		</WalletProvider>
	);
}
