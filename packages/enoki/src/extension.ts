// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi, SuiClientTypes } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';
import { TransactionDataBuilder, type Transaction } from '@mysten/sui/transactions';
import { fromBase64, toBase64 } from '@mysten/sui/utils';

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
}

/** A sponsor SDK `RemoteSigner` backed by Enoki: pass it as `createSponsor`'s `signer`. */
export interface EnokiSponsorSigner {
	toSuiAddress(): string;
	signAndExecuteTransaction(options: {
		transaction: Uint8Array;
		additionalSignatures: string[];
		signal?: AbortSignal;
	}): Promise<
		| {
				$kind: 'Rejected';
				issues: Issue[];
				policyIssues: Issue[];
				analysisIssues: Issue[];
				reason: 'POLICY_REJECTED';
		  }
		| SuiClientTypes.TransactionResult<{ effects: true }>
	>;
}

type Issue = { code?: string; message: string };

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

	constructor({ client, enoki }: { client: ClientWithCoreApi; enoki: EnokiClient }) {
		this.#client = client;
		this.#enoki = enoki;
	}

	/** Enoki's sponsor address on the client's network. */
	getSponsorAddress(): Promise<string> {
		return this.#enoki.getSponsorAddress({ network: this.#network() });
	}

	/** Sets Enoki as gas owner with an empty gas payment, without building. */
	prepareSponsoredTransaction({
		transaction,
	}: EnokiPrepareSponsoredTransactionOptions): Promise<Transaction> {
		return this.#enoki.prepareSponsoredTransaction({ transaction, network: this.#network() });
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

		const transactionBytes = typeof bytes === 'string' ? fromBase64(bytes) : bytes;
		// Wait on the digest of the bytes that were signed, not one reported by the server.
		const digest = TransactionDataBuilder.getDigestFromBytes(transactionBytes);

		options.signal?.throwIfAborted();
		const response = await this.#enoki.sponsorAndExecuteTransaction({
			network,
			transactionBytes: toBase64(transactionBytes),
			signature,
			allowedAddresses: options.allowedAddresses,
			allowedMoveCallTargets: options.allowedMoveCallTargets,
		});
		if (response.digest !== digest) {
			throw new Error(`Enoki returned digest ${response.digest}, but the transaction is ${digest}`);
		}

		return this.#client.core.waitForTransaction({
			digest,
			include: options.include,
			signal: options.signal,
		});
	}

	/**
	 * A signer that makes Enoki the sponsor in the sponsor SDK's `createSponsor`. Create the sponsor
	 * per request. Enoki's `invalid_transaction` is returned as `Rejected`.
	 */
	async getSponsorSigner({
		allowedAddresses,
		allowedMoveCallTargets,
	}: {
		allowedAddresses?: string[];
		allowedMoveCallTargets?: string[];
	} = {}): Promise<EnokiSponsorSigner> {
		const address = await this.getSponsorAddress();
		return {
			toSuiAddress: () => address,
			signAndExecuteTransaction: async ({ transaction, additionalSignatures, signal }) => {
				if (additionalSignatures.length !== 1) {
					throw new Error('Enoki sponsorship takes exactly one user signature.');
				}
				try {
					return await this.sponsorAndExecuteTransaction({
						transaction,
						signature: additionalSignatures[0],
						include: { effects: true },
						signal,
						allowedAddresses,
						allowedMoveCallTargets,
					});
				} catch (error) {
					if (error instanceof EnokiClientError && error.code === 'invalid_transaction') {
						const issues = error.errors.map(({ code, message }) => ({ code, message }));
						return {
							$kind: 'Rejected',
							issues,
							policyIssues: issues,
							analysisIssues: [],
							reason: 'POLICY_REJECTED',
						};
					}
					throw error;
				}
			},
		};
	}

	#network(): EnokiDomainNetwork {
		const network: string = this.#client.network;
		if (network === 'mainnet' || network === 'testnet') {
			return network;
		}
		throw new Error(`Enoki sponsorship is not available on ${network}`);
	}
}
