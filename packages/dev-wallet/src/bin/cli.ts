#!/usr/bin/env node
// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve, dirname } from 'node:path';
import { parseArgs, promisify } from 'node:util';

const execFileAsync = promisify(execFile);

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

	const port = parseInt(values.port ?? '5174', 10);
	if (isNaN(port) || port < 1 || port > 65535) {
		console.error('Error: --port must be a number between 1 and 65535');
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

	// Build Vite define config
	const define: Record<string, string> = {};
	if (hasSuiCli) {
		define.__DEV_WALLET_CLI__ = JSON.stringify('true');
	}

	// Find the app directory relative to this script
	// In dist: dist/bin/cli.mjs -> app is at ../../src/app/
	// In src: src/bin/cli.ts -> app is at ../app/
	const scriptDir = dirname(new URL(import.meta.url).pathname);
	let appDir: string;
	if (scriptDir.includes('dist/bin') || scriptDir.includes('dist\\bin')) {
		// Running from dist/ - app source is at ../../src/app/
		appDir = resolve(scriptDir, '..', '..', 'src', 'app');
	} else {
		// Running from src/ (e.g., via tsx)
		appDir = resolve(scriptDir, '..', 'app');
	}

	if (!existsSync(resolve(appDir, 'index.html'))) {
		console.error(`App directory not found at ${appDir}`);
		process.exit(1);
	}

	// Dynamically import vite to start the dev server
	const { createServer } = await import('vite');

	// The package root is two levels up from src/app/
	const packageRoot = resolve(appDir, '..', '..');

	// Build Vite plugins — CLI middleware must be registered via configureServer
	// so it runs before Vite's SPA fallback (which would serve index.html for /api/* routes).
	const plugins = [];
	let cliToken: string | null = null;
	if (hasSuiCli) {
		const { createCliSigningMiddleware } = await import('../server/cli-signing-middleware.js');
		const { middleware, token } = createCliSigningMiddleware();
		cliToken = token;
		plugins.push({
			name: 'dev-wallet-cli-middleware',
			configureServer(server: { middlewares: { use: (fn: unknown) => void } }) {
				server.middlewares.use(middleware);
			},
		});
	}

	// Bookmarklet plugin — builds and serves /bookmarklet.js as a self-contained IIFE.
	// dApp pages can load this script to register the dev wallet without code changes.
	plugins.push({
		name: 'dev-wallet-bookmarklet',
		configureServer(server: { middlewares: { use: (fn: unknown) => void } }) {
			let cachedBundle: string | null = null;
			let buildPromise: Promise<string> | null = null;

			async function buildBookmarklet(): Promise<string> {
				if (cachedBundle) return cachedBundle;
				if (buildPromise) return buildPromise;

				buildPromise = (async (): Promise<string> => {
					const { build } = await import('vite');
					const entryFile = resolve(appDir, 'bookmarklet-entry.ts');

					const result = await build({
						root: packageRoot,
						configFile: false,
						logLevel: 'silent',
						build: {
							write: false,
							lib: {
								entry: entryFile,
								formats: ['iife'],
								name: 'DevWalletBookmarklet',
								fileName: () => 'bookmarklet.js',
							},
							rollupOptions: {
								output: {
									inlineDynamicImports: true,
								},
							},
							minify: 'esbuild',
						},
						resolve: {
							conditions: ['import', 'module', 'browser', 'default'],
						},
					});

					// build() with write:false returns RollupOutput (or RollupOutput[])
					const outputs = Array.isArray(result) ? result : [result];
					const rollupOutput = outputs[0] as { output: Array<{ type: string; code?: string }> };
					const chunk = rollupOutput.output.find((o) => o.type === 'chunk');
					if (!chunk?.code) {
						throw new Error('Bookmarklet build produced no output chunk');
					}

					cachedBundle = chunk.code;
					return chunk.code;
				})();

				try {
					return await buildPromise;
				} catch (err) {
					buildPromise = null;
					throw err;
				}
			}

			const middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
				if (req.url !== '/bookmarklet.js') {
					next();
					return;
				}

				buildBookmarklet()
					.then((code) => {
						res.writeHead(200, {
							'Content-Type': 'application/javascript',
							'Access-Control-Allow-Origin': '*',
							'Cache-Control': 'no-cache',
						});
						res.end(code);
					})
					.catch((err) => {
						console.error('[dev-wallet] Bookmarklet build error:', err);
						res.writeHead(500, { 'Content-Type': 'text/plain' });
						res.end('Failed to build bookmarklet');
					});
			};

			server.middlewares.use(middleware);
		},
	});

	const server = await createServer({
		root: appDir,
		server: {
			port,
			open: false,
			fs: {
				// Allow serving files from the whole package tree and monorepo node_modules
				allow: [packageRoot],
			},
		},
		define,
		plugins,
		optimizeDeps: {
			exclude: ['@mysten/dev-wallet'],
		},
	});

	await server.listen();

	const address = server.resolvedUrls?.local?.[0] ?? `http://localhost:${port}`;
	const baseUrl = address.replace(/\/$/, '');

	const enabledAdapters = ['In-Memory (Ed25519)', 'WebCrypto (Passkey)'];
	if (hasSuiCli) {
		enabledAdapters.push('CLI Signer');
	}

	// Build the URL with token for auto-authentication (Jupyter-style)
	const walletUrl = cliToken ? `${baseUrl}/?token=${cliToken}` : baseUrl;

	const bookmarkletCode = `javascript:void(document.head.appendChild(Object.assign(document.createElement('script'),{src:'${baseUrl}/bookmarklet.js'})))`;

	console.log(`
  Dev Wallet running at ${walletUrl}
  Adapters: ${enabledAdapters.join(', ')}${!hasSuiCli ? '\n  (Install sui CLI to enable CLI signing)' : ''}

  To connect from your dApp:

    import { DevWalletClient } from '@mysten/dev-wallet/client';
    DevWalletClient.register({ origin: '${baseUrl}' });

  Or use the bookmarklet — drag from the Settings tab, or copy:

    ${bookmarkletCode}

  Or paste in the browser console:

    var s=document.createElement('script');s.src='${baseUrl}/bookmarklet.js';document.head.appendChild(s);

  Press Ctrl+C to stop.
`);
}

main().catch((error) => {
	console.error('Failed to start dev wallet:', error);
	process.exit(1);
});
