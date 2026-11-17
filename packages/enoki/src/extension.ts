// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi, SuiClientTypes } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress, toBase64 } from '@mysten/sui/utils';

import type { EnokiClientConfig } from './EnokiClient/index.js';
import { EnokiClient, EnokiClientError } from './EnokiClient/index.js';
import type { EnokiDomainNetwork } from './EnokiClient/type.js';

export type EnokiExtensionOptions<Name extends string = 'enoki'> = Omit<
	EnokiClientConfig,
	'additionalEpochs'
> & {
	name?: Name;
};

interface EnokiSponsorAndExecuteBaseOptions<Include extends SuiClientTypes.TransactionInclude>
	extends SuiClientTypes.CoreClientMethodOptions {
	/** Addresses the transaction may use, in addition to the app's allowlist in the Enoki Portal. */
	allowedAddresses?: string[];
	/** Move call targets the transaction may call, in addition to the app's allowlist in the Enoki Portal. */
	allowedMoveCallTargets?: string[];
	include?: Include & SuiClientTypes.TransactionInclude;
}

export type EnokiSponsorAndExecuteTransactionOptions<
	Include extends SuiClientTypes.TransactionInclude = {},
> = EnokiSponsorAndExecuteBaseOptions<Include> &
	(
		| {
				/** The transaction to send. Enoki is set as gas owner, and the sender defaults to `signer`. */
				transaction: Transaction;
				/** Signs as the transaction sender. */
				signer: Signer;
				signature?: never;
		  }
		| {
				/**
				 * Built transaction bytes (or base64) of a transaction prepared with
				 * `prepareSponsoredTransaction`.
				 */
				transaction: Uint8Array | string;
				/** The sender's signature over the bytes. */
				signature: string;
				signer?: never;
		  }
	);

export interface EnokiPrepareSponsoredTransactionOptions {
	/** The transaction to prepare. Enoki is set as gas owner, paying from its address balance. */
	transaction: Transaction;
	/** The sender, set if the transaction doesn't already have one. */
	sender?: string;
}

/**
 * Adds Enoki sponsorship to a Sui client. Requires a private API key with sponsored transactions
 * enabled.
 *
 * @example
 * ```ts
 * const client = new SuiGrpcClient({ network: 'mainnet', baseUrl }).$extend(
 *   enoki({ apiKey: process.env.ENOKI_PRIVATE_KEY! }),
 * );
 *
 * const result = await client.enoki.sponsorAndExecuteTransaction({ transaction, signer });
 * ```
 */
export function enoki<const Name extends string = 'enoki'>({
	name = 'enoki' as Name,
	...config
}: EnokiExtensionOptions<Name>) {
	return {
		name,
		register: (client: ClientWithCoreApi) =>
			new EnokiClientExtension({ client, enoki: new EnokiClient(config) }),
	};
}

export class EnokiClientExtension {
	#client: ClientWithCoreApi;
	#enoki: EnokiClient;
	#sponsorAddress?: Promise<string>;

	constructor({ client, enoki }: { client: ClientWithCoreApi; enoki: EnokiClient }) {
		this.#client = client;
		this.#enoki = enoki;
	}

