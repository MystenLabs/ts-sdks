// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64, toBase64 } from '@mysten/sui/utils';
import type {
	IdentifierArray,
	StandardConnectFeature,
	StandardConnectMethod,
	StandardDisconnectFeature,
	StandardDisconnectMethod,
	StandardEventsFeature,
	StandardEventsListeners,
	StandardEventsOnMethod,
	SuiSignAndExecuteTransactionFeature,
	SuiSignAndExecuteTransactionMethod,
	SuiSignPersonalMessageFeature,
	SuiSignPersonalMessageMethod,
	SuiSignTransactionFeature,
	SuiSignTransactionMethod,
	Wallet,
	WalletIcon,
} from '@mysten/wallet-standard';
import {
	getWallets,
	ReadonlyWalletAccount,
	StandardConnect,
	StandardDisconnect,
	StandardEvents,
	SUI_CHAINS,
	SuiSignAndExecuteTransaction,
	SuiSignPersonalMessage,
	SuiSignTransaction,
} from '@mysten/wallet-standard';
import type { Emitter } from 'mitt';
import mitt from 'mitt';
import type { InferOutput } from 'valibot';
import { boolean, object, string } from 'valibot';
import type { CustomCaipNetwork } from '@reown/appkit-universal-connector';
import { UniversalConnector } from '@reown/appkit-universal-connector';
import type { Experimental_BaseClient } from '@mysten/sui/experimental';
import { Transaction } from '@mysten/sui/dist/cjs/transactions/Transaction';

// -- Types --
type Network = 'mainnet' | 'testnet' | 'devnet' | 'localnet';
type WalletEventsMap = {
	[E in keyof StandardEventsListeners]: Parameters<StandardEventsListeners[E]>[0];
};

export type GetClient = (network: Network) => Experimental_BaseClient;
type WalletMetadata = InferOutput<typeof WalletMetadataSchema>;

// -- Constants --
const icon =
	'data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIHdpZHRoPSI0MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPjxjbGlwUGF0aCBpZD0iYSI+PHBhdGggZD0ibTAgMGg0MDB2NDAwaC00MDB6Ii8+PC9jbGlwUGF0aD48ZyBjbGlwLXBhdGg9InVybCgjYSkiPjxjaXJjbGUgY3g9IjIwMCIgY3k9IjIwMCIgZmlsbD0iIzE0MTQxNCIgcj0iMTk5LjUiIHN0cm9rZT0iIzNiNDA0MCIvPjxwYXRoIGQ9Im0xMjIuNTE5IDE0OC45NjVjNDIuNzkxLTQxLjcyOSAxMTIuMTcxLTQxLjcyOSAxNTQuOTYyIDBsNS4xNSA1LjAyMmMyLjE0IDIuMDg2IDIuMTQgNS40NjkgMCA3LjU1NWwtMTcuNjE3IDE3LjE4Yy0xLjA3IDEuMDQzLTIuODA0IDEuMDQzLTMuODc0IDBsLTcuMDg3LTYuOTExYy0yOS44NTMtMjkuMTExLTc4LjI1My0yOS4xMTEtMTA4LjEwNiAwbC03LjU5IDcuNDAxYy0xLjA3IDEuMDQzLTIuODA0IDEuMDQzLTMuODc0IDBsLTE3LjYxNy0xNy4xOGMtMi4xNC0yLjA4Ni0yLjE0LTUuNDY5IDAtNy41NTV6bTE5MS4zOTcgMzUuNTI5IDE1LjY3OSAxNS4yOWMyLjE0IDIuMDg2IDIuMTQgNS40NjkgMCA3LjU1NWwtNzAuNyA2OC45NDRjLTIuMTM5IDIuMDg3LTUuNjA4IDIuMDg3LTcuNzQ4IDBsLTUwLjE3OC00OC45MzFjLS41MzUtLjUyMi0xLjQwMi0uNTIyLTEuOTM3IDBsLTUwLjE3OCA0OC45MzFjLTIuMTM5IDIuMDg3LTUuNjA4IDIuMDg3LTcuNzQ4IDBsLTcwLjcwMTUtNjguOTQ1Yy0yLjEzOTYtMi4wODYtMi4xMzk2LTUuNDY5IDAtNy41NTVsMTUuNjc5NS0xNS4yOWMyLjEzOTYtMi4wODcgNS42MDg1LTIuMDg3IDcuNzQ4MSAwbDUwLjE3ODkgNDguOTMyYy41MzUuNTIyIDEuNDAyLjUyMiAxLjkzNyAwbDUwLjE3Ny00OC45MzJjMi4xMzktMi4wODcgNS42MDgtMi4wODcgNy43NDggMGw1MC4xNzkgNDguOTMyYy41MzUuNTIyIDEuNDAyLjUyMiAxLjkzNyAwbDUwLjE3OS00OC45MzFjMi4xMzktMi4wODcgNS42MDgtMi4wODcgNy43NDggMHoiIGZpbGw9IiNmZmYiLz48L2c+PC9zdmc+';
