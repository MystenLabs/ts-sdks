// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { execFile } from 'node:child_process';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import { isValidSuiAddress } from '@mysten/sui/utils';
import { Hono } from 'hono';

const execFileAsync = promisify(execFile);

function isValidBase64(value: unknown): value is string {
	if (typeof value !== 'string' || value.length === 0) return false;
	return /^[A-Za-z0-9+/]+=*$/.test(value) && value.length <= 1_000_000;
}

const MAX_BODY_SIZE = 2 * 1024 * 1024; // 2 MB

function generateToken(): string {
	return randomBytes(32).toString('hex');
}

export interface CliSigningMiddlewareOptions {
	/** The port the server is listening on, used for DNS rebinding protection. */
	port: number;
}

export interface CliSigningMiddlewareResult {
	app: Hono;
	token: string;
}

/**
 * Create a Hono sub-app that exposes signing endpoints backed by the `sui` CLI.
 *
 * Uses token-in-URL auth: a 256-bit random token is embedded in the URL printed
 * to the terminal and sent as `Authorization: Bearer <token>` on subsequent requests.
 * All CLI calls use `execFile` to prevent shell injection.
 */
export function createCliSigningMiddleware(
	options: CliSigningMiddlewareOptions,
): CliSigningMiddlewareResult {
	const { port } = options;
	const token = generateToken();

	function isAuthenticated(authHeader: string | undefined): boolean {
		if (!token) return false;
		if (!authHeader || !/^bearer /i.test(authHeader)) return false;
		const provided = authHeader.slice(7);
		if (provided.length !== token.length) return false;
		return timingSafeEqual(Buffer.from(provided), Buffer.from(token));
	}

	const app = new Hono();

	// DNS rebinding protection — reject non-localhost hosts
	app.use('*', async (c, next) => {
		const host = c.req.header('host') ?? '';
		const allowedHosts = new Set([`localhost:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`]);
		if (host && !allowedHosts.has(host)) {
			return c.json({ error: 'Requests must originate from localhost.' }, 403);
		}
		return await next();
	});

	// Token authentication for API routes
	app.use('/api/*', async (c, next) => {
		if (!isAuthenticated(c.req.header('authorization'))) {
			return c.json(
				{ error: 'Authentication required. Open the token URL from the terminal.' },
				401,
			);
		}
		return await next();
	});

	// GET /api/v1/accounts — list accounts from sui CLI keystore
	app.get('/api/v1/accounts', async (c) => {
		try {
			const { stdout } = await execFileAsync('sui', ['keytool', 'list', '--json']);
			const accounts = JSON.parse(stdout);
			return c.json({ accounts });
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			const isExecError = message.includes('ENOENT') || message.includes('not found');
			return c.json(
				{
					error: isExecError
						? 'Failed to list accounts: sui CLI not found.'
						: 'Failed to list accounts.',
				},
				500,
			);
		}
	});

	// POST /api/v1/sign-transaction — sign BCS-serialized TransactionData
	app.post('/api/v1/sign-transaction', async (c) => {
		const contentLength = c.req.header('content-length');
		if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
			return c.json({ error: 'Request body too large' }, 413);
		}

		let body: { address?: unknown; txBytes?: unknown };
		try {
			body = await c.req.json();
		} catch {
			return c.json({ error: 'Invalid JSON body' }, 400);
		}

		if (typeof body.address !== 'string' || !isValidSuiAddress(body.address)) {
			return c.json({ error: 'Invalid address format. Expected 0x-prefixed hex.' }, 400);
		}

		if (!isValidBase64(body.txBytes)) {
			return c.json({ error: 'Invalid txBytes. Expected non-empty base64 string.' }, 400);
		}

		try {
			const { stdout } = await execFileAsync('sui', [
				'keytool',
				'sign',
				'--address',
				body.address,
				'--data',
				body.txBytes as string,
				'--json',
			]);

			const result = JSON.parse(stdout);
			return c.json({ suiSignature: result.suiSignature, digest: result.digest });
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			console.error('[dev-wallet] CLI signing error:', message);

			if (message.includes('not found') || message.includes('Cannot find key')) {
				return c.json({ error: `Address not found in keystore: ${body.address}` }, 404);
			}

			return c.json({ error: 'Signing failed due to a CLI error.' }, 500);
		}
	});

	return { app, token };
}
