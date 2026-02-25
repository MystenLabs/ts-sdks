// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import type { Server } from 'node:http';

import { createCliSigningMiddleware } from '../src/server/cli-signing-middleware.js';

// Mock child_process.execFile
vi.mock('node:child_process', () => ({
	execFile: vi.fn(),
}));

import { execFile } from 'node:child_process';
const mockExecFile = vi.mocked(execFile);

// Test data
const mockAccountList = [
	{
		alias: 'test-alias',
		suiAddress: '0xabc123',
		publicBase64Key: 'AHsXwcxaWNaNtCIIszwu7V2G6HO8aNM1598w/8y0zI5q',
		keyScheme: 'ed25519',
		flag: 0,
	},
];

const mockSignResult = {
	suiAddress: '0xabc123',
	rawTxData: 'dHhEYXRh',
	intent: { scope: 0, version: 0, appId: 0 },
	rawIntentMsg: 'aW50ZW50TXNn',
	digest: 'ZGlnZXN0',
	suiSignature: 'c2lnbmF0dXJl',
};

// Helper to set up a test HTTP server with the middleware
function createTestServer(): { server: Server; port: number; close: () => Promise<void> } {
	const middleware = createCliSigningMiddleware();

	const server = createServer((req, res) => {
		middleware(req, res, () => {
			res.writeHead(404, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ error: 'Not found (passthrough)' }));
		});
	});

	let resolvedPort: number;

	return {
		get port() {
			return resolvedPort;
		},
		server,
		close: () =>
			new Promise<void>((resolve) => {
				server.close(() => resolve());
			}),
	};
}

async function startServer(testServer: ReturnType<typeof createTestServer>): Promise<number> {
	return new Promise((resolve) => {
		testServer.server.listen(0, () => {
			const addr = testServer.server.address();
			const port = typeof addr === 'object' ? addr!.port : 0;
			resolve(port);
		});
	});
}

async function request(
	port: number,
	path: string,
	options?: { method?: string; body?: unknown },
): Promise<{ status: number; body: any }> {
	const res = await fetch(`http://localhost:${port}${path}`, {
		method: options?.method ?? 'GET',
		headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
		body: options?.body ? JSON.stringify(options.body) : undefined,
	});

	const body = await res.json();
	return { status: res.status, body };
}

