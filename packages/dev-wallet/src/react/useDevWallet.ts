// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useMemo, useRef, useState } from 'react';

import { mountDevWallet } from '../ui/mount.js';
import { DevWallet, type DevWalletConfig } from '../wallet/dev-wallet.js';

export interface UseDevWalletOptions extends DevWalletConfig {
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
	/** True while the wallet is being initialized. */
	loading: boolean;
}

/**
 * React hook that initializes a DevWallet, registers it with the wallet-standard
 * registry, and optionally mounts the wallet drawer UI.
 *
 * The adapters are captured on first render and used for the wallet's
 * lifetime. Pass stable references (created outside the component or via useMemo).
 *
 * @example
 * ```tsx
 * const adapters = useMemo(() => [new InMemorySignerAdapter()], []);
 *
 * const wallet = useDevWallet({ adapters, networks: { devnet: 'https://fullnode.devnet.sui.io:443' } });
 * ```
 */
export function useDevWallet(options: UseDevWalletOptions): UseDevWalletResult {
	const [wallet, setWallet] = useState<DevWallet | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const [loading, setLoading] = useState(true);
	const optionsRef = useRef(options);
	optionsRef.current = options;

	useEffect(() => {
		const {
			autoInitialize = true,
			createInitialAccount = true,
			mountUI = true,
			container,
			...walletConfig
		} = optionsRef.current;

		let cancelled = false;
		let unregister: (() => void) | undefined;
		let unmountUI: (() => void) | undefined;

		let devWallet: DevWallet;
		try {
			devWallet = new DevWallet(walletConfig);
		} catch (err) {
			setError(err instanceof Error ? err : new Error(String(err)));
			setLoading(false);
			return;
		}

		async function setup() {
			if (autoInitialize) {
				await Promise.all(walletConfig.adapters.map((a) => a.initialize()));
			}
			if (cancelled) return;

			if (createInitialAccount) {
				const hasAccounts = walletConfig.adapters.some((a) => a.getAccounts().length > 0);
				if (!hasAccounts) {
					const creatableAdapter = walletConfig.adapters.find(
						(a) => a.createAccount && a.getAccounts().length === 0,
					);
					if (creatableAdapter?.createAccount) {
						await creatableAdapter.createAccount({ label: 'Dev Account' });
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
				setLoading(false);
			}
		}

		setup().catch((err) => {
			if (!cancelled) {
				setError(err instanceof Error ? err : new Error(String(err)));
				setLoading(false);
			}
		});

		return () => {
			cancelled = true;
			unmountUI?.();
			unregister?.();
			devWallet.destroy();
		};
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	return useMemo(() => ({ wallet, error, loading }), [wallet, error, loading]);
}
