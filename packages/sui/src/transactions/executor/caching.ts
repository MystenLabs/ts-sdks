// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '../../bcs/index.js';
import type { ClientWithCoreApi } from '../../client/core.js';
import { coreClientResolveTransactionPlugin } from '../../client/core-resolver.js';
import type { SuiClientTypes } from '../../client/types.js';
import type { Signer } from '../../cryptography/keypair.js';
import type { BuildTransactionOptions } from '../resolve.js';
import type { ObjectCacheOptions } from '../ObjectCache.js';
import { ObjectCache } from '../ObjectCache.js';
import type { Transaction } from '../Transaction.js';
import { isTransaction } from '../Transaction.js';

export interface ExecuteTransactionOptions<Include extends SuiClientTypes.TransactionInclude = {}> {
	transaction: Transaction | Uint8Array;
	signatures: string[];
	include?: Include;
}

export class CachingTransactionExecutor {
	#client: ClientWithCoreApi;
	#lastDigest: string | null = null;
	cache: ObjectCache;

	constructor({
		client,
		...options
	}: ObjectCacheOptions & {
		client: ClientWithCoreApi;
	}) {
		this.#client = client;
		this.cache = new ObjectCache(options);
	}

	/**
	 * Clears all Owned objects
	 * Immutable objects, Shared objects, and Move function definitions will be preserved
	 */
	async reset() {
		await Promise.all([
			this.cache.clearOwnedObjects(),
			this.cache.clearCustom(),
			this.waitForLastTransaction(),
		]);
	}

	async buildTransaction({
		transaction,
		...options
	}: { transaction: Transaction } & BuildTransactionOptions) {
		transaction.addBuildPlugin(this.cache.asPlugin());
		transaction.addBuildPlugin(coreClientResolveTransactionPlugin);
		return transaction.build({
			client: this.#client,
			...options,
		});
	}

	async executeTransaction<Include extends SuiClientTypes.TransactionInclude = {}>({
		transaction,
		signatures,
		include,
	}: ExecuteTransactionOptions<Include>): Promise<
		SuiClientTypes.TransactionResult<Include & { effects: true }>
	> {
		const bytes = isTransaction(transaction)
			? await this.buildTransaction({ transaction })
			: transaction;

		const results = await this.#client.core.executeTransaction({
			transaction: bytes,
			signatures,
			include: {
				...include,
				effects: true,
			},
		});

		const tx = results.$kind === 'Transaction' ? results.Transaction : results.FailedTransaction;
		if (tx.effects?.bcs) {
			const effects = bcs.TransactionEffects.parse(tx.effects.bcs);
			await this.applyEffects(effects);
		}

		return results as SuiClientTypes.TransactionResult<Include & { effects: true }>;
	}

	async signAndExecuteTransaction<Include extends SuiClientTypes.TransactionInclude = {}>({
		include,
		transaction,
		signer,
	}: {
		transaction: Transaction;
		signer: Signer;
		include?: Include;
	}): Promise<SuiClientTypes.TransactionResult<Include & { effects: true }>> {
		transaction.setSenderIfNotSet(signer.toSuiAddress());
		const bytes = await this.buildTransaction({ transaction });
		const { signature } = await signer.signTransaction(bytes);
		return this.executeTransaction({
			transaction: bytes,
			signatures: [signature],
			include,
		});
	}

	async applyEffects(effects: typeof bcs.TransactionEffects.$inferType) {
		this.#lastDigest = effects.V2?.transactionDigest ?? null;
		await this.cache.applyEffects(effects);
	}

	async waitForLastTransaction() {
		if (this.#lastDigest) {
			await this.#client.core.waitForTransaction({ digest: this.#lastDigest });
			this.#lastDigest = null;
		}
	}
}
