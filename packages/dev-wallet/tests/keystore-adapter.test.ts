// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { toBase64 } from '@mysten/sui/utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KeystoreSignerAdapter } from '../src/adapters/keystore-adapter.js';

// Create a keystore-formatted base64 entry from an Ed25519 keypair
function createKeystoreEntry(keypair: Ed25519Keypair): string {
	const { secretKey } = decodeSuiPrivateKey(keypair.getSecretKey());
	const bytes = new Uint8Array(1 + secretKey.length);
	bytes[0] = 0x00; // Ed25519 flag
	bytes.set(secretKey, 1);
	return toBase64(bytes);
}

// Pre-generate keypairs for consistent test addresses
const testKeypair1 = new Ed25519Keypair();
const testKeypair2 = new Ed25519Keypair();
const testAddress1 = testKeypair1.getPublicKey().toSuiAddress();
const testAddress2 = testKeypair2.getPublicKey().toSuiAddress();

const mockKeystore = JSON.stringify([
	createKeystoreEntry(testKeypair1),
	createKeystoreEntry(testKeypair2),
]);

vi.mock('node:fs/promises', () => ({
	readFile: vi.fn(),
}));

import { readFile } from 'node:fs/promises';

const mockReadFile = vi.mocked(readFile);

describe('KeystoreSignerAdapter', () => {
	let adapter: KeystoreSignerAdapter;

	beforeEach(() => {
		adapter = new KeystoreSignerAdapter({ keystorePath: '/tmp/test.keystore' });
		mockReadFile.mockResolvedValue(mockKeystore);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('has correct id and name', () => {
		expect(adapter.id).toBe('keystore');
		expect(adapter.name).toBe('Keystore Signer');
	});

	it('initializes and loads keys from keystore', async () => {
		await adapter.initialize();

		const accounts = adapter.getAccounts();
		expect(accounts).toHaveLength(2);
		expect(accounts[0].address).toBe(testAddress1);
		expect(accounts[1].address).toBe(testAddress2);
	});

	it('assigns sequential labels', async () => {
		await adapter.initialize();

		const accounts = adapter.getAccounts();
		expect(accounts[0].label).toBe('Keystore Account 1');
		expect(accounts[1].label).toBe('Keystore Account 2');
	});

	it('getAccount returns correct account by address', async () => {
		await adapter.initialize();

		const account = adapter.getAccount(testAddress1);
		expect(account).toBeDefined();
		expect(account!.address).toBe(testAddress1);
	});

	it('getAccount returns undefined for unknown address', async () => {
		mockReadFile.mockResolvedValue(JSON.stringify([]));
		await adapter.initialize();

		expect(adapter.getAccount('0xnonexistent')).toBeUndefined();
	});

	it('skips malformed base64 entries', async () => {
		const validEntry = createKeystoreEntry(testKeypair1);
		mockReadFile.mockResolvedValue(JSON.stringify([validEntry, 'not-valid-base64!!!']));
		await adapter.initialize();

		expect(adapter.getAccounts()).toHaveLength(1);
	});

	it('skips entries with unknown key scheme flags', async () => {
		const validEntry = createKeystoreEntry(testKeypair1);
		// Create entry with flag 0xFF (unknown scheme)
		const unknownFlag = new Uint8Array(33);
		unknownFlag[0] = 0xff;
		const unknownEntry = toBase64(unknownFlag);
		mockReadFile.mockResolvedValue(JSON.stringify([validEntry, unknownEntry]));
		await adapter.initialize();

		expect(adapter.getAccounts()).toHaveLength(1);
	});

	it('deduplicates accounts on re-load', async () => {
		const entry = createKeystoreEntry(testKeypair1);
		mockReadFile.mockResolvedValue(JSON.stringify([entry, entry]));
		await adapter.initialize();

		expect(adapter.getAccounts()).toHaveLength(1);
	});

	it('reload picks up new keys', async () => {
		const entry1 = createKeystoreEntry(testKeypair1);
		mockReadFile.mockResolvedValue(JSON.stringify([entry1]));
		await adapter.initialize();
		expect(adapter.getAccounts()).toHaveLength(1);

		// Now the keystore has a second key
		const entry2 = createKeystoreEntry(testKeypair2);
		mockReadFile.mockResolvedValue(JSON.stringify([entry1, entry2]));

		await adapter.reload();
		expect(adapter.getAccounts()).toHaveLength(2);
	});

	it('reload notifies listeners', async () => {
		const entry1 = createKeystoreEntry(testKeypair1);
		mockReadFile.mockResolvedValue(JSON.stringify([entry1]));
		await adapter.initialize();

		const listener = vi.fn();
		adapter.onAccountsChanged(listener);

		const entry2 = createKeystoreEntry(testKeypair2);
		mockReadFile.mockResolvedValue(JSON.stringify([entry1, entry2]));

		await adapter.reload();
		expect(listener).toHaveBeenCalledWith(
			expect.arrayContaining([expect.objectContaining({ address: testAddress2 })]),
		);
	});

	it('does not have createAccount method', () => {
		expect(adapter.createAccount).toBeUndefined();
	});

	it('signing works with loaded keypairs', async () => {
		await adapter.initialize();

		const account = adapter.getAccounts()[0];
		const message = new TextEncoder().encode('test message');
		const { signature } = await account.signer.signPersonalMessage(message);
		expect(signature).toBeDefined();
		expect(typeof signature).toBe('string');
	});

	it('onAccountsChanged returns unsubscribe function', async () => {
		mockReadFile.mockResolvedValue(JSON.stringify([]));
		await adapter.initialize();

		const listener = vi.fn();
		const unsubscribe = adapter.onAccountsChanged(listener);
		expect(typeof unsubscribe).toBe('function');

		unsubscribe();

		// Reload should not notify after unsubscribe
		mockReadFile.mockResolvedValue(JSON.stringify([createKeystoreEntry(testKeypair1)]));
		await adapter.reload();
		expect(listener).not.toHaveBeenCalled();
	});

	it('destroy clears accounts and listeners', async () => {
		await adapter.initialize();
		expect(adapter.getAccounts()).toHaveLength(2);

		adapter.destroy();
		expect(adapter.getAccounts()).toHaveLength(0);
	});

	it('uses default keystore path when not specified', () => {
		const defaultAdapter = new KeystoreSignerAdapter();
		// Just verify it doesn't throw — actual path validation happens on initialize
		expect(defaultAdapter.id).toBe('keystore');
	});
});
