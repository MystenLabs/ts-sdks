// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64, toBase64 } from '@mysten/sui/utils';
import { mitt, type Emitter } from '@mysten/utils';
import type {
	StandardConnectFeature,
	StandardConnectMethod,
	StandardDisconnectFeature,
	StandardDisconnectMethod,
	StandardEventsFeature,
	StandardEventsOnMethod,
	SuiFeatures,
	SuiSignAndExecuteTransactionMethod,
	SuiSignPersonalMessageMethod,
	SuiSignTransactionMethod,
	Wallet,
	WalletIcon,
} from '@mysten/wallet-standard';
import { getWallets, ReadonlyWalletAccount, SUI_CHAINS } from '@mysten/wallet-standard';
import { DappPostMessageChannel, decodeJwtSession } from '@mysten/window-wallet-core';

import { DEFAULT_WALLET_ICON, type WalletEventsMap } from '../wallet/constants.js';

const DEFAULT_WALLET_NAME = 'Dev Wallet (Web)';
const DEFAULT_ORIGIN = 'http://localhost:5174';

/**
 * Creates a wallet initializer that can be passed to `createDAppKit({ walletInitializers: [...] })`.
 *
 * This registers a {@link DevWalletClient} that communicates with a standalone
 * dev wallet server via PostMessage popups.
 *
 * @example
 * ```ts
 * import { createDAppKit } from '@mysten/dapp-kit-react';
 * import { devWalletClientInitializer } from '@mysten/dev-wallet/client';
 *
 * const dAppKit = createDAppKit({
 *   networks: ['devnet'],
 *   walletInitializers: [
 *     devWalletClientInitializer({ origin: 'http://localhost:5174' }),
 *   ],
 * });
 * ```
 */
export function devWalletClientInitializer(options?: DevWalletClientOptions): {
	id: string;
	initialize(): { unregister: () => void };
} {
	return {
		id: 'dev-wallet-client-initializer',
		initialize() {
			const unregister = DevWalletClient.register(options);
			return { unregister };
		},
	};
}

const WALLET_FEATURES = [
	'sui:signTransaction',
	'sui:signAndExecuteTransaction',
	'sui:signPersonalMessage',
] as const;

/**
 * Options for creating a DevWalletClient.
 */
export interface DevWalletClientOptions {
	/** Display name for the wallet. Defaults to 'Dev Wallet (Web)'. */
	name?: string;
	/** Data URI icon for the wallet. */
	icon?: WalletIcon;
	/** Origin of the dev wallet web app. Defaults to 'http://localhost:5174'. */
	origin?: string;
}

/**
 * Wallet-standard wallet that communicates with a standalone DevWallet
 * web app via PostMessage popups (started via `npx @mysten/dev-wallet serve`).
 */
export class DevWalletClient implements Wallet {
	readonly #name: string;
	readonly #icon: WalletIcon;
	readonly #origin: string;
	readonly #sessionKey: string;
	#accounts: ReadonlyWalletAccount[] = [];
	#events: Emitter<WalletEventsMap>;

	constructor(options?: DevWalletClientOptions) {
		this.#name = options?.name ?? DEFAULT_WALLET_NAME;
		this.#icon = options?.icon ?? DEFAULT_WALLET_ICON;
		this.#origin = options?.origin ?? DEFAULT_ORIGIN;
		this.#sessionKey = `dev-wallet:session:${this.#origin}`;
		this.#events = mitt();
		this.#tryRestoreSession();
	}

	static register(options?: DevWalletClientOptions): () => void {
		const wallet = new DevWalletClient(options);
		const wallets = getWallets();
		return wallets.register(wallet);
	}

	get version() {
		return '1.0.0' as const;
	}

	get name() {
		return this.#name;
	}

	get icon() {
		return this.#icon;
	}

	get chains() {
		return SUI_CHAINS;
	}

	get accounts(): readonly ReadonlyWalletAccount[] {
		return this.#accounts;
	}

