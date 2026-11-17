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
				 * Built transaction bytes (or base64), with the sponsor address from `getSponsorAddress`
				 * as gas owner and an empty gas payment.
				 */
				transaction: Uint8Array | string;
				/** The sender's signature over the bytes. */
				signature: string;
				signer?: never;
		  }
	);

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
	 * Has Enoki sponsor and execute a transaction, and waits for it. Returns the same result as
	 * `client.core.signAndExecuteTransaction`.
	 *
	 * With a `signer`, the transaction is built with Enoki as gas owner and an empty gas payment,
	 * and signed here. With a `signature`, the bytes are sent as they are.
	 *
	 * Enoki errors are thrown as `EnokiClientError`. If `isStaleTransactionError(error)`, call this
	 * again to build and sign with the current sponsor address and gas price.
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
			transaction.setGasOwner(await this.getSponsorAddress());
			transaction.setGasPayment([]);
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
			if (error instanceof EnokiClientError) {
				if (error.code === 'invalid_gas_owner') {
					this.#sponsorAddress = undefined;
				}
				// The built transaction keeps its gas price, so update it for a retry with the same one.
				const { referenceGasPrice } = (error.errors[0]?.data ?? {}) as {
					referenceGasPrice?: string;
				};
				if (error.code === 'invalid_gas_price' && options.signer && referenceGasPrice) {
					options.transaction.setGasPrice(BigInt(referenceGasPrice));
				}
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
