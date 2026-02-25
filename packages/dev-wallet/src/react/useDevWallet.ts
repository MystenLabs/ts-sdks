// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import type { WalletIcon } from '@mysten/wallet-standard';
import { useEffect, useRef, useState } from 'react';

import type { SignerAdapter } from '../types.js';
import { mountDevWallet } from '../ui/mount.js';
import { DevWallet } from '../wallet/dev-wallet.js';

export interface UseDevWalletOptions {
	/** The signer adapters that manage accounts and signing. Must be stable references. */
	adapters: SignerAdapter[];
	/** Map of network name to SuiClient instance (e.g. { testnet: suiClient }). */
	clients: Record<string, ClientWithCoreApi>;
	/** Display name for the wallet. Defaults to 'Dev Wallet'. */
	name?: string;
	/** Data URI icon for the wallet. */
	icon?: WalletIcon;
	/** Whether to call adapter.initialize() automatically. Defaults to true. */
	autoInitialize?: boolean;
	/** Whether to create an initial account after initialization (if adapter supports it). Defaults to true. */
	createInitialAccount?: boolean;
	/** Whether to mount the floating wallet drawer UI. Defaults to true. */
	mountUI?: boolean;
	/** Container element for the UI drawer. Defaults to document.body. */
	container?: HTMLElement;
}

export interface UseDevWalletResult {
	wallet: DevWallet | null;
	/** Initialization error, if any (e.g. IndexedDB quota exceeded, adapter failure). */
	error: Error | null;
}

/**
 * React hook that initializes a DevWallet, registers it with the wallet-standard
 * registry, and optionally mounts the wallet drawer UI.
 *
 * The adapters and clients are captured on first render and used for the wallet's
 * lifetime. Pass stable references (created outside the component or via useMemo).
 *
 * @example
 * ```tsx
 * const adapters = useMemo(() => [new InMemorySignerAdapter()], []);
 * const clients = useMemo(() => ({ testnet: new SuiClient({ url: getFullnodeUrl('testnet') }) }), []);
 *
 * const wallet = useDevWallet({ adapters, clients, createInitialAccount: true });
 * ```
 *
 * @returns An object with `wallet` (the DevWallet instance, or null during setup) and `error` (initialization error, or null).
 */
export function useDevWallet(options: UseDevWalletOptions): UseDevWalletResult {
	const [wallet, setWallet] = useState<DevWallet | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const optionsRef = useRef(options);

	useEffect(() => {
		const {
			adapters,
			clients,
			name,
			icon,
			autoInitialize = true,
			createInitialAccount = true,
			mountUI = true,
			container,
		} = optionsRef.current;

		let cancelled = false;
		let unregister: (() => void) | undefined;
		let unmountUI: (() => void) | undefined;

		const devWallet = new DevWallet({ adapters, clients, name, icon });

		async function setup() {
			if (autoInitialize) {
				await Promise.all(adapters.map((a) => a.initialize()));
			}
			if (cancelled) return;

			if (createInitialAccount) {
				const hasAccounts = adapters.some((a) => a.getAccounts().length > 0);
				if (!hasAccounts) {
					const creatableAdapter = adapters.find(
						(a) => a.createAccount && a.getAccounts().length === 0,
					);
					if (creatableAdapter?.createAccount) {
						await creatableAdapter.createAccount();
					}
				}
			}
			if (cancelled) return;

			unregister = devWallet.register();

			if (mountUI && typeof document !== 'undefined') {
				unmountUI = mountDevWallet(devWallet, { container });
			}

			if (!cancelled) {
				setWallet(devWallet);
			}
		}

		setup().catch((err) => {
			if (!cancelled) {
				setError(err instanceof Error ? err : new Error(String(err)));
			}
		});

		return () => {
			cancelled = true;
			unmountUI?.();
			unregister?.();
			devWallet.destroy();
		};
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	return { wallet, error };
}
