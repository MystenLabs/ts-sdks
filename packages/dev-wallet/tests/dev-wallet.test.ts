// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { toBase64 } from '@mysten/sui/utils';
import { ReadonlyWalletAccount, SUI_CHAINS } from '@mysten/wallet-standard';

import { DevWallet } from '../src/wallet/dev-wallet.js';
import { createMockAccount, createMockAdapter, createDefaultConfig } from './test-utils.js';

describe('DevWallet', () => {
	it('has correct default properties', () => {
		const wallet = new DevWallet(createDefaultConfig());
		expect(wallet.version).toBe('1.0.0');
		expect(wallet.name).toBe('Dev Wallet');
		expect(wallet.icon).toMatch(/^data:image\//);
		expect(wallet.chains).toBe(SUI_CHAINS);
	});

	it('uses custom name and icon when provided', () => {
		const customIcon =
			'data:image/png;base64,aW1hZ2U=' as `data:image/${'svg+xml' | 'webp' | 'png' | 'gif'};base64,${string}`;
		const wallet = new DevWallet(
			createDefaultConfig({ name: 'My Custom Wallet', icon: customIcon }),
		);
		expect(wallet.name).toBe('My Custom Wallet');
		expect(wallet.icon).toBe(customIcon);
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
	});

	describe('features', () => {
		it.each([
			['standard:connect', '1.0.0'],
			['standard:events', '1.0.0'],
			['standard:disconnect', '1.0.0'],
			['sui:signPersonalMessage', '1.1.0'],
			['sui:signTransaction', '2.0.0'],
			['sui:signAndExecuteTransaction', '2.0.0'],
		])('implements %s with version %s', (feature, version) => {
			const wallet = new DevWallet(createDefaultConfig());
			const feat = (wallet.features as any)[feature];
			expect(feat).toBeDefined();
			expect(feat.version).toBe(version);
		});
	});

	describe('connect()', () => {
		it('returns adapter accounts with autoConnect', async () => {
			const account = createMockAccount();
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter], autoConnect: true }));

			const result = await wallet.features['standard:connect'].connect();

			expect(result.accounts).toHaveLength(1);
			expect(result.accounts[0].address).toBe(account.address);
		});

		it('returns empty accounts when adapter has none (autoConnect)', async () => {
			const wallet = new DevWallet(createDefaultConfig({ autoConnect: true }));

			const result = await wallet.features['standard:connect'].connect();

			expect(result.accounts).toHaveLength(0);
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

	it('has no pending request initially', () => {
		const wallet = new DevWallet(createDefaultConfig());
		expect(wallet.pendingRequest).toBeNull();
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
					networks: { mainnet: 'https://fullnode.mainnet.sui.io:443' },
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

			await expect(resultPromise).rejects.toThrow('No client for network "testnet"');
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

	it('register() returns an unregister function', () => {
		const wallet = new DevWallet(createDefaultConfig());
		const unregister = wallet.register();

		expect(typeof unregister).toBe('function');

		unregister();
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

			expect(result.bytes).toBe(toBase64(message));
			expect(result.signature).toBeTruthy();
			expect(wallet.pendingRequest).toBeNull();
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

		it('does not auto-approve when adapter.allowAutoSign is false', async () => {
			const keypair = new Ed25519Keypair();
			const account = createMockAccount(keypair);
			const adapter = { ...createMockAdapter([account]), allowAutoSign: false };
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter], autoApprove: true }));

			const pending = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message: new TextEncoder().encode('cli-test'),
				account: account.walletAccount,
			});

			expect(wallet.pendingRequest).not.toBeNull();

			wallet.rejectRequest();
			await pending.catch(() => {});
		});
	});

	describe('multi-adapter', () => {
		it('aggregates accounts from multiple adapters', () => {
			const account1 = createMockAccount();
			const account2 = createMockAccount();
			const adapter1 = createMockAdapter([account1]);
			const adapter2 = createMockAdapter([account2]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter1, adapter2] }));

			expect(wallet.accounts).toHaveLength(2);
			expect(wallet.accounts[0].address).toBe(account1.address);
			expect(wallet.accounts[1].address).toBe(account2.address);
		});

		it('getAdapterForAccount returns the correct adapter', () => {
			const account1 = createMockAccount();
			const account2 = createMockAccount();
			const adapter1 = createMockAdapter([account1], { id: 'adapter-1' });
			const adapter2 = createMockAdapter([account2], { id: 'adapter-2' });
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter1, adapter2] }));

			expect(wallet.getAdapterForAccount(account1.address)?.id).toBe('adapter-1');
			expect(wallet.getAdapterForAccount(account2.address)?.id).toBe('adapter-2');
			expect(wallet.getAdapterForAccount('0x' + '0'.repeat(64))).toBeUndefined();
		});

		it('signs with the correct signer across adapters', async () => {
			const keypair1 = new Ed25519Keypair();
			const keypair2 = new Ed25519Keypair();
			const account1 = createMockAccount(keypair1);
			const account2 = createMockAccount(keypair2);
			const adapter1 = createMockAdapter([account1]);
			const adapter2 = createMockAdapter([account2]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter1, adapter2] }));

			const message = new TextEncoder().encode('Cross-adapter test');

			// Sign with account from adapter2
			const resultPromise = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message,
				account: account2.walletAccount,
			});

			await wallet.approveRequest();
			const result = await resultPromise;

			// Verify it was signed by keypair2
			const expected = await keypair2.signPersonalMessage(message);
			expect(result.signature).toBe(expected.signature);
		});

		it('emits change when any adapter updates accounts', () => {
			const account1 = createMockAccount();
			const adapter1 = createMockAdapter([account1]);
			const adapter2 = createMockAdapter([]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter1, adapter2] }));

			const listener = vi.fn();
			wallet.features['standard:events'].on('change', listener);

			const newAccount = createMockAccount();
			adapter2._triggerAccountsChanged([newAccount]);

			expect(listener).toHaveBeenCalledTimes(1);
			expect(wallet.accounts).toHaveLength(2);
		});
	});

	describe('destroy()', () => {
		it('rejects pending signing request', async () => {
			const account = createMockAccount();
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			const resultPromise = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message: new TextEncoder().encode('will be destroyed'),
				account: account.walletAccount,
			});

			expect(wallet.pendingRequest).not.toBeNull();

			wallet.destroy();

			await expect(resultPromise).rejects.toThrow('Wallet destroyed');
			expect(wallet.pendingRequest).toBeNull();
		});

		it('rejects new signing requests after destroy', async () => {
			const account = createMockAccount();
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			wallet.destroy();

			await expect(
				wallet.features['sui:signPersonalMessage'].signPersonalMessage({
					message: new TextEncoder().encode('post-destroy'),
					account: account.walletAccount,
				}),
			).rejects.toThrow('destroyed');
		});

		it('unsubscribes from adapter account changes', () => {
			const account = createMockAccount();
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			const listener = vi.fn();
			wallet.features['standard:events'].on('change', listener);

			wallet.destroy();
			listener.mockClear();

			// Trigger adapter change — should NOT propagate since we unsubscribed
			adapter._triggerAccountsChanged([]);
			expect(listener).not.toHaveBeenCalled();
		});
	});

	describe('network management', () => {
		it('exposes default network URLs', () => {
			const wallet = new DevWallet(createDefaultConfig());
			expect(wallet.availableNetworks).toEqual(['testnet']);
			expect(wallet.networkUrls).toEqual({ testnet: 'https://fullnode.testnet.sui.io:443' });
		});

		it('sets activeNetwork to first network key by default', () => {
			const wallet = new DevWallet(
				createDefaultConfig({
					networks: { devnet: 'https://devnet.example', testnet: 'https://testnet.example' },
				}),
			);
			expect(wallet.activeNetwork).toBe('devnet');
		});

		it('uses activeNetwork from config if provided', () => {
			const wallet = new DevWallet(
				createDefaultConfig({
					networks: { devnet: 'https://devnet.example', testnet: 'https://testnet.example' },
					activeNetwork: 'testnet',
				}),
			);
			expect(wallet.activeNetwork).toBe('testnet');
		});

		it('setActiveNetwork switches and emits change', () => {
			const wallet = new DevWallet(
				createDefaultConfig({
					networks: { devnet: 'https://devnet.example', testnet: 'https://testnet.example' },
				}),
			);

			const listener = vi.fn();
			wallet.features['standard:events'].on('change', listener);

			wallet.setActiveNetwork('testnet');

			expect(wallet.activeNetwork).toBe('testnet');
			expect(listener).toHaveBeenCalledTimes(1);
		});

		it('setActiveNetwork throws for unknown network', () => {
			const wallet = new DevWallet(createDefaultConfig());
			expect(() => wallet.setActiveNetwork('mainnet')).toThrow('No client for network "mainnet"');
		});

		it('addNetwork adds a new network and emits change', () => {
			const wallet = new DevWallet(createDefaultConfig());
			const listener = vi.fn();
			wallet.features['standard:events'].on('change', listener);

			wallet.addNetwork('devnet', 'https://fullnode.devnet.sui.io:443');

			expect(wallet.availableNetworks).toContain('devnet');
			expect(wallet.networkUrls['devnet']).toBe('https://fullnode.devnet.sui.io:443');
			expect(listener).toHaveBeenCalledTimes(1);
		});

		it('addNetwork throws for invalid URL', () => {
			const wallet = new DevWallet(createDefaultConfig());
			expect(() => wallet.addNetwork('custom', 'not-a-url')).toThrow('Invalid URL');
		});

		it('removeNetwork removes and emits change', () => {
			const wallet = new DevWallet(
				createDefaultConfig({
					networks: { devnet: 'https://devnet.example', testnet: 'https://testnet.example' },
				}),
			);

			const listener = vi.fn();
			wallet.features['standard:events'].on('change', listener);

			wallet.removeNetwork('testnet');

			expect(wallet.availableNetworks).toEqual(['devnet']);
			expect(listener).toHaveBeenCalledTimes(1);
		});

		it('removeNetwork resets activeNetwork when removing the active one', () => {
			const wallet = new DevWallet(
				createDefaultConfig({
					networks: { devnet: 'https://devnet.example', testnet: 'https://testnet.example' },
					activeNetwork: 'testnet',
				}),
			);

			wallet.removeNetwork('testnet');

			expect(wallet.activeNetwork).toBe('devnet');
		});

		it('activeClient returns client for active network', () => {
			const clientFactory = vi.fn((_network, _url) => ({ core: {} }) as any);
			const wallet = new DevWallet(createDefaultConfig({ clientFactory }));

			const client = wallet.activeClient;

			expect(client).not.toBeNull();
			expect(clientFactory).toHaveBeenCalledWith('testnet', 'https://fullnode.testnet.sui.io:443');
		});

		it('activeClient returns null when no active network', () => {
			const wallet = new DevWallet(createDefaultConfig({ networks: {} }));
			expect(wallet.activeClient).toBeNull();
		});

		it('activeClient lazily creates client (not on construction)', () => {
			const clientFactory = vi.fn((_network, _url) => ({ core: {} }) as any);
			const wallet = new DevWallet(createDefaultConfig({ clientFactory }));

			expect(clientFactory).not.toHaveBeenCalled();
			void wallet.activeClient;
			expect(clientFactory).toHaveBeenCalledTimes(1);
		});

		it('clients getter eagerly creates all clients', () => {
			const clientFactory = vi.fn((_network, _url) => ({ core: {} }) as any);
			const wallet = new DevWallet(
				createDefaultConfig({
					networks: { devnet: 'https://devnet.example', testnet: 'https://testnet.example' },
					clientFactory,
				}),
			);

			const clients = wallet.clients;

			expect(Object.keys(clients)).toEqual(['devnet', 'testnet']);
			expect(clientFactory).toHaveBeenCalledTimes(2);
		});

		it('getClient returns client for specific network', () => {
			const clientFactory = vi.fn((_network, _url) => ({ core: {} }) as any);
			const wallet = new DevWallet(createDefaultConfig({ clientFactory }));

			const client = wallet.getClient('testnet');

			expect(client).toBeDefined();
			expect(clientFactory).toHaveBeenCalledWith('testnet', 'https://fullnode.testnet.sui.io:443');
		});

		it('getClient caches the client (same reference on second call)', () => {
			const clientFactory = vi.fn((_network, _url) => ({ core: {} }) as any);
			const wallet = new DevWallet(createDefaultConfig({ clientFactory }));

			const first = wallet.getClient('testnet');
			const second = wallet.getClient('testnet');

			expect(first).toBe(second);
			expect(clientFactory).toHaveBeenCalledTimes(1);
		});

		it('getClient throws for unknown network', () => {
			const wallet = new DevWallet(createDefaultConfig());
			expect(() => wallet.getClient('mainnet')).toThrow('No client for network "mainnet"');
		});
	});

	describe('disconnect()', () => {
		it('completes without error', async () => {
			const wallet = new DevWallet(createDefaultConfig());
			await expect(wallet.features['standard:disconnect'].disconnect()).resolves.toBeUndefined();
		});

		it('retains accounts after disconnect', async () => {
			const account = createMockAccount();
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter], autoConnect: true }));

			await wallet.features['standard:connect'].connect();
			expect(wallet.accounts).toHaveLength(1);

			await wallet.features['standard:disconnect'].disconnect();

			expect(wallet.accounts).toHaveLength(1);
			expect(wallet.accounts[0].address).toBe(account.address);
		});

		it('still receives adapter updates after disconnect', async () => {
			const account = createMockAccount();
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter], autoConnect: true }));

			await wallet.features['standard:connect'].connect();
			await wallet.features['standard:disconnect'].disconnect();

			const newAccount = createMockAccount();
			adapter._triggerAccountsChanged([account, newAccount]);

			expect(wallet.accounts).toHaveLength(2);
		});
	});

	describe('connect flow', () => {
		it('approveConnect([]) exposes all accounts', async () => {
			const account1 = createMockAccount();
			const account2 = createMockAccount();
			const adapter = createMockAdapter([account1, account2]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			const connectPromise = wallet.features['standard:connect'].connect();
			wallet.approveConnect([]);
			const result = await connectPromise;

			expect(result.accounts).toHaveLength(2);
		});

		it('queues a connect request when autoConnect is false', async () => {
			const account = createMockAccount();
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			const connectPromise = wallet.features['standard:connect'].connect();

			expect(wallet.pendingConnect).not.toBeNull();

			// Clean up
			wallet.rejectConnect();
			await connectPromise.catch(() => {});
		});

		it('auto-connects with all accounts when autoConnect is true', async () => {
			const account1 = createMockAccount();
			const account2 = createMockAccount();
			const adapter = createMockAdapter([account1, account2]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter], autoConnect: true }));

			const result = await wallet.features['standard:connect'].connect();

			expect(result.accounts).toHaveLength(2);
			expect(wallet.pendingConnect).toBeNull();
		});

		it('approveConnect returns only selected accounts', async () => {
			const account1 = createMockAccount();
			const account2 = createMockAccount();
			const adapter = createMockAdapter([account1, account2]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			const connectPromise = wallet.features['standard:connect'].connect();

			expect(wallet.pendingConnect).not.toBeNull();

			wallet.approveConnect([account1.address]);

			const result = await connectPromise;
			expect(result.accounts).toHaveLength(1);
			expect(result.accounts[0].address).toBe(account1.address);
		});

		it('rejectConnect rejects the promise', async () => {
			const account = createMockAccount();
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			const connectPromise = wallet.features['standard:connect'].connect();

			wallet.rejectConnect('User said no');

			await expect(connectPromise).rejects.toThrow('User said no');
		});

		it('notifies connect listeners', async () => {
			const account = createMockAccount();
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			const listener = vi.fn();
			wallet.onConnectChange(listener);

			const connectPromise = wallet.features['standard:connect'].connect();

			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith(expect.objectContaining({ id: expect.any(String) }));

			wallet.rejectConnect();
			await connectPromise.catch(() => {});

			expect(listener).toHaveBeenCalledTimes(2);
			expect(listener).toHaveBeenLastCalledWith(null);
		});

		it('rejects duplicate connect requests', async () => {
			const account = createMockAccount();
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			const first = wallet.features['standard:connect'].connect();

			await expect(wallet.features['standard:connect'].connect()).rejects.toThrow(
				'already pending',
			);

			wallet.rejectConnect();
			await first.catch(() => {});
		});

		it('destroy rejects pending connect request', async () => {
			const account = createMockAccount();
			const adapter = createMockAdapter([account]);
			const wallet = new DevWallet(createDefaultConfig({ adapters: [adapter] }));

			const connectPromise = wallet.features['standard:connect'].connect();

			wallet.destroy();

			await expect(connectPromise).rejects.toThrow('Wallet destroyed');
		});
	});
});
