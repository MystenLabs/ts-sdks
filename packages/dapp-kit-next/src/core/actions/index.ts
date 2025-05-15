// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type {
	SuiSignAndExecuteTransactionInput,
	SuiSignPersonalMessageInput,
	SuiSignTransactionInput,
} from '@mysten/wallet-standard';
import type { DAppKitState } from '../state.js';
import { connectWalletCreator } from './connect-wallet.js';
import { disconnectWalletCreator } from './disconnect-wallet.js';
import { switchAccountCreator } from './switch-account.js';
import type { Transaction } from '@mysten/sui/transactions';

type SignTransactionArgs = {
	transaction: Transaction | string;
} & Omit<SuiSignTransactionInput, 'account' | 'chain' | 'transaction'>;

type SignPersonalMessageArgs = Omit<SuiSignPersonalMessageInput, 'account' | 'chain'>;

type signAndExecuteTransactionArgs = {
	transaction: Transaction | string;
} & Omit<SuiSignAndExecuteTransactionInput, 'account' | 'chain' | 'transaction'>;

export function createActions(state: DAppKitState) {
	return {
		switchAccount: switchAccountCreator(state),
		connectWallet: connectWalletCreator(state),
		disconnectWallet: disconnectWalletCreator(state),

		// temporary stubs
		async signTransaction(_args: SignTransactionArgs): Promise<{
			bytes: string;
			signature: string;
		}> {
			throw new Error('Not implemented');
		},
		async signPersonalMessage(_args: SignPersonalMessageArgs): Promise<{
			bytes: string;
			signature: string;
		}> {
			throw new Error('Not implemented');
		},
		async signAndExecuteTransaction(_args: signAndExecuteTransactionArgs): Promise<{
			bytes: string;
			signature: string;
			digest: string;
			effects: string;
		}> {
			throw new Error('Not implemented');
		},
	};
}
