// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { promiseWithResolvers } from '@mysten/utils';
import type { SuiObjectRef } from '../../bcs/types.js';
import type { ClientWithCoreApi } from '../../client/core.js';
import { coreClientResolveTransactionPlugin } from '../../client/core-resolver.js';
import type { SuiClientTypes } from '../../client/types.js';
import type { Signer } from '../../cryptography/index.js';
import type { ObjectCacheOptions } from '../ObjectCache.js';
import { Transaction } from '../Transaction.js';
import { TransactionDataBuilder } from '../TransactionData.js';
import { CachingTransactionExecutor } from './caching.js';
import { ParallelQueue, SerialQueue } from './queue.js';

const PARALLEL_EXECUTOR_DEFAULTS = {
	coinBatchSize: 20,
	initialCoinBalance: 200_000_000n,
	minimumCoinBalance: 50_000_000n,
	maxPoolSize: 50,
} satisfies Partial<ParallelTransactionExecutorCoinOptions>;

const EPOCH_BOUNDARY_WINDOW = 60_000;

interface ParallelTransactionExecutorBaseOptions extends Omit<ObjectCacheOptions, 'address'> {
	client: ClientWithCoreApi;
	signer: Signer;
	/** The gasBudget to use if the transaction has not defined it's own gasBudget, defaults to `minimumCoinBalance` */
	defaultGasBudget?: bigint;
	/** The maximum number of transactions that can be execute in parallel, this also determines the maximum number of gas coins that will be created */
	maxPoolSize?: number;
}

export interface ParallelTransactionExecutorCoinOptions extends ParallelTransactionExecutorBaseOptions {
	/** Gas mode - use owned coins for gas payments (default) */
	gasMode?: 'coins';
	/** The number of coins to create in a batch when refilling the gas pool */
	coinBatchSize?: number;
	/** The initial balance of each coin created for the gas pool */
	initialCoinBalance?: bigint;
	/** The minimum balance of a coin that can be reused for future transactions.  If the gasCoin is below this value, it will be used when refilling the gasPool */
	minimumCoinBalance?: bigint;
	/** An initial list of coins used to fund the gas pool, uses all owned SUI coins by default */
	sourceCoins?: string[];
}

export interface ParallelTransactionExecutorAddressBalanceOptions extends ParallelTransactionExecutorBaseOptions {
	/** Gas mode - use address balance for gas payments instead of owned coins */
	gasMode: 'addressBalance';
}

/** Options for ParallelTransactionExecutor - discriminated union based on gasMode */
export type ParallelTransactionExecutorOptions =
	| ParallelTransactionExecutorCoinOptions
	| ParallelTransactionExecutorAddressBalanceOptions;

