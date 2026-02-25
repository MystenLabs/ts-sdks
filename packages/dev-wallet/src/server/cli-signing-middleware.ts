// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { execFile } from 'node:child_process';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// ── Input validation ─────────────────────────────────────────────────────────

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{1,64}$/;
const VALID_SCHEMES = new Set(['ed25519', 'secp256k1', 'secp256r1']);

function isValidAddress(value: unknown): value is string {
	return typeof value === 'string' && ADDRESS_PATTERN.test(value);
}

function isValidBase64(value: unknown): value is string {
	if (typeof value !== 'string' || value.length === 0) return false;
	// Only allow base64 characters (standard + URL-safe), padding, and reasonable length
	return /^[A-Za-z0-9+/\-_]+=*$/.test(value) && value.length <= 1_000_000;
}

function isValidScheme(value: unknown): value is string {
	return typeof value === 'string' && VALID_SCHEMES.has(value);
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
		errorResponse(res, 500, `Failed to list accounts: ${message}`);
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

		// Check for common CLI errors
		if (message.includes('not found') || message.includes('Cannot find key')) {
			return errorResponse(res, 404, `Address not found in keystore: ${body.address}`);
		}

		errorResponse(res, 500, `Signing failed: ${message}`);
	}
}

/**
 * POST /api/create-account
 *
 * Creates a new account via `sui client new-address`.
 *
 * Request body: `{ scheme?: string }`
 * Response: `{ address: string, keyScheme: string }`
 */
async function handleCreateAccount(req: IncomingMessage, res: ServerResponse): Promise<void> {
	let body: { scheme?: unknown } = {};
	try {
		const raw = await collectBody(req);
		if (raw.length > 0) {
			body = JSON.parse(raw);
		}
	} catch {
		return errorResponse(res, 400, 'Invalid JSON body');
	}

	const scheme = body.scheme ?? 'ed25519';
	if (!isValidScheme(scheme)) {
		return errorResponse(
			res,
			400,
			`Invalid key scheme: ${String(scheme)}. Must be one of: ${[...VALID_SCHEMES].join(', ')}`,
		);
	}

	try {
		// scheme: validated against VALID_SCHEMES allowlist
		const { stdout } = await execFileAsync('sui', ['client', 'new-address', scheme, '--json']);

		const result = JSON.parse(stdout);
		jsonResponse(res, 200, {
			address: result.address,
			keyScheme: result.keyScheme,
			alias: result.alias,
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		errorResponse(res, 500, `Account creation failed: ${message}`);
	}
}

// ── Middleware ────────────────────────────────────────────────────────────────

type NextFunction = () => void;

/**
 * Create a Connect-compatible middleware that exposes signing endpoints
 * backed by the `sui` CLI.
 *
 * All CLI calls use `execFile` (not `exec`) to prevent shell injection.
 * All user-supplied inputs are validated before being passed as CLI arguments.
 *
 * @example
 * ```typescript
 * const server = await createServer({ ... });
 * server.middlewares.use(createCliSigningMiddleware());
 * await server.listen();
 * ```
 */
export function createCliSigningMiddleware(): (
	req: IncomingMessage,
	res: ServerResponse,
	next: NextFunction,
) => void {
	return (req: IncomingMessage, res: ServerResponse, next: NextFunction) => {
		const url = req.url ?? '';

		if (url === '/api/accounts' && req.method === 'GET') {
			handleListAccounts(res).catch(() => errorResponse(res, 500, 'Internal server error'));
			return;
		}

		if (url === '/api/sign-transaction' && req.method === 'POST') {
			handleSignTransaction(req, res).catch(() => errorResponse(res, 500, 'Internal server error'));
			return;
		}

		if (url === '/api/create-account' && req.method === 'POST') {
			handleCreateAccount(req, res).catch(() => errorResponse(res, 500, 'Internal server error'));
			return;
		}

		next();
	};
}
