// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi, SuiClientTypes } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress, toBase64 } from '@mysten/sui/utils';

import type { EnokiClientConfig } from './EnokiClient/index.js';
import { EnokiClient, isStaleTransactionError } from './EnokiClient/index.js';
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

	/** Enoki's sponsor address on the client's network. Cached until a transaction is rejected as stale. */
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
	 * Sets Enoki as the transaction's gas owner with an empty gas payment.
	 * Doesn't build it, so a wallet can still resolve the rest. Build or have a wallet sign it, run
	 * any checks, then pass the bytes and signature to `sponsorAndExecuteTransaction`.
	 *
	 * Safe to call on a transaction that's already prepared. Throws if the transaction already has
	 * a different gas owner, or a gas payment.
	 */
	async prepareSponsoredTransaction({
		transaction,
	}: EnokiPrepareSponsoredTransactionOptions): Promise<Transaction> {
		const sponsorAddress = await this.getSponsorAddress();
		const data = transaction.getData();

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
	 * Enoki errors are thrown as `EnokiClientError`. If `isStaleTransactionError(error)`, build a new
	 * transaction, sign it and call this again; the sponsor address is fetched again.
	 */
	async sponsorAndExecuteTransaction<Include extends SuiClientTypes.TransactionInclude = {}>(
		options: EnokiSponsorAndExecuteTransactionOptions<Include>,
	): Promise<SuiClientTypes.TransactionResult<Include>> {
		const network = this.#network();

		let bytes: Uint8Array | string;
		let signature: string;
		if (options.signer) {
			const { transaction, signer } = options;
			transaction.setSenderIfNotSet(signer.toSuiAddress());
			await this.prepareSponsoredTransaction({ transaction });
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
			if (isStaleTransactionError(error)) {
				this.#sponsorAddress = undefined;
			}
			throw error;
		}

		return this.#client.core.waitForTransaction({
			digest,
			include: options.include,
			signal: options.signal,
		});
	}

	#network(): EnokiDomainNetwork {
		const network: string = this.#client.network;
		if (network === 'mainnet' || network === 'testnet') {
			return network;
		}
		throw new Error(`Enoki sponsorship is not available on ${network}`);
	}
}