interface CoinWithBalance {
	id: string;
	version: string;
	digest: string;
	balance: bigint;
}
export class ParallelTransactionExecutor {
	#signer: Signer;
	#client: ClientWithCoreApi;
	#gasMode: 'coins' | 'addressBalance';
	#coinBatchSize: number;
	#initialCoinBalance: bigint;
	#minimumCoinBalance: bigint;
	#defaultGasBudget: bigint;
	#maxPoolSize: number;
	#sourceCoins: Map<string, SuiObjectRef | null> | null;
	#coinPool: CoinWithBalance[] = [];
	#cache: CachingTransactionExecutor;
	#objectIdQueues = new Map<string, (() => void)[]>();
	#buildQueue = new SerialQueue();
	#executeQueue: ParallelQueue;
	#lastDigest: string | null = null;
	#cacheLock: Promise<void> | null = null;
	#pendingTransactions = 0;
	#epochInfo: null | {
		epoch: string;
		price: bigint;
		expiration: number;
		chainIdentifier: string;
	} = null;
	#epochInfoPromise: Promise<void> | null = null;

	constructor(options: ParallelTransactionExecutorOptions) {
		this.#signer = options.signer;
		this.#client = options.client;
		this.#gasMode = options.gasMode ?? 'coins';

		if (this.#gasMode === 'coins') {
			const coinOptions = options as ParallelTransactionExecutorCoinOptions;
			this.#coinBatchSize = coinOptions.coinBatchSize ?? PARALLEL_EXECUTOR_DEFAULTS.coinBatchSize;
			this.#initialCoinBalance =
				coinOptions.initialCoinBalance ?? PARALLEL_EXECUTOR_DEFAULTS.initialCoinBalance;
			this.#minimumCoinBalance =
				coinOptions.minimumCoinBalance ?? PARALLEL_EXECUTOR_DEFAULTS.minimumCoinBalance;
			this.#sourceCoins = coinOptions.sourceCoins
				? new Map(coinOptions.sourceCoins.map((id) => [id, null]))
				: null;
		} else {
			this.#coinBatchSize = 0;
			this.#initialCoinBalance = 0n;
			this.#minimumCoinBalance = PARALLEL_EXECUTOR_DEFAULTS.minimumCoinBalance;
			this.#sourceCoins = null;
		}

		this.#defaultGasBudget = options.defaultGasBudget ?? this.#minimumCoinBalance;
		this.#maxPoolSize = options.maxPoolSize ?? PARALLEL_EXECUTOR_DEFAULTS.maxPoolSize;
		this.#cache = new CachingTransactionExecutor({
			client: options.client,
			cache: options.cache,
		});
		this.#executeQueue = new ParallelQueue(this.#maxPoolSize);
	}

	resetCache() {
		this.#epochInfo = null;
		return this.#updateCache(() => this.#cache.reset());
	}

	async waitForLastTransaction() {
		await this.#updateCache(() => this.#waitForLastDigest());
	}

	async executeTransaction<Include extends SuiClientTypes.TransactionInclude = {}>(
		transaction: Transaction,
		include?: Include,
		additionalSignatures: string[] = [],
	): Promise<SuiClientTypes.TransactionResult<Include & { effects: true }>> {
		const { promise, resolve, reject } =
			promiseWithResolvers<SuiClientTypes.TransactionResult<Include & { effects: true }>>();
		const usedObjects = await this.#getUsedObjects(transaction);

		const execute = () => {
			this.#executeQueue.runTask(() => {
				const promise = this.#execute(transaction, usedObjects, include, additionalSignatures);

				return promise.then(resolve, reject);
			});
		};

		const conflicts = new Set<string>();

		usedObjects.forEach((objectId) => {
			const queue = this.#objectIdQueues.get(objectId);
			if (queue) {
				conflicts.add(objectId);
				this.#objectIdQueues.get(objectId)!.push(() => {
					conflicts.delete(objectId);
					if (conflicts.size === 0) {
						execute();
					}
				});
			} else {
				this.#objectIdQueues.set(objectId, []);
			}
		});

		if (conflicts.size === 0) {
			execute();
		}

		return promise;
	}

	async #getUsedObjects(transaction: Transaction) {
		const usedObjects = new Set<string>();
		let serialized = false;

		transaction.addSerializationPlugin(async (blockData, _options, next) => {
			await next();

			if (serialized) {
				return;
			}
			serialized = true;

			blockData.inputs.forEach((input) => {
				if (input.Object?.ImmOrOwnedObject?.objectId) {
					usedObjects.add(input.Object.ImmOrOwnedObject.objectId);
				} else if (input.Object?.Receiving?.objectId) {
					usedObjects.add(input.Object.Receiving.objectId);
				} else if (
					input.UnresolvedObject?.objectId &&
					!input.UnresolvedObject.initialSharedVersion
				) {
					usedObjects.add(input.UnresolvedObject.objectId);
				}
			});
		});

		await transaction.prepareForSerialization({ client: this.#client });

		return usedObjects;
	}

	async #execute<Include extends SuiClientTypes.TransactionInclude = {}>(
		transaction: Transaction,
		usedObjects: Set<string>,
		include?: Include,
		additionalSignatures: string[] = [],
	): Promise<SuiClientTypes.TransactionResult<Include & { effects: true }>> {
		let gasCoin: CoinWithBalance | null = null;
		try {
			transaction.setSenderIfNotSet(this.#signer.toSuiAddress());

			await this.#buildQueue.runTask(async () => {
				const data = transaction.getData();

				if (!data.gasData.price) {
					transaction.setGasPrice(await this.#getGasPrice());
				}

				transaction.setGasBudgetIfNotSet(this.#defaultGasBudget);

				await this.#updateCache();
				this.#pendingTransactions++;

				if (this.#gasMode === 'addressBalance') {
					// Address balance mode: use empty gas payment with ValidDuring expiration
					transaction.setGasPayment([]);
					transaction.setExpiration(await this.#getValidDuringExpiration());
				} else {
					// Coin mode: use gas coin from pool
					gasCoin = await this.#getGasCoin();
					transaction.setGasPayment([
						{
							objectId: gasCoin.id,
							version: gasCoin.version,
							digest: gasCoin.digest,
						},
					]);
				}

				// Resolve cached references
				await this.#cache.buildTransaction({ transaction, onlyTransactionKind: true });
			});

			const bytes = await transaction.build({ client: this.#client });

			const { signature } = await this.#signer.signTransaction(bytes);

			const results = await this.#cache.executeTransaction({
				transaction: bytes,
				signatures: [signature, ...additionalSignatures],
				include,
			});

			const tx = results.$kind === 'Transaction' ? results.Transaction : results.FailedTransaction;
			const effects = tx.effects!;
			const gasObject = effects.gasObject;
			const gasUsed = effects.gasUsed;

			if (gasCoin && gasUsed && gasObject) {
				const coin = gasCoin as CoinWithBalance;
				const gasOwner = gasObject.outputOwner?.AddressOwner ?? gasObject.outputOwner?.ObjectOwner;

				if (gasOwner === this.#signer.toSuiAddress()) {
					const totalUsed =
						BigInt(gasUsed.computationCost) +
						BigInt(gasUsed.storageCost) +
						BigInt(gasUsed.storageCost) -
						BigInt(gasUsed.storageRebate);
					const remainingBalance = coin.balance - totalUsed;

					let usesGasCoin = false;
					new TransactionDataBuilder(transaction.getData()).mapArguments((arg) => {
						if (arg.$kind === 'GasCoin') {
							usesGasCoin = true;
						}

						return arg;
					});

					const gasRef = {
						objectId: gasObject.objectId,
						version: gasObject.outputVersion!,
						digest: gasObject.outputDigest!,
					};

					if (!usesGasCoin && remainingBalance >= this.#minimumCoinBalance) {
						this.#coinPool.push({
							id: gasRef.objectId,
							version: gasRef.version,
							digest: gasRef.digest,
							balance: remainingBalance,
						});
					} else {
						if (!this.#sourceCoins) {
							this.#sourceCoins = new Map();
						}
						this.#sourceCoins.set(gasRef.objectId, gasRef);
					}
				}
			}

			this.#lastDigest = tx.digest;

			return results as SuiClientTypes.TransactionResult<Include & { effects: true }>;
		} catch (error) {
			if (gasCoin) {
				if (!this.#sourceCoins) {
					this.#sourceCoins = new Map();
				}

				this.#sourceCoins.set((gasCoin as CoinWithBalance).id, null);
			}

			await this.#updateCache(async () => {
				await Promise.all([
					this.#cache.cache.deleteObjects([...usedObjects]),
					this.#waitForLastDigest(),
				]);
			});

			throw error;
		} finally {
			usedObjects.forEach((objectId) => {
				const queue = this.#objectIdQueues.get(objectId);
				if (queue && queue.length > 0) {
					queue.shift()!();
				} else if (queue) {
					this.#objectIdQueues.delete(objectId);
				}
			});
			this.#pendingTransactions--;
		}
	}

	/** Helper for synchronizing cache updates, by ensuring only one update happens at a time.  This can also be used to wait for any pending cache updates  */
	async #updateCache(fn?: () => Promise<void>) {
		if (this.#cacheLock) {
			await this.#cacheLock;
		}

		this.#cacheLock =
			fn?.().then(
				() => {
					this.#cacheLock = null;
				},
				() => {},
			) ?? null;
	}

	async #waitForLastDigest() {
		const digest = this.#lastDigest;
		if (digest) {
			this.#lastDigest = null;
			await this.#client.core.waitForTransaction({ digest });
		}
	}

	async #getGasCoin() {
		if (this.#coinPool.length === 0 && this.#pendingTransactions <= this.#maxPoolSize) {
			await this.#refillCoinPool();
		}

		if (this.#coinPool.length === 0) {
			throw new Error('No coins available');
		}

		const coin = this.#coinPool.shift()!;
		return coin;
	}

	async #getGasPrice(): Promise<bigint> {
		await this.#ensureEpochInfo();
		return this.#epochInfo!.price;
	}

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
			price: BigInt(systemState.referenceGasPrice),
			expiration:
				Number(systemState.epochStartTimestampMs) + Number(systemState.parameters.epochDurationMs),
			chainIdentifier,
		};
	}

	async #refillCoinPool() {
		const batchSize = Math.min(
			this.#coinBatchSize,
			this.#maxPoolSize - (this.#coinPool.length + this.#pendingTransactions) + 1,
		);

		if (batchSize === 0) {
			return;
		}

		const txb = new Transaction();
		const address = this.#signer.toSuiAddress();
		txb.setSender(address);

		if (this.#sourceCoins) {
			const refs = [];
			const ids = [];
			for (const [id, ref] of this.#sourceCoins) {
				if (ref) {
					refs.push(ref);
				} else {
					ids.push(id);
				}
			}

			if (ids.length > 0) {
				const { objects } = await this.#client.core.getObjects({
					objectIds: ids,
				});
				refs.push(
					...objects
						.filter((obj): obj is SuiClientTypes.Object => !(obj instanceof Error))
						.map((obj) => ({
							objectId: obj.objectId,
							version: obj.version,
							digest: obj.digest,
						})),
				);
			}

			txb.setGasPayment(refs);
			this.#sourceCoins = new Map();
		}

		const amounts = new Array(batchSize).fill(this.#initialCoinBalance);
		const splitResults = txb.splitCoins(txb.gas, amounts);
		const coinResults = [];
		for (let i = 0; i < amounts.length; i++) {
			coinResults.push(splitResults[i]);
		}
		txb.transferObjects(coinResults, address);

		await this.waitForLastTransaction();

		txb.addBuildPlugin(coreClientResolveTransactionPlugin);
		const bytes = await txb.build({ client: this.#client });
		const { signature } = await this.#signer.signTransaction(bytes);

		const result = await this.#client.core.executeTransaction({
			transaction: bytes,
			signatures: [signature],
			include: { effects: true },
		});

		const tx = result.$kind === 'Transaction' ? result.Transaction : result.FailedTransaction;
		const effects = tx.effects!;

		effects.changedObjects.forEach((changedObj) => {
			if (
				changedObj.objectId === effects.gasObject?.objectId ||
				changedObj.outputState !== 'ObjectWrite'
			) {
				return;
			}

			this.#coinPool.push({
				id: changedObj.objectId,
				version: changedObj.outputVersion!,
				digest: changedObj.outputDigest!,
				balance: BigInt(this.#initialCoinBalance),
			});
		});

		if (!this.#sourceCoins) {
			this.#sourceCoins = new Map();
		}

		const gasObject = effects.gasObject!;
		this.#sourceCoins!.set(gasObject.objectId, {
			objectId: gasObject.objectId,
			version: gasObject.outputVersion!,
			digest: gasObject.outputDigest!,
		});

		await this.#client.core.waitForTransaction({ digest: tx.digest });
	}
}
