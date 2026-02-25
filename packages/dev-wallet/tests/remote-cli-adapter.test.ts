// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment happy-dom

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { toBase64 } from '@mysten/sui/utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CliProxySigner, RemoteCliAdapter } from '../src/adapters/remote-cli-adapter.js';

// Pre-generate test data
const testKeypair1 = new Ed25519Keypair();
const testKeypair2 = new Ed25519Keypair();
const testAddress1 = testKeypair1.getPublicKey().toSuiAddress();
const testAddress2 = testKeypair2.getPublicKey().toSuiAddress();

// Mock server account data (matches `sui keytool list --json` format)
const mockServerAccounts = [
	{
		suiAddress: testAddress1,
		publicBase64Key: toBase64(testKeypair1.getPublicKey().toSuiBytes()),
		keyScheme: 'ed25519',
		alias: 'Test Key 1',
	},
	{
		suiAddress: testAddress2,
		publicBase64Key: toBase64(testKeypair2.getPublicKey().toSuiBytes()),
		keyScheme: 'ed25519',
		alias: null,
	},
];

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('RemoteCliAdapter', () => {
	let adapter: RemoteCliAdapter;

	beforeEach(() => {
		adapter = new RemoteCliAdapter({ serverOrigin: 'http://localhost:5175' });
		mockFetch.mockReset();
	});

	afterEach(() => {
		adapter.destroy();
	});

	it('has correct id and name', () => {
		expect(adapter.id).toBe('remote-cli');
		expect(adapter.name).toBe('Remote CLI Signer');
	});

	it('has no accounts before initialization', () => {
		expect(adapter.getAccounts()).toEqual([]);
	});

	describe('initialize()', () => {
		it('fetches accounts from server', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ accounts: mockServerAccounts }),
			});

			await adapter.initialize();

			expect(mockFetch).toHaveBeenCalledWith('http://localhost:5175/api/accounts');
			expect(adapter.getAccounts()).toHaveLength(2);
		});

		it('populates accounts with correct addresses', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ accounts: mockServerAccounts }),
			});

			await adapter.initialize();

			expect(adapter.getAccount(testAddress1)).toBeDefined();
			expect(adapter.getAccount(testAddress2)).toBeDefined();
		});

		it('uses alias as label when available', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ accounts: mockServerAccounts }),
			});

			await adapter.initialize();

			expect(adapter.getAccount(testAddress1)!.label).toBe('Test Key 1');
			expect(adapter.getAccount(testAddress2)!.label).toBe('CLI Account 2');
		});

		it('creates CliProxySigner instances', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ accounts: mockServerAccounts }),
			});

			await adapter.initialize();

			const account = adapter.getAccount(testAddress1)!;
			expect(account.signer).toBeInstanceOf(CliProxySigner);
		});

		it('skips accounts with unknown key schemes', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					accounts: [
						{ ...mockServerAccounts[0], keyScheme: 'unknown-scheme' },
						mockServerAccounts[1],
					],
				}),
			});

			await adapter.initialize();

			expect(adapter.getAccounts()).toHaveLength(1);
		});

		it('throws on network error', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				statusText: 'Internal Server Error',
			});

			await expect(adapter.initialize()).rejects.toThrow('Failed to fetch accounts');
		});
	});

	describe('getAccount()', () => {
		beforeEach(async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ accounts: mockServerAccounts }),
			});
			await adapter.initialize();
		});

		it('returns account by address', () => {
			expect(adapter.getAccount(testAddress1)!.address).toBe(testAddress1);
		});

		it('returns undefined for unknown address', () => {
			expect(adapter.getAccount('0x' + '0'.repeat(64))).toBeUndefined();
		});
	});

	describe('createAccount()', () => {
		beforeEach(async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ accounts: mockServerAccounts }),
			});
			await adapter.initialize();
		});

		it('calls server to create account', async () => {
			const newKeypair = new Ed25519Keypair();
			const newAddress = newKeypair.getPublicKey().toSuiAddress();

			// POST /api/create-account
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					address: newAddress,
					keyScheme: 'ed25519',
				}),
			});

			// GET /api/accounts (refresh)
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					accounts: [
						...mockServerAccounts,
						{
							suiAddress: newAddress,
							publicBase64Key: toBase64(newKeypair.getPublicKey().toSuiBytes()),
							keyScheme: 'ed25519',
							alias: null,
						},
					],
				}),
			});

			const account = await adapter.createAccount({ scheme: 'ed25519' });

			expect(account.address).toBe(newAddress);
			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:5175/api/create-account',
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify({ scheme: 'ed25519', label: undefined }),
				}),
			);
		});

		it('rejects invalid scheme', async () => {
			await expect(adapter.createAccount({ scheme: 'invalid' })).rejects.toThrow(
				'Invalid key scheme',
			);

			// Should not have called fetch for creation
			expect(mockFetch).toHaveBeenCalledTimes(1); // only the initial initialize()
		});

		it('notifies listeners on account creation', async () => {
			const listener = vi.fn();
			adapter.onAccountsChanged(listener);

			const newKeypair = new Ed25519Keypair();
			const newAddress = newKeypair.getPublicKey().toSuiAddress();

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ address: newAddress, keyScheme: 'ed25519' }),
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					accounts: [
						...mockServerAccounts,
						{
							suiAddress: newAddress,
							publicBase64Key: toBase64(newKeypair.getPublicKey().toSuiBytes()),
							keyScheme: 'ed25519',
							alias: null,
						},
					],
				}),
			});

			await adapter.createAccount();

			expect(listener).toHaveBeenCalledTimes(1);
		});
	});

	describe('onAccountsChanged()', () => {
		it('returns unsubscribe function', () => {
			const listener = vi.fn();
			const unsubscribe = adapter.onAccountsChanged(listener);
			expect(typeof unsubscribe).toBe('function');
			unsubscribe();
		});
	});

	describe('destroy()', () => {
		it('clears accounts', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ accounts: mockServerAccounts }),
			});
			await adapter.initialize();
			expect(adapter.getAccounts()).toHaveLength(2);

			adapter.destroy();
			expect(adapter.getAccounts()).toHaveLength(0);
		});
	});
});

