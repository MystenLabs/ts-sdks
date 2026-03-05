#!/usr/bin/env node
// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { parseArgs, promisify } from 'node:util';

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const execFileAsync = promisify(execFile);

const MIME_TYPES: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'application/javascript',
	'.mjs': 'application/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.ico': 'image/x-icon',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
};

function findStandaloneDir(startDir: string): string | null {
	let dir = startDir;
	for (let i = 0; i < 5; i++) {
		const candidate = resolve(dir, 'standalone');
		if (existsSync(resolve(candidate, 'index.html'))) return candidate;
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	return null;
}

function formatStartupMessage(options: {
	walletUrl: string;
	baseUrl: string;
	adapters: string[];
	hasSuiCli: boolean;
	bookmarkletCode: string;
}): string {
	const { walletUrl, baseUrl, adapters, hasSuiCli, bookmarkletCode } = options;
	return `
  Dev Wallet running at ${walletUrl}
  Adapters: ${adapters.join(', ')}${!hasSuiCli ? '\n  (Install sui CLI to enable CLI signing)' : ''}

  To connect from your dApp:

    import { DevWalletClient } from '@mysten/dev-wallet/client';
    DevWalletClient.register({ origin: '${baseUrl}' });

  Or use the bookmarklet — drag from the Settings tab, or copy:

    ${bookmarkletCode}

  Or paste in the browser console:

    var s=document.createElement('script');s.src='${baseUrl}/bookmarklet.js';document.head.appendChild(s);

  Press Ctrl+C to stop.
`;
}

async function main() {
	const { values } = parseArgs({
		options: {
			port: { type: 'string', default: '5174' },
			help: { type: 'boolean', short: 'h' },
		},
		allowPositionals: true,
	});

	if (values.help) {
		console.log(`
Usage: dev-wallet serve [options]

Start a dev wallet web app for dApp signing.

Options:
  --port <number>          Port to serve on (default: 5174)
  -h, --help               Show this help message

The wallet automatically detects available adapters:
  - In-Memory (Ed25519) — always available
  - WebCrypto (Passkey) — available in browsers with IndexedDB
  - CLI Signer — available when the sui CLI is on your PATH
`);
		process.exit(0);
	}

	const port = Number(values.port ?? '5174');
	if (!Number.isInteger(port) || port < 1 || port > 65535) {
		console.error('Error: --port must be an integer between 1 and 65535');
		process.exit(1);
	}

	// Check if sui CLI is available
	let hasSuiCli = false;
	try {
		await execFileAsync('sui', ['--version']);
		hasSuiCli = true;
	} catch {
		// sui CLI not available — CLI adapter will not be enabled
	}

	// Find the pre-built standalone app directory
	const scriptDir = dirname(new URL(import.meta.url).pathname);
	const standaloneDir = findStandaloneDir(scriptDir);

	if (!standaloneDir) {
		console.error(
			'Standalone wallet app not found.\nRun `pnpm turbo build --filter=@mysten/dev-wallet` first.',
		);
		process.exit(1);
	}

	// Read index.html and inject __DEV_WALLET_CLI__ flag when sui CLI is available
	let indexHtml = await readFile(resolve(standaloneDir, 'index.html'), 'utf-8');
	if (hasSuiCli) {
		indexHtml = indexHtml.replace(
			'</head>',
			'<script>window.__DEV_WALLET_CLI__=true;</script></head>',
		);
		if (!indexHtml.includes('__DEV_WALLET_CLI__')) {
			console.warn('Warning: Failed to inject CLI flag into index.html');
		}
	}

	// Cache bookmarklet file at startup
	let bookmarkletJs: string | null = null;
	try {
		bookmarkletJs = await readFile(resolve(standaloneDir, 'bookmarklet.js'), 'utf-8');
	} catch {
		// bookmarklet not available
	}

	// --- Hono app ---
	const app = new Hono();

	// CLI signing middleware (mounted before static routes)
	let cliToken: string | null = null;

	if (hasSuiCli) {
		const { createCliSigningMiddleware } = await import('../server/cli-signing-middleware.js');
		const result = createCliSigningMiddleware();
		cliToken = result.token;
		app.route('/', result.app);
	}

	// Bookmarklet with CORS (loaded cross-origin by dApp pages)
	app.get('/bookmarklet.js', cors({ origin: '*' }), (c) => {
		if (!bookmarkletJs) {
			return c.text('Bookmarklet not found', 404);
		}
		c.header('Cache-Control', 'no-cache');
		return c.body(bookmarkletJs, { headers: { 'Content-Type': 'application/javascript' } });
	});

	// Static files from pre-built standalone directory
	app.get('*', async (c) => {
		const urlPath = decodeURIComponent(new URL(c.req.url).pathname);

		// Root and index.html get the injected version
		if (urlPath === '/' || urlPath === '/index.html') {
			return c.html(indexHtml);
		}

		// Serve static file if it exists
		const filePath = resolve(standaloneDir, urlPath.slice(1));

		// Path traversal protection
		if (!filePath.startsWith(standaloneDir)) {
			return c.html(indexHtml);
		}

		try {
			const content = await readFile(filePath);
			const ext = filePath.slice(filePath.lastIndexOf('.'));
			const contentType = MIME_TYPES[ext] || 'application/octet-stream';
			return c.body(content, { headers: { 'Content-Type': contentType } });
		} catch {
			// File not found — SPA fallback
			return c.html(indexHtml);
		}
	});

	const baseUrl = `http://localhost:${port}`;

	const server = serve({ fetch: app.fetch, port }, () => {
		const enabledAdapters = ['In-Memory (Ed25519)', 'WebCrypto (Passkey)'];
		if (hasSuiCli) {
			enabledAdapters.push('CLI Signer');
		}

		const walletUrl = cliToken ? `${baseUrl}/?token=${cliToken}` : baseUrl;
		const bookmarkletCode = `javascript:void(document.head.appendChild(Object.assign(document.createElement('script'),{src:'${baseUrl}/bookmarklet.js'})))`;

		console.log(
			formatStartupMessage({
				walletUrl,
				baseUrl,
				adapters: enabledAdapters,
				hasSuiCli,
				bookmarkletCode,
			}),
		);
	});

	function shutdown() {
		console.log('\nShutting down...');
		server.close(() => process.exit(0));
		setTimeout(() => process.exit(1), 3000).unref();
	}
	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);
}

main().catch((error) => {
	console.error('Failed to start dev wallet:', error);
	process.exit(1);
});
