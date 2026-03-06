// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createServer } from 'node:net';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { serve } from '@hono/node-server';
import { Hono } from 'hono';

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
		suiAddress: '0x00000000000000000000000000000000000000000000000000000000000abc23',
		publicBase64Key: 'AHsXwcxaWNaNtCIIszwu7V2G6HO8aNM1598w/8y0zI5q',
		keyScheme: 'ed25519',
		flag: 0,
	},
];

const mockSignResult = {
	suiAddress: '0x00000000000000000000000000000000000000000000000000000000000abc23',
	rawTxData: 'dHhEYXRh',
	intent: { scope: 0, version: 0, appId: 0 },
	rawIntentMsg: 'aW50ZW50TXNn',
	digest: 'ZGlnZXN0',
	suiSignature: 'c2lnbmF0dXJl',
};

/** Find an available port by briefly listening on port 0. */
function getAvailablePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const srv = createServer();
		srv.listen(0, () => {
			const addr = srv.address();
			const port = typeof addr === 'object' ? addr!.port : 0;
			srv.close((err) => (err ? reject(err) : resolve(port)));
		});
	});
}

// Helper to set up a test HTTP server with the middleware
async function createTestServer(): Promise<{
	server: Server;
	token: string;
	port: number;
	close: () => Promise<void>;
}> {
	const port = await getAvailablePort();
	const { app: cliApp, token } = createCliSigningMiddleware({ port });

	const app = new Hono();
	app.route('/', cliApp);
	app.all('*', (c) => c.json({ error: 'Not found (passthrough)' }, 404));

	const server = serve({ fetch: app.fetch, port }) as Server;

	return {
		server,
		token,
		port,
		close: () =>
			new Promise<void>((resolve) => {
				server.close(() => resolve());
			}),
	};
}

async function request(
	port: number,
	path: string,
	options?: { method?: string; body?: unknown; token?: string },
): Promise<{ status: number; body: any }> {
	const headers: Record<string, string> = {};
	if (options?.body) headers['Content-Type'] = 'application/json';
	if (options?.token) headers['Authorization'] = `Bearer ${options.token}`;

	const res = await fetch(`http://localhost:${port}${path}`, {
		method: options?.method ?? 'GET',
		headers,
		body: options?.body ? JSON.stringify(options.body) : undefined,
	});

	const body = await res.json();
	return { status: res.status, body };
}

