// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WebCryptoSignerAdapter } from '../src/adapters/webcrypto-adapter.js';
import { runAdapterContractTests } from './shared-adapter-tests.js';

// Mock idb-store — IndexedDB is not available in Node.js
const mockStore = new Map<string, unknown>();
vi.mock('../src/adapters/idb-store.js', () => ({
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

runAdapterContractTests('WebCryptoSignerAdapter', async () => {
	const adapter = new WebCryptoSignerAdapter();
	await adapter.initialize();
	return adapter;
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

	it('createAccount assigns default label', async () => {
		const adapter = new WebCryptoSignerAdapter();
		await adapter.initialize();
		const account = await adapter.createAccount();
		expect(account.label).toBe('Account 1');
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

		expect(mockStore.has(account.address)).toBe(true);
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
		const adapter1 = new WebCryptoSignerAdapter();
		await adapter1.initialize();
		const account1 = await adapter1.createAccount({ label: 'First' });
		const account2 = await adapter1.createAccount({ label: 'Second' });

		const adapter2 = new WebCryptoSignerAdapter();
		await adapter2.initialize();

		const restored = adapter2.getAccounts();
		expect(restored).toHaveLength(2);

		const restoredAddresses = restored.map((a) => a.address).sort();
		const originalAddresses = [account1.address, account2.address].sort();
		expect(restoredAddresses).toEqual(originalAddresses);

		expect(adapter2.getAccount(account1.address)!.label).toBe('First');
		expect(adapter2.getAccount(account2.address)!.label).toBe('Second');
	});

	it('restored accounts can still sign', async () => {
		const adapter1 = new WebCryptoSignerAdapter();
		await adapter1.initialize();
		const account = await adapter1.createAccount();

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
