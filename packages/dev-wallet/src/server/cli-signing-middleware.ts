// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { execFile } from 'node:child_process';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// ── Input validation ─────────────────────────────────────────────────────────

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{1,64}$/;

function isValidAddress(value: unknown): value is string {
	return typeof value === 'string' && ADDRESS_PATTERN.test(value);
}

function isValidBase64(value: unknown): value is string {
	if (typeof value !== 'string' || value.length === 0) return false;
	// Only allow base64 characters (standard + URL-safe), padding, and reasonable length
	return /^[A-Za-z0-9+/\-_]+=*$/.test(value) && value.length <= 1_000_000;
}

// ── Body parsing ─────────────────────────────────────────────────────────────

const MAX_BODY_SIZE = 2 * 1024 * 1024; // 2 MB

function collectBody(req: IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		let size = 0;

		req.on('data', (chunk: Buffer) => {
			size += chunk.length;
			if (size > MAX_BODY_SIZE) {
				req.destroy();
				reject(new Error('Request body too large'));
			}
			chunks.push(chunk);
		});

		req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
		req.on('error', reject);
	});
}

// ── JSON response helpers ────────────────────────────────────────────────────

function jsonResponse(res: ServerResponse, status: number, body: unknown): void {
	res.writeHead(status, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify(body));
}

function errorResponse(res: ServerResponse, status: number, message: string): void {
	jsonResponse(res, status, { error: message });
}

// ── Route handlers ───────────────────────────────────────────────────────────

/**
 * GET /api/accounts
 *
 * Lists accounts from the Sui CLI keystore via `sui keytool list --json`.
 * Returns account metadata only — no private key material.
 */
async function handleListAccounts(res: ServerResponse): Promise<void> {
	try {
		const { stdout } = await execFileAsync('sui', ['keytool', 'list', '--json']);
		const accounts = JSON.parse(stdout);
		jsonResponse(res, 200, { accounts });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		const isExecError = message.includes('ENOENT') || message.includes('not found');
		errorResponse(
			res,
			500,
			isExecError ? 'Failed to list accounts: sui CLI not found.' : 'Failed to list accounts.',
		);
	}
}

/**
 * POST /api/sign-transaction
 *
 * Signs BCS-serialized TransactionData via `sui keytool sign`.
 * The CLI reads keys from the keystore internally — our code never
 * touches private key material.
 *
 * Request body: `{ address: string, txBytes: string (base64) }`
 * Response: `{ suiSignature: string, digest: string }`
 */
async function handleSignTransaction(req: IncomingMessage, res: ServerResponse): Promise<void> {
	let body: { address?: unknown; txBytes?: unknown };
	try {
		body = JSON.parse(await collectBody(req));
	} catch {
		return errorResponse(res, 400, 'Invalid JSON body');
	}

	if (!isValidAddress(body.address)) {
		return errorResponse(res, 400, 'Invalid address format. Expected 0x-prefixed hex.');
	}

	if (!isValidBase64(body.txBytes)) {
		return errorResponse(res, 400, 'Invalid txBytes. Expected non-empty base64 string.');
	}

	try {
		// All arguments are passed as an array — no shell interpretation.
		// address: validated by ADDRESS_PATTERN (hex only)
		// txBytes: validated as base64 (alphanumeric + /+=)
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
		jsonResponse(res, 200, {
			suiSignature: result.suiSignature,
			digest: result.digest,
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error('[dev-wallet] CLI signing error:', message);

		// Check for common CLI errors — return sanitized messages
		if (message.includes('not found') || message.includes('Cannot find key')) {
			return errorResponse(res, 404, `Address not found in keystore: ${body.address}`);
		}

		errorResponse(res, 500, 'Signing failed due to a CLI error.');
	}
}

// ── Token generation ────────────────────────────────────────────────────────

function generateToken(): string {
	return randomBytes(32).toString('hex');
}

// ── Middleware ────────────────────────────────────────────────────────────────

type NextFunction = () => void;

export interface CliSigningMiddlewareOptions {
	/**
	 * When true, skip token authentication. Useful for testing.
	 * @default false
	 */
	skipAuth?: boolean;
}

export interface CliSigningMiddlewareResult {
	middleware: (req: IncomingMessage, res: ServerResponse, next: NextFunction) => void;
	/** Cryptographically strong token for URL-based auth (Jupyter-style). Null if auth is skipped. */
	token: string | null;
}

/**
 * Create a Connect-compatible middleware that exposes signing endpoints
 * backed by the `sui` CLI.
 *
 * Authentication uses a **token-in-URL** approach (same pattern as Jupyter
 * notebooks). The CLI server generates a 256-bit random token, embeds it
 * in the URL printed to the terminal. Opening that URL auto-authenticates
 * the browser session via `Authorization: Bearer <token>`.
 *
 * All CLI calls use `execFile` (not `exec`) to prevent shell injection.
 * All user-supplied inputs are validated before being passed as CLI arguments.
 */
export function createCliSigningMiddleware(
	options?: CliSigningMiddlewareOptions,
): CliSigningMiddlewareResult {
	const skipAuth = options?.skipAuth ?? false;
	const token = skipAuth ? null : generateToken();

	function isAuthenticated(req: IncomingMessage): boolean {
		if (skipAuth) return true;
		if (!token) return false;
		const auth = req.headers.authorization;
		if (!auth?.startsWith('Bearer ')) return false;
		const provided = auth.slice(7);
		if (provided.length !== token.length) return false;
		return timingSafeEqual(Buffer.from(provided), Buffer.from(token));
	}

	const middleware = (req: IncomingMessage, res: ServerResponse, next: NextFunction) => {
		const url = req.url ?? '';

		// Reject requests from non-localhost hosts (DNS rebinding protection)
		const host = (req.headers.host ?? '').replace(/:\d+$/, '');
		if (host && host !== 'localhost' && host !== '127.0.0.1' && host !== '[::1]') {
			errorResponse(res, 403, 'Requests must originate from localhost.');
			return;
		}

		// All API routes require authentication
		if (url.startsWith('/api/') && !isAuthenticated(req)) {
			errorResponse(res, 401, 'Authentication required. Open the token URL from the terminal.');
			return;
		}

		if (url === '/api/accounts' && req.method === 'GET') {
			handleListAccounts(res).catch(() => errorResponse(res, 500, 'Internal server error'));
			return;
		}

		if (url === '/api/sign-transaction' && req.method === 'POST') {
			handleSignTransaction(req, res).catch(() => errorResponse(res, 500, 'Internal server error'));
			return;
		}

		next();
	};

	return { middleware, token };
}