	get features(): StandardConnectFeature &
		StandardEventsFeature &
		StandardDisconnectFeature &
		SuiFeatures {
		return {
			'standard:connect': {
				version: '1.0.0',
				connect: this.#connect,
			},
			'standard:events': {
				version: '1.0.0',
				on: this.#on,
			},
			'standard:disconnect': {
				version: '1.0.0',
				disconnect: this.#disconnect,
			},
			'sui:signPersonalMessage': {
				version: '1.1.0',
				signPersonalMessage: this.#signPersonalMessage,
			},
			'sui:signTransaction': {
				version: '2.0.0',
				signTransaction: this.#signTransaction,
			},
			'sui:signAndExecuteTransaction': {
				version: '2.0.0',
				signAndExecuteTransaction: this.#signAndExecuteTransaction,
			},
		};
	}

	#on: StandardEventsOnMethod = (event, listener) => {
		this.#events.on(event, listener);
		return () => this.#events.off(event, listener);
	};

	#connect: StandardConnectMethod = async () => {
		const channel = this.#createChannel();
		const response = await channel.send({ type: 'connect' });

		this.#setSession(response.session);
		this.#setAccountsFromSession(response.session);

		return { accounts: this.accounts };
	};

	#disconnect: StandardDisconnectMethod = async () => {
		this.#clearSession();
		this.#accounts = [];
		this.#events.emit('change', { accounts: this.#accounts });
	};

	#signPersonalMessage: SuiSignPersonalMessageMethod = async (input) => {
		const channel = this.#createChannel();
		const response = await channel.send({
			type: 'sign-personal-message',
			message: toBase64(input.message),
			address: input.account.address,
			chain: input.chain ?? input.account.chains[0] ?? 'sui:unknown',
			session: this.#getSession(),
		});

		return { bytes: response.bytes, signature: response.signature };
	};

	#signTransaction: SuiSignTransactionMethod = async (input) => {
		const txJson = await input.transaction.toJSON();
		const channel = this.#createChannel();
		const response = await channel.send({
			type: 'sign-transaction',
			transaction: txJson,
			address: input.account.address,
			chain: input.chain,
			session: this.#getSession(),
		});

		return { bytes: response.bytes, signature: response.signature };
	};

	#signAndExecuteTransaction: SuiSignAndExecuteTransactionMethod = async (input) => {
		const txJson = await input.transaction.toJSON();
		const channel = this.#createChannel();
		const response = await channel.send({
			type: 'sign-and-execute-transaction',
			transaction: txJson,
			address: input.account.address,
			chain: input.chain,
			session: this.#getSession(),
		});

		return {
			bytes: response.bytes,
			signature: response.signature,
			digest: response.digest,
			effects: response.effects,
		};
	};

	#createChannel(): DappPostMessageChannel {
		return new DappPostMessageChannel({
			appName: this.#name,
			hostOrigin: this.#origin,
		});
	}

	#getSession(): string {
		if (typeof localStorage === 'undefined') {
			throw new Error('No active session. Call connect() first.');
		}
		const session = localStorage.getItem(this.#sessionKey);
		if (!session) {
			throw new Error('No active session. Call connect() first.');
		}
		return session;
	}

	#setSession(session: string): void {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(this.#sessionKey, session);
		}
	}

	#clearSession(): void {
		if (typeof localStorage !== 'undefined') {
			localStorage.removeItem(this.#sessionKey);
		}
	}

	#setAccountsFromSession(session: string): void {
		const decoded = decodeJwtSession(session);
		this.#accounts = decoded.payload.accounts.map(
			(account: { address: string; publicKey: string; label?: string }) =>
				new ReadonlyWalletAccount({
					address: account.address,
					publicKey: account.publicKey ? fromBase64(account.publicKey) : new Uint8Array(0),
					chains: [...SUI_CHAINS],
					features: [...WALLET_FEATURES],
					label: account.label,
				}),
		);
		this.#events.emit('change', { accounts: this.#accounts });
	}

	#tryRestoreSession(): void {
		if (typeof localStorage === 'undefined') return;
		const session = localStorage.getItem(this.#sessionKey);
		if (!session) return;

		try {
			this.#setAccountsFromSession(session);
		} catch {
			this.#clearSession();
		}
	}
}