describe('CLI Signing Middleware', () => {
	let testServer: Awaited<ReturnType<typeof createTestServer>>;
	let port: number;

	beforeEach(async () => {
		vi.clearAllMocks();
		testServer = await createTestServer();
		port = testServer.port;
	});

	afterEach(async () => {
		await testServer.close();
	});

	describe('GET /api/v1/accounts', () => {
		it('returns accounts from sui keytool list', async () => {
			mockExecFile.mockImplementation((_cmd, _args, callback: any) => {
				callback(null, { stdout: JSON.stringify(mockAccountList), stderr: '' });
				return {} as any;
			});

			const { status, body } = await request(port, '/api/v1/accounts', {
				token: testServer.token,
			});

			expect(status).toBe(200);
			expect(body.accounts).toEqual(mockAccountList);
		});

		it('calls sui keytool list --json', async () => {
			mockExecFile.mockImplementation((_cmd, _args, callback: any) => {
				callback(null, { stdout: '[]', stderr: '' });
				return {} as any;
			});

			await request(port, '/api/v1/accounts', { token: testServer.token });

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

			const { status, body } = await request(port, '/api/v1/accounts', {
				token: testServer.token,
			});

			expect(status).toBe(500);
			expect(body.error).toContain('Failed to list accounts');
		});
	});

	describe('POST /api/v1/sign-transaction', () => {
		it('signs transaction via sui keytool sign', async () => {
			mockExecFile.mockImplementation((_cmd, _args, callback: any) => {
				callback(null, { stdout: JSON.stringify(mockSignResult), stderr: '' });
				return {} as any;
			});

			const { status, body } = await request(port, '/api/v1/sign-transaction', {
				method: 'POST',
				body: {
					address: '0x00000000000000000000000000000000000000000000000000000000000abc23',
					txBytes: 'dHhEYXRh',
				},
				token: testServer.token,
			});

			expect(status).toBe(200);
			expect(body.suiSignature).toBe('c2lnbmF0dXJl');
			expect(body.digest).toBe('ZGlnZXN0');
		});

		it('rejects invalid address format', async () => {
			const { status, body } = await request(port, '/api/v1/sign-transaction', {
				method: 'POST',
				body: { address: 'not-an-address', txBytes: 'dHhEYXRh' },
				token: testServer.token,
			});

			expect(status).toBe(400);
			expect(body.error).toContain('Invalid address format');
			expect(mockExecFile).not.toHaveBeenCalled();
		});

		it('rejects empty txBytes', async () => {
			const { status, body } = await request(port, '/api/v1/sign-transaction', {
				method: 'POST',
				body: {
					address: '0x00000000000000000000000000000000000000000000000000000000000abc23',
					txBytes: '',
				},
				token: testServer.token,
			});

			expect(status).toBe(400);
			expect(body.error).toContain('Invalid txBytes');
		});

		it('rejects shell injection in address', async () => {
			const { status } = await request(port, '/api/v1/sign-transaction', {
				method: 'POST',
				body: { address: '$(rm -rf /)', txBytes: 'dHhEYXRh' },
				token: testServer.token,
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
	});

	describe('DNS rebinding protection', () => {
		it('rejects requests from non-localhost Host header', async () => {
			// Use raw http.request since fetch overrides the Host header
			const http = await import('node:http');
			const { status, body } = await new Promise<{ status: number; body: any }>((resolve) => {
				const req = http.request(
					{
						hostname: '127.0.0.1',
						port,
						path: '/api/v1/accounts',
						method: 'GET',
						headers: { Host: 'evil.example.com' },
					},
					(res) => {
						let data = '';
						res.on('data', (chunk: Buffer) => (data += chunk));
						res.on('end', () => resolve({ status: res.statusCode!, body: JSON.parse(data) }));
					},
				);
				req.end();
			});
			expect(status).toBe(403);
			expect(body.error).toContain('localhost');
		});

		it('rejects requests with wrong port in Host header', async () => {
			const http = await import('node:http');
			const { status, body } = await new Promise<{ status: number; body: any }>((resolve) => {
				const req = http.request(
					{
						hostname: '127.0.0.1',
						port,
						path: '/api/v1/accounts',
						method: 'GET',
						headers: { Host: 'localhost:9999' },
					},
					(res) => {
						let data = '';
						res.on('data', (chunk: Buffer) => (data += chunk));
						res.on('end', () => resolve({ status: res.statusCode!, body: JSON.parse(data) }));
					},
				);
				req.end();
			});
			expect(status).toBe(403);
			expect(body.error).toContain('localhost');
		});
	});

	describe('body validation', () => {
		it('returns 400 for invalid JSON body', async () => {
			const res = await fetch(`http://localhost:${port}/api/v1/sign-transaction`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${testServer.token}`,
				},
				body: '{invalid json',
			});
			const body = await res.json();
			expect(res.status).toBe(400);
			expect(body.error).toContain('Invalid JSON');
		});
	});
});

describe('Token Authentication', () => {
	let testServer: Awaited<ReturnType<typeof createTestServer>>;
	let port: number;

	beforeEach(async () => {
		vi.clearAllMocks();
		testServer = await createTestServer();
		port = testServer.port;
	});

	afterEach(async () => {
		await testServer.close();
	});

	it('generates a 64-char hex token', () => {
		expect(testServer.token).toBeTruthy();
		expect(testServer.token).toMatch(/^[0-9a-f]{64}$/);
	});

	it('rejects API calls without authentication', async () => {
		const { status, body } = await request(port, '/api/v1/accounts');

		expect(status).toBe(401);
		expect(body.error).toContain('Authentication required');
	});

	it('allows API calls with valid token', async () => {
		mockExecFile.mockImplementation((_cmd, _args, callback: any) => {
			callback(null, { stdout: '[]', stderr: '' });
			return {} as any;
		});

		const { status } = await request(port, '/api/v1/accounts', {
			token: testServer.token,
		});

		expect(status).toBe(200);
	});

	it('rejects API calls with invalid token', async () => {
		const { status } = await request(port, '/api/v1/accounts', {
			token: 'invalid-token',
		});

		expect(status).toBe(401);
	});

	it('accepts Bearer scheme case-insensitively', async () => {
		mockExecFile.mockImplementation((_cmd, _args, callback: any) => {
			callback(null, { stdout: '[]', stderr: '' });
			return {} as any;
		});

		const res = await fetch(`http://localhost:${port}/api/v1/accounts`, {
			headers: { Authorization: `bearer ${testServer.token}` },
		});

		expect(res.status).toBe(200);
	});

	it('passthrough routes are not affected by auth', async () => {
		const { status, body } = await request(port, '/some-other-path');

		expect(status).toBe(404);
		expect(body.error).toBe('Not found (passthrough)');
	});
});
