// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { bcs } from '../../bcs/index.js';
import type { ClientWithCoreApi } from '../../client/core.js';
import type { SuiClientTypes } from '../../client/types.js';
import type { Signer } from '../../cryptography/keypair.js';
import type { ObjectCacheOptions } from '../ObjectCache.js';
import { isTransaction, Transaction } from '../Transaction.js';
import { CachingTransactionExecutor } from './caching.js';
import { SerialQueue } from './queue.js';

const EPOCH_BOUNDARY_WINDOW = 60_000;

interface SerialTransactionExecutorBaseOptions extends Omit<ObjectCacheOptions, 'address'> {
	client: ClientWithCoreApi;
	signer: Signer;
	defaultGasBudget?: bigint;
}

export interface SerialTransactionExecutorCoinOptions extends SerialTransactionExecutorBaseOptions {
	gasMode?: 'coins';
}

export interface SerialTransactionExecutorAddressBalanceOptions extends SerialTransactionExecutorBaseOptions {
	gasMode: 'addressBalance';
}

export type SerialTransactionExecutorOptions =
	| SerialTransactionExecutorCoinOptions
	| SerialTransactionExecutorAddressBalanceOptions;

export class SerialTransactionExecutor {
	#queue = new SerialQueue();
	#signer: Signer;
	#client: ClientWithCoreApi;
	#cache: CachingTransactionExecutor;
	#defaultGasBudget: bigint;
	#gasMode: 'coins' | 'addressBalance';
	#epochInfo: null | {
		epoch: string;
		expiration: number;
		chainIdentifier: string;
	} = null;
	#epochInfoPromise: Promise<void> | null = null;

	constructor(options: SerialTransactionExecutorOptions) {
		const { signer, defaultGasBudget = 50_000_000n, client, cache } = options;
		this.#signer = signer;
		this.#client = client;
		this.#defaultGasBudget = defaultGasBudget;
		this.#gasMode = options.gasMode ?? 'coins';
		this.#cache = new CachingTransactionExecutor({
			client,
			cache,
			onEffects: (effects) => this.#cacheGasCoin(effects),
		});
	}

	async applyEffects(effects: typeof bcs.TransactionEffects.$inferType) {
		return this.#cache.applyEffects(effects);
	}

	#cacheGasCoin = async (effects: typeof bcs.TransactionEffects.$inferType) => {
		if (this.#gasMode === 'addressBalance' || !effects.V2) {
			return;
		}

		const gasCoin = getGasCoinFromEffects(effects).ref;
		if (gasCoin) {
			this.#cache.cache.setCustom('gasCoin', gasCoin);
		} else {
			this.#cache.cache.deleteCustom('gasCoin');
		}
	};

	async buildTransaction(transaction: Transaction) {
		return this.#queue.runTask(() => this.#buildTransaction(transaction));
	}

	#buildTransaction = async (transaction: Transaction) => {
		await transaction.prepareForSerialization({
			client: this.#client,
			supportedIntents: ['CoinWithBalance'],
		});
		const copy = Transaction.from(transaction);

		if (this.#gasMode === 'addressBalance') {
			copy.setGasPayment([]);
			copy.setExpiration(await this.#getValidDuringExpiration());
		} else {
			// Coin mode: use cached gas coin if available
			const gasCoin = await this.#cache.cache.getCustom<{
				objectId: string;
				version: string;
				digest: string;
			}>('gasCoin');

			if (gasCoin) {
				copy.setGasPayment([gasCoin]);
			}
		}

		copy.setGasBudgetIfNotSet(this.#defaultGasBudget);
		copy.setSenderIfNotSet(this.#signer.toSuiAddress());

		return this.#cache.buildTransaction({ transaction: copy });
	};

	async #getValidDuringExpiration() {
		await this.#ensureEpochInfo();
		const currentEpoch = BigInt(this.#epochInfo!.epoch);
		return {
			ValidDuring: {
				minEpoch: String(currentEpoch),
				maxEpoch: String(currentEpoch + 1n),
				minTimestamp: null,
				maxTimestamp: null,
				chain: this.#epochInfo!.chainIdentifier,
				nonce: (Math.random() * 0x100000000) >>> 0,
			},
		};
	}

	async #ensureEpochInfo(): Promise<void> {
		if (this.#epochInfo && this.#epochInfo.expiration - EPOCH_BOUNDARY_WINDOW - Date.now() > 0) {
			return;
		}

		if (this.#epochInfoPromise) {
			await this.#epochInfoPromise;
			return;
		}

		this.#epochInfoPromise = this.#fetchEpochInfo();
		try {
			await this.#epochInfoPromise;
		} finally {
			this.#epochInfoPromise = null;
		}
	}

	async #fetchEpochInfo(): Promise<void> {
		const [{ systemState }, { chainIdentifier }] = await Promise.all([
			this.#client.core.getCurrentSystemState(),
			this.#client.core.getChainIdentifier(),
		]);

		this.#epochInfo = {
			epoch: systemState.epoch,
			expiration:
				Number(systemState.epochStartTimestampMs) + Number(systemState.parameters.epochDurationMs),
			chainIdentifier,
		};
	}

	resetCache() {
		return this.#cache.reset();
	}

	waitForLastTransaction() {
		return this.#cache.waitForLastTransaction();
	}

	executeTransaction<Include extends SuiClientTypes.TransactionInclude = {}>(
		transaction: Transaction | Uint8Array,
		include?: Include,
		additionalSignatures: string[] = [],
	): Promise<SuiClientTypes.TransactionResult<Include & { effects: true }>> {
		return this.#queue.runTask(async () => {
			const bytes = isTransaction(transaction)
				? await this.#buildTransaction(transaction)
				: transaction;

			const { signature } = await this.#signer.signTransaction(bytes);
			return this.#cache
				.executeTransaction({
					signatures: [signature, ...additionalSignatures],
					transaction: bytes,
					include,
				})
				.catch(async (error) => {
					await this.resetCache();
					throw error;
				});
		});
	}
}

export function getGasCoinFromEffects(effects: typeof bcs.TransactionEffects.$inferType) {
	if (!effects.V2) {
		throw new Error('Unexpected effects version');
	}

	const gasObjectChange = effects.V2.changedObjects[effects.V2.gasObjectIndex!];

	if (!gasObjectChange) {
		throw new Error('Gas object not found in effects');
	}

	const [objectId, { outputState }] = gasObjectChange;

	if (!outputState.ObjectWrite) {
		throw new Error('Unexpected gas object state');
	}

	const [digest, owner] = outputState.ObjectWrite;

	return {
		ref: {
			objectId,
			digest,
			version: effects.V2.lamportVersion,
		},
		owner: owner.AddressOwner || owner.ObjectOwner!,
	};
}
