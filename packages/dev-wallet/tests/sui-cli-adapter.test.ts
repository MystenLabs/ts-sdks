// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { toBase64 } from '@mysten/sui/utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SuiCliSignerAdapter } from '../src/adapters/sui-cli-adapter.js';

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

vi.mock('node:child_process', () => ({
	execFile: vi.fn(),
}));

// Need to import the mocked modules
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';

const mockReadFile = vi.mocked(readFile);
const mockExecFile = vi.mocked(execFile);

describe('SuiCliSignerAdapter', () => {
	let adapter: SuiCliSignerAdapter;

	beforeEach(() => {
		adapter = new SuiCliSignerAdapter({ keystorePath: '/fake/path/sui.keystore' });
		mockReadFile.mockResolvedValue(mockKeystore);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('has correct id and name', () => {
		expect(adapter.id).toBe('sui-cli');
		expect(adapter.name).toBe('Sui CLI Signer');
	});

	it('has no accounts before initialization', () => {
		expect(adapter.getAccounts()).toEqual([]);
	});

	describe('initialize()', () => {
		it('loads accounts from keystore file', async () => {
			await adapter.initialize();

			const accounts = adapter.getAccounts();
			expect(accounts).toHaveLength(2);
			expect(accounts[0].address).toBe(testAddress1);
			expect(accounts[1].address).toBe(testAddress2);
		});

		it('reads from the configured keystore path', async () => {
			await adapter.initialize();

			expect(mockReadFile).toHaveBeenCalledWith('/fake/path/sui.keystore', 'utf-8');
		});

		it('assigns sequential labels', async () => {
			await adapter.initialize();

			const accounts = adapter.getAccounts();
			expect(accounts[0].label).toBe('CLI Account 1');
			expect(accounts[1].label).toBe('CLI Account 2');
		});

		it('creates valid wallet accounts', async () => {
			await adapter.initialize();

			const account = adapter.getAccounts()[0];
			expect(account.walletAccount).toBeDefined();
			expect(account.walletAccount.address).toBe(testAddress1);
			expect(account.walletAccount.chains).toContain('sui:testnet');
		});

		it('skips keys with unknown scheme flags', async () => {
			// Create a keystore with an unknown flag byte (0x05)
			const unknownKey = toBase64(new Uint8Array([0x05, ...new Uint8Array(32)]));
			mockReadFile.mockResolvedValue(JSON.stringify([unknownKey]));

			await adapter.initialize();

			expect(adapter.getAccounts()).toHaveLength(0);
		});

		it('skips malformed keys', async () => {
			mockReadFile.mockResolvedValue(JSON.stringify(['not-valid-base64!!!!']));

			// Should not throw, just skip invalid entries
			await adapter.initialize();

			expect(adapter.getAccounts()).toHaveLength(0);
		});

		it('does not add duplicate accounts on re-initialization', async () => {
			await adapter.initialize();
			await adapter.initialize();

			expect(adapter.getAccounts()).toHaveLength(2);
		});
	});

	describe('getAccount()', () => {
		it('returns account by address', async () => {
			await adapter.initialize();

			const account = adapter.getAccount(testAddress1);
			expect(account).toBeDefined();
			expect(account!.address).toBe(testAddress1);
		});

		it('returns undefined for unknown address', async () => {
			await adapter.initialize();

			const account = adapter.getAccount('0x' + '0'.repeat(64));
			expect(account).toBeUndefined();
		});
	});

	describe('createAccount()', () => {
		it('calls sui CLI to create a new address', async () => {
			await adapter.initialize();

			const newKeypair = new Ed25519Keypair();
			const newEntry = createKeystoreEntry(newKeypair);

			// After CLI creates the account, the keystore has the new key
			mockReadFile.mockResolvedValueOnce(
				JSON.stringify([
					createKeystoreEntry(testKeypair1),
					createKeystoreEntry(testKeypair2),
					newEntry,
				]),
			);

			// Mock execFile to simulate `sui client new-address ed25519 --json`
			mockExecFile.mockImplementation((_cmd, _args, callback: any) => {
				callback(null, { stdout: '{}', stderr: '' });
				return {} as any;
			});

			const account = await adapter.createAccount();

			expect(account).toBeDefined();
			expect(account.address).toBe(newKeypair.getPublicKey().toSuiAddress());
		});

		it('uses custom label when provided', async () => {
			await adapter.initialize();

			const newKeypair = new Ed25519Keypair();
			const newEntry = createKeystoreEntry(newKeypair);

			mockReadFile.mockResolvedValueOnce(
				JSON.stringify([
					createKeystoreEntry(testKeypair1),
					createKeystoreEntry(testKeypair2),
					newEntry,
				]),
			);

			mockExecFile.mockImplementation((_cmd, _args, callback: any) => {
				callback(null, { stdout: '{}', stderr: '' });
				return {} as any;
			});

			const account = await adapter.createAccount({ label: 'My Custom Account' });

			expect(account.label).toBe('My Custom Account');
		});

		it('notifies listeners when account is created', async () => {
			await adapter.initialize();

			const listener = vi.fn();
			adapter.onAccountsChanged(listener);

			const newKeypair = new Ed25519Keypair();
			mockReadFile.mockResolvedValueOnce(
				JSON.stringify([
					createKeystoreEntry(testKeypair1),
					createKeystoreEntry(testKeypair2),
					createKeystoreEntry(newKeypair),
				]),
			);

			mockExecFile.mockImplementation((_cmd, _args, callback: any) => {
				callback(null, { stdout: '{}', stderr: '' });
				return {} as any;
			});

			await adapter.createAccount();

			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({})]));
		});

		it('throws when CLI does not produce a new account', async () => {
			await adapter.initialize();

			// Keystore unchanged after CLI call
			mockReadFile.mockResolvedValueOnce(mockKeystore);

			mockExecFile.mockImplementation((_cmd, _args, callback: any) => {
				callback(null, { stdout: '{}', stderr: '' });
				return {} as any;
			});

			await expect(adapter.createAccount()).rejects.toThrow(
				'Failed to create new account via sui CLI',
			);
		});
	});

	describe('signing', () => {
		it('provides signers that can sign personal messages', async () => {
			await adapter.initialize();

			const account = adapter.getAccount(testAddress1)!;
			const message = new TextEncoder().encode('Hello from Sui CLI!');
			const { bytes, signature } = await account.signer.signPersonalMessage(message);

			expect(bytes).toBeTruthy();
			expect(signature).toBeTruthy();
			expect(typeof signature).toBe('string');
		});

		it('signature matches direct keypair signing', async () => {
			await adapter.initialize();

			const account = adapter.getAccount(testAddress1)!;
			const message = new TextEncoder().encode('Verify me');

			const fromAdapter = await account.signer.signPersonalMessage(message);
			const fromKeypair = await testKeypair1.signPersonalMessage(message);

			expect(fromAdapter.bytes).toBe(fromKeypair.bytes);
			expect(fromAdapter.signature).toBe(fromKeypair.signature);
		});
	});

	describe('onAccountsChanged()', () => {
		it('returns unsubscribe function', async () => {
			const listener = vi.fn();
			const unsubscribe = adapter.onAccountsChanged(listener);

			expect(typeof unsubscribe).toBe('function');
			unsubscribe();
		});
	});

	describe('destroy()', () => {
		it('clears accounts', async () => {
			await adapter.initialize();
			expect(adapter.getAccounts()).toHaveLength(2);

			adapter.destroy();
			expect(adapter.getAccounts()).toHaveLength(0);
		});
	});
});
