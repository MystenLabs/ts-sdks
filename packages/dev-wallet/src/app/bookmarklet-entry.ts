// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Bookmarklet entry point — bundled into an IIFE and served at /bookmarklet.js
 * by the dev-wallet server (local CLI or hosted).
 *
 * When injected into a page via bookmarklet, this script registers a
 * DevWalletClient with the wallet-standard registry, making the dev wallet
 * appear in dApp wallet pickers.
 *
 * IMPORTANT: This uses the wallet-standard window event protocol
 * (`wallet-standard:register-wallet`) instead of the app-side
 * `getWallets().register()` API. This is necessary because IIFE bundles
 * get their own module-level singleton of `@wallet-standard/app`, which
 * is separate from the host page's singleton. The window event protocol
 * bridges this gap — the host page's `getWallets()` listener picks up
 * the event and adds the wallet to its own registry.
 */

import type { Wallet } from '@mysten/wallet-standard';
import { DevWalletClient } from '../client/dev-wallet-client.js';

/**
 * Register a wallet using the wallet-standard window event protocol.
 * This dispatches `wallet-standard:register-wallet` which works across
 * bundle boundaries (unlike `getWallets().register()` which is per-module).
 */
function registerWalletViaEvent(wallet: Wallet) {
	const callback = ({ register }: { register: (...wallets: Wallet[]) => void }) => register(wallet);

	try {
		window.dispatchEvent(
			new CustomEvent('wallet-standard:register-wallet', {
				bubbles: false,
				cancelable: false,
				composed: false,
				detail: callback,
			}),
		);
	} catch (error) {
		console.error('wallet-standard:register-wallet event could not be dispatched\n', error);
	}

	try {
		window.addEventListener('wallet-standard:app-ready', ({ detail: api }: any) => callback(api));
	} catch (error) {
		console.error('wallet-standard:app-ready event listener could not be added\n', error);
	}
}

(function () {
	if ((window as unknown as Record<string, unknown>).__DEV_WALLET_INJECTED__) {
		console.log('[Dev Wallet] Already injected, skipping.');
		return;
	}
	(window as unknown as Record<string, unknown>).__DEV_WALLET_INJECTED__ = true;

	// Derive the wallet server origin from this script's URL.
	// When loaded via <script src="https://wallet.example.com/bookmarklet.js">,
	// document.currentScript.src gives us the full URL — works on any host.
	const src =
		document.currentScript instanceof HTMLScriptElement ? document.currentScript.src : null;

	if (!src) {
		console.error('[Dev Wallet] Could not determine wallet origin from script src.');
		return;
	}

	const origin = new URL(src).origin;

	// Create the wallet instance but register via the window event protocol
	// so the host page's wallet-standard registry picks it up.
	const wallet = new DevWalletClient({ origin });
	registerWalletViaEvent(wallet);
	console.log(`[Dev Wallet] Registered (origin: ${origin})`);
})();
