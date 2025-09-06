// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useEffect, useRef, useState } from 'react';
import type {
	Wallet,
	StandardConnectMethod,
	StandardEventsOnMethod,
	SuiSignPersonalMessageMethod,
	SuiSignTransactionMethod,
	SuiSignAndExecuteTransactionMethod,
} from '@mysten/wallet-standard';
import {
	SUI_DEVNET_CHAIN,
	SUI_TESTNET_CHAIN,
	SUI_LOCALNET_CHAIN,
	SUI_MAINNET_CHAIN,
	isSuiChain,
} from '@mysten/wallet-standard';
import type { SuiChain } from '@mysten/wallet-standard';
import { getWallets } from '@mysten/wallet-standard';
import { Transaction } from '@mysten/sui/transactions';
import { toBase64 } from '@mysten/sui/utils';
import { SuiClient } from '@mysten/sui/client';
import { useWalletAccount } from './hooks/useWalletAccount.js';
import { AccountInfo } from './components/AccountInfo.js';
import { BalancesList } from './components/BalancesList.js';
import { SigningModal } from './components/SigningModal.js';
import { TransactionApprovalModal } from './components/TransactionApprovalModal.js';
import { DEMO_WALLET_ICON } from './constants/icons.js';
import { PolicyManager, AUTO_APPROVAL_POLICY_INTENT, extractCoinFlows } from '@mysten/wallet-sdk';
import { DemoWalletPolicyStorage } from './storage/PolicyStorage.js';

// New wallet request types - much simpler, just store the data and callbacks
type WalletRequest = {
	type: 'personalMessage' | 'transaction' | 'signAndExecute';
	data: string | Transaction; // JSON string for personal messages, Transaction object for transactions
	origin: string;
	account: any;
	chain: string;
	resolve: (transaction?: Transaction) => void;
	reject: (error: Error) => void;
};

// Create our demo wallet class
class DemoWalletImpl implements Wallet {
	#signingKeypair: any; // The keypair used for signing (wallet's internal selection)
	#allAccounts: any[]; // All accounts available to the dApp (fixed list)
	#allKeypairs: Map<string, any> = new Map(); // Map of address to keypair for all accounts
	#suiClients: Map<SuiChain, SuiClient> = new Map(); // Map of chain to SuiClient
	#activeNetwork: SuiChain = SUI_TESTNET_CHAIN; // Default to testnet
	#onWalletRequest: (request: WalletRequest) => void;
	#eventListeners: Set<(properties: any) => void> = new Set();
	#policyManager: PolicyManager;
	unregister?: () => void; // Store unregister function

