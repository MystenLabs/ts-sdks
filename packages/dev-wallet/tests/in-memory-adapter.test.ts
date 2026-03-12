// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';

import { InMemorySignerAdapter } from '../src/adapters/in-memory-adapter.js';
import { runAdapterContractTests } from './shared-adapter-tests.js';

runAdapterContractTests('InMemorySignerAdapter', async () => new InMemorySignerAdapter());

describe('InMemorySignerAdapter', () => {
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

	it('importAccount throws when signer is missing', async () => {
		const adapter = new InMemorySignerAdapter();
		await expect(adapter.importAccount({} as any)).rejects.toThrow(
			'In-memory adapter requires a signer to import',
		);
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
