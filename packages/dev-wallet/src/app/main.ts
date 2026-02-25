// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

import type { SignerAdapter } from '../types.js';
import { parseWalletRequest } from '../server/request-handler.js';

// Import UI components to register custom elements
import '../ui/dev-wallet-popup.js';
import '../ui/dev-wallet-accounts.js';
import '../ui/dev-wallet-balances.js';
import type { DevWalletConnect } from '../ui/dev-wallet-connect.js';

declare const __DEV_WALLET_CLI__: string | undefined;

const NETWORKS = ['mainnet', 'testnet', 'devnet', 'localnet'] as const;

function createClients(): Record<string, SuiJsonRpcClient> {
	const clients: Record<string, SuiJsonRpcClient> = {};
	for (const network of NETWORKS) {
		clients[network] = new SuiJsonRpcClient({
			url: getJsonRpcFullnodeUrl(network),
			network,
		});
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
	const adapters: SignerAdapter[] = [];

	// Always add in-memory adapter (lightweight, always available)
	const { InMemorySignerAdapter } = await import('../adapters/in-memory-adapter.js');
	const memoryAdapter = new InMemorySignerAdapter();
	await memoryAdapter.initialize();
	adapters.push(memoryAdapter);

	// Add WebCrypto adapter (browser with IndexedDB)
	if (typeof indexedDB !== 'undefined') {
		try {
			const { WebCryptoSignerAdapter } = await import('../adapters/webcrypto-adapter.js');
			const wcAdapter = new WebCryptoSignerAdapter();
			await wcAdapter.initialize();
			adapters.push(wcAdapter);
		} catch {
			// WebCrypto not available in this environment
		}
	}

	// Add CLI adapter (when running with CLI middleware)
	if (typeof __DEV_WALLET_CLI__ !== 'undefined') {
		const { RemoteCliAdapter } = await import('../adapters/remote-cli-adapter.js');
		const cliAdapter = new RemoteCliAdapter();
		await cliAdapter.initialize();
		adapters.push(cliAdapter);
	}

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
	const app = document.getElementById('app')!;

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
		const network = request.chain?.split(':')[1];
		const client = network ? clients[network] : clients['devnet'];

		const popup = document.createElement('dev-wallet-popup');
		popup.walletName = 'Dev Wallet';
		popup.requestType = request.type;
		popup.appName = request.appName;
		popup.appUrl = request.appUrl;
		popup.address = request.address ?? '';
		popup.chain = request.chain ?? 'sui:unknown';
		popup.data = request.data ?? null;
		popup.client = client ?? null;

		let handling = false;

		popup.addEventListener('approve', async () => {
			if (handling) return;
			handling = true;
			try {
				await request.approve();
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
 * Show the standalone wallet management page using shared Lit components.
 * This is a full-page layout (not the embedded floating FAB).
 */
async function showStandaloneUI() {
	const app = document.getElementById('app')!;

	try {
		const adapters = await createAdapters();
		const clients = createClients();
		const client = clients['devnet'] ?? clients['testnet'] ?? Object.values(clients)[0];

		app.innerHTML = '';

		const container = document.createElement('dev-wallet-standalone');
		container.innerHTML = '';

		// We use a simple wrapper div styled via the page's CSS
		const wrapper = document.createElement('div');
		wrapper.className = 'standalone-layout';

		const header = document.createElement('div');
		header.className = 'standalone-header';
		header.innerHTML = '<h1>Dev Wallet</h1><p>Wallet is running. Connect from your dApp.</p>';
		wrapper.appendChild(header);

		const allAccounts = adapters.flatMap((a) => a.getAccounts());
		const firstAddress = allAccounts[0]?.address ?? '';

		// Use the shared <dev-wallet-balances> component
		const balancesEl = document.createElement('dev-wallet-balances');
		balancesEl.address = firstAddress;
		(balancesEl as any).client = client;
		wrapper.appendChild(balancesEl);

		// Use the shared <dev-wallet-accounts> component
		const accountsEl = document.createElement('dev-wallet-accounts');
		(accountsEl as any).accounts = allAccounts.map((a) => a.walletAccount);
		(accountsEl as any).adapters = adapters;
		accountsEl.activeAddress = firstAddress;
		wrapper.appendChild(accountsEl);

		// When account is selected, update balances
		accountsEl.addEventListener('account-selected', ((e: CustomEvent) => {
			const newAddress = e.detail.account.address;
			accountsEl.activeAddress = newAddress;
			balancesEl.address = newAddress;
		}) as EventListener);

		// When accounts change (new account added), refresh the list
		for (const adapter of adapters) {
			adapter.onAccountsChanged(() => {
				const updatedAccounts = adapters.flatMap((a) => a.getAccounts());
				(accountsEl as any).accounts = updatedAccounts.map((a) => a.walletAccount);
			});
		}

		app.appendChild(wrapper);
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

// Entry point
const hash = window.location.hash.slice(1);
if (hash) {
	handlePopupRequest(hash);
} else {
	showStandaloneUI();
}
