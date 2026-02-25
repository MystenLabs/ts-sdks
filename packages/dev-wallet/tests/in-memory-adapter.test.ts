// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';

import { InMemorySignerAdapter } from '../src/adapters/in-memory-adapter.js';

describe('InMemorySignerAdapter', () => {
	it('createAccount creates an account with valid Sui address', async () => {
		const adapter = new InMemorySignerAdapter();
		const account = await adapter.createAccount();

		expect(account.address).toMatch(/^0x[a-f0-9]{64}$/);
	});

	it('createAccount with label uses the provided label', async () => {
		const adapter = new InMemorySignerAdapter();
		const account = await adapter.createAccount({ label: 'My Custom Label' });

		expect(account.label).toBe('My Custom Label');
	});

	it('getAccounts returns all created accounts', async () => {
		const adapter = new InMemorySignerAdapter();
		await adapter.createAccount();
		await adapter.createAccount();
		await adapter.createAccount();

		const accounts = adapter.getAccounts();
		expect(accounts).toHaveLength(3);
	});

	it('getAccount finds account by address', async () => {
		const adapter = new InMemorySignerAdapter();
		const created = await adapter.createAccount({ label: 'Test' });

		const found = adapter.getAccount(created.address);
		expect(found).toBeDefined();
		expect(found!.address).toBe(created.address);
		expect(found!.label).toBe('Test');
	});

	it('getAccount returns undefined for unknown address', () => {
		const adapter = new InMemorySignerAdapter();

		const found = adapter.getAccount(
			'0x0000000000000000000000000000000000000000000000000000000000000000',
		);
		expect(found).toBeUndefined();
	});

	it('removeAccount removes the account', async () => {
		const adapter = new InMemorySignerAdapter();
		const account = await adapter.createAccount();

		const removed = await adapter.removeAccount(account.address);
		expect(removed).toBe(true);
		expect(adapter.getAccounts()).toHaveLength(0);
		expect(adapter.getAccount(account.address)).toBeUndefined();
	});

	it('removeAccount returns false for unknown address', async () => {
		const adapter = new InMemorySignerAdapter();

		const removed = await adapter.removeAccount(
			'0x0000000000000000000000000000000000000000000000000000000000000000',
		);
		expect(removed).toBe(false);
	});

	it('onAccountsChanged fires when accounts are created', async () => {
		const adapter = new InMemorySignerAdapter();
		const callback = vi.fn();

		adapter.onAccountsChanged(callback);
		await adapter.createAccount();

		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenCalledWith(
			expect.arrayContaining([expect.objectContaining({ address: expect.any(String) })]),
		);
	});

	it('onAccountsChanged fires when accounts are removed', async () => {
		const adapter = new InMemorySignerAdapter();
		const account = await adapter.createAccount();

		const callback = vi.fn();
		adapter.onAccountsChanged(callback);
		await adapter.removeAccount(account.address);

		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenCalledWith([]);
	});

	it('destroy clears all accounts', async () => {
		const adapter = new InMemorySignerAdapter();
		await adapter.createAccount();
		await adapter.createAccount();

		expect(adapter.getAccounts()).toHaveLength(2);

		adapter.destroy();

		expect(adapter.getAccounts()).toHaveLength(0);
	});

	it('account.signer.signPersonalMessage returns a verifiable signature', async () => {
		const adapter = new InMemorySignerAdapter();
		const account = await adapter.createAccount();

		const message = new TextEncoder().encode('hello');
		const { signature } = await account.signer.signPersonalMessage(message);
		const publicKey = account.signer.getPublicKey();
		const isValid = await publicKey.verifyPersonalMessage(message, signature);
		expect(isValid).toBe(true);
	});

	it('importAccount imports an existing keypair', async () => {
		const { Ed25519Keypair } = await import('@mysten/sui/keypairs/ed25519');
		const keypair = new Ed25519Keypair();
		const expectedAddress = keypair.getPublicKey().toSuiAddress();

		const adapter = new InMemorySignerAdapter();
		const account = await adapter.importAccount({
			signer: keypair,
			label: 'Imported Key',
		});

		expect(account.address).toBe(expectedAddress);
		expect(account.label).toBe('Imported Key');
		expect(adapter.getAccounts()).toHaveLength(1);
		expect(adapter.getAccount(expectedAddress)).toBeDefined();
	});

	it('importAccount deduplicates by address', async () => {
		const { Ed25519Keypair } = await import('@mysten/sui/keypairs/ed25519');
		const keypair = new Ed25519Keypair();

		const adapter = new InMemorySignerAdapter();
		await adapter.importAccount({ signer: keypair });
		await adapter.importAccount({ signer: keypair });

		expect(adapter.getAccounts()).toHaveLength(1);
	});

	it('importAccount signs correctly with the imported key', async () => {
		const { Ed25519Keypair } = await import('@mysten/sui/keypairs/ed25519');
		const keypair = new Ed25519Keypair();

		const adapter = new InMemorySignerAdapter();
		const account = await adapter.importAccount({ signer: keypair });

		const message = new TextEncoder().encode('test message');
		const { signature } = await account.signer.signPersonalMessage(message);
		const isValid = await keypair.getPublicKey().verifyPersonalMessage(message, signature);
		expect(isValid).toBe(true);
	});

	it('importAccount fires onAccountsChanged', async () => {
		const { Ed25519Keypair } = await import('@mysten/sui/keypairs/ed25519');
		const keypair = new Ed25519Keypair();

		const adapter = new InMemorySignerAdapter();
		const callback = vi.fn();
		adapter.onAccountsChanged(callback);

		await adapter.importAccount({ signer: keypair });

		expect(callback).toHaveBeenCalledTimes(1);
	});
});