	/** Enoki's sponsor address on the client's network. Cached until Enoki reports it changed. */
	getSponsorAddress(): Promise<string> {
		if (!this.#sponsorAddress) {
			const network = this.#network();
			this.#sponsorAddress = this.#enoki.getApp().then(({ sponsorAddresses }) => {
				const address = sponsorAddresses?.[network];
				if (!address) {
					throw new Error(`Enoki does not sponsor transactions on ${network}`);
				}
				return normalizeSuiAddress(address);
			});
			this.#sponsorAddress.catch(() => {
				this.#sponsorAddress = undefined;
			});
		}
		return this.#sponsorAddress;
	}

	/**
	 * Sets Enoki as the transaction's gas owner with an empty gas payment, and the sender if given.
	 * Doesn't build it, so a wallet can still resolve the rest. Build or have a wallet sign it, run
	 * any checks, then pass the bytes and signature to `sponsorAndExecuteTransaction`.
	 *
	 * Safe to call on a transaction that's already prepared. Throws if the transaction already has
	 * a different sender or gas owner, or a gas payment.
	 */
	async prepareSponsoredTransaction({
		transaction,
		sender,
	}: EnokiPrepareSponsoredTransactionOptions): Promise<Transaction> {
		const sponsorAddress = await this.getSponsorAddress();
		const data = transaction.getData();

		if (sender) {
			if (data.sender && normalizeSuiAddress(data.sender) !== normalizeSuiAddress(sender)) {
				throw new Error(`Transaction sender is ${data.sender}, not ${sender}`);
			}
			transaction.setSenderIfNotSet(sender);
		}
		if (data.gasData.owner && normalizeSuiAddress(data.gasData.owner) !== sponsorAddress) {
			throw new Error(
				`Transaction gas owner is ${data.gasData.owner}, not Enoki's sponsor ${sponsorAddress}`,
			);
		}
		if (data.gasData.payment && data.gasData.payment.length > 0) {
			throw new Error('Sponsored transactions pay gas from the sponsor; remove the gas payment');
		}

		transaction.setGasOwner(sponsorAddress);
		transaction.setGasPayment([]);
		return transaction;
	}

	/**
	 * Has Enoki sponsor and execute a transaction, and waits for it. Returns the same result as
	 * `client.core.signAndExecuteTransaction`.
	 *
	 * With a `signer`, the transaction is prepared with `prepareSponsoredTransaction`, built and
	 * signed here. With a `signature`, the bytes are sent as they are.
	 *
	 * Enoki errors are thrown as `EnokiClientError`. If `isStaleTransactionError(error)`, the cached
	 * sponsor address (and, with a `signer`, the transaction's gas owner or gas price) is updated,
	 * so calling this again with the same transaction builds and signs with current values.
	 */
	async sponsorAndExecuteTransaction<Include extends SuiClientTypes.TransactionInclude = {}>(
		options: EnokiSponsorAndExecuteTransactionOptions<Include>,
	): Promise<SuiClientTypes.TransactionResult<Include>> {
		const network = this.#network();

		let bytes: Uint8Array | string;
		let signature: string;
		if (options.signer) {
			const { transaction, signer } = options;
			await this.prepareSponsoredTransaction({ transaction, sender: signer.toSuiAddress() });
			bytes = await transaction.build({ client: this.#client });
			({ signature } = await signer.signTransaction(bytes));
		} else {
			bytes = options.transaction;
			signature = options.signature;
		}

		let digest: string;
		try {
			({ digest } = await this.#enoki.sponsorAndExecuteTransaction({
				network,
				transactionBytes: typeof bytes === 'string' ? bytes : toBase64(bytes),
				signature,
				allowedAddresses: options.allowedAddresses,
				allowedMoveCallTargets: options.allowedMoveCallTargets,
			}));
		} catch (error) {
			if (error instanceof EnokiClientError && error.requiresRebuild) {
				this.#refreshFrom(error, options.signer ? options.transaction : undefined);
			}
			throw error;
		}

		return this.#client.core.waitForTransaction({
			digest,
			include: options.include,
			signal: options.signal,
		});
	}

	/** Updates the cached sponsor address, and the transaction if given, from a stale-transaction error. */
	#refreshFrom(error: EnokiClientError, transaction?: Transaction) {
		const { sponsorAddress, referenceGasPrice } = (error.errors[0]?.data ?? {}) as {
			sponsorAddress?: string;
			referenceGasPrice?: string;
		};

		if (error.code === 'invalid_gas_owner') {
			if (sponsorAddress) {
				const address = normalizeSuiAddress(sponsorAddress);
				this.#sponsorAddress = Promise.resolve(address);
				transaction?.setGasOwner(address);
			} else {
				this.#sponsorAddress = undefined;
			}
		}
		if (error.code === 'invalid_gas_price' && referenceGasPrice) {
			transaction?.setGasPrice(BigInt(referenceGasPrice));
		}
	}

	#network(): EnokiDomainNetwork {
		const network: string = this.#client.network;
		if (network === 'mainnet' || network === 'testnet') {
			return network;
		}
		throw new Error(`Enoki sponsorship is not available on ${network}`);
	}
}
