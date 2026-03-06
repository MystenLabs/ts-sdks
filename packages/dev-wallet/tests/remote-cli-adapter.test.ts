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

const MOCK_TOKEN = 'test-auth-token-abc123';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

/** Helper: mock a successful accounts fetch */
function mockAccountsFetch() {
	mockFetch.mockResolvedValueOnce({
		ok: true,
		json: async () => ({ accounts: mockServerAccounts }),
	});
}

describe('RemoteCliAdapter', () => {
	let adapter: RemoteCliAdapter;

	beforeEach(() => {
		mockFetch.mockReset();
		sessionStorage.clear();
		localStorage.clear();
	});

	afterEach(() => {
		adapter?.destroy();
	});

	it('has correct id and name', () => {
		adapter = new RemoteCliAdapter();
		expect(adapter.id).toBe('remote-cli');
		expect(adapter.name).toBe('Remote CLI Signer');
	});

	it('has no accounts when no token is available', async () => {
		adapter = new RemoteCliAdapter({ serverOrigin: 'http://localhost:5175' });
		await adapter.initialize();
		expect(adapter.getAccounts()).toEqual([]);
		expect(adapter.isPaired).toBe(false);
	});

	describe('token-in-URL auto-auth', () => {
		it('authenticates from constructor token without auto-importing', async () => {
			mockAccountsFetch(); // for fetchServerAccounts in initialize

			adapter = new RemoteCliAdapter({
				serverOrigin: 'http://localhost:5175',
				token: MOCK_TOKEN,
			});
			await adapter.initialize();

			expect(adapter.isPaired).toBe(true);
			// No accounts auto-imported — user must import manually
			expect(adapter.getAccounts()).toHaveLength(0);
		});

		it('authenticates from localStorage token', async () => {
			localStorage.setItem(RemoteCliAdapter.TOKEN_KEY, MOCK_TOKEN);
			mockAccountsFetch();

			adapter = new RemoteCliAdapter({ serverOrigin: 'http://localhost:5175' });
			await adapter.initialize();

			expect(adapter.isPaired).toBe(true);
			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:5175/api/v1/accounts',
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: `Bearer ${MOCK_TOKEN}`,
					}),
				}),
			);
		});

		it('clears invalid token from localStorage on auth failure', async () => {
			localStorage.setItem(RemoteCliAdapter.TOKEN_KEY, 'invalid-token');
			mockFetch.mockResolvedValueOnce({
				ok: false,
				statusText: 'Unauthorized',
			});

			adapter = new RemoteCliAdapter({ serverOrigin: 'http://localhost:5175' });
			await adapter.initialize();

			expect(adapter.isPaired).toBe(false);
			expect(adapter.getAccounts()).toHaveLength(0);
			expect(localStorage.getItem(RemoteCliAdapter.TOKEN_KEY)).toBeNull();
		});

		it('constructor token takes precedence over localStorage', async () => {
			localStorage.setItem(RemoteCliAdapter.TOKEN_KEY, 'stored-token');
			mockAccountsFetch();

			adapter = new RemoteCliAdapter({
				serverOrigin: 'http://localhost:5175',
				token: MOCK_TOKEN,
			});
			await adapter.initialize();

			expect(adapter.isPaired).toBe(true);
			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:5175/api/v1/accounts',
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: `Bearer ${MOCK_TOKEN}`,
					}),
				}),
			);
		});
	});

	describe('localStorage persistence', () => {
		it('saves imported addresses to localStorage', async () => {
			mockAccountsFetch(); // for initialize
			adapter = new RemoteCliAdapter({
				serverOrigin: 'http://localhost:5175',
				token: MOCK_TOKEN,
			});
			await adapter.initialize();

			// Import an account
			mockAccountsFetch(); // for importAccount -> fetchServerAccounts
			await adapter.importAccount({ address: testAddress1 });

			const saved = JSON.parse(localStorage.getItem(RemoteCliAdapter.STORAGE_KEY)!);
			expect(saved).toEqual([testAddress1]);
		});

		it('restores previously-imported accounts on initialize', async () => {
			// Save an imported address to localStorage
			localStorage.setItem(RemoteCliAdapter.STORAGE_KEY, JSON.stringify([testAddress1]));

			mockAccountsFetch(); // for initialize -> fetchServerAccounts
			adapter = new RemoteCliAdapter({
				serverOrigin: 'http://localhost:5175',
				token: MOCK_TOKEN,
			});
			await adapter.initialize();

			// Only the previously-imported account should be restored
			expect(adapter.getAccounts()).toHaveLength(1);
			expect(adapter.getAccounts()[0].address).toBe(testAddress1);
			expect(adapter.getAccounts()[0].label).toBe('Test Key 1');
		});

		it('skips addresses that no longer exist on the server', async () => {
			localStorage.setItem(
				RemoteCliAdapter.STORAGE_KEY,
				JSON.stringify([testAddress1, '0xnonexistent']),
			);

			mockAccountsFetch();
			adapter = new RemoteCliAdapter({
				serverOrigin: 'http://localhost:5175',
				token: MOCK_TOKEN,
			});
			await adapter.initialize();

			// Only testAddress1 exists on server
			expect(adapter.getAccounts()).toHaveLength(1);
			expect(adapter.getAccounts()[0].address).toBe(testAddress1);
		});

		it('removes address from localStorage on removeAccount', async () => {
			mockAccountsFetch();
			adapter = new RemoteCliAdapter({
				serverOrigin: 'http://localhost:5175',
				token: MOCK_TOKEN,
			});
			await adapter.initialize();

			mockAccountsFetch();
			await adapter.importAccount({ address: testAddress1 });
			mockAccountsFetch();
			await adapter.importAccount({ address: testAddress2 });

			expect(adapter.getAccounts()).toHaveLength(2);

			await adapter.removeAccount(testAddress1);

			expect(adapter.getAccounts()).toHaveLength(1);
			expect(adapter.getAccounts()[0].address).toBe(testAddress2);

			const saved = JSON.parse(localStorage.getItem(RemoteCliAdapter.STORAGE_KEY)!);
			expect(saved).toEqual([testAddress2]);
		});
	});

	describe('listAvailableAccounts()', () => {
		it('lists all unimported accounts from server', async () => {
			mockAccountsFetch();
			adapter = new RemoteCliAdapter({
				serverOrigin: 'http://localhost:5175',
				token: MOCK_TOKEN,
			});
			await adapter.initialize();

			// No accounts imported yet — all should be available
			mockAccountsFetch();
			const available = await adapter.listAvailableAccounts();
			expect(available).toHaveLength(2);
			expect(available[0].address).toBe(testAddress1);
			expect(available[0].alias).toBe('Test Key 1');
		});

		it('excludes already-imported accounts', async () => {
			mockAccountsFetch();
			adapter = new RemoteCliAdapter({
				serverOrigin: 'http://localhost:5175',
				token: MOCK_TOKEN,
			});
			await adapter.initialize();

			mockAccountsFetch();
			await adapter.importAccount({ address: testAddress1 });

			mockAccountsFetch();
			const available = await adapter.listAvailableAccounts();
			expect(available).toHaveLength(1);
			expect(available[0].address).toBe(testAddress2);
		});
	});

	describe('importAccount()', () => {
		it('imports a specific account from the server', async () => {
			mockAccountsFetch();
			adapter = new RemoteCliAdapter({
				serverOrigin: 'http://localhost:5175',
				token: MOCK_TOKEN,
			});
			await adapter.initialize();

			mockAccountsFetch();
			const account = await adapter.importAccount({ address: testAddress1 });

			expect(account.address).toBe(testAddress1);
			expect(account.label).toBe('Test Key 1');
			expect(account.signer).toBeInstanceOf(CliProxySigner);
			expect(adapter.getAccounts()).toHaveLength(1);
		});

		it('throws when importing already-imported account', async () => {
			mockAccountsFetch();
			adapter = new RemoteCliAdapter({
				serverOrigin: 'http://localhost:5175',
				token: MOCK_TOKEN,
			});
			await adapter.initialize();

			mockAccountsFetch();
			await adapter.importAccount({ address: testAddress1 });

			await expect(adapter.importAccount({ address: testAddress1 })).rejects.toThrow(
				'already imported',
			);
		});

		it('notifies listeners on import', async () => {
			mockAccountsFetch();
			adapter = new RemoteCliAdapter({
				serverOrigin: 'http://localhost:5175',
				token: MOCK_TOKEN,
			});
			await adapter.initialize();

			const listener = vi.fn();
			adapter.onAccountsChanged(listener);

			mockAccountsFetch();
			await adapter.importAccount({ address: testAddress1 });

			expect(listener).toHaveBeenCalledTimes(1);
		});
	});

	describe('destroy()', () => {
		it('clears accounts and auth state', async () => {
			mockAccountsFetch();
			adapter = new RemoteCliAdapter({
				serverOrigin: 'http://localhost:5175',
				token: MOCK_TOKEN,
			});
			await adapter.initialize();

			adapter.destroy();
			expect(adapter.getAccounts()).toHaveLength(0);
			expect(adapter.isPaired).toBe(false);
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
			authToken: MOCK_TOKEN,
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
		it('sends transaction bytes to server with auth token', async () => {
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
				'http://localhost:5175/api/v1/sign-transaction',
				expect.objectContaining({
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${MOCK_TOKEN}`,
					},
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
	});

	describe('sign()', () => {
		it('throws — not used directly', async () => {
			await expect(signer.sign(new Uint8Array(32))).rejects.toThrow(
				'does not support direct digest signing',
			);
		});
	});
});
