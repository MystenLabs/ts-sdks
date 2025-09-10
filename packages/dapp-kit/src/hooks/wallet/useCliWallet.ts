// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64, toBase64 } from '@mysten/utils';
import type {
	StandardConnectFeature,
	StandardConnectMethod,
	StandardEventsFeature,
	StandardEventsOnMethod,
	SuiFeatures,
	SuiSignAndExecuteTransactionMethod,
	SuiSignPersonalMessageMethod,
	SuiSignTransactionMethod,
	Wallet,
} from '@mysten/wallet-standard';
import { getWallets, ReadonlyWalletAccount, SUI_CHAINS } from '@mysten/wallet-standard';
import { useEffect } from 'react';
import { useSuiClient } from '../useSuiClient.js';
import type { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

const WALLET_NAME = 'CLI Wallet';
const SERVER_URL = 'http://localhost:8783';

export function useCliWallet(enabled: boolean = false) {
	const suiClient = useSuiClient();

	useEffect(() => {
		if (!enabled) {
			return;
		}
		const unregister = registerCliWallet(SERVER_URL, suiClient);
		return unregister;
	}, [enabled, suiClient]);
}

function registerCliWallet(serverUrl: string, suiClient: SuiClient) {
	const walletsApi = getWallets();
	const registeredWallets = walletsApi.get();

	if (registeredWallets.find((wallet) => wallet.name === WALLET_NAME)) {
		console.warn(
			'registerCliWallet: Sui CLI Wallet already registered, skipping duplicate registration.',
		);
		return;
	}

	console.info('Sui CLI Wallet connecting to server:', serverUrl);

	class CliWallet implements Wallet {
		#serverUrl: string;
		#accounts: ReadonlyWalletAccount[] = [];
		#connected = false;
		#suiClient: SuiClient;

		constructor(serverUrl: string, suiClient: SuiClient) {
			this.#serverUrl = serverUrl;
			this.#suiClient = suiClient;
		}

		get version() {
			return '1.0.0' as const;
		}

		get name() {
			return WALLET_NAME;
		}

		get icon() {
			return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUwMCIgaGVpZ2h0PSIyMDUxIiB2aWV3Qm94PSIwIDAgMjU2IDIxMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJ4TWlkWU1pZCI+PHJlY3Qgd2lkdGg9IjI1NiIgaGVpZ2h0PSIyMDkuMzQyIiByeD0iNSIvPjxwYXRoIGQ9Ik0yOC4yNDEgMjEuNzc0Yy0uODU1LS44NTYtMS44ODgtMS4yODQtMy4wOTgtMS4yODRzLTIuMjQ2LjQzMi0zLjExIDEuMjk2Yy0uODUyLjg1Mi0xLjI4NCAxLjg4OC0xLjI4NCAzLjA5OHMuNDMyIDIuMjQ3IDEuMjg0IDMuMDk4bDEzLjQ0MiAxMy40NDItMTMuNDMgMTMuNDNjLS44NjQuODY0LTEuMjk2IDEuOS0xLjMwOCAzLjExLjAxMiAxLjIxLjQ0NCAyLjI0NyAxLjI5NiAzLjA5OC44NjQuODUyIDEuOSAxLjI4NCAzLjA5OCAxLjI5NiAxLjIyMiAwIDIuMjU5LS40MzIgMy4xMjMtMS4yOTZsMTQuOTM1LTE0Ljk0N2MzLjEzNS0zLjEyMyAzLjEzNS02LjI1OCAwLTkuMzk0TDI4LjI0MSAyMS43NzR6bTU4LjU0NSAzMy4xMDRjLS44NjQtLjg2NC0xLjkxMy0xLjI5Ni0zLjEzNS0xLjI5NnYtLjAwNkg1NC44MTd2LjAwNmMtMS4yMjIgMC0yLjI2LjQzMi0zLjEyMyAxLjI5Ni0uODY0Ljg2NC0xLjI5NiAxLjkwMS0xLjI5NiAzLjEyMyAwIDEuMjIyLjQzMiAyLjI3MSAxLjI5NiAzLjEzNS44NjQuODY0IDEuOSAxLjI5NiAzLjEyMyAxLjI5NnYtLjAwNkg4My42NXYuMDA2YzEuMjIyIDAgMi4yNy0uNDMyIDMuMTM1LTEuMjk2Ljg2NC0uODY0IDEuMjk2LTEuOTEzIDEuMjk2LTMuMTM1IDAtMS4yMjItLjQzMi0yLjI1OS0xLjI5Ni0zLjEyM3oiIGZpbGw9IiNGRkYiLz48L3N2Zz4=' as const;
		}

		get chains() {
			return SUI_CHAINS;
		}

		get accounts() {
			return this.#accounts;
		}

		get features(): StandardConnectFeature & StandardEventsFeature & SuiFeatures {
			return {
				'standard:connect': {
					version: '1.0.0',
					connect: this.#connect,
				},
				'standard:events': {
					version: '1.0.0',
					on: this.#on,
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

		#on: StandardEventsOnMethod = () => {
			return () => {};
		};

		#connect: StandardConnectMethod = async (input) => {
			try {
				const response = await fetch(`${this.#serverUrl}/wallet-standard/connect`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						silent: input?.silent ?? false,
					}),
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || 'Connection failed');
				}

				const data: {
					accounts: { address: string; public_key: string; chains: string[]; features: string[] }[];
				} = await response.json();

				this.#accounts = data.accounts.map(
					(account: any) =>
						new ReadonlyWalletAccount({
							address: account.address,
							publicKey: fromBase64(account.public_key),
							chains: account.chains,
							features: account.features,
						}),
				);

				this.#connected = true;

				return { accounts: this.accounts };
			} catch (error) {
				console.error('Failed to connect to Sui CLI Wallet:', error);
				throw new Error(
					`Failed to connect to Sui CLI Wallet: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		};

		#signPersonalMessage: SuiSignPersonalMessageMethod = async (input) => {
			if (!this.#connected) {
				throw new Error('Wallet not connected');
			}

			try {
				const response = await fetch(`${this.#serverUrl}/wallet-standard/sign-personal-message`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						message: toBase64(input.message),
						account: input.account.address,
					}),
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || 'Personal message signing failed');
				}

				const data: { signature: string; bytes: string } = await response.json();
				return {
					signature: data.signature,
					bytes: toBase64(input.message),
				};
			} catch (error) {
				console.error('Failed to sign personal message:', error);
				throw new Error(
					`Failed to sign personal message: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		};

		#signTransaction: SuiSignTransactionMethod = async (input) => {
			if (!this.#connected) {
				throw new Error('Wallet not connected');
			}

			try {
				const transaction = Transaction.from(await input.transaction.toJSON());
				transaction.setSenderIfNotSet(input.account.address);

				const response = await fetch(`${this.#serverUrl}/wallet-standard/sign-transaction`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						transaction: toBase64(await transaction.build({ client: this.#suiClient })),
						account: input.account.address,
						options: {
							show_effects: true,
							show_events: false,
							show_object_changes: false,
							show_balance_changes: false,
						},
					}),
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || 'Transaction signing failed');
				}

				const data: { transaction_block_bytes: string; signature: string } = await response.json();

				input.signal?.throwIfAborted();

				return {
					bytes: data.transaction_block_bytes,
					signature: data.signature,
				};
			} catch (error) {
				console.error('Failed to sign transaction:', error);
				throw new Error(
					`Failed to sign transaction: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		};

		#signAndExecuteTransaction: SuiSignAndExecuteTransactionMethod = async (input) => {
			const { bytes, signature } = await this.#signTransaction(input);

			input.signal?.throwIfAborted();

			const { rawEffects, digest } = await this.#suiClient.executeTransactionBlock({
				signature,
				transactionBlock: bytes,
				options: {
					showRawEffects: true,
				},
			});

			return {
				bytes,
				signature,
				digest,
				effects: toBase64(new Uint8Array(rawEffects!)),
			};
		};
	}

	const wallet = new CliWallet(serverUrl, suiClient);

	return walletsApi.register(wallet);
}