export const WALLETCONNECT_WALLET_NAME = 'WalletConnect' as const;
const walletAccountFeatures = [
	'sui:signTransaction',
	'sui:signAndExecuteTransaction',
	'sui:signPersonalMessage',
] as const;

const SUICaipNetworks: CustomCaipNetwork<'sui'>[] = SUI_CHAINS.map((chain) => {
	const [_, chainId] = chain.split(':');
	return {
		id: chainId,
		chainNamespace: 'sui',
		caipNetworkId: chain,
		name: `Sui ${chainId}`,
		nativeCurrency: { name: 'SUI', symbol: 'SUI', decimals: 9 },
		rpcUrls: { default: { http: [`https://sui-${chainId}.gateway.tatum.io`] } },
	};
});

const WalletMetadataSchema = object({
	id: string('Wallet ID is required'),
	walletName: string('Wallet name is required'),
	icon: string('Icon must be a valid wallet icon format'),
	enabled: boolean('Enabled is required'),
});

const toStandardAccounts = (
	accounts: { address: string; pubkey: string }[],
	chains: IdentifierArray,
) => {
	return accounts.map((account) => {
		return new ReadonlyWalletAccount({
			address: account.address,
			chains,
			features: walletAccountFeatures,
			publicKey: fromBase64(account.pubkey),
		});
	});
};

// -- Wallet --
export class WalletConnectWallet implements Wallet {
	#id: string;
	#events: Emitter<WalletEventsMap>;
	#accounts: ReadonlyWalletAccount[];
	#walletName: string;
	#icon: WalletIcon;
	#connector?: UniversalConnector;
	#projectId: string;
	#getClient: GetClient;

	get name() {
		return this.#walletName;
	}

	get id() {
		return this.#id;
	}

	get icon() {
		return this.#icon;
	}

	get version() {
		return '1.0.0' as const;
	}

	get chains() {
		return SUI_CHAINS;
	}

	get accounts() {
		return this.#accounts;
	}

	get features(): StandardConnectFeature &
		StandardDisconnectFeature &
		StandardEventsFeature &
		SuiSignTransactionFeature &
		SuiSignPersonalMessageFeature &
		SuiSignAndExecuteTransactionFeature {
		return {
			[StandardConnect]: {
				version: '1.0.0',
				connect: this.#connect,
			},
			[StandardDisconnect]: {
				version: '1.0.0',
				disconnect: this.#disconnect,
			},
			[StandardEvents]: {
				version: '1.0.0',
				on: this.#on,
			},
			[SuiSignTransaction]: {
				version: '2.0.0',
				signTransaction: this.#signTransaction,
			},
			[SuiSignPersonalMessage]: {
				version: '1.1.0',
				signPersonalMessage: this.#signPersonalMessage,
			},
			[SuiSignAndExecuteTransaction]: {
				version: '2.0.0',
				signAndExecuteTransaction: this.#signAndExecuteTransaction,
			},
		};
	}

	constructor({
		metadata,
		projectId,
		getClient,
	}: {
		metadata: WalletMetadata;
		projectId: string;
		getClient: GetClient;
	}) {
		this.#id = metadata.id;
		this.#accounts = [];
		this.#events = mitt();
		this.#walletName = metadata.walletName;
		this.#icon = icon;
		this.#projectId = projectId;
		this.#getClient = getClient;
		this.init();
	}

