// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import { SuiGrpcClient } from '@mysten/sui/grpc';

import { RemoteCliAdapter } from '../adapters/remote-cli-adapter.js';
import type { SignerAdapter } from '../types.js';
import { parseWalletRequest } from '../server/request-handler.js';
import { getNetworkFromChain } from '../wallet/constants.js';
import { DEFAULT_NETWORK_URLS, DevWallet } from '../wallet/dev-wallet.js';

// Import UI components to register custom elements
import '../ui/dev-wallet-popup.js';
import type { DevWalletStandalone } from '../ui/dev-wallet-standalone.js';
import '../ui/dev-wallet-standalone.js';
import type { DevWalletConnect } from '../ui/dev-wallet-connect.js';

declare global {
	interface Window {
		__DEV_WALLET_CLI__?: boolean;
	}
}

function createClients(): Record<string, ClientWithCoreApi> {
	const clients: Record<string, ClientWithCoreApi> = {};
	for (const [name, url] of Object.entries(DEFAULT_NETWORK_URLS)) {
		clients[name] = new SuiGrpcClient({ baseUrl: url, network: name });
	}
	return clients;
}

// NOTE: JWT secret is stored in localStorage (readable by any JS on the same origin).
// This is acceptable for a dev-only tool but should not be used in production wallets.
async function getJwtSecretKey(): Promise<Uint8Array> {
	const stored = localStorage.getItem('dev-wallet:jwt-secret');
	if (stored) {
		const { fromBase64 } = await import('@mysten/sui/utils');
		return fromBase64(stored);
	}
	const key = crypto.getRandomValues(new Uint8Array(32));
	const { toBase64 } = await import('@mysten/sui/utils');
	localStorage.setItem('dev-wallet:jwt-secret', toBase64(key));
	return key;
}

async function createAdapters(): Promise<SignerAdapter[]> {
	// Initialize all adapters concurrently
	const initTasks: Array<Promise<SignerAdapter | null>> = [];

	// WebCrypto adapter (persistent via IndexedDB — preferred default)
	if (typeof indexedDB !== 'undefined') {
		initTasks.push(
			import('../adapters/webcrypto-adapter.js')
				.then(async ({ WebCryptoSignerAdapter }) => {
					const adapter = new WebCryptoSignerAdapter();
					await adapter.initialize();
					return adapter;
				})
				.catch(() => null),
		);
	}

	// In-memory adapter (lightweight fallback, always available)
	initTasks.push(
		import('../adapters/in-memory-adapter.js').then(async ({ InMemorySignerAdapter }) => {
			const adapter = new InMemorySignerAdapter();
			await adapter.initialize();
			return adapter;
		}),
	);

	// CLI adapter (when running with CLI middleware)
	if (window.__DEV_WALLET_CLI__) {
		initTasks.push(
			import('../adapters/remote-cli-adapter.js').then(async ({ RemoteCliAdapter }) => {
				const cliAdapter = new RemoteCliAdapter();
				await cliAdapter.initialize();
				return cliAdapter;
			}),
		);
	}

	const results = await Promise.allSettled(initTasks);
	const adapters = results
		.filter(
			(r): r is PromiseFulfilledResult<SignerAdapter> =>
				r.status === 'fulfilled' && r.value !== null,
		)
		.map((r) => r.value);

	// Ensure at least one account exists across all adapters
	const hasAccounts = adapters.some((a) => a.getAccounts().length > 0);
	if (!hasAccounts) {
		const creatableAdapter = adapters.find((a) => a.createAccount);
		if (creatableAdapter?.createAccount) {
			await creatableAdapter.createAccount({ label: 'Dev Account' });
		}
	}

	return adapters;
}

/**
 * Handle a popup request from a dApp using shared Lit components.
 */