	constructor(
		keypair: any,
		account: any,
		onWalletRequest: (request: WalletRequest) => void,
		allAccounts: any[] = [],
		allKeypairs: any[] = [],
		activeNetwork: SuiChain = SUI_TESTNET_CHAIN,
	) {
		this.#signingKeypair = keypair;
		this.#allAccounts = allAccounts.length > 0 ? allAccounts : [account];
		this.#onWalletRequest = onWalletRequest;
		this.#activeNetwork = activeNetwork;

		// Build map of address to keypair
		this.#allAccounts.forEach((acc, index) => {
			const kp = allKeypairs[index] || keypair; // Use corresponding keypair or default
			this.#allKeypairs.set(acc.address, kp);
		});

		// Initialize SuiClient instances for each network
		this.#initializeSuiClients();

		// Initialize policy manager
		this.#policyManager = new PolicyManager(new DemoWalletPolicyStorage());
	}

	#initializeSuiClients() {
		// Network configurations
		const networkConfigs = {
			[SUI_MAINNET_CHAIN]: {
				url: 'https://fullnode.mainnet.sui.io:443',
				network: 'mainnet' as const,
			},
			[SUI_TESTNET_CHAIN]: {
				url: 'https://fullnode.testnet.sui.io:443',
				network: 'testnet' as const,
			},
			[SUI_DEVNET_CHAIN]: {
				url: 'https://fullnode.devnet.sui.io:443',
				network: 'devnet' as const,
			},
			[SUI_LOCALNET_CHAIN]: {
				url: 'http://localhost:9000',
				network: 'localnet' as const,
			},
		};

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
		// The dApp sees the same accounts, just the signing key changes internally
	}

	// Method to update the accounts list (when accounts are added/removed)
	updateAvailableAccounts(accounts: any[], keypairs: any[] = []) {
		this.#allAccounts = accounts;

		// Rebuild the keypairs map
		this.#allKeypairs.clear();
		accounts.forEach((acc, index) => {
			const kp = keypairs[index] || this.#signingKeypair; // Use corresponding keypair or current default
			this.#allKeypairs.set(acc.address, kp);
		});

		// Notify listeners that available accounts have changed
		this.#eventListeners.forEach((listener) => listener({ accounts: this.accounts }));
	}

	// Helper method to get the keypair for a requested account
	#getKeypairForAccount(account: any): any {
		const keypair = this.#allKeypairs.get(account.address);
		if (!keypair) {
			throw new Error(`Account ${account.address} not found in wallet`);
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
		return this.#policyManager.removePolicy(origin);
	}

	// Public getters for component access
	getSuiClientForChain(chain: SuiChain): SuiClient {
		return this.#getSuiClientForChain(chain);
	}

	get policyManager(): PolicyManager {
		return this.#policyManager;
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
		return ['sui:testnet', 'sui:mainnet', 'sui:devnet'] as const;
	}

	get accounts() {
		return this.#allAccounts;
	}

	get features() {
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

	#on: StandardEventsOnMethod = (event, listener) => {
		if (event === 'change') {
			this.#eventListeners.add(listener);
			return () => {
				this.#eventListeners.delete(listener);
			};
		}
		return () => {};
	};

	#connect: StandardConnectMethod = async () => {
		return {
			accounts: this.accounts,
			supportedIntents: [
				// Add your custom intents here
				'CoinWithBalance',
				AUTO_APPROVAL_POLICY_INTENT,
			],
		};
	};

	#signPersonalMessage: SuiSignPersonalMessageMethod = async (input) => {
		// Use the keypair for the requested account, not the wallet's internal selection
		const requestedKeypair = this.#getKeypairForAccount(input.account);

		// Validate chain if provided (personal message signing chain is optional)
		if (input.chain && !isSuiChain(input.chain)) {
			throw new Error(`Unsupported chain: ${input.chain}`);
		}

		const message =
			typeof input.message === 'string' ? input.message : toBase64(new Uint8Array(input.message));

		return new Promise((resolve, reject) => {
			this.#onWalletRequest({
				type: 'personalMessage',
				data: message,
				origin: window.location.origin,
				account: input.account,
				chain: input.chain || this.#activeNetwork,
				resolve: async () => {
					try {
						const result = await requestedKeypair.signPersonalMessage(input.message);
						resolve(result);
					} catch (error) {
						reject(error);
					}
				},
				reject,
			});
		});
	};

	#signTransaction: SuiSignTransactionMethod = async (input) => {
		// Use the keypair for the requested account, not the wallet's internal selection
		const requestedKeypair = this.#getKeypairForAccount(input.account);

		// Get the appropriate SuiClient for the requested chain
		const suiClient = this.#getSuiClientForChain(input.chain);

		const transaction = Transaction.from(await input.transaction.toJSON());
		const transactionJson = await input.transaction.toJSON();

		return new Promise((resolve, reject) => {
			this.#onWalletRequest({
				type: 'transaction',
				data: transactionJson,
				origin: window.location.origin,
				account: input.account,
				chain: input.chain,
				resolve: async () => {
					try {
						const { bytes, signature } = await transaction.sign({
							client: suiClient,
							signer: requestedKeypair,
						});
						resolve({ bytes, signature });
					} catch (error) {
						reject(error);
					}
				},
				reject,
			});
		});
	};

	#signAndExecuteTransaction: SuiSignAndExecuteTransactionMethod = async (input) => {
		// Use the keypair for the requested account, not the wallet's internal selection
		const requestedKeypair = this.#getKeypairForAccount(input.account);

		// Get the appropriate SuiClient for the requested chain
		const suiClient = this.#getSuiClientForChain(input.chain);

		const transactionJson = await input.transaction.toJSON();

		return new Promise((resolve, reject) => {
			this.#onWalletRequest({
				type: 'signAndExecute',
				data: transactionJson,
				origin: window.location.origin,
				account: input.account,
				chain: input.chain,
				resolve: async (resolvedTransaction?: Transaction) => {
					try {
						// Use the resolved transaction if provided, otherwise fall back to JSON
						const transaction = resolvedTransaction || Transaction.from(transactionJson);
						console.log(
							'🔐 DemoWallet: Using transaction for signing:',
							resolvedTransaction ? 'resolved Transaction object' : 'recreated from JSON',
						);
						const { bytes, signature } = await transaction.sign({
							client: suiClient,
							signer: requestedKeypair,
						});

						const result = await suiClient.executeTransactionBlock({
							signature,
							transactionBlock: bytes,
							options: {
								showRawEffects: true,
							},
						});

						console.log('✅ Transaction executed successfully');

						// Update policy budget after successful transaction
						try {
							if (resolvedTransaction) {
								// Extract coin flows and analyze transaction cost
								const coinFlows = await extractCoinFlows(resolvedTransaction, suiClient);
								const analysis = this.policyManager.analyzeTransaction(coinFlows.outflows);

								await this.policyManager.updatePolicyAfterTransaction(
									window.location.origin,
									analysis,
								);
								console.log('💰 Policy budget updated after transaction');
							}
						} catch (policyError) {
							console.warn('⚠️ Failed to update policy budget:', policyError);
							// Don't fail the transaction if policy update fails
						}

						resolve({
							bytes,
							signature,
							digest: result.digest,
							effects: toBase64(new Uint8Array(result.rawEffects!)),
						});
					} catch (error) {
						reject(error);
					}
				},
				reject,
			});
		});
	};
}

