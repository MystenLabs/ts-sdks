// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64, toBase64 } from '@mysten/sui/utils';
import type {
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
import { getWallets, ReadonlyWalletAccount, SUI_CHAINS } from '@mysten/wallet-standard';
import type { Emitter } from 'mitt';
import mitt from 'mitt';
import type { InferOutput } from 'valibot';
import { boolean, object, string } from 'valibot';
import type { CustomCaipNetwork } from '@reown/appkit-universal-connector';
import { UniversalConnector } from '@reown/appkit-universal-connector';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

const icon =
	'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjNENBMkZGIi8+CjxwYXRoIGQ9Ik0xMi4zNDczIDM0LjcyNTRDMTMuNTU1MyAzOS4yMzM2IDE4LjA2NzMgNDMuMzE0OCAyNy40MDI1IDQwLjgxMzRDMzYuMzA5NyAzOC40MjY3IDQxLjg5MjEgMzEuMDk5MyA0MC40NDQ2IDI1LjY5NzJDMzkuOTQ0NyAyMy44MzE3IDM4LjQzOTEgMjIuNTY4OSAzNi4xMTc4IDIyLjc3NDRMMTUuMzYxNSAyNC41MDM4QzE0LjA1NDQgMjQuNjA0MSAxMy40NTUgMjQuMzg5OCAxMy4xMDkyIDIzLjU2NjFDMTIuNzczOCAyMi43ODEyIDEyLjk2NDkgMjEuOTM4NSAxNC41NDM3IDIxLjE0MDZMMzAuMzM5NiAxMy4wMzQyQzMxLjU1MDMgMTIuNDE4MiAzMi4zNTY3IDEyLjE2MDUgMzMuMDkzNiAxMi40MjEzQzMzLjU1NTUgMTIuNTg5MSAzMy44NTk2IDEzLjI1NzQgMzMuNTgwMyAxNC4wODJMMzIuNTU2MSAxNy4xMDU2QzMxLjI5OTIgMjAuODE2NCAzMy45ODk5IDIxLjY3ODQgMzUuNTA2OCAyMS4yNzE5QzM3LjgwMTcgMjAuNjU3IDM4LjM0MTYgMTguNDcxMiAzNy42MDIzIDE1LjcxMTlDMzUuNzI3OCA4LjcxNjI5IDI4LjMwNTkgNy42MjI1NCAyMS41NzY4IDkuNDI1NTlDMTQuNzMxMSAxMS4yNTk5IDguNzk2ODEgMTYuODA3MiAxMC42MDg4IDIzLjU2OTZDMTEuMDM1OCAyNS4xNjMgMTIuNTAyNSAyNi40MzYyIDE0LjIwMTQgMjYuMzk3NUwxNi43OTUgMjYuMzkxMkMxNy4zMjg0IDI2LjM3ODggMTcuMTM2MyAyNi40MjI3IDE4LjE2NTMgMjYuMzM3NEMxOS4xOTQ0IDI2LjI1MjIgMjEuOTQyNSAyNS45MTQgMjEuOTQyNSAyNS45MTRMMzUuNDI3NSAyNC4zODhMMzUuNzc1IDI0LjMzNzVDMzYuNTYzNyAyNC4yMDMgMzcuMTU5NyAyNC40MDc5IDM3LjY2MzYgMjUuMjc2QzM4LjQxNzcgMjYuNTc1IDM3LjI2NzIgMjcuNTU0NiAzNS44ODk5IDI4LjcyNzJDMzUuODUzIDI4Ljc1ODYgMzUuODE2IDI4Ljc5MDEgMzUuNzc4OSAyOC44MjE4TDIzLjkyNSAzOS4wMzc3QzIxLjg5MzMgNDAuNzkwMSAyMC40NjYgNDAuMTMxMSAxOS45NjYyIDM4LjI2NTZMMTguMTk1OCAzMS42NTg3QzE3Ljc1ODUgMzAuMDI2NCAxNi4xNjQ2IDI4Ljc0NTYgMTQuMjk3NiAyOS4yNDU5QzExLjk2MzggMjkuODcxMiAxMS43NzQ2IDMyLjU4NzggMTIuMzQ3MyAzNC43MjU0WiIgZmlsbD0iIzA2MEQxNCIvPgo8L3N2Zz4K';

async function getTransaction(digest: string, chain: 'mainnet' | 'testnet' | 'devnet') {
	const client = new SuiClient({ url: getFullnodeUrl(chain) });
	const response = await client.getTransactionBlock({
		digest: digest,
		options: {
			showInput: true,
			showEffects: true,
			showEvents: true,
		},
	});

	return response;
}

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

type WalletEventsMap = {
	[E in keyof StandardEventsListeners]: Parameters<StandardEventsListeners[E]>[0];
};

export const WALLETCONNECT_WALLET_NAME = 'WalletConnect' as const;

const WalletMetadataSchema = object({
	id: string('Wallet ID is required'),
	walletName: string('Wallet name is required'),
	icon: string('Icon must be a valid wallet icon format'),
	enabled: boolean('Enabled is required'),
});

const walletAccountFeatures = [
	'sui:signTransaction',
	'sui:signAndExecuteTransaction',
	'sui:signPersonalMessage',
] as const;

type WalletMetadata = InferOutput<typeof WalletMetadataSchema>;
export class WalletConnectWallet implements Wallet {
	#id: string;
	#events: Emitter<WalletEventsMap>;
	#accounts: ReadonlyWalletAccount[];
	#walletName: string;
	#icon: WalletIcon;
	#connector?: UniversalConnector;
	#projectId: string;

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
			'standard:connect': {
				version: '1.0.0',
				connect: this.#connect,
			},
			'standard:disconnect': {
				version: '1.0.0',
				disconnect: this.#disconnect,
			},
			'standard:events': {
				version: '1.0.0',
				on: this.#on,
			},
			'sui:signTransaction': {
				version: '2.0.0',
				signTransaction: this.#signTransaction,
			},
			'sui:signPersonalMessage': {
				version: '1.1.0',
				signPersonalMessage: this.#signPersonalMessage,
			},
			'sui:signAndExecuteTransaction': {
				version: '2.0.0',
				signAndExecuteTransaction: this.#signAndExecuteTransaction,
			},
		};
	}

	constructor({ metadata, projectId }: { metadata: WalletMetadata; projectId: string }) {
		this.#id = metadata.id;
		this.#accounts = [];
		this.#events = mitt();
		this.#walletName = metadata.walletName;
		this.#icon = metadata.icon as WalletIcon;
		this.#projectId = projectId;
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
					events: [],
					chains: SUICaipNetworks,
				},
			],
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
		const data = await transaction.toJSON();

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

		const [_, chainId] = chain.split(':');
		const tx = await getTransaction(response.digest, chainId as 'mainnet' | 'testnet' | 'devnet');

		return {
			digest: response.digest,
			effects: tx.effects?.toString() ?? '',
			signature: tx.transaction?.txSignatures[0] ?? '',
			bytes: tx.rawTransaction ?? '',
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
		const response = (await this.#connector?.request(
			{ method: 'sui_getAccounts' },
			'sui:mainnet',
		)) as { result: { address: string; pubkey: string }[] };

		return response.result.map((account) => {
			return new ReadonlyWalletAccount({
				address: account.address,
				chains: SUI_CHAINS,
				features: walletAccountFeatures,
				publicKey: fromBase64(account.pubkey),
			});
		});
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
		if (!this.#connector?.provider?.session?.namespaces?.sui) {
			return [];
		}

		const accounts = await this.#getAccounts();
		return (
			accounts.map((account) => {
				return new ReadonlyWalletAccount({
					address: account.address,
					publicKey: account.publicKey,
					chains: SUI_CHAINS,
					features: walletAccountFeatures,
				});
			}) ?? []
		);
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

export function registerWalletConnectWallet(projectId: string) {
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

	const walletConnectWalletInstance = new WalletConnectWallet({
		metadata: {
			id: 'walletconnect',
			walletName: 'Wallet Connect',
			icon,
			enabled: true,
		},
		projectId,
	});
	unregister = wallets.register(walletConnectWalletInstance);

	walletConnectWalletInstance.updateMetadata({
		id: 'walletconnect',
		walletName: 'Wallet Connect',
		icon,
		enabled: true,
	});

	return {
		wallet: walletConnectWalletInstance,
		unregister,
	};
}
