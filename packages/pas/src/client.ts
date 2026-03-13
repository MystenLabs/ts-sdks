// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';

import { TESTNET_PAS_PACKAGE_CONFIG } from './constants.js';
import {
	deriveAccountAddress,
	derivePolicyAddress,
	deriveTemplateAddress,
	deriveTemplateRegistryAddress,
} from './derivation.js';
import { PASClientError } from './error.js';
import {
	accountForAddressIntent,
	sendBalanceIntent,
	unlockBalanceIntent,
	unlockUnrestrictedBalanceIntent,
} from './intents.js';
import type { PASClientConfig, PASOptions, PASPackageConfig } from './types.js';

export function pas<const Name extends string = 'pas'>({
	packageConfig,
	name = 'pas' as Name,
	...options
}: PASOptions<Name> = {}): {
	name: Name;
	register: (client: ClientWithCoreApi) => PASClient;
} {
	return {
		name,
		register: (client: ClientWithCoreApi) =>
			new PASClient({ packageConfig, suiClient: client, ...options }),
	};
}

export class PASClient {
	#packageConfig: PASPackageConfig;

	constructor(config: PASClientConfig) {
		const network = config.suiClient.network;

		// Mainnet: no custom config allowed (avoid accidental republishing).
		if (network === 'mainnet' && config.packageConfig) {
			throw new PASClientError(
				'Custom package configuration is not allowed on mainnet. Use the built-in mainnet config when mainnet is supported.',
			);
		}

		if (config.packageConfig) {
			this.#packageConfig = config.packageConfig;
			return;
		}

		if (!network || (network !== 'mainnet' && network !== 'testnet')) {
			throw new PASClientError(
				'PAS client requires a known network (mainnet, testnet) or a custom package configuration.',
			);
		}

		// TODO: Remove when we add mainnet data
		if (network === 'mainnet') {
			throw new PASClientError('Mainnet is not supported yet.');
		}

		this.#packageConfig = TESTNET_PAS_PACKAGE_CONFIG;
	}

	/**
	 * Get the package configuration
	 */
	getPackageConfig() {
		return this.#packageConfig;
	}

	/**
	 * Derives the account address for a given owner address.
	 *
	 * @param owner - The owner address (can be a user address or object address)
	 * @returns The derived account object ID
	 */
	deriveAccountAddress(owner: string): string {
		return deriveAccountAddress(owner, this.#packageConfig);
	}

	/**
	 * Derives the policy address for a given asset type T.
	 * By default wraps with `Balance<T>` to match the on-chain convention.
	 *
	 * @param assetType - The full type of the asset (e.g., "0x2::sui::SUI")
	 * @returns The derived policy object ID
	 */
	derivePolicyAddress(assetType: string): string {
		return derivePolicyAddress(assetType, this.#packageConfig);
	}

	/**
	 * Derives the templates object address for a given package configuration.
	 *
	 * @returns The derived templates object ID
	 */
	deriveTemplateRegistryAddress(): string {
		return deriveTemplateRegistryAddress(this.#packageConfig);
	}

	/**
	 * Derives the template DF address for a given approval type name.
	 *
	 * @param approvalTypeName - The fully qualified approval type name
	 * @returns The derived dynamic field object ID
	 */
	deriveTemplateAddress(approvalTypeName: string): string {
		return deriveTemplateAddress(this.deriveTemplateRegistryAddress(), approvalTypeName);
	}

	/**
	 * Intent-based transaction builders. Each method returns a synchronous closure
	 * that registers a `$Intent` placeholder in the transaction. The actual PTB commands
	 * are resolved lazily at `tx.build()` time via the shared PAS resolver plugin.
	 */
	get call() {
		return {
			/**
			 * Creates a transfer funds intent. At build time, it auto-resolves the issuer's
			 * approval template commands by reading the Policy and Templates objects on-chain.
			 * If the recipient account does not exist, it will be created and shared automatically.
			 *
			 * @param options - Transfer options
			 * @param options.from - The sender's address (owner of the source account)
			 * @param options.to - The receiver's address (owner of the destination account)
			 * @param options.amount - The amount to transfer
			 * @param options.assetType - The full asset type (e.g., "0x2::sui::SUI")
			 * @returns A sync closure `(tx: Transaction) => TransactionResult`
			 */
			sendBalance: sendBalanceIntent(this.#packageConfig),

			/**
			 * Creates an unlock balance intent. At build time, it resolves the issuer's
			 * approval template commands. This will fail if the issuer has not configured
			 * unlock approvals for the asset type.
			 *
			 * @param options - Unlock options
			 * @param options.from - The sender's address (owner of the source account)
			 * @param options.amount - The amount to unlock
			 * @param options.assetType - The full asset type (e.g., "0x2::sui::SUI")
			 * @returns A sync closure `(tx: Transaction) => TransactionResult`
			 */
			unlockBalance: unlockBalanceIntent(this.#packageConfig),

			/**
			 * Creates an unlock balance intent for unrestricted (non-managed) assets.
			 * Use this when no Policy exists for the asset type (e.g., SUI).
			 *
			 * @param options - Unlock options
			 * @param options.from - The sender's address (owner of the source account)
			 * @param options.amount - The amount to unlock
			 * @param options.assetType - The full asset type (e.g., "0x2::sui::SUI")
			 * @returns A sync closure `(tx: Transaction) => TransactionResult`
			 */
			unlockUnrestrictedBalance: unlockUnrestrictedBalanceIntent(this.#packageConfig),

			/**
			 * Returns a account object for the given address. At build time, if the account
			 * already exists on-chain it resolves to an object reference; otherwise it
			 * creates the account and shares it.
			 *
			 * @param owner - The owner address
			 * @returns A sync closure `(tx: Transaction) => TransactionResult` (the account)
			 */
			accountForAddress: accountForAddressIntent(this.#packageConfig),
		};
	}
}