async function handlePopupRequest(hash: string) {
	const app = document.getElementById('app');
	if (!app) throw new Error('Missing #app element in document');

	try {
		const adapters = await createAdapters();
		const clients = createClients();
		const jwtSecretKey = await getJwtSecretKey();

		const request = parseWalletRequest({
			adapters,
			jwtSecretKey,
			clients,
			hash,
		});

		app.innerHTML = '';

		// Determine client for signing analysis
		const network = request.chain ? getNetworkFromChain(request.chain) : undefined;
		const client = network ? clients[network] : clients['devnet'];

		const popup = document.createElement('dev-wallet-popup');
		popup.walletName = 'Dev Wallet (Web)';
		popup.requestType = request.type;
		popup.appName = request.appName;
		popup.appUrl = request.appUrl;
		popup.address = request.address ?? '';
		popup.chain = request.chain ?? 'sui:unknown';
		popup.data = request.data ?? null;
		popup.client = client ?? null;

		// For connect requests, pass account list to enable selection
		if (request.type === 'connect') {
			popup.connectAccounts = adapters.flatMap((a) =>
				a.getAccounts().map((acc) => ({ address: acc.address, label: acc.label })),
			);
		}

		let handling = false;

		popup.addEventListener('approve', async (e) => {
			if (handling) return;
			handling = true;
			try {
				const detail = (e as CustomEvent).detail;
				await request.approve(
					detail?.selectedAddresses ? { selectedAddresses: detail.selectedAddresses } : undefined,
				);
				window.close();
			} catch (error) {
				handling = false;
				// Try to show error on the connect component (if it's a connect request)
				const connectEl = popup.shadowRoot?.querySelector(
					'dev-wallet-connect',
				) as DevWalletConnect | null;
				if (connectEl) {
					connectEl.showError(error instanceof Error ? error.message : String(error));
				}
			}
		});

		popup.addEventListener('reject', () => {
			if (handling) return;
			handling = true;
			request.reject('User rejected');
			window.close();
		});

		app.appendChild(popup);
	} catch (error) {
		showErrorMessage(app, 'Error', error);
	}
}

/**
 * Show the standalone wallet management page using the shared standalone component.
 * This is a full-page layout (not the embedded floating FAB).
 */
async function showStandaloneUI() {
	const app = document.getElementById('app');
	if (!app) throw new Error('Missing #app element in document');

	try {
		const adapters = await createAdapters();

		const wallet = new DevWallet({
			adapters,
			activeNetwork: 'devnet',
		});

		app.innerHTML = '';

		const el = document.createElement('dev-wallet-standalone') as DevWalletStandalone;
		el.wallet = wallet;
		el.bookmarkletOrigin = window.location.origin;
		app.appendChild(el);
	} catch (error) {
		showErrorMessage(app, 'Failed to initialize wallet', error);
	}
}

/**
 * Render an error message safely using textContent (no innerHTML interpolation).
 */
function showErrorMessage(container: HTMLElement, title: string, error: unknown) {
	container.innerHTML = '';
	const wrapper = document.createElement('div');
	wrapper.style.cssText = 'color: #ef4444; text-align: center;';

	const heading = document.createElement('h3');
	heading.textContent = title;
	wrapper.appendChild(heading);

	const message = document.createElement('p');
	message.textContent = error instanceof Error ? error.message : String(error);
	message.style.cssText = 'font-size: 13px; margin-top: 8px;';
	wrapper.appendChild(message);

	container.appendChild(wrapper);
}

// Extract and store CLI token from URL (Jupyter-style auth).
// Stored in localStorage so popups (signing requests) can also access it.
const url = new URL(window.location.href);
const urlToken = url.searchParams.get('token');
if (urlToken) {
	localStorage.setItem(RemoteCliAdapter.TOKEN_KEY, urlToken);
	url.searchParams.delete('token');
	history.replaceState(null, '', url.pathname + url.hash);
}

// Entry point
const hash = window.location.hash.slice(1);
if (hash) {
	handlePopupRequest(hash);
} else {
	showStandaloneUI();
}
