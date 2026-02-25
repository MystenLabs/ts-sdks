// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toBase64 } from '@mysten/sui/utils';

import { InMemorySignerAdapter } from '../src/adapters/in-memory-adapter.js';

// Mock window-wallet-core
vi.mock('@mysten/window-wallet-core', () => {
	const mockChannel = {
		getRequestData: vi.fn(),
		sendMessage: vi.fn(),
	};

	return {
		WalletPostMessageChannel: {
			fromUrlHash: vi.fn(() => mockChannel),
		},
		createJwtSession: vi.fn(async () => 'mock-jwt-session-token'),
		__mockChannel: mockChannel,
	};
});

// Get mock references
const windowWalletCore = await import('@mysten/window-wallet-core');
const mockChannel = (windowWalletCore as any).__mockChannel;
const { WalletPostMessageChannel } = windowWalletCore;

// Import after mock setup
const { parseWalletRequest } = await import('../src/server/request-handler.js');

describe('parseWalletRequest', () => {
	let adapter: InMemorySignerAdapter;
	const jwtSecretKey = crypto.getRandomValues(new Uint8Array(32));

	beforeEach(async () => {
		vi.clearAllMocks();
		adapter = new InMemorySignerAdapter();
		await adapter.initialize();
		await adapter.createAccount({ label: 'Test Account' });
	});

	describe('connect requests', () => {
		beforeEach(() => {
			mockChannel.getRequestData.mockReturnValue({
				appName: 'Test dApp',
				appUrl: 'http://localhost:3000',
				payload: { type: 'connect' },
			});
		});

		it('returns a connect request with correct metadata', () => {
			const request = parseWalletRequest({
				adapters: [adapter],
				jwtSecretKey,
				hash: 'fake-encoded-hash',
			});

			expect(request.type).toBe('connect');
			expect(request.appName).toBe('Test dApp');
			expect(request.appUrl).toBe('http://localhost:3000');
			expect(request.address).toBeUndefined();
			expect(request.chain).toBeUndefined();
			expect(request.data).toBeUndefined();
		});

		it('approve sends a resolve message with session', async () => {
			const request = parseWalletRequest({
				adapters: [adapter],
				jwtSecretKey,
				hash: 'fake-encoded-hash',
			});

			await request.approve();

			expect(mockChannel.sendMessage).toHaveBeenCalledWith({
				type: 'resolve',
				data: { type: 'connect', session: 'mock-jwt-session-token' },
			});
		});

		it('reject sends a reject message', () => {
			const request = parseWalletRequest({
				adapters: [adapter],
				jwtSecretKey,
				hash: 'fake-encoded-hash',
			});

			request.reject('User rejected');

			expect(mockChannel.sendMessage).toHaveBeenCalledWith({
				type: 'reject',
				reason: 'User rejected',
			});
		});

		it('reject sends a reject message with no reason', () => {
			const request = parseWalletRequest({
				adapters: [adapter],
				jwtSecretKey,
				hash: 'fake-encoded-hash',
			});

			request.reject();

			expect(mockChannel.sendMessage).toHaveBeenCalledWith({
				type: 'reject',
				reason: undefined,
			});
		});
	});

	describe('sign-personal-message requests', () => {
		const testMessage = new TextEncoder().encode('hello world');

		beforeEach(() => {
			const account = adapter.getAccounts()[0];
			mockChannel.getRequestData.mockReturnValue({
				appName: 'Test dApp',
				appUrl: 'http://localhost:3000',
				payload: {
					type: 'sign-personal-message',
					message: toBase64(testMessage),
					address: account.address,
					chain: 'sui:testnet',
				},
			});
		});

		it('returns correct request metadata', () => {
			const account = adapter.getAccounts()[0];
			const request = parseWalletRequest({
				adapters: [adapter],
				jwtSecretKey,
				hash: 'fake-encoded-hash',
			});

			expect(request.type).toBe('sign-personal-message');
			expect(request.address).toBe(account.address);
			expect(request.chain).toBe('sui:testnet');
			expect(request.data).toBeInstanceOf(Uint8Array);
		});

		it('approve signs the message and sends resolve', async () => {
			const request = parseWalletRequest({
				adapters: [adapter],
				jwtSecretKey,
				hash: 'fake-encoded-hash',
			});

			await request.approve();

			expect(mockChannel.sendMessage).toHaveBeenCalledWith({
				type: 'resolve',
				data: expect.objectContaining({
					type: 'sign-personal-message',
					bytes: expect.any(String),
					signature: expect.any(String),
				}),
			});
		});

		it('approve rejects when account is not found', async () => {
			// Override payload with unknown address
			mockChannel.getRequestData.mockReturnValue({
				appName: 'Test dApp',
				appUrl: 'http://localhost:3000',
				payload: {
					type: 'sign-personal-message',
					message: toBase64(testMessage),
					address: '0xdeadbeef',
					chain: 'sui:testnet',
				},
			});

			const request = parseWalletRequest({
				adapters: [adapter],
				jwtSecretKey,
				hash: 'fake-encoded-hash',
			});

			await request.approve();

			expect(mockChannel.sendMessage).toHaveBeenCalledWith({
				type: 'reject',
				reason: 'Account 0xdeadbeef not found',
			});
		});
	});

	describe('sign-transaction requests', () => {
		it('returns correct request metadata', () => {
			const account = adapter.getAccounts()[0];
			mockChannel.getRequestData.mockReturnValue({
				appName: 'Test dApp',
				appUrl: 'http://localhost:3000',
				payload: {
					type: 'sign-transaction',
					transaction: '{}',
					address: account.address,
					chain: 'sui:testnet',
				},
			});

			const request = parseWalletRequest({
				adapters: [adapter],
				jwtSecretKey,
				hash: 'fake-encoded-hash',
			});

			expect(request.type).toBe('sign-transaction');
			expect(request.data).toBe('{}');
			expect(request.address).toBe(account.address);
			expect(request.chain).toBe('sui:testnet');
		});

		it('approve rejects if no client for network', async () => {
			const account = adapter.getAccounts()[0];
			mockChannel.getRequestData.mockReturnValue({
				appName: 'Test dApp',
				appUrl: 'http://localhost:3000',
				payload: {
					type: 'sign-transaction',
					transaction: '{}',
					address: account.address,
					chain: 'sui:testnet',
				},
			});

			const request = parseWalletRequest({
				adapters: [adapter],
				jwtSecretKey,
				hash: 'fake-encoded-hash',
				// no clients provided
			});

			await request.approve();

			expect(mockChannel.sendMessage).toHaveBeenCalledWith({
				type: 'reject',
				reason: expect.stringContaining('No client provided'),
			});
		});
	});

	describe('sign-and-execute-transaction requests', () => {
		it('returns correct request metadata', () => {
			const account = adapter.getAccounts()[0];
			mockChannel.getRequestData.mockReturnValue({
				appName: 'Test dApp',
				appUrl: 'http://localhost:3000',
				payload: {
					type: 'sign-and-execute-transaction',
					transaction: '{"kind":"ProgrammableTransaction"}',
					address: account.address,
					chain: 'sui:devnet',
				},
			});

			const request = parseWalletRequest({
				adapters: [adapter],
				jwtSecretKey,
				hash: 'fake-encoded-hash',
			});

			expect(request.type).toBe('sign-and-execute-transaction');
			expect(request.chain).toBe('sui:devnet');
		});
	});

	describe('hash parameter', () => {
		it('passes hash to WalletPostMessageChannel.fromUrlHash', () => {
			mockChannel.getRequestData.mockReturnValue({
				appName: 'Test dApp',
				appUrl: 'http://localhost:3000',
				payload: { type: 'connect' },
			});

			parseWalletRequest({
				adapters: [adapter],
				jwtSecretKey,
				hash: 'my-custom-hash',
			});

			expect(WalletPostMessageChannel.fromUrlHash).toHaveBeenCalledWith('my-custom-hash');
		});
	});
});
