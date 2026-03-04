// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock window-wallet-core before importing the client
const mockSend = vi.fn();

const mockDecodeJwtSession = vi.fn(() => ({
	payload: {
		accounts: [
			{ address: '0xabc123', publicKey: '' },
			{ address: '0xdef456', publicKey: '' },
		],
	},
}));

vi.mock('@mysten/window-wallet-core', () => {
	return {
		DappPostMessageChannel: class MockChannel {
			appName: string;
			hostOrigin: string;
			constructor(opts: any) {
				this.appName = opts.appName;
				this.hostOrigin = opts.hostOrigin;
			}
			send = mockSend;
		},
		decodeJwtSession: mockDecodeJwtSession,
	};
});

// Mock wallet-standard getWallets
const mockRegister = vi.fn(() => vi.fn());
vi.mock('@mysten/wallet-standard', async (importOriginal) => {
	const original = (await importOriginal()) as any;
	return {
		...original,
		getWallets: vi.fn(() => ({
			register: mockRegister,
		})),
	};
});

const { DevWalletClient } = await import('../src/client/dev-wallet-client.js');

describe('DevWalletClient', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		// Restore default decodeJwtSession behavior
		mockDecodeJwtSession.mockReturnValue({
			payload: {
				accounts: [
					{ address: '0xabc123', publicKey: '' },
					{ address: '0xdef456', publicKey: '' },
				],
			},
		});
	});

	describe('constructor', () => {
		it('creates with default options', () => {
			const client = new DevWalletClient();
			expect(client.name).toBe('Dev Wallet (Web)');
			expect(client.version).toBe('1.0.0');
			expect(client.chains).toBeDefined();
			expect(client.accounts).toHaveLength(0);
		});

		it('creates with custom name', () => {
			const client = new DevWalletClient({ name: 'My Wallet' });
			expect(client.name).toBe('My Wallet');
		});

		it('has expected wallet-standard features', () => {
			const client = new DevWalletClient();
			const features = client.features;
			expect(features['standard:connect']).toBeDefined();
			expect(features['standard:events']).toBeDefined();
			expect(features['standard:disconnect']).toBeDefined();
			expect(features['sui:signPersonalMessage']).toBeDefined();
			expect(features['sui:signTransaction']).toBeDefined();
			expect(features['sui:signAndExecuteTransaction']).toBeDefined();
		});

		it('restores session from localStorage', () => {
			localStorage.setItem('dev-wallet:session:http://localhost:5174', 'stored-session-token');
			const client = new DevWalletClient();
			// decodeJwtSession mock returns 2 accounts
			expect(client.accounts).toHaveLength(2);
		});

		it('clears invalid session from localStorage', () => {
			localStorage.setItem('dev-wallet:session:http://localhost:5174', 'invalid-token');
			mockDecodeJwtSession.mockImplementationOnce(() => {
				throw new Error('Invalid session');
			});

			const client = new DevWalletClient();
			expect(client.accounts).toHaveLength(0);
			expect(localStorage.getItem('dev-wallet:session:http://localhost:5174')).toBeNull();
		});
	});

	describe('static register', () => {
		it('registers wallet with wallet-standard registry', () => {
			DevWalletClient.register({ origin: 'http://localhost:5174' });
			expect(mockRegister).toHaveBeenCalled();
		});

		it('returns unregister function', () => {
			const unregister = DevWalletClient.register();
			expect(typeof unregister).toBe('function');
		});
	});

	describe('connect', () => {
		it('opens popup channel and stores session', async () => {
			mockSend.mockResolvedValue({
				session: 'new-session-token',
			});

			const client = new DevWalletClient({ origin: 'http://localhost:5174' });
			const { connect } = client.features['standard:connect'];
			const result = await connect();

			expect(mockSend).toHaveBeenCalledWith({ type: 'connect' });
			expect(result.accounts).toHaveLength(2);
			expect(localStorage.getItem('dev-wallet:session:http://localhost:5174')).toBe(
				'new-session-token',
			);
		});
	});

	describe('disconnect', () => {
		it('clears session and accounts', async () => {
			localStorage.setItem('dev-wallet:session:http://localhost:5174', 'existing-session');
			const client = new DevWalletClient();

			const { disconnect } = client.features['standard:disconnect'];
			await disconnect();

			expect(client.accounts).toHaveLength(0);
			expect(localStorage.getItem('dev-wallet:session:http://localhost:5174')).toBeNull();
		});
	});

	describe('events', () => {
		it('can subscribe to and unsubscribe from events', () => {
			const client = new DevWalletClient();
			const { on } = client.features['standard:events'];
			const listener = vi.fn();

			const unsubscribe = on('change', listener);
			expect(typeof unsubscribe).toBe('function');

			unsubscribe();
		});

		it('emits change event on connect', async () => {
			mockSend.mockResolvedValue({ session: 'test-session' });

			const client = new DevWalletClient();
			const { on } = client.features['standard:events'];
			const listener = vi.fn();
			on('change', listener);

			const { connect } = client.features['standard:connect'];
			await connect();

			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					accounts: expect.any(Array),
				}),
			);
		});

		it('emits change event on disconnect', async () => {
			localStorage.setItem('dev-wallet:session:http://localhost:5174', 'test-session');
			const client = new DevWalletClient();
			const { on } = client.features['standard:events'];
			const listener = vi.fn();
			on('change', listener);

			// Clear listener from the session restore
			listener.mockClear();

			const { disconnect } = client.features['standard:disconnect'];
			await disconnect();

			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					accounts: expect.arrayContaining([]),
				}),
			);
		});
	});

	describe('signPersonalMessage', () => {
		it('sends sign-personal-message request via channel', async () => {
			localStorage.setItem('dev-wallet:session:http://localhost:5174', 'test-session');
			mockSend.mockResolvedValue({
				bytes: 'signed-bytes',
				signature: 'sig-123',
			});

			const client = new DevWalletClient();
			const { signPersonalMessage } = client.features['sui:signPersonalMessage'];

			const result = await signPersonalMessage({
				message: new Uint8Array([1, 2, 3]),
				account: client.accounts[0],
			});

			expect(mockSend).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'sign-personal-message',
					address: '0xabc123',
					session: 'test-session',
				}),
			);
			expect(result.bytes).toBe('signed-bytes');
			expect(result.signature).toBe('sig-123');
		});

		it('throws if no session', async () => {
			const client = new DevWalletClient();
			const { signPersonalMessage } = client.features['sui:signPersonalMessage'];

			await expect(
				signPersonalMessage({
					message: new Uint8Array([1, 2, 3]),
					account: {
						address: '0xabc123',
						publicKey: new Uint8Array(0),
						chains: ['sui:testnet'],
						features: [],
					},
				}),
			).rejects.toThrow('No active session');
		});
	});

	describe('signTransaction', () => {
		it('throws if no session', async () => {
			const client = new DevWalletClient();
			const { signTransaction } = client.features['sui:signTransaction'];

			const mockTransaction = { toJSON: vi.fn().mockResolvedValue('{}') };

			await expect(
				signTransaction({
					transaction: mockTransaction as any,
					account: {
						address: '0xabc123',
						publicKey: new Uint8Array(0),
						chains: ['sui:testnet'],
						features: [],
					},
					chain: 'sui:testnet',
				}),
			).rejects.toThrow('No active session');
		});

		it('sends sign-transaction request via channel', async () => {
			localStorage.setItem('dev-wallet:session:http://localhost:5174', 'test-session');
			mockSend.mockResolvedValue({
				bytes: 'tx-bytes',
				signature: 'tx-sig',
			});

			const client = new DevWalletClient();
			const { signTransaction } = client.features['sui:signTransaction'];

			const mockTransaction = { toJSON: vi.fn().mockResolvedValue('{"tx":"data"}') };

			const result = await signTransaction({
				transaction: mockTransaction as any,
				account: client.accounts[0],
				chain: 'sui:testnet',
			});

			expect(mockSend).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'sign-transaction',
					transaction: '{"tx":"data"}',
					address: '0xabc123',
					chain: 'sui:testnet',
					session: 'test-session',
				}),
			);
			expect(result.bytes).toBe('tx-bytes');
			expect(result.signature).toBe('tx-sig');
		});
	});

	describe('signAndExecuteTransaction', () => {
		it('throws if no session', async () => {
			const client = new DevWalletClient();
			const { signAndExecuteTransaction } = client.features['sui:signAndExecuteTransaction'];

			const mockTransaction = { toJSON: vi.fn().mockResolvedValue('{}') };

			await expect(
				signAndExecuteTransaction({
					transaction: mockTransaction as any,
					account: {
						address: '0xabc123',
						publicKey: new Uint8Array(0),
						chains: ['sui:testnet'],
						features: [],
					},
					chain: 'sui:testnet',
				}),
			).rejects.toThrow('No active session');
		});

		it('sends sign-and-execute-transaction request via channel', async () => {
			localStorage.setItem('dev-wallet:session:http://localhost:5174', 'test-session');
			mockSend.mockResolvedValue({
				bytes: 'exec-bytes',
				signature: 'exec-sig',
				digest: 'tx-digest',
				effects: 'effects-data',
			});

			const client = new DevWalletClient();
			const { signAndExecuteTransaction } = client.features['sui:signAndExecuteTransaction'];

			const mockTransaction = { toJSON: vi.fn().mockResolvedValue('{"tx":"exec"}') };

			const result = await signAndExecuteTransaction({
				transaction: mockTransaction as any,
				account: client.accounts[0],
				chain: 'sui:testnet',
			});

			expect(mockSend).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'sign-and-execute-transaction',
					transaction: '{"tx":"exec"}',
					address: '0xabc123',
					chain: 'sui:testnet',
					session: 'test-session',
				}),
			);
			expect(result.bytes).toBe('exec-bytes');
			expect(result.signature).toBe('exec-sig');
			expect(result.digest).toBe('tx-digest');
			expect(result.effects).toBe('effects-data');
		});
	});

	describe('icon', () => {
		it('has a default icon', () => {
			const client = new DevWalletClient();
			expect(client.icon).toContain('data:image/svg+xml');
		});

		it('accepts custom icon', () => {
			const customIcon = 'data:image/png;base64,abc' as any;
			const client = new DevWalletClient({ icon: customIcon });
			expect(client.icon).toBe(customIcon);
		});
	});
});
