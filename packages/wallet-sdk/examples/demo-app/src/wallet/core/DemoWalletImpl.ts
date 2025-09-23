// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type {
	Wallet,
	StandardConnectMethod,
	StandardEventsOnMethod,
	SuiSignPersonalMessageMethod,
	SuiSignTransactionMethod,
	SuiSignAndExecuteTransactionMethod,
	SuiGetSupportedIntentsMethod,
} from '@mysten/wallet-standard';
import {
	SUI_DEVNET_CHAIN,
	SUI_TESTNET_CHAIN,
	SUI_LOCALNET_CHAIN,
	SUI_MAINNET_CHAIN,
	isSuiChain,
} from '@mysten/wallet-standard';
import type { SuiChain } from '@mysten/wallet-standard';
import { Transaction } from '@mysten/sui/transactions';
import { toBase64 } from '@mysten/sui/utils';
import { SuiClient } from '@mysten/sui/client';
import type { ReadonlyWalletAccount } from '@mysten/wallet-standard';
import type { Keypair } from '@mysten/sui/cryptography';
import { DEMO_WALLET_ICON } from '../constants/icons.js';
import { AUTO_APPROVAL_INTENT } from '@mysten/wallet-sdk';

// Wallet request type for handling signing requests
export type WalletRequest = {
	type: 'personalMessage' | 'transaction' | 'signAndExecute';
	data: string | Transaction;
	origin: string;
	account: ReadonlyWalletAccount;
	chain: string;
	resolve: (transaction?: Transaction) => void;
	reject: (error: Error) => void;
};

// Network configurations
const networkConfigs = {
	[SUI_DEVNET_CHAIN]: {
		url: 'https://fullnode.devnet.sui.io:443',
		network: 'devnet',
	},
	[SUI_TESTNET_CHAIN]: {
		url: 'https://fullnode.testnet.sui.io:443',
		network: 'testnet',
	},
	[SUI_LOCALNET_CHAIN]: {
		url: 'http://127.0.0.1:9000',
		network: 'localnet',
	},
	[SUI_MAINNET_CHAIN]: {
		url: 'https://fullnode.mainnet.sui.io:443',
		network: 'mainnet',
	},
};

// Core wallet implementation class
export class DemoWalletImpl implements Wallet {
	#signingKeypair: any; // The keypair used for signing
	#allAccounts: any[]; // All accounts available to the dApp
	#allKeypairs: Map<string, any> = new Map(); // Map of address to keypair for all accounts
	#suiClients: Map<SuiChain, SuiClient> = new Map(); // Map of chain to SuiClient
	#activeNetwork: SuiChain = SUI_TESTNET_CHAIN; // Default to testnet
	#eventListeners: Set<(data: any) => void> = new Set();
	#requestHandler: (request: WalletRequest) => void;