describe('CLI Signing Middleware', () => {
	let testServer: ReturnType<typeof createTestServer>;
	let port: number;

	beforeEach(async () => {
		vi.clearAllMocks();
		testServer = createTestServer();
		port = await startServer(testServer);
	});

	afterEach(async () => {
		await testServer.close();
	});

	describe('GET /api/accounts', () => {
		it('returns accounts from sui keytool list', async () => {
			mockExecFile.mockImplementation((_cmd, _args, callback: any) => {
				callback(null, { stdout: JSON.stringify(mockAccountList), stderr: '' });
				return {} as any;
			});

			const { status, body } = await request(port, '/api/accounts');

			expect(status).toBe(200);
			expect(body.accounts).toEqual(mockAccountList);
		});

		it('calls sui keytool list --json', async () => {
			mockExecFile.mockImplementation((_cmd, _args, callback: any) => {
				callback(null, { stdout: '[]', stderr: '' });
				return {} as any;
			});

			await request(port, '/api/accounts');

			expect(mockExecFile).toHaveBeenCalledWith(
				'sui',
				['keytool', 'list', '--json'],
				expect.any(Function),
			);
		});

		it('returns 500 on CLI error', async () => {
			mockExecFile.mockImplementation((_cmd, _args, callback: any) => {
				callback(new Error('sui not found'), null);
				return {} as any;
			});

			const { status, body } = await request(port, '/api/accounts');

			expect(status).toBe(500);
			expect(body.error).toContain('Failed to list accounts');
		});
	});

	describe('POST /api/sign-transaction', () => {
		it('signs transaction via sui keytool sign', async () => {
			mockExecFile.mockImplementation((_cmd, _args, callback: any) => {
				callback(null, { stdout: JSON.stringify(mockSignResult), stderr: '' });
				return {} as any;
			});

			const { status, body } = await request(port, '/api/sign-transaction', {
				method: 'POST',
				body: { address: '0xabc123', txBytes: 'dHhEYXRh' },
			});

			expect(status).toBe(200);
			expect(body.suiSignature).toBe('c2lnbmF0dXJl');
			expect(body.digest).toBe('ZGlnZXN0');
		});

		it('calls sui keytool sign with correct arguments', async () => {
			mockExecFile.mockImplementation((_cmd, _args, callback: any) => {
				callback(null, { stdout: JSON.stringify(mockSignResult), stderr: '' });
				return {} as any;
			});

			await request(port, '/api/sign-transaction', {
				method: 'POST',
				body: { address: '0xabc123', txBytes: 'dHhEYXRh' },
			});

			expect(mockExecFile).toHaveBeenCalledWith(
				'sui',
				['keytool', 'sign', '--address', '0xabc123', '--data', 'dHhEYXRh', '--json'],
				expect.any(Function),
			);
		});

		it('rejects invalid address format', async () => {
			const { status, body } = await request(port, '/api/sign-transaction', {
				method: 'POST',
				body: { address: 'not-an-address', txBytes: 'dHhEYXRh' },
			});

			expect(status).toBe(400);
			expect(body.error).toContain('Invalid address format');
			expect(mockExecFile).not.toHaveBeenCalled();
		});

		it('rejects address without 0x prefix', async () => {
			const { status, body } = await request(port, '/api/sign-transaction', {
				method: 'POST',
				body: { address: 'abc123', txBytes: 'dHhEYXRh' },
			});

			expect(status).toBe(400);
			expect(body.error).toContain('Invalid address format');
		});

		it('rejects empty txBytes', async () => {
			const { status, body } = await request(port, '/api/sign-transaction', {
				method: 'POST',
				body: { address: '0xabc123', txBytes: '' },
			});

			expect(status).toBe(400);
			expect(body.error).toContain('Invalid txBytes');
		});

		it('rejects missing txBytes', async () => {
			const { status, body } = await request(port, '/api/sign-transaction', {
				method: 'POST',
				body: { address: '0xabc123' },
			});

			expect(status).toBe(400);
			expect(body.error).toContain('Invalid txBytes');
		});

		it('rejects invalid JSON body', async () => {
			const res = await fetch(`http://localhost:${port}/api/sign-transaction`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: 'not-json{{{',
			});

			expect(res.status).toBe(400);
			const body = await res.json();
			expect(body.error).toContain('Invalid JSON body');
		});

		it('rejects shell injection in address', async () => {
			const { status } = await request(port, '/api/sign-transaction', {
				method: 'POST',
				body: { address: '$(rm -rf /)', txBytes: 'dHhEYXRh' },
			});

			expect(status).toBe(400);
			expect(mockExecFile).not.toHaveBeenCalled();
		});

		it('rejects address with special characters', async () => {
			const { status } = await request(port, '/api/sign-transaction', {
				method: 'POST',
				body: { address: '0xabc; rm -rf /', txBytes: 'dHhEYXRh' },
			});

			expect(status).toBe(400);
			expect(mockExecFile).not.toHaveBeenCalled();
		});

		it('returns 500 on CLI error', async () => {
			mockExecFile.mockImplementation((_cmd, _args, callback: any) => {
				callback(new Error('Signing failed'), null);
				return {} as any;
			});

			const { status, body } = await request(port, '/api/sign-transaction', {
				method: 'POST',
				body: { address: '0xabc123', txBytes: 'dHhEYXRh' },
			});

			expect(status).toBe(500);
			expect(body.error).toContain('Signing failed');
		});
	});

	describe('POST /api/create-account', () => {
		it('creates account via sui client new-address', async () => {
			mockExecFile.mockImplementation((_cmd, _args, callback: any) => {
				callback(null, {
					stdout: JSON.stringify({
						alias: 'new-alias',
						address: '0xnew',
						keyScheme: 'ed25519',
						recoveryPhrase: 'word1 word2 word3',
					}),
					stderr: '',
				});
				return {} as any;
			});

			const { status, body } = await request(port, '/api/create-account', {
				method: 'POST',
				body: { scheme: 'ed25519' },
			});

			expect(status).toBe(200);
			expect(body.address).toBe('0xnew');
			expect(body.keyScheme).toBe('ed25519');
		});

		it('does not return recovery phrase', async () => {
			mockExecFile.mockImplementation((_cmd, _args, callback: any) => {
				callback(null, {
					stdout: JSON.stringify({
						alias: 'new-alias',
						address: '0xnew',
						keyScheme: 'ed25519',
						recoveryPhrase: 'secret words here',
					}),
					stderr: '',
				});
				return {} as any;
			});

			const { body } = await request(port, '/api/create-account', {
				method: 'POST',
				body: { scheme: 'ed25519' },
			});

			// Should not leak recovery phrase to browser
			expect(body.recoveryPhrase).toBeUndefined();
		});

		it('calls sui client new-address with correct arguments', async () => {
			mockExecFile.mockImplementation((_cmd, _args, callback: any) => {
				callback(null, { stdout: '{}', stderr: '' });
				return {} as any;
			});

			await request(port, '/api/create-account', {
				method: 'POST',
				body: { scheme: 'secp256k1' },
			});

			expect(mockExecFile).toHaveBeenCalledWith(
				'sui',
				['client', 'new-address', 'secp256k1', '--json'],
				expect.any(Function),
			);
		});

		it('defaults to ed25519', async () => {
			mockExecFile.mockImplementation((_cmd, _args, callback: any) => {
				callback(null, { stdout: '{}', stderr: '' });
				return {} as any;
			});

			await request(port, '/api/create-account', {
				method: 'POST',
				body: {},
			});

			expect(mockExecFile).toHaveBeenCalledWith(
				'sui',
				['client', 'new-address', 'ed25519', '--json'],
				expect.any(Function),
			);
		});

		it('rejects invalid scheme', async () => {
			const { status, body } = await request(port, '/api/create-account', {
				method: 'POST',
				body: { scheme: 'rsa4096' },
			});

			expect(status).toBe(400);
			expect(body.error).toContain('Invalid key scheme');
			expect(mockExecFile).not.toHaveBeenCalled();
		});

		it('rejects shell injection in scheme', async () => {
			const { status } = await request(port, '/api/create-account', {
				method: 'POST',
				body: { scheme: 'ed25519; rm -rf /' },
			});

			expect(status).toBe(400);
			expect(mockExecFile).not.toHaveBeenCalled();
		});
	});

	describe('passthrough', () => {
		it('passes non-API routes to next()', async () => {
			const { status, body } = await request(port, '/some-other-path');

			expect(status).toBe(404);
			expect(body.error).toBe('Not found (passthrough)');
		});

		it('passes non-matching methods to next()', async () => {
			const { status, body } = await request(port, '/api/accounts', {
				method: 'POST',
				body: {},
			});

			expect(status).toBe(404);
			expect(body.error).toBe('Not found (passthrough)');
		});
	});
});
