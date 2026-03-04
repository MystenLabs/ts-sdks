// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { ReadonlyWalletAccount, SUI_CHAINS } from '@mysten/wallet-standard';
import { vi } from 'vitest';

import type { ManagedAccount, SignerAdapter } from '../src/types.js';
import type { DevWalletConfig } from '../src/wallet/dev-wallet.js';

export function createMockAccount(keypair?: Ed25519Keypair): ManagedAccount {
	const kp = keypair ?? new Ed25519Keypair();
	const address = kp.getPublicKey().toSuiAddress();

	return {
		address,
		label: 'Test Account',
		signer: kp,
		walletAccount: new ReadonlyWalletAccount({
			address,
			publicKey: kp.getPublicKey().toSuiBytes(),
			chains: [...SUI_CHAINS],
			features: ['sui:signTransaction', 'sui:signAndExecuteTransaction', 'sui:signPersonalMessage'],
		}),
	};
}

export function createMockAdapter(accounts: ManagedAccount[] = []): SignerAdapter & {
	_triggerAccountsChanged(accounts: ManagedAccount[]): void;
} {
	const listeners = new Set<(accounts: ManagedAccount[]) => void>();

	return {
		id: 'mock',
		name: 'Mock Adapter',
		initialize: vi.fn().mockResolvedValue(undefined),
		getAccounts: vi.fn(() => [...accounts]),
		getAccount: vi.fn((address: string) => accounts.find((a) => a.address === address)),
		createAccount: vi.fn().mockResolvedValue({
			address: '0x' + '1'.repeat(64),
			label: 'New Account',
			signer: {} as any,
			walletAccount: {} as any,
		}),
		removeAccount: vi.fn(),
		onAccountsChanged: vi.fn((callback: (accounts: ManagedAccount[]) => void) => {
			listeners.add(callback);
			return () => {
				listeners.delete(callback);
			};
		}),
		destroy: vi.fn(),
		_triggerAccountsChanged(newAccounts: ManagedAccount[]) {
			accounts.length = 0;
			accounts.push(...newAccounts);
			for (const listener of listeners) {
				listener([...newAccounts]);
			}
		},
	};
}

export function createDefaultConfig(overrides?: Partial<DevWalletConfig>): DevWalletConfig {
	return {
		adapters: [createMockAdapter()],
		networks: {
			testnet: 'https://fullnode.testnet.sui.io:443',
		},
		...overrides,
	};
}
