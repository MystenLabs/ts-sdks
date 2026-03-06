// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import type { WalletIcon } from '@mysten/wallet-standard';

import type { SignerAdapter } from '../types.js';
import { DevWallet, type AutoApprovePolicy } from './dev-wallet.js';

/**
 * Configuration for the dev wallet initializer.
 *
 * Unlike {@link DevWalletConfig}, this does not include `networks` or
 * `clientFactory` because those come from the dApp Kit context at
 * initialization time.
 */
export interface DevWalletInitializerConfig {
	/** The signer adapters that manage accounts and signing. */
	adapters: SignerAdapter[];
	/** Display name for the wallet. Defaults to 'Dev Wallet'. */
	name?: string;
	/** Data URI icon for the wallet. */
	icon?: WalletIcon;
	/** Auto-approval policy for signing requests. */
	autoApprove?: AutoApprovePolicy;
	/** When true, connect requests are auto-approved with all accounts. */
	autoConnect?: boolean;
	/** Whether to call adapter.initialize() automatically. Defaults to true. */
	autoInitialize?: boolean;
	/** Whether to create an initial account after initialization (if adapter supports it). Defaults to true. */
	createInitialAccount?: boolean;
	/** Whether to mount the floating wallet drawer UI. Defaults to false. */
	mountUI?: boolean;
	/** Container element for the UI drawer. Defaults to document.body. */
	container?: HTMLElement;
	/**
	 * Called with the DevWallet instance after creation. Use this for
	 * programmatic access to approve/reject requests, etc.
	 */
	onWalletCreated?: (wallet: DevWallet) => void;
}

/**
 * Creates a wallet initializer that can be passed to `createDAppKit({ walletInitializers: [...] })`.
 *
 * This integrates DevWallet with dApp Kit's lifecycle — the wallet uses dApp Kit's
 * networks and client factory instead of managing its own, and is properly
 * unregistered when dApp Kit tears down.
 *
 * @example
 * ```ts
 * import { createDAppKit } from '@mysten/dapp-kit-react';
 * import { devWalletInitializer } from '@mysten/dev-wallet';
 * import { WebCryptoSignerAdapter, InMemorySignerAdapter } from '@mysten/dev-wallet/adapters';
 *
 * const dAppKit = createDAppKit({
 *   networks: ['devnet', 'testnet'],
 *   createClient(network) { ... },
 *   walletInitializers: [
 *     devWalletInitializer({
 *       adapters: [new WebCryptoSignerAdapter(), new InMemorySignerAdapter()],
 *       autoConnect: true,
 *       mountUI: true,
 *     }),
 *   ],
 * });
 * ```
 */
export function devWalletInitializer(config: DevWalletInitializerConfig): {
	id: string;
	initialize(input: {
		networks: readonly string[];
		getClient: (network?: string) => ClientWithCoreApi;
	}): Promise<{ unregister: () => void }>;
} {
	return {
		id: 'dev-wallet-initializer',
		async initialize({ networks, getClient }) {
			const { autoInitialize = true, createInitialAccount = true, mountUI = false } = config;

			// Initialize adapters
			if (autoInitialize) {
				await Promise.all(config.adapters.map((a) => a.initialize()));
			}

			// Create initial account if needed
			if (createInitialAccount) {
				const hasAccounts = config.adapters.some((a) => a.getAccounts().length > 0);
				if (!hasAccounts) {
					const creatableAdapter = config.adapters.find(
						(a) => a.createAccount && a.getAccounts().length === 0,
					);
					if (creatableAdapter?.createAccount) {
						await creatableAdapter.createAccount({ label: 'Dev Account' });
					}
				}
			}

			// Map dApp Kit networks to DevWallet format.
			// DevWallet needs a Record<string, string> of network name → URL, but
			// the clientFactory we provide delegates to getClient, so the URLs are
			// never actually used. We use placeholder values.
			const networkUrls: Record<string, string> = {};
			for (const network of networks) {
				networkUrls[network] = `dapp-kit://${network}`;
			}

			const wallet = new DevWallet({
				adapters: config.adapters,
				networks: networkUrls,
				name: config.name,
				icon: config.icon,
				autoApprove: config.autoApprove,
				autoConnect: config.autoConnect,
				clientFactory: (network) => getClient(network),
			});

			config.onWalletCreated?.(wallet);

			// Mount UI if requested
			let unmountUI: (() => void) | undefined;
			if (mountUI && typeof document !== 'undefined') {
				const { mountDevWallet } = await import('../ui/mount.js');
				unmountUI = mountDevWallet(wallet, { container: config.container });
			}

			const unregister = wallet.register();
			return {
				unregister() {
					unmountUI?.();
					unregister();
					wallet.destroy();
				},
			};
		},
	};
}