describe('CliProxySigner', () => {
	const testKeypair = new Ed25519Keypair();
	const testAddress = testKeypair.getPublicKey().toSuiAddress();
	const testPublicKey = testKeypair.getPublicKey();

	let signer: CliProxySigner;

	beforeEach(() => {
		signer = new CliProxySigner({
			address: testAddress,
			publicKey: testPublicKey,
			scheme: 'ED25519',
			serverOrigin: 'http://localhost:5175',
		});
		mockFetch.mockReset();
	});

	it('returns correct address', () => {
		expect(signer.toSuiAddress()).toBe(testAddress);
	});

	it('returns correct key scheme', () => {
		expect(signer.getKeyScheme()).toBe('ED25519');
	});

	it('returns correct public key', () => {
		expect(signer.getPublicKey()).toBe(testPublicKey);
	});

	describe('signTransaction()', () => {
		it('sends transaction bytes to server and returns signature', async () => {
			const txBytes = new Uint8Array([1, 2, 3, 4]);
			const mockSignature = 'mockSuiSignatureBase64String';

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ suiSignature: mockSignature }),
			});

			const result = await signer.signTransaction(txBytes);

			expect(result.bytes).toBe(toBase64(txBytes));
			expect(result.signature).toBe(mockSignature);

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:5175/api/sign-transaction',
				expect.objectContaining({
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						address: testAddress,
						txBytes: toBase64(txBytes),
					}),
				}),
			);
		});

		it('throws on server error', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({ error: 'Address not found in keystore' }),
			});

			await expect(signer.signTransaction(new Uint8Array([1]))).rejects.toThrow(
				'Transaction signing failed',
			);
		});
	});

	describe('signPersonalMessage()', () => {
		it('throws with clear error message', async () => {
			await expect(signer.signPersonalMessage(new Uint8Array([1, 2, 3]))).rejects.toThrow(
				'Personal message signing is not supported in CLI mode',
			);
		});

		it('does not call fetch', async () => {
			try {
				await signer.signPersonalMessage(new Uint8Array([1]));
			} catch {
				// expected
			}

			expect(mockFetch).not.toHaveBeenCalled();
		});
	});

	describe('sign()', () => {
		it('throws — not used directly', async () => {
			await expect(signer.sign(new Uint8Array(32))).rejects.toThrow(
				'does not support direct digest signing',
			);
		});
	});
});