	constructor(
		signingKeypair: any,
		primaryAccount: any,
		requestHandler: (request: WalletRequest) => void,
		allAccounts: any[] = [],
		allKeypairs: any[] = [],
		activeNetwork: SuiChain = SUI_TESTNET_CHAIN,
	) {
		this.#signingKeypair = signingKeypair;
		this.#allAccounts = allAccounts.length > 0 ? allAccounts : [primaryAccount];
		this.#requestHandler = requestHandler;
		this.#activeNetwork = activeNetwork;

		// Create the keypair mapping
		this.#allAccounts.forEach((acc, index) => {
			const kp = allKeypairs[index] || signingKeypair; // Use corresponding keypair or default
			// Ensure we can access the address property correctly
			const address =
				acc.address ||
				acc.getAddress?.() ||
				(typeof acc.toJSON === 'function' ? acc.toJSON().address : null);
			if (!address) {
				console.error('Account missing address:', acc);
				throw new Error(`Account at index ${index} is missing address property`);
			}
			this.#allKeypairs.set(address, kp);
		});

		// Create SuiClient for each network
		Object.entries(networkConfigs).forEach(([chain, config]) => {
			this.#suiClients.set(
				chain as SuiChain,
				new SuiClient({
					url: config.url,
					network: config.network,
				}),
			);
		});
	}

	// Method to update which account is used for signing (internal wallet state)
	updateSigningAccount(keypair: any) {
		this.#signingKeypair = keypair;
		// Don't notify listeners - this is internal wallet state only
	}

	// Method to update the accounts list (when accounts are added/removed)
	updateAvailableAccounts(accounts: any[], keypairs: any[] = []) {
		this.#allAccounts = accounts;

		// Rebuild the keypairs map
		this.#allKeypairs.clear();
		accounts.forEach((acc, index) => {
			const kp = keypairs[index] || this.#signingKeypair;
			this.#allKeypairs.set(acc.address, kp);
		});

		// Notify listeners that available accounts have changed
		this.#eventListeners.forEach((listener) => listener({ accounts: this.accounts }));
	}

	// Helper method to get the keypair for a requested account
	#getKeypairForAccount(account: ReadonlyWalletAccount): Keypair {
		const address = account.address;
		if (!address) {
			throw new Error(`Account is missing address property`);
		}
		const keypair = this.#allKeypairs.get(address);
		if (!keypair) {
			throw new Error(`Account ${address} not found in wallet`);
		}
		return keypair;
	}

	// Helper method to get the SuiClient for a requested chain
	#getSuiClientForChain(chain: string): SuiClient {
		if (!isSuiChain(chain as any)) {
			throw new Error(`Unsupported chain: ${chain}`);
		}

		const client = this.#suiClients.get(chain as SuiChain);
		if (!client) {
			throw new Error(`No client configured for chain: ${chain}`);
		}

		return client;
	}

	// Get the SuiClient for the currently active network (for wallet UI)
	get activeNetworkClient(): SuiClient {
		return this.#getSuiClientForChain(this.#activeNetwork);
	}

	// Get the currently active network
	get activeNetwork(): SuiChain {
		return this.#activeNetwork;
	}

	// Update the active network (for wallet UI)
	updateActiveNetwork(network: SuiChain) {
		if (!isSuiChain(network)) {
			throw new Error(`Unsupported network: ${network}`);
		}
		this.#activeNetwork = network;
		// Notify listeners that the active network changed
		this.#eventListeners.forEach((listener) => listener({ activeNetwork: network }));
	}

	async removePolicy(origin: string): Promise<void> {
		// Remove auto-approval policy state from localStorage
		const storageKey = `auto-approval-${origin}-${this.#activeNetwork}`;
		localStorage.removeItem(storageKey);
	}

	// Public getters for component access
	getSuiClientForChain(chain: SuiChain): SuiClient {
		return this.#getSuiClientForChain(chain);
	}

	get version() {
		return '1.0.0' as const;
	}

	get name() {
		return 'Demo Wallet' as const;
	}

	get icon() {
		return DEMO_WALLET_ICON;
	}

	get chains() {
		return Object.keys(networkConfigs) as `${string}:${string}`[];
	}

	get features(): any {
		return {
			'standard:connect': { version: '1.0.0', connect: this.connect },
			'standard:events': { version: '1.0.0', on: this.on },
			'sui:signPersonalMessage': {
				version: '1.0.0',
				signPersonalMessage: this.signPersonalMessage,
			},
			'sui:signTransaction': { version: '1.0.0', signTransaction: this.signTransaction },
			'sui:signAndExecuteTransaction': {
				version: '1.0.0',
				signAndExecuteTransaction: this.signAndExecuteTransaction,
			},
			'sui:getSupportedIntents': {
				version: '1.0.0',
				getSupportedIntents: this.getSupportedIntents,
			},
		};
	}

	get accounts() {
		return this.#allAccounts.map((account) => {
			// Ensure we preserve all properties and don't lose the address
			const accountData = {
				address:
					account.address ||
					account.getAddress?.() ||
					(typeof account.toJSON === 'function' ? account.toJSON().address : null),
				publicKey: account.publicKey,
				label: account.label,
				icon: account.icon,
				chains: this.chains,
				features: [
					'sui:signPersonalMessage',
					'sui:signTransaction',
					'sui:signAndExecuteTransaction',
				] as const,
			};

			if (!accountData.address) {
				console.error('Account missing address in getter:', account);
			}

			return accountData;
		});
	}

	connect: StandardConnectMethod = async (input) => {
		const selectedAccounts = input?.silent ? this.accounts : this.accounts;
		return { accounts: selectedAccounts };
	};

	on: StandardEventsOnMethod = (_event, listener) => {
		this.#eventListeners.add(listener);
		return () => this.#eventListeners.delete(listener);
	};

	signPersonalMessage: SuiSignPersonalMessageMethod = async ({ message, account, chain }) => {
		const requestedAccount = account as ReadonlyWalletAccount;
		const requestedChain = chain;

		return new Promise((promiseResolve, promiseReject) => {
			this.#requestHandler({
				type: 'personalMessage',
				data: typeof message === 'string' ? message : new TextDecoder().decode(message),
				origin: window.location.origin,
				account: requestedAccount,
				chain: requestedChain || this.#activeNetwork,
				resolve: async () => {
					try {
						const keypair = this.#getKeypairForAccount(requestedAccount);
						const messageBytes =
							typeof message === 'string' ? new TextEncoder().encode(message) : message;
						const signatureResult = await keypair.signPersonalMessage(messageBytes);
						promiseResolve({ signature: signatureResult.signature, bytes: signatureResult.bytes });
					} catch (error) {
						promiseReject(error as Error);
					}
				},
				reject: (error: Error) => promiseReject(error),
			});
		});
	};

	signTransaction: SuiSignTransactionMethod = async ({ transaction, account, chain }) => {
		const requestedAccount = account as ReadonlyWalletAccount;
		const requestedChain = chain;

		// Convert wallet standard transaction to proper Transaction instance
		const transactionJson = await transaction.toJSON();
		const properTransaction = Transaction.from(transactionJson);

		return new Promise((resolve, reject) => {
			this.#requestHandler({
				type: 'transaction',
				data: properTransaction,
				origin: window.location.origin,
				account: requestedAccount,
				chain: requestedChain,
				resolve: async (updatedTransaction) => {
					try {
						const finalTransaction = updatedTransaction || (transaction as Transaction);
						const keypair = this.#getKeypairForAccount(requestedAccount);
						const suiClient = this.#getSuiClientForChain(requestedChain);
						const txBytes = await finalTransaction.build({ client: suiClient });
						const signatureResult = await keypair.signTransaction(txBytes);
						resolve({ signature: signatureResult.signature, bytes: signatureResult.bytes });
					} catch (error) {
						reject(error as Error);
					}
				},
				reject,
			});
		});
	};

	signAndExecuteTransaction: SuiSignAndExecuteTransactionMethod = async ({
		transaction,
		account,
		chain,
	}) => {
		const requestedAccount = account as ReadonlyWalletAccount;
		const requestedChain = chain;
		const suiClient = this.#getSuiClientForChain(requestedChain);

		// Convert wallet standard transaction to proper Transaction instance
		const transactionJson = await transaction.toJSON();
		const properTransaction = Transaction.from(transactionJson);

		return new Promise((resolve, reject) => {
			this.#requestHandler({
				type: 'signAndExecute',
				data: properTransaction,
				origin: window.location.origin,
				account: requestedAccount,
				chain: requestedChain,
				resolve: async (updatedTransaction) => {
					try {
						const finalTransaction = updatedTransaction || (transaction as Transaction);
						const keypair = this.#getKeypairForAccount(requestedAccount);
						const txBytes = await finalTransaction.build({ client: suiClient });
						const txBytesString = toBase64(txBytes);
						const signatureResult = await keypair.signTransaction(txBytes);

						const result = await suiClient.executeTransactionBlock({
							transactionBlock: txBytesString,
							signature: [signatureResult.signature],
							options: {
								showEffects: true,
								showObjectChanges: true,
								showBalanceChanges: true,
								showEvents: true,
								showInput: true,
							},
						});

						resolve({
							bytes: txBytesString,
							signature: signatureResult.signature,
							digest: result.digest,
							effects: (typeof result.rawEffects === 'string' ? result.rawEffects : '') || '',
						});
					} catch (error) {
						reject(error as Error);
					}
				},
				reject,
			});
		});
	};

	getSupportedIntents: SuiGetSupportedIntentsMethod = async () => {
		return {
			supportedIntents: [AUTO_APPROVAL_INTENT],
		};
	};

	// Method for cleanup
	unregister?: () => void;
}
