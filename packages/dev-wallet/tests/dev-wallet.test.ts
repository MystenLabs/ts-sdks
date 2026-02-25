// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { toBase64 } from '@mysten/sui/utils';
import { ReadonlyWalletAccount, SUI_CHAINS } from '@mysten/wallet-standard';

import { DevWallet } from '../src/wallet/dev-wallet.js';
import type { DevWalletConfig } from '../src/wallet/dev-wallet.js';
import type { ManagedAccount, SignerAdapter } from '../src/types.js';

function createMockAccount(keypair?: Ed25519Keypair): ManagedAccount {
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

function createMockAdapter(accounts: ManagedAccount[] = []): SignerAdapter & {
	_triggerAccountsChanged(accounts: ManagedAccount[]): void;
} {
	const listeners = new Set<(accounts: ManagedAccount[]) => void>();

	return {
		id: 'mock',
		name: 'Mock Adapter',
		initialize: vi.fn().mockResolvedValue(undefined),
		getAccounts: vi.fn(() => [...accounts]),
		getAccount: vi.fn((address: string) => accounts.find((a) => a.address === address)),
		createAccount: vi.fn(),
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

function createDefaultConfig(overrides?: Partial<DevWalletConfig>): DevWalletConfig {
	return {
		adapters: [createMockAdapter()],
		clients: {
			testnet: {},
		},
		...overrides,
	};
}

describe('DevWallet', () => {
	describe('properties', () => {
		it('has version 1.0.0', () => {
			const wallet = new DevWallet(createDefaultConfig());
			expect(wallet.version).toBe('1.0.0');
		});

		it('has default name "Dev Wallet"', () => {
			const wallet = new DevWallet(createDefaultConfig());
			expect(wallet.name).toBe('Dev Wallet');
		});

		it('uses custom name when provided', () => {
			const wallet = new DevWallet(createDefaultConfig({ name: 'My Custom Wallet' }));
			expect(wallet.name).toBe('My Custom Wallet');
		});

		it('has a default icon', () => {
			const wallet = new DevWallet(createDefaultConfig());
			expect(wallet.icon).toMatch(/^data:image\//);
		});

		it('uses custom icon when provided', () => {
			const customIcon =
				'data:image/png;base64,aW1hZ2U=' as `data:image/${'svg+xml' | 'webp' | 'png' | 'gif'};base64,${string}`;
			const wallet = new DevWallet(createDefaultConfig({ icon: customIcon }));
			expect(wallet.icon).toBe(customIcon);
		});

		it('returns SUI_CHAINS for chains', () => {
			const wallet = new DevWallet(createDefaultConfig());
			expect(wallet.chains).toBe(SUI_CHAINS);
		});
	});

	describe('accounts', () => {
		it('returns empty accounts when adapter has none', () => {
			const wallet = new DevWallet(createDefaultConfig());
			expect(wallet.accounts).toEqual([]);
		});

		it('reflects adapter accounts', () => {
			const account = createMockAccount();
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			expect(wallet.accounts).toHaveLength(1);
			expect(wallet.accounts[0].address).toBe(account.address);
		});

		it('reflects multiple adapter accounts', () => {
			const account1 = createMockAccount();
			const account2 = createMockAccount();
			const adapter = createMockAdapter([account1, account2]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			expect(wallet.accounts).toHaveLength(2);
		});
	});

	describe('features', () => {
		it('implements standard:connect', () => {
			const wallet = new DevWallet(createDefaultConfig());
			expect(wallet.features['standard:connect']).toBeDefined();
			expect(wallet.features['standard:connect'].version).toBe('1.0.0');
		});

		it('implements standard:events', () => {
			const wallet = new DevWallet(createDefaultConfig());
			expect(wallet.features['standard:events']).toBeDefined();
			expect(wallet.features['standard:events'].version).toBe('1.0.0');
		});

		it('implements standard:disconnect', () => {
			const wallet = new DevWallet(createDefaultConfig());
			expect(wallet.features['standard:disconnect']).toBeDefined();
			expect(wallet.features['standard:disconnect'].version).toBe('1.0.0');
		});

		it('implements sui:signPersonalMessage', () => {
			const wallet = new DevWallet(createDefaultConfig());
			expect(wallet.features['sui:signPersonalMessage']).toBeDefined();
			expect(wallet.features['sui:signPersonalMessage'].version).toBe('1.1.0');
		});

		it('implements sui:signTransaction', () => {
			const wallet = new DevWallet(createDefaultConfig());
			expect(wallet.features['sui:signTransaction']).toBeDefined();
			expect(wallet.features['sui:signTransaction'].version).toBe('2.0.0');
		});

		it('implements sui:signAndExecuteTransaction', () => {
			const wallet = new DevWallet(createDefaultConfig());
			expect(wallet.features['sui:signAndExecuteTransaction']).toBeDefined();
			expect(wallet.features['sui:signAndExecuteTransaction'].version).toBe('2.0.0');
		});
	});

	describe('connect()', () => {
		it('returns adapter accounts', async () => {
			const account = createMockAccount();
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			const result = await wallet.features['standard:connect'].connect();

			expect(result.accounts).toHaveLength(1);
			expect(result.accounts[0].address).toBe(account.address);
		});

		it('returns empty accounts when adapter has none', async () => {
			const wallet = new DevWallet(createDefaultConfig());

			const result = await wallet.features['standard:connect'].connect();

			expect(result.accounts).toHaveLength(0);
		});
	});

	describe('disconnect()', () => {
		it('completes without error', async () => {
			const wallet = new DevWallet(createDefaultConfig());
			await expect(wallet.features['standard:disconnect'].disconnect()).resolves.toBeUndefined();
		});
	});

	describe('events', () => {
		it('emits change event when adapter accounts change', () => {
			const account1 = createMockAccount();
			const adapter = createMockAdapter([account1]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			const listener = vi.fn();
			wallet.features['standard:events'].on('change', listener);

			const account2 = createMockAccount();
			adapter._triggerAccountsChanged([account1, account2]);

			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					accounts: expect.arrayContaining([
						expect.objectContaining({ address: account1.address }),
						expect.objectContaining({ address: account2.address }),
					]),
				}),
			);
		});

		it('returns an unsubscribe function that stops events', () => {
			const account1 = createMockAccount();
			const adapter = createMockAdapter([account1]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			const listener = vi.fn();
			const off = wallet.features['standard:events'].on('change', listener);

			off();

			adapter._triggerAccountsChanged([]);

			expect(listener).not.toHaveBeenCalled();
		});

		it('updates wallet.accounts when adapter fires change', () => {
			const adapter = createMockAdapter([]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			expect(wallet.accounts).toHaveLength(0);

			const newAccount = createMockAccount();
			adapter._triggerAccountsChanged([newAccount]);

			expect(wallet.accounts).toHaveLength(1);
			expect(wallet.accounts[0].address).toBe(newAccount.address);
		});
	});

	describe('request queue', () => {
		it('has no pending request initially', () => {
			const wallet = new DevWallet(createDefaultConfig());
			expect(wallet.pendingRequest).toBeNull();
		});

		it('exposes the adapters', () => {
			const adapter = createMockAdapter();
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));
			expect(wallet.adapters).toEqual([adapter]);
		});
	});

	describe('signPersonalMessage()', () => {
		it('enqueues a request and sets pendingRequest', () => {
			const account = createMockAccount();
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			const message = new TextEncoder().encode('Hello, Sui!');

			// Call signPersonalMessage but don't await — it will hang until approved/rejected
			wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message,
				account: account.walletAccount,
			});

			expect(wallet.pendingRequest).not.toBeNull();
			expect(wallet.pendingRequest!.type).toBe('sign-personal-message');
			expect(wallet.pendingRequest!.account.address).toBe(account.address);
			expect(wallet.pendingRequest!.data).toBe(message);
		});

		it('resolves when approved', async () => {
			const keypair = new Ed25519Keypair();
			const account = createMockAccount(keypair);
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			const message = new TextEncoder().encode('Hello, Sui!');

			const resultPromise = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message,
				account: account.walletAccount,
			});

			await wallet.approveRequest();

			const result = await resultPromise;
			expect(result.bytes).toBe(toBase64(message));
			expect(result.signature).toBeTruthy();
			expect(typeof result.signature).toBe('string');
		});

		it('clears pendingRequest after approval', async () => {
			const keypair = new Ed25519Keypair();
			const account = createMockAccount(keypair);
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			const message = new TextEncoder().encode('test');

			const resultPromise = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message,
				account: account.walletAccount,
			});

			await wallet.approveRequest();
			await resultPromise;

			expect(wallet.pendingRequest).toBeNull();
		});

		it('rejects when rejected', async () => {
			const account = createMockAccount();
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			const resultPromise = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message: new TextEncoder().encode('test'),
				account: account.walletAccount,
			});

			wallet.rejectRequest('User said no');

			await expect(resultPromise).rejects.toThrow('User said no');
		});

		it('rejects with default message when no reason given', async () => {
			const account = createMockAccount();
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			const resultPromise = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message: new TextEncoder().encode('test'),
				account: account.walletAccount,
			});

			wallet.rejectRequest();

			await expect(resultPromise).rejects.toThrow('Request rejected by user.');
		});

		it('clears pendingRequest after rejection', async () => {
			const account = createMockAccount();
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			const resultPromise = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message: new TextEncoder().encode('test'),
				account: account.walletAccount,
			});

			wallet.rejectRequest();
			await resultPromise.catch(() => {});

			expect(wallet.pendingRequest).toBeNull();
		});

		it('selects the correct signer based on account address', async () => {
			const keypair1 = new Ed25519Keypair();
			const keypair2 = new Ed25519Keypair();
			const account1 = createMockAccount(keypair1);
			const account2 = createMockAccount(keypair2);
			const adapter = createMockAdapter([account1, account2]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			const message = new TextEncoder().encode('Test message');

			const resultPromise = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message,
				account: account2.walletAccount,
			});

			await wallet.approveRequest();
			const result = await resultPromise;

			// Verify the signature is from keypair2 by independently signing
			const expected = await keypair2.signPersonalMessage(message);

			expect(result.bytes).toBe(expected.bytes);
			expect(result.signature).toBe(expected.signature);
		});

		it('uses sui:unknown chain when chain is not provided for personal message', () => {
			const account = createMockAccount();
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message: new TextEncoder().encode('test'),
				account: account.walletAccount,
			});

			expect(wallet.pendingRequest!.chain).toBe('sui:unknown');
		});
	});

	describe('signTransaction()', () => {
		it('enqueues a request with serialized transaction', async () => {
			const account = createMockAccount();
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			const mockTransaction = {
				toJSON: vi.fn().mockResolvedValue('{"kind":"TransactionData"}'),
			};

			// Don't await — will pend
			wallet.features['sui:signTransaction'].signTransaction({
				transaction: mockTransaction as any,
				account: account.walletAccount,
				chain: 'sui:testnet',
			});

			// Wait for toJSON to complete
			await vi.waitFor(() => {
				expect(wallet.pendingRequest).not.toBeNull();
			});

			expect(wallet.pendingRequest!.type).toBe('sign-transaction');
			expect(wallet.pendingRequest!.chain).toBe('sui:testnet');
			expect(wallet.pendingRequest!.data).toBe('{"kind":"TransactionData"}');
		});

		it('throws when no client is configured for the chain', async () => {
			const account = createMockAccount();
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(
				createDefaultConfig({
					adapters: [adapter],
					clients: { mainnet: {} },
				}),
			);

			const mockTransaction = {
				toJSON: vi.fn().mockResolvedValue('{}'),
			};

			const resultPromise = wallet.features['sui:signTransaction'].signTransaction({
				transaction: mockTransaction as any,
				account: account.walletAccount,
				chain: 'sui:testnet',
			});

			// Wait for the request to be enqueued
			await vi.waitFor(() => {
				expect(wallet.pendingRequest).not.toBeNull();
			});

			// Approve it — the signing process will fail because no client for testnet
			await wallet.approveRequest();

			await expect(resultPromise).rejects.toThrow('No client configured for network "testnet"');
		});
	});

	describe('signAndExecuteTransaction()', () => {
		it('enqueues a request with serialized transaction', async () => {
			const account = createMockAccount();
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			const mockTransaction = {
				toJSON: vi.fn().mockResolvedValue('{"kind":"TransactionData"}'),
			};

			wallet.features['sui:signAndExecuteTransaction'].signAndExecuteTransaction({
				transaction: mockTransaction as any,
				account: account.walletAccount,
				chain: 'sui:testnet',
			});

			await vi.waitFor(() => {
				expect(wallet.pendingRequest).not.toBeNull();
			});

			expect(wallet.pendingRequest!.type).toBe('sign-and-execute-transaction');
			expect(wallet.pendingRequest!.chain).toBe('sui:testnet');
			expect(wallet.pendingRequest!.data).toBe('{"kind":"TransactionData"}');
		});
	});

	describe('concurrent requests', () => {
		it('rejects a second request while one is pending', async () => {
			const account = createMockAccount();
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			const message = new TextEncoder().encode('first');

			// First request
			wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message,
				account: account.walletAccount,
			});

			// Second request should be rejected immediately
			await expect(
				wallet.features['sui:signPersonalMessage'].signPersonalMessage({
					message: new TextEncoder().encode('second'),
					account: account.walletAccount,
				}),
			).rejects.toThrow('A signing request is already pending.');
		});

		it('allows a new request after the previous one is approved', async () => {
			const keypair = new Ed25519Keypair();
			const account = createMockAccount(keypair);
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			// First request
			const first = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message: new TextEncoder().encode('first'),
				account: account.walletAccount,
			});

			await wallet.approveRequest();
			await first;

			// Second request should work
			const second = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message: new TextEncoder().encode('second'),
				account: account.walletAccount,
			});

			expect(wallet.pendingRequest).not.toBeNull();

			await wallet.approveRequest();
			const result = await second;

			expect(result.bytes).toBeTruthy();
		});

		it('allows a new request after the previous one is rejected', async () => {
			const account = createMockAccount();
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			// First request
			const first = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message: new TextEncoder().encode('first'),
				account: account.walletAccount,
			});

			wallet.rejectRequest();
			await first.catch(() => {});

			// Second request should work
			wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message: new TextEncoder().encode('second'),
				account: account.walletAccount,
			});

			expect(wallet.pendingRequest).not.toBeNull();
			expect(wallet.pendingRequest!.type).toBe('sign-personal-message');
		});
	});

	describe('approveRequest() / rejectRequest() errors', () => {
		it('approveRequest throws when no request is pending', async () => {
			const wallet = new DevWallet(createDefaultConfig());
			await expect(wallet.approveRequest()).rejects.toThrow('No pending request to approve.');
		});

		it('rejectRequest throws when no request is pending', () => {
			const wallet = new DevWallet(createDefaultConfig());
			expect(() => wallet.rejectRequest()).toThrow('No pending request to reject.');
		});

		it('approveRequest rejects when signer address is not found', async () => {
			const account = createMockAccount();
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			const unknownAccount = new ReadonlyWalletAccount({
				address: '0x0000000000000000000000000000000000000000000000000000000000000000',
				publicKey: new Uint8Array(32),
				chains: [...SUI_CHAINS],
				features: [],
			});

			const resultPromise = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message: new TextEncoder().encode('test'),
				account: unknownAccount,
			});

			await wallet.approveRequest();

			await expect(resultPromise).rejects.toThrow('No account found for address');
		});
	});

	describe('register()', () => {
		it('returns an unregister function', () => {
			const wallet = new DevWallet(createDefaultConfig());
			const unregister = wallet.register();

			expect(typeof unregister).toBe('function');

			// Clean up
			unregister();
		});
	});

	describe('auto-approval', () => {
		it('auto-approves all requests when autoApprove is true', async () => {
			const keypair = new Ed25519Keypair();
			const account = createMockAccount(keypair);
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter], autoApprove: true }));

			const message = new TextEncoder().encode('auto-approve test');

			const result = await wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message,
				account: account.walletAccount,
			});

			// Should resolve immediately without needing approveRequest()
			expect(result.bytes).toBe(toBase64(message));
			expect(result.signature).toBeTruthy();
			// No pending request should be set
			expect(wallet.pendingRequest).toBeNull();
		});

		it('does not set pendingRequest when auto-approved', async () => {
			const keypair = new Ed25519Keypair();
			const account = createMockAccount(keypair);
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter], autoApprove: true }));

			const resultPromise = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message: new TextEncoder().encode('test'),
				account: account.walletAccount,
			});

			// pendingRequest should never be set for auto-approved requests
			expect(wallet.pendingRequest).toBeNull();
			await resultPromise;
		});

		it('allows concurrent auto-approved requests (no queue blocking)', async () => {
			const keypair = new Ed25519Keypair();
			const account = createMockAccount(keypair);
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter], autoApprove: true }));

			const msg1 = new TextEncoder().encode('first');
			const msg2 = new TextEncoder().encode('second');

			// Both should resolve without errors (no "already pending" rejection)
			const [result1, result2] = await Promise.all([
				wallet.features['sui:signPersonalMessage'].signPersonalMessage({
					message: msg1,
					account: account.walletAccount,
				}),
				wallet.features['sui:signPersonalMessage'].signPersonalMessage({
					message: msg2,
					account: account.walletAccount,
				}),
			]);

			expect(result1.bytes).toBe(toBase64(msg1));
			expect(result2.bytes).toBe(toBase64(msg2));
		});

		it('uses policy function for selective auto-approval', async () => {
			const keypair = new Ed25519Keypair();
			const account = createMockAccount(keypair);
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(
				createDefaultConfig({
					adapters: [adapter],
					autoApprove: (request) => request.type === 'sign-personal-message',
				}),
			);

			// Personal message should auto-approve
			const message = new TextEncoder().encode('auto');
			const result = await wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message,
				account: account.walletAccount,
			});

			expect(result.bytes).toBe(toBase64(message));
			expect(wallet.pendingRequest).toBeNull();
		});

		it('queues request when policy function returns false', async () => {
			const keypair = new Ed25519Keypair();
			const account = createMockAccount(keypair);
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(
				createDefaultConfig({
					adapters: [adapter],
					autoApprove: (request) => request.type === 'sign-transaction',
				}),
			);

			// Personal message should NOT auto-approve (policy only approves sign-transaction)
			const pending = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message: new TextEncoder().encode('needs approval'),
				account: account.walletAccount,
			});

			expect(wallet.pendingRequest).not.toBeNull();
			expect(wallet.pendingRequest!.type).toBe('sign-personal-message');

			// Clean up
			wallet.rejectRequest();
			await pending.catch(() => {});
		});

		it('does not auto-approve when autoApprove is false (default)', async () => {
			const account = createMockAccount();
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			const pending = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message: new TextEncoder().encode('test'),
				account: account.walletAccount,
			});

			expect(wallet.pendingRequest).not.toBeNull();

			// Clean up
			wallet.rejectRequest();
			await pending.catch(() => {});
		});

		it('policy function receives correct request details', async () => {
			const keypair = new Ed25519Keypair();
			const account = createMockAccount(keypair);
			const adapter = createMockAdapter([account]);
			const policySpy = vi.fn().mockReturnValue(true);
			const wallet = new DevWallet(
				createDefaultConfig({ adapters: [adapter], autoApprove: policySpy }),
			);

			const message = new TextEncoder().encode('details test');

			await wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message,
				account: account.walletAccount,
			});

			expect(policySpy).toHaveBeenCalledWith({
				type: 'sign-personal-message',
				account: account.walletAccount,
				chain: 'sui:unknown',
				data: message,
			});
		});
	});

	describe('chain parsing', () => {
		it('extracts network name from chain identifier', async () => {
			const account = createMockAccount();
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(
				createDefaultConfig({
					adapters: [adapter],
					clients: {
						testnet: {},
						mainnet: {},
					},
				}),
			);

			const mockTransaction = {
				toJSON: vi.fn().mockResolvedValue('test-json'),
			};

			wallet.features['sui:signTransaction'].signTransaction({
				transaction: mockTransaction as any,
				account: account.walletAccount,
				chain: 'sui:testnet',
			});

			await vi.waitFor(() => {
				expect(wallet.pendingRequest).not.toBeNull();
			});

			expect(wallet.pendingRequest!.chain).toBe('sui:testnet');
		});
	});
});
