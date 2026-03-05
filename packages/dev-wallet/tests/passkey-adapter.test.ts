// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Secp256r1Keypair } from '@mysten/sui/keypairs/secp256r1';
import { PasskeyKeypair } from '@mysten/sui/keypairs/passkey';
import type { PasskeyProvider } from '@mysten/sui/keypairs/passkey';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PasskeySignerAdapter } from '../src/adapters/passkey-adapter.js';
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

/**
 * Create a mock PasskeyProvider and spy on PasskeyKeypair.getPasskeyInstance
 * so that it returns a real PasskeyKeypair constructed from a secp256r1 keypair's
 * compressed public key — no WebAuthn or noble-curves needed.
 */
const MOCK_CREDENTIAL_ID = new Uint8Array([10, 20, 30, 40, 50]);

function createMockProvider(): {
	provider: PasskeyProvider;
	keypair: Secp256r1Keypair;
} {
	const kp = new Secp256r1Keypair();
	const compressedPubKey = kp.getPublicKey().toRawBytes();

	const provider: PasskeyProvider = {
		create: vi.fn(),
		get: vi.fn().mockRejectedValue(new Error('Sign not mocked')),
	};

	vi.spyOn(PasskeyKeypair, 'getPasskeyInstance').mockImplementation(async (p) => {
		return new PasskeyKeypair(compressedPubKey, p, MOCK_CREDENTIAL_ID);
	});

	return { provider, keypair: kp };
}

beforeEach(() => {
	mockStore.clear();
	vi.restoreAllMocks();
});

runAdapterContractTests('PasskeySignerAdapter', async () => {
	const { provider } = createMockProvider();
	const adapter = new PasskeySignerAdapter({ provider });
	await adapter.initialize();
	return adapter;
});

describe('PasskeySignerAdapter', () => {
	it('has correct id and name', () => {
		const { provider } = createMockProvider();
		const adapter = new PasskeySignerAdapter({ provider });
		expect(adapter.id).toBe('passkey');
		expect(adapter.name).toBe('Passkey Signer');
	});

	it('has allowAutoSign set to false', () => {
		const { provider } = createMockProvider();
		const adapter = new PasskeySignerAdapter({ provider });
		expect(adapter.allowAutoSign).toBe(false);
	});

	it('starts with no accounts before initialize', () => {
		const { provider } = createMockProvider();
		const adapter = new PasskeySignerAdapter({ provider });
		expect(adapter.getAccounts()).toEqual([]);
	});

	it('persists accounts in IndexedDB and restores on initialize', async () => {
		const { provider } = createMockProvider();
		const adapter1 = new PasskeySignerAdapter({ provider });
		await adapter1.initialize();

		const account = await adapter1.createAccount({ label: 'Persisted Account' });
		adapter1.destroy();

		const adapter2 = new PasskeySignerAdapter({ provider });
		await adapter2.initialize();

		const accounts = adapter2.getAccounts();
		expect(accounts).toHaveLength(1);
		expect(accounts[0].address).toBe(account.address);
		expect(accounts[0].label).toBe('Persisted Account');
		expect(accounts[0].signer).toBeInstanceOf(PasskeyKeypair);
	});

	it('persists and restores credential IDs across adapter instances', async () => {
		const { provider } = createMockProvider();
		const adapter1 = new PasskeySignerAdapter({ provider });
		await adapter1.initialize();

		await adapter1.createAccount({ label: 'Cred ID Test' });
		adapter1.destroy();

		const adapter2 = new PasskeySignerAdapter({ provider });
		await adapter2.initialize();

		const accounts = adapter2.getAccounts();
		expect(accounts).toHaveLength(1);
		const signer = accounts[0].signer as PasskeyKeypair;
		expect(signer.getCredentialId()).toEqual(MOCK_CREDENTIAL_ID);
	});

	it('wallet accounts have correct features', async () => {
		const { provider } = createMockProvider();
		const adapter = new PasskeySignerAdapter({ provider });
		await adapter.initialize();

		const account = await adapter.createAccount();

		expect(account.walletAccount.features).toContain('sui:signTransaction');
		expect(account.walletAccount.features).toContain('sui:signAndExecuteTransaction');
		expect(account.walletAccount.features).toContain('sui:signPersonalMessage');
	});
});