export function DemoWallet() {
	const {
		accounts,
		activeAccount,
		activeKeypair,
		activeAccountIndex,
		keypairs,
		addAccount,
		removeAccount,
		switchAccount,
		renameAccount,
	} = useWalletAccount();
	const walletRef = useRef<DemoWalletImpl | null>(null);
	const [walletRequest, setWalletRequest] = useState<WalletRequest | null>(null);
	const [activeNetwork, setActiveNetwork] = useState<SuiChain>(SUI_TESTNET_CHAIN);

	// Register wallet once on mount, but only when we have accounts
	useEffect(() => {
		if (!activeKeypair || !activeAccount) return;

		// Only create wallet if it doesn't exist
		if (!walletRef.current) {
			// Create demo wallet instance with all accounts and keypairs
			const wallet = new DemoWalletImpl(
				activeKeypair,
				activeAccount,
				setWalletRequest,
				accounts,
				keypairs,
				activeNetwork,
			);

			// Register the wallet
			const walletsApi = getWallets();
			const unregister = walletsApi.register(wallet);

			walletRef.current = wallet;

			console.warn(
				'Your application is currently using the demo wallet. Make sure that this wallet is disabled in production.',
			);

			// Store unregister function for cleanup
			walletRef.current.unregister = unregister;
		} else {
			// Wallet exists, only update which account is used for signing internally
			walletRef.current.updateSigningAccount(activeKeypair);
			// Only update available accounts when the accounts list actually changes (add/remove)
			// but not when just switching between existing accounts
			if (walletRef.current.accounts.length !== accounts.length) {
				walletRef.current.updateAvailableAccounts(accounts, keypairs);
			}
		}
	}, [activeKeypair, activeAccount, accounts, keypairs, activeNetwork]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (walletRef.current?.unregister) {
				walletRef.current.unregister();
				walletRef.current = null;
			}
		};
	}, []);

	// Handle HMR cleanup
	useEffect(() => {
		if (import.meta.hot) {
			import.meta.hot.dispose(() => {
				if (walletRef.current) {
					walletRef.current = null;
				}
			});
		}
	}, []);

	const handleWalletResponse = (approved: boolean) => {
		if (walletRequest) {
			if (approved) {
				walletRequest.resolve(undefined); // The actual signing happens in the resolve function
			} else {
				walletRequest.reject(new Error('User rejected the request'));
			}
			setWalletRequest(null);
		}
	};

	const handleNetworkSwitch = (network: SuiChain) => {
		setActiveNetwork(network);
		if (walletRef.current) {
			walletRef.current.updateActiveNetwork(network);
		}
	};

	if (!activeAccount) {
		return (
			<div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
				Initializing wallet...
			</div>
		);
	}

	return (
		<>
			<div
				style={{
					position: 'fixed',
					right: 0,
					top: 0,
					bottom: 0,
					width: '380px',
					backgroundColor: '#fafafa',
					borderLeft: '1px solid #e0e0e0',
					display: 'flex',
					flexDirection: 'column',
					zIndex: 100,
				}}
			>
				<AccountInfo
					accounts={accounts}
					activeAccountIndex={activeAccountIndex}
					onSwitchAccount={switchAccount}
					onAddAccount={addAccount}
					onRemoveAccount={removeAccount}
					onRenameAccount={renameAccount}
					activeNetwork={activeNetwork}
					onNetworkSwitch={handleNetworkSwitch}
				/>

				{/* Wallet Content */}
				<div
					style={{
						flex: 1,
						padding: '20px',
						overflow: 'auto',
					}}
				>
					<BalancesList
						account={activeAccount}
						suiClient={
							walletRef.current?.activeNetworkClient ||
							new SuiClient({ url: 'https://fullnode.testnet.sui.io:443', network: 'testnet' })
						}
					/>
				</div>

				{/* Wallet Footer */}
				<div
					style={{
						padding: '16px 20px',
						borderTop: '1px solid #e0e0e0',
						backgroundColor: '#fff',
						fontSize: '11px',
						color: '#999',
						textAlign: 'center',
					}}
				>
					This is a demo wallet for testing purposes only.
					<br />
					Do not use with real assets.
				</div>
			</div>

			{/* Transaction Approval Modal (with new hook-based architecture) */}
			{walletRequest && walletRequest.type === 'signAndExecute' && walletRef.current && (
				<TransactionApprovalModal
					isOpen={true}
					transactionJson={typeof walletRequest.data === 'string' ? walletRequest.data : ''}
					suiClient={walletRef.current.getSuiClientForChain(walletRequest.chain as SuiChain)}
					policyManager={walletRef.current.policyManager}
					account={activeAccount}
					origin={walletRequest.origin}
					onApprove={async (resolvedTransaction: Transaction) => {
						console.log('🟢 DemoWallet: onApprove called with resolved transaction');
						walletRequest.resolve(resolvedTransaction);
						setWalletRequest(null);
					}}
					onReject={(error) => {
						walletRequest.reject(new Error(error));
						setWalletRequest(null);
					}}
					onClose={() => {
						walletRequest.reject(new Error('User canceled transaction'));
						setWalletRequest(null);
					}}
				/>
			)}

			{/* Personal Message Modal */}
			{walletRequest && walletRequest.type === 'personalMessage' && (
				<div
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						backgroundColor: 'rgba(0, 0, 0, 0.5)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						zIndex: 10000,
					}}
				>
					<div
						style={{
							backgroundColor: '#fff',
							borderRadius: '12px',
							padding: '24px',
							maxWidth: '500px',
							width: '90%',
							maxHeight: '80vh',
							overflow: 'auto',
							boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
						}}
					>
						<h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '600', color: '#333' }}>
							Sign Message
						</h3>
						<p style={{ margin: '0 0 20px', fontSize: '14px', color: '#666' }}>
							An application is requesting to sign a message with your account.
						</p>

						<div
							style={{
								backgroundColor: '#f5f5f5',
								borderRadius: '8px',
								padding: '12px',
								marginBottom: '20px',
							}}
						>
							<div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Message</div>
							<div style={{ fontSize: '14px', color: '#333', wordBreak: 'break-word' }}>
								{typeof walletRequest.data === 'string'
									? walletRequest.data
									: '[Transaction Object]'}
							</div>
						</div>

						<div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
							<button
								onClick={() => handleWalletResponse(false)}
								style={{
									padding: '10px 20px',
									backgroundColor: '#f5f5f5',
									border: '1px solid #ddd',
									borderRadius: '6px',
									fontSize: '14px',
									fontWeight: '500',
									cursor: 'pointer',
									color: '#333',
								}}
							>
								Reject
							</button>
							<button
								onClick={() => handleWalletResponse(true)}
								style={{
									padding: '10px 20px',
									backgroundColor: '#1976d2',
									border: 'none',
									borderRadius: '6px',
									fontSize: '14px',
									fontWeight: '500',
									cursor: 'pointer',
									color: 'white',
								}}
							>
								Sign Message
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Transaction Signing Modal */}
			{walletRequest && walletRequest.type === 'transaction' && (
				<SigningModal
					isOpen={true}
					account={activeAccount}
					requestType={walletRequest.type}
					transaction={Transaction.from(walletRequest.data)}
					onApprove={() => handleWalletResponse(true)}
					onReject={() => handleWalletResponse(false)}
				/>
			)}
		</>
	);
}