	async init() {
		this.#connector = await UniversalConnector.init({
			projectId: this.#projectId,

			// TODO: Use dapp metadata
			metadata: {
				name: this.#walletName,
				description: 'WalletConnect',
				icon: this.#icon,
			},
			networks: [
				{
					namespace: 'sui',
					methods: [
						'sui_signTransaction',
						'sui_signPersonalMessage',
						'sui_signAndExecuteTransaction',
						'sui_getAccounts',
					],
					events: ['chainChanged', 'accountsChanged'],
					chains: SUICaipNetworks,
				},
			],
			modalConfig: {
				themeVariables: {
					'--w3m-z-index': 2147483647,
				},
			},
		});
		this.#accounts = await this.#getPreviouslyAuthorizedAccounts();
	}

	#signTransaction: SuiSignTransactionMethod = async ({ transaction, account, chain }) => {
		const tx = await transaction.toJSON();

		const response = (await this.#connector?.request(
			{
				method: 'sui_signTransaction',
				params: {
					transaction: tx,
					address: account.address,
				},
			},
			chain,
		)) as { transactionBytes: string; signature: string };

		return {
			bytes: response.transactionBytes,
			signature: response.signature,
		};
	};

	#signAndExecuteTransaction: SuiSignAndExecuteTransactionMethod = async ({
		transaction,
		account,
		chain,
	}) => {
		const [, network] = chain.split(':');
		const client = this.#getClient(network as Network);
		const data = await transaction.toJSON();
		const parsedTransaction = Transaction.from(data);
		const bytes = await parsedTransaction.build({ client });
		const response = (await this.#connector?.request(
			{
				method: 'sui_signAndExecuteTransaction',
				params: {
					transaction: data,
					address: account.address,
				},
			},
			chain,
		)) as { digest: string };

		const tx = await client.core.waitForTransaction({
			digest: response.digest,
		});

		return {
			digest: response.digest,
			signature: tx.transaction.signatures[0] ?? '',
			bytes: toBase64(bytes),
			effects: tx.transaction.effects.bcs ? toBase64(tx.transaction.effects.bcs) : '',
		};
	};

	#signPersonalMessage: SuiSignPersonalMessageMethod = async ({ message, account, chain }) => {
		const response = (await this.#connector?.request(
			{
				method: 'sui_signPersonalMessage',
				params: {
					message: toBase64(message),
					address: account.address,
				},
			},
			chain ?? 'sui:mainnet',
		)) as { signature: string };

		return {
			signature: response.signature,
			bytes: toBase64(message),
		};
	};

	#on: StandardEventsOnMethod = (event, listener) => {
		this.#events.on(event, listener);
		return () => this.#events.off(event, listener);
	};

	#setAccounts(accounts: ReadonlyWalletAccount[]) {
		this.#accounts = accounts;
		this.#events.emit('change', { accounts: this.accounts });
	}

	#getAccounts = async () => {
		let accounts: { address: string; pubkey: string }[] | undefined = JSON.parse(
			this.#connector?.provider?.session?.sessionProperties?.['sui_getAccounts'] ?? '[]',
		);

		if (!accounts?.length) {
			accounts = (await this.#connector?.request({ method: 'sui_getAccounts' }, 'sui:mainnet')) as {
				address: string;
				pubkey: string;
			}[];
		}

		return toStandardAccounts(accounts, this.chains);
	};

	#connect: StandardConnectMethod = async (input) => {
		if (input?.silent) {
			const accounts = await this.#getPreviouslyAuthorizedAccounts();
			if (accounts.length > 0) {
				this.#setAccounts(accounts);
				return { accounts };
			}
		}

		if (!this.#connector?.provider?.session?.namespaces?.sui) {
			await this.#connector?.connect();
		}

		const accounts = await this.#getAccounts();
		this.#setAccounts(accounts);

		return { accounts: this.accounts };
	};

	#getPreviouslyAuthorizedAccounts = async () => {
		const session = this.#connector?.provider?.session;
		if (!session?.namespaces?.sui) {
			return [];
		}

		const accounts = JSON.parse(session.sessionProperties?.['sui_getAccounts'] ?? '[]') as {
			address: string;
			pubkey: string;
		}[];

		return toStandardAccounts(accounts, SUI_CHAINS);
	};

	#disconnect: StandardDisconnectMethod = async () => {
		this.#connector?.disconnect();
		this.#setAccounts([]);
	};

	updateMetadata(metadata: WalletMetadata) {
		this.#id = metadata.id;
		this.#walletName = metadata.walletName;
		this.#icon = metadata.icon as WalletIcon;
	}
}
type RegisterWalletConnectWallet = {
	projectId: string;
	getClient: GetClient;
	metadata?: WalletMetadata;
};

export function registerWalletConnectWallet({
	projectId,
	getClient,
	metadata,
}: RegisterWalletConnectWallet) {
	const wallets = getWallets();

	let unregister: (() => void) | null = null;

	// listen for wallet registration
	wallets.on('register', (wallet: Wallet) => {
		if (wallet.id === 'walletconnect') {
			unregister?.();
		}
	});

	const extension = wallets.get().find((wallet: Wallet) => wallet.id === 'walletconnect');
	if (extension) {
		return;
	}

	const fullMetadata = {
		id: 'walletconnect',
		walletName: 'Wallet Connect',
		icon,
		enabled: true,
		...(metadata ?? {}),
	};

	const walletConnectWalletInstance = new WalletConnectWallet({
		metadata: fullMetadata,
		projectId,
		getClient,
	});
	unregister = wallets.register(walletConnectWalletInstance);

	walletConnectWalletInstance.updateMetadata({
		...fullMetadata,
		enabled: true,
	});

	return {
		wallet: walletConnectWalletInstance,
		unregister,
	};
}
