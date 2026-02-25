// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { WebCryptoSignerAdapter } from '../src/adapters/webcrypto-adapter.js';

// Mock idb-keyval — IndexedDB is not available in Node.js
const mockStore = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
	createStore: vi.fn(() => 'mock-store'),
	get: vi.fn((key: string) => Promise.resolve(mockStore.get(key))),
	set: vi.fn((key: string, value: unknown) => {
		mockStore.set(key, value);
		return Promise.resolve();
	}),
	del: vi.fn((key: string) => {
		mockStore.delete(key);
		return Promise.resolve();
	}),
	entries: vi.fn(() => Promise.resolve([...mockStore.entries()])),
}));

beforeEach(() => {
	mockStore.clear();
});

describe('WebCryptoSignerAdapter', () => {
	it('has correct id and name', () => {
		const adapter = new WebCryptoSignerAdapter();
		expect(adapter.id).toBe('webcrypto');
		expect(adapter.name).toBe('WebCrypto Signer');
	});

	it('starts with no accounts before initialize', () => {
		const adapter = new WebCryptoSignerAdapter();
		expect(adapter.getAccounts()).toEqual([]);
	});

	it('createAccount creates an account with valid Sui address', async () => {
		const adapter = new WebCryptoSignerAdapter();
		await adapter.initialize();
		const account = await adapter.createAccount();

		expect(account.address).toMatch(/^0x[a-f0-9]{64}$/);
	});

	it('createAccount with label uses the provided label', async () => {
		const adapter = new WebCryptoSignerAdapter();
		await adapter.initialize();
		const account = await adapter.createAccount({ label: 'My WebCrypto Account' });

		expect(account.label).toBe('My WebCrypto Account');
	});

	it('createAccount assigns default label', async () => {
		const adapter = new WebCryptoSignerAdapter();
		await adapter.initialize();
		const account = await adapter.createAccount();

		expect(account.label).toBe('Account 1');
	});

	it('getAccounts returns all created accounts', async () => {
		const adapter = new WebCryptoSignerAdapter();
		await adapter.initialize();
		await adapter.createAccount();
		await adapter.createAccount();
		await adapter.createAccount();

		expect(adapter.getAccounts()).toHaveLength(3);
	});

	it('getAccount finds account by address', async () => {
		const adapter = new WebCryptoSignerAdapter();
		await adapter.initialize();
		const created = await adapter.createAccount({ label: 'Test' });

		const found = adapter.getAccount(created.address);
		expect(found).toBeDefined();
		expect(found!.address).toBe(created.address);
		expect(found!.label).toBe('Test');
	});

	it('getAccount returns undefined for unknown address', async () => {
		const adapter = new WebCryptoSignerAdapter();
		await adapter.initialize();

		const found = adapter.getAccount(
			'0x0000000000000000000000000000000000000000000000000000000000000000',
		);
		expect(found).toBeUndefined();
	});

	it('removeAccount removes the account', async () => {
		const adapter = new WebCryptoSignerAdapter();
		await adapter.initialize();
		const account = await adapter.createAccount();

		const removed = await adapter.removeAccount(account.address);
		expect(removed).toBe(true);
		expect(adapter.getAccounts()).toHaveLength(0);
		expect(adapter.getAccount(account.address)).toBeUndefined();
	});

	it('removeAccount returns false for unknown address', async () => {
		const adapter = new WebCryptoSignerAdapter();
		await adapter.initialize();

		const removed = await adapter.removeAccount(
			'0x0000000000000000000000000000000000000000000000000000000000000000',
		);
		expect(removed).toBe(false);
	});

	it('onAccountsChanged fires when accounts are created', async () => {
		const adapter = new WebCryptoSignerAdapter();
		await adapter.initialize();
		const callback = vi.fn();

		adapter.onAccountsChanged(callback);
		await adapter.createAccount();

		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenCalledWith(
			expect.arrayContaining([expect.objectContaining({ address: expect.any(String) })]),
		);
	});

	it('onAccountsChanged fires when accounts are removed', async () => {
		const adapter = new WebCryptoSignerAdapter();
		await adapter.initialize();
		const account = await adapter.createAccount();

		const callback = vi.fn();
		adapter.onAccountsChanged(callback);
		await adapter.removeAccount(account.address);

		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenCalledWith([]);
	});

	it('unsubscribe stops receiving events', async () => {
		const adapter = new WebCryptoSignerAdapter();
		await adapter.initialize();

		const callback = vi.fn();
		const unsubscribe = adapter.onAccountsChanged(callback);
		unsubscribe();

		await adapter.createAccount();
		expect(callback).not.toHaveBeenCalled();
	});

	it('destroy clears all accounts', async () => {
		const adapter = new WebCryptoSignerAdapter();
		await adapter.initialize();
		await adapter.createAccount();
		await adapter.createAccount();

		expect(adapter.getAccounts()).toHaveLength(2);

		adapter.destroy();

		expect(adapter.getAccounts()).toHaveLength(0);
	});

	it('account.signer.signPersonalMessage returns a verifiable signature', async () => {
		const adapter = new WebCryptoSignerAdapter();
		await adapter.initialize();
		const account = await adapter.createAccount();

		const message = new TextEncoder().encode('hello webcrypto');
		const { signature } = await account.signer.signPersonalMessage(message);
		const publicKey = account.signer.getPublicKey();
		const isValid = await publicKey.verifyPersonalMessage(message, signature);
		expect(isValid).toBe(true);
	});

	it('persists keys to IndexedDB on create', async () => {
		const adapter = new WebCryptoSignerAdapter();
		await adapter.initialize();
		const account = await adapter.createAccount({ label: 'Persisted' });

		// Verify the key was stored
		expect(mockStore.has(account.address)).toBe(true);
		// Verify meta was stored
		expect(mockStore.has('__account_meta__')).toBe(true);
	});

	it('removes keys from IndexedDB on remove', async () => {
		const adapter = new WebCryptoSignerAdapter();
		await adapter.initialize();
		const account = await adapter.createAccount();

		expect(mockStore.has(account.address)).toBe(true);

		await adapter.removeAccount(account.address);

		expect(mockStore.has(account.address)).toBe(false);
	});

	it('restores accounts from IndexedDB on initialize', async () => {
		// Create an adapter and add accounts
		const adapter1 = new WebCryptoSignerAdapter();
		await adapter1.initialize();
		const account1 = await adapter1.createAccount({ label: 'First' });
		const account2 = await adapter1.createAccount({ label: 'Second' });

		// Create a new adapter that should restore from the same mock store
		const adapter2 = new WebCryptoSignerAdapter();
		await adapter2.initialize();

		const restored = adapter2.getAccounts();
		expect(restored).toHaveLength(2);

		const restoredAddresses = restored.map((a) => a.address).sort();
		const originalAddresses = [account1.address, account2.address].sort();
		expect(restoredAddresses).toEqual(originalAddresses);

		// Verify labels were restored
		const first = adapter2.getAccount(account1.address);
		expect(first!.label).toBe('First');

		const second = adapter2.getAccount(account2.address);
		expect(second!.label).toBe('Second');
	});

	it('restored accounts can still sign', async () => {
		const adapter1 = new WebCryptoSignerAdapter();
		await adapter1.initialize();
		const account = await adapter1.createAccount();

		// Restore in new adapter
		const adapter2 = new WebCryptoSignerAdapter();
		await adapter2.initialize();

		const restored = adapter2.getAccount(account.address)!;
		const message = new TextEncoder().encode('after restore');
		const { signature } = await restored.signer.signPersonalMessage(message);
		const isValid = await restored.signer.getPublicKey().verifyPersonalMessage(message, signature);
		expect(isValid).toBe(true);
	});

	it('walletAccount has correct features', async () => {
		const adapter = new WebCryptoSignerAdapter();
		await adapter.initialize();
		const account = await adapter.createAccount();

		expect(account.walletAccount.features).toContain('sui:signTransaction');
		expect(account.walletAccount.features).toContain('sui:signAndExecuteTransaction');
		expect(account.walletAccount.features).toContain('sui:signPersonalMessage');
	});

	it('accepts custom dbName and storeName', () => {
		const adapter = new WebCryptoSignerAdapter({
			dbName: 'custom-db',
			storeName: 'custom-store',
		});
		expect(adapter.id).toBe('webcrypto');
	});
});
