// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { InferBcsType } from '@mysten/bcs';
import { bcs, fromBase64 } from '@mysten/bcs';
import { SuiClient } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';
import type { TransactionObjectArgument } from '@mysten/sui/transactions';
import { coinWithBalance, Transaction } from '@mysten/sui/transactions';
import { normalizeStructTag, parseStructTag } from '@mysten/sui/utils';
import { bls12381_min_pk_verify } from '@mysten/walrus-wasm';

import {
	MAINNET_WALRUS_PACKAGE_CONFIG,
	statusLifecycleRank,
	TESTNET_WALRUS_PACKAGE_CONFIG,
} from './constants.js';
import { Blob, init as initBlobContract } from './contracts/blob.js';
import type { Committee } from './contracts/committee.js';
import { init as initMetadataContract } from './contracts/metadata.js';
import { StakingInnerV1 } from './contracts/staking_inner.js';
import { StakingPool } from './contracts/staking_pool.js';
import { Staking } from './contracts/staking.js';
import { Storage } from './contracts/storage_resource.js';
import { init as initSubsidiesContract } from './contracts/subsidies.js';
import { SystemStateInnerV1 } from './contracts/system_state_inner.js';
import { init as initSystemContract, System } from './contracts/system.js';
import {
	BehindCurrentEpochError,
	BlobBlockedError,
	BlobNotCertifiedError,
	InconsistentBlobError,
	NoBlobMetadataReceivedError,
	NoBlobStatusReceivedError,
	NotEnoughBlobConfirmationsError,
	NotEnoughSliversReceivedError,
	NoVerifiedBlobStatusReceivedError,
	RetryableWalrusClientError,
	WalrusClientError,
} from './error.js';
import { StorageNodeClient } from './storage-node/client.js';
import { LegallyUnavailableError, NotFoundError, UserAbortError } from './storage-node/error.js';
import type { BlobMetadataWithId, BlobStatus, GetSliverResponse } from './storage-node/types.js';
import type {
	CertifyBlobOptions,
	CommitteeInfo,
	DeleteBlobOptions,
	ExtendBlobOptions,
	GetBlobMetadataOptions,
	GetCertificationEpochOptions,
	GetSliversOptions,
	GetStorageConfirmationOptions,
	GetVerifiedBlobStatusOptions,
	ReadBlobOptions,
	RegisterBlobOptions,
	SliversForNode,
	StorageNode,
	StorageWithSizeOptions,
	WalrusClientConfig,
	WalrusPackageConfig,
	WriteBlobAttributesOptions,
	WriteBlobOptions,
	WriteEncodedBlobOptions,
	WriteEncodedBlobToNodesOptions,
	WriteMetadataOptions,
	WriteSliverOptions,
	WriteSliversToNodeOptions,
} from './types.js';
import {
	blobIdToInt,
	IntentType,
	SliverData,
	StorageConfirmation,
	TestnetSystemStateInnerV1,
} from './utils/bcs.js';
import {
	chunk,
	encodedBlobLength,
	getShardIndicesByNodeId,
	getSourceSymbols,
	isAboveValidity,
	isQuorum,
	signersToBitmap,
	storageUnitsFromSize,
	toPairIndex,
	toShardIndex,
	toTypeString,
} from './utils/index.js';
import { MemoCache } from './utils/memo.js';
import { SuiObjectDataLoader } from './utils/object-loader.js';
import { shuffle, weightedShuffle } from './utils/randomness.js';
import { combineSignatures, computeMetadata, decodePrimarySlivers, encodeBlob } from './wasm.js';

export class WalrusClient {
	#storageNodeClient: StorageNodeClient;

	#packageConfig: WalrusPackageConfig;
	#suiClient: SuiClient;
	#objectLoader: SuiObjectDataLoader;

	#blobMetadataConcurrencyLimit = 10;
	#readCommittee?: CommitteeInfo | Promise<CommitteeInfo> | null;
	#memo = new MemoCache();

	constructor(config: WalrusClientConfig) {
		if (config.network && !config.packageConfig) {
			const network = config.network;
			switch (network) {
				case 'testnet':
					this.#packageConfig = TESTNET_WALRUS_PACKAGE_CONFIG;
					break;
				case 'mainnet':
					this.#packageConfig = MAINNET_WALRUS_PACKAGE_CONFIG;
					break;
				default:
					throw new WalrusClientError(`Unsupported network: ${network}`);
			}
		} else {
			this.#packageConfig = config.packageConfig!;
		}

		this.#suiClient =
			config.suiClient ??
			new SuiClient({
				url: config.suiRpcUrl,
			});

		this.#storageNodeClient = new StorageNodeClient(config.storageNodeClientOptions);
		this.#objectLoader = new SuiObjectDataLoader(this.#suiClient);
	}

	/** The Move type for a WAL coin */
	#walType = this.#memo.create('walType', async () => {
		const stakedWal = await this.#suiClient.getNormalizedMoveStruct({
			package: await this.#getPackageId(),
			module: 'staked_wal',
			struct: 'StakedWal',
		});

		const balanceType = stakedWal.fields.find((field) => field.name === 'principal')?.type;

		if (!balanceType) {
			throw new WalrusClientError('WAL type not found');
		}

		const parsed = parseStructTag(toTypeString(balanceType));
		const coinType = parsed.typeParams[0];

		if (!coinType) {
			throw new WalrusClientError('WAL type not found');
		}

		return normalizeStructTag(coinType);
	});

	#getPackageId = this.#memo.create('getPackageId', async () => {
		const system = await this.#objectLoader.load(this.#packageConfig.systemObjectId);
		return parseStructTag(system.type!).address;
	});

	/** The Move type for a Blob object */
	#getBlobType = this.#memo.create('getBlobType', async () => {
		return `${await this.#getPackageId()}::blob::Blob`;
	});

	#getSystemContract = this.#memo.create('getSystemContract', async () => {
		const { package_id } = await this.systemObject();
		return initSystemContract(package_id);
	});

	#getSubsidiesContract = this.#memo.create('getSubsidiesContract', async () => {
		if (!this.#packageConfig.subsidiesObjectId) {
			throw new WalrusClientError('Subsidies object ID not defined in package config');
		}

		const subsidiesObject = await this.#objectLoader.load(this.#packageConfig.subsidiesObjectId);

		const packageId = parseStructTag(subsidiesObject.type!).address;

		return initSubsidiesContract(packageId);
	});

	#getBlobContract = this.#memo.create('getBlobContract', async () => {
		const { package_id } = await this.systemObject();
		return initBlobContract(package_id);
	});

	#getMetadataContract = this.#memo.create('getMetadataContract', async () => {
		const { package_id } = await this.systemObject();
		return initMetadataContract(package_id);
	});

	/** The cached system object for the walrus package */
	systemObject() {
		return this.#objectLoader.load(this.#packageConfig.systemObjectId, System());
	}

	/** The cached staking pool object for the walrus package */
	stakingObject() {
		return this.#objectLoader.load(this.#packageConfig.stakingPoolId, Staking());
	}

	/** The system state for the current version of walrus contract  */
	async systemState() {
		const systemState = await this.#objectLoader.loadFieldObject(
			this.#packageConfig.systemObjectId,
			{ type: 'u64', value: (await this.systemObject()).version },

			this.#packageConfig.systemObjectId === TESTNET_WALRUS_PACKAGE_CONFIG.systemObjectId
				? (TestnetSystemStateInnerV1 as never)
				: SystemStateInnerV1(),
		);

		return systemState;
	}

	/** The staking state for the current version of walrus contract */
	async stakingState() {
		return this.#objectLoader.loadFieldObject(
			this.#packageConfig.stakingPoolId,
			{
				type: 'u64',
				value: (await this.stakingObject()).version,
			},
			StakingInnerV1(),
		);
	}

	/** Read a blob from the storage nodes */
	readBlob = this.#retryOnPossibleEpochChange(this.#internalReadBlob);

	async #internalReadBlob({ blobId, signal }: ReadBlobOptions) {
		const systemState = await this.systemState();
		const numShards = systemState.committee.n_shards;

		const blobMetadata = await this.getBlobMetadata({ blobId, signal });

		const slivers = await this.getSlivers({ blobId, signal });

		const blobBytes = decodePrimarySlivers(
			blobId,
			numShards,
			blobMetadata.metadata.V1.unencoded_length,
			slivers,
		);

		const reconstructedBlobMetadata = computeMetadata(systemState.committee.n_shards, blobBytes);

		if (reconstructedBlobMetadata.blob_id !== blobId) {
			throw new InconsistentBlobError('The specified blob was encoded incorrectly.');
		}

		return blobBytes;
	}

	async getBlobMetadata({ blobId, signal }: GetBlobMetadataOptions) {
		const committee = await this.#getReadCommittee({ blobId, signal });
		const randomizedNodes = shuffle(committee.nodes);

		const stakingState = await this.stakingState();
		const numShards = stakingState.n_shards;

		let numNotFoundWeight = 0;
		let numBlockedWeight = 0;
		let totalErrorCount = 0;
		const controller = new AbortController();

		const metadataExecutors = randomizedNodes.map((node) => async () => {
			try {
				return await this.#storageNodeClient.getBlobMetadata(
					{ blobId },
					{
						nodeUrl: node.networkUrl,
						signal: signal ? AbortSignal.any([controller.signal, signal]) : controller.signal,
					},
				);
			} catch (error) {
				if (error instanceof NotFoundError) {
					numNotFoundWeight += node.shardIndices.length;
				} else if (error instanceof LegallyUnavailableError) {
					numBlockedWeight += node.shardIndices.length;
				}

				totalErrorCount += 1;
				throw error;
			}
		});

		try {
			const attemptGetMetadata = metadataExecutors.shift()!;
			return await attemptGetMetadata();
		} catch (error) {
			const chunkSize = Math.floor(metadataExecutors.length / this.#blobMetadataConcurrencyLimit);
			const chunkedExecutors = chunk(metadataExecutors, chunkSize);

			return await new Promise<BlobMetadataWithId>((resolve, reject) => {
				chunkedExecutors.forEach(async (executors) => {
					for (const executor of executors) {
						try {
							const result = await executor();
							controller.abort('Blob metadata successfully retrieved.');
							resolve(result);
						} catch (error) {
							if (error instanceof UserAbortError) {
								reject(error);
								return;
							} else if (isQuorum(numBlockedWeight + numNotFoundWeight, numShards)) {
								const abortError =
									numNotFoundWeight > numBlockedWeight
										? new BlobNotCertifiedError(`The specified blob ${blobId} is not certified.`)
										: new BlobBlockedError(`The specified blob ${blobId} is blocked.`);

								controller.abort(abortError);
								reject(abortError);
								return;
							}

							if (totalErrorCount === metadataExecutors.length) {
								reject(
									new NoBlobMetadataReceivedError(
										'No valid blob metadata could be retrieved from any storage node.',
									),
								);
							}
						}
					}
				});
			});
		}
	}

	async getSlivers({ blobId, signal }: GetSliversOptions) {
		const committee = await this.#getReadCommittee({ blobId, signal });
		const randomizedNodes = weightedShuffle(
			committee.nodes.map((node) => ({
				value: node,
				weight: node.shardIndices.length,
			})),
		);

		const stakingState = await this.stakingState();
		const numShards = stakingState.n_shards;
		const { primarySymbols: minSymbols } = getSourceSymbols(numShards);

		const sliverPairIndices = randomizedNodes.flatMap((node) =>
			node.shardIndices.map((shardIndex) => ({
				url: node.networkUrl,
				sliverPairIndex: toPairIndex(shardIndex, blobId, numShards),
			})),
		);

		const controller = new AbortController();
		const chunkedSliverPairIndices = chunk(sliverPairIndices, minSymbols);
		const slivers: GetSliverResponse[] = [];
		const failedNodes = new Set<string>();
		let numNotFoundWeight = 0;
		let numBlockedWeight = 0;
		let totalErrorCount = 0;

		return new Promise<GetSliverResponse[]>((resolve, reject) => {
			chunkedSliverPairIndices[0].forEach(async (_, colIndex) => {
				for (let rowIndex = 0; rowIndex < chunkedSliverPairIndices.length; rowIndex += 1) {
					const value = chunkedSliverPairIndices.at(rowIndex)?.at(colIndex);
					if (!value) break;

					const { url, sliverPairIndex } = value;

					try {
						if (failedNodes.has(url)) {
							throw new Error(`Skipping node at ${url} due to previous failure.`);
						}

						const sliver = await this.#storageNodeClient.getSliver(
							{ blobId, sliverPairIndex, sliverType: 'primary' },
							{
								nodeUrl: url,
								signal: signal ? AbortSignal.any([controller.signal, signal]) : controller.signal,
							},
						);

						if (slivers.length === minSymbols) {
							controller.abort('Enough slivers successfully retrieved.');
							resolve(slivers);
							return;
						}

						slivers.push(sliver);
					} catch (error) {
						if (error instanceof NotFoundError) {
							numNotFoundWeight += 1;
						} else if (error instanceof LegallyUnavailableError) {
							numBlockedWeight += 1;
						} else if (error instanceof UserAbortError) {
							reject(error);
							return;
						}

						if (isQuorum(numBlockedWeight + numNotFoundWeight, numShards)) {
							const abortError =
								numNotFoundWeight > numBlockedWeight
									? new BlobNotCertifiedError(`The specified blob ${blobId} is not certified.`)
									: new BlobBlockedError(`The specified blob ${blobId} is blocked.`);

							controller.abort(abortError);
							reject(abortError);
							return;
						}

						failedNodes.add(url);
						totalErrorCount += 1;

						const remainingTasks = sliverPairIndices.length - (slivers.length + totalErrorCount);
						const tooManyFailures = slivers.length + remainingTasks < minSymbols;

						if (tooManyFailures) {
							const abortError = new NotEnoughSliversReceivedError(
								`Unable to retrieve enough slivers to decode blob ${blobId}.`,
							);
							controller.abort(abortError);
							reject(abortError);
						}
					}
				}
			});
		});
	}

	/**
	 * Gets the blob status from multiple storage nodes and returns the latest status that can be verified.
	 */
	async getVerifiedBlobStatus({ blobId, signal }: GetVerifiedBlobStatusOptions) {
		// Read from the latest committee because, during epoch change, it is the committee
		// that will have the most up-to-date information on old and newly certified blobs:
		const committee = await this.#getActiveCommittee();
		const stakingState = await this.stakingState();
		const numShards = stakingState.n_shards;
		const controller = new AbortController();

		const statuses = await new Promise<{ status: BlobStatus; weight: number }[]>(
			(resolve, reject) => {
				const results: { status: BlobStatus; weight: number }[] = [];
				let successWeight = 0;
				let numNotFoundWeight = 0;
				let settledCount = 0;

				committee.nodes.forEach(async (node) => {
					const weight = node.shardIndices.length;

					try {
						const status = await this.#storageNodeClient.getBlobStatus(
							{ blobId },
							{
								nodeUrl: node.networkUrl,
								signal: signal ? AbortSignal.any([controller.signal, signal]) : controller.signal,
							},
						);

						if (isQuorum(successWeight, numShards)) {
							controller.abort('Quorum of blob statuses retrieved successfully.');
							resolve(results);
						} else {
							successWeight += weight;
							results.push({ status, weight });
						}
					} catch (error) {
						if (error instanceof NotFoundError) {
							numNotFoundWeight += weight;
						} else if (error instanceof UserAbortError) {
							reject(error);
						}

						if (isQuorum(numNotFoundWeight, numShards)) {
							const abortError = new BlobNotCertifiedError('The blob does not exist.');
							controller.abort(abortError);
							reject(abortError);
						}
					} finally {
						settledCount += 1;
						if (settledCount === committee.nodes.length) {
							reject(
								new NoBlobStatusReceivedError(
									'Not enough statuses were retrieved to achieve quorum.',
								),
							);
						}
					}
				});
			},
		);

		const aggregatedStatuses = statuses.reduce((accumulator, value) => {
			const { status, weight } = value;
			const key = JSON.stringify(status);

			const existing = accumulator.get(key);
			if (existing) {
				existing.totalWeight += weight;
			} else {
				accumulator.set(key, { status, totalWeight: weight });
			}

			return accumulator;
		}, new Map<string, { status: BlobStatus; totalWeight: number }>());

		const uniqueStatuses = [...aggregatedStatuses.values()];
		const sortedStatuses = uniqueStatuses.toSorted(
			(a, b) => statusLifecycleRank[b.status.type] - statusLifecycleRank[a.status.type],
		);

		for (const value of sortedStatuses) {
			// TODO: We can check the chain via the `event` field as a fallback here.
			if (isAboveValidity(value.totalWeight, numShards)) {
				return value.status;
			}
		}

		throw new NoVerifiedBlobStatusReceivedError(
			`The blob status could not be verified for blob ${blobId},`,
		);
	}

	async #getCertificationEpoch({ blobId, signal }: GetCertificationEpochOptions) {
		const stakingState = await this.stakingState();
		const currentEpoch = stakingState.epoch;

		if (stakingState.epoch_state.$kind === 'EpochChangeSync') {
			const status = await this.getVerifiedBlobStatus({ blobId, signal });
			if (status.type === 'nonexistent' || status.type === 'invalid') {
				throw new BlobNotCertifiedError(`The specified blob ${blobId} is ${status.type}.`);
			}

			if (typeof status.initialCertifiedEpoch !== 'number') {
				throw new BlobNotCertifiedError(`The specified blob ${blobId} is not certified.`);
			}

			if (status.initialCertifiedEpoch > currentEpoch) {
				throw new BehindCurrentEpochError(
					`The client is at epoch ${currentEpoch} while the specified blob was certified at epoch ${status.initialCertifiedEpoch}.`,
				);
			}

			return status.initialCertifiedEpoch;
		}

		return currentEpoch;
	}

	/**
	 * Retrieves the node committee responsible for serving reads.
	 *
	 * During an epoch change, reads should be served by the previous committee if the blob was
	 * certified in an earlier epoch. This ensures that we read from nodes with the most accurate
	 * information as nodes from the current committee might still be receiving transferred shards
	 * from the previous committee.
	 */
	async #getReadCommittee(options: ReadBlobOptions) {
		if (!this.#readCommittee) {
			this.#readCommittee = this.#forceGetReadCommittee(options);
		}
		return this.#readCommittee;
	}

	async #forceGetReadCommittee({ blobId, signal }: ReadBlobOptions) {
		const stakingState = await this.stakingState();
		const isTransitioning = stakingState.epoch_state.$kind === 'EpochChangeSync';
		const certificationEpoch = await this.#getCertificationEpoch({ blobId, signal });

		if (isTransitioning && certificationEpoch < stakingState.epoch) {
			return await this.#getCommittee(stakingState.previous_committee);
		}
		return await this.#getActiveCommittee();
	}

	/**
	 * Calculate the cost of storing a blob for a given a size and number of epochs.
	 */
	async storageCost(size: number, epochs: number) {
		const systemState = await this.systemState();
		const encodedSize = encodedBlobLength(size, systemState.committee.n_shards);
		const storageUnits = storageUnitsFromSize(encodedSize);
		const storageCost =
			BigInt(storageUnits) * BigInt(systemState.storage_price_per_unit_size) * BigInt(epochs);
		BigInt(epochs);

		const writeCost = BigInt(storageUnits) * BigInt(systemState.write_price_per_unit_size);

		return { storageCost, writeCost, totalCost: storageCost + writeCost };
	}

	/**
	 * A utility for creating a storage object in a transaction.
	 *
	 * @usage
	 * ```ts
	 * tx.transferObjects([await client.createStorage({ size: 1000, epochs: 3 })], owner);
	 * ```
	 */
	async createStorage({ size, epochs, walCoin, owner }: StorageWithSizeOptions) {
		const systemObject = await this.systemObject();
		const systemState = await this.systemState();
		const encodedSize = encodedBlobLength(size, systemState.committee.n_shards);
		const { storageCost } = await this.storageCost(size, epochs);
		const systemContract = await this.#getSystemContract();
		const subsidiesContract = this.#packageConfig.subsidiesObjectId
			? await this.#getSubsidiesContract()
			: null;

		return this.#withWal(
			storageCost,
			owner,
			walCoin ?? null,
			subsidiesContract !== null,
			(coin, tx) => {
				return tx.add(
					subsidiesContract
						? subsidiesContract.reserve_space({
								arguments: [
									this.#packageConfig.subsidiesObjectId!,
									systemObject.id.id,
									encodedSize,
									epochs,
									coin,
								],
							})
						: systemContract.reserve_space({
								arguments: [systemObject.id.id, encodedSize, epochs, coin],
							}),
				);
			},
		);
	}

	async #withWal<T>(
		amount: bigint,
		owner: string,
		source: TransactionObjectArgument | null,
		withSubsidies: boolean,
		fn: (coin: TransactionObjectArgument, tx: Transaction) => T,
	) {
		const walType = await this.#walType();

		return (tx: Transaction): T => {
			const coin = source
				? tx.splitCoins(source, [amount])[0]
				: tx.add(
						coinWithBalance({
							balance: amount,
							type: walType,
						}),
					);

			const result = fn(coin, tx);

			if (withSubsidies) {
				if (source) {
					tx.mergeCoins(source, [coin]);
				} else {
					tx.transferObjects([coin], owner);
				}
			} else {
				tx.moveCall({
					target: '0x2::coin::destroy_zero',
					typeArguments: [walType],
					arguments: [coin],
				});
			}

			return result;
		};
	}

	/**
	 * Create a transaction that creates a storage object
	 *
	 * @usage
	 * ```ts
	 * const tx = await client.createStorageTransaction({ size: 1000, epochs: 3, owner: signer.toSuiAddress() });
	 * ```
	 */
	async createStorageTransaction({
		transaction = new Transaction(),
		size,
		epochs,
		owner,
	}: StorageWithSizeOptions & { transaction?: Transaction }) {
		transaction.transferObjects([await this.createStorage({ size, epochs, owner })], owner);

		return transaction;
	}

	/**
	 * Execute a transaction that creates a storage object
	 *
	 * @usage
	 * ```ts
	 * const { digest, storage } = await client.executeCreateStorageTransaction({ size: 1000, epochs: 3, signer });
	 * ```
	 */
	async executeCreateStorageTransaction({
		signer,
		...options
	}: StorageWithSizeOptions & { transaction?: Transaction; signer: Signer }) {
		const transaction = await this.createStorageTransaction({
			...options,
			owner: options.transaction?.getData().sender ?? signer.toSuiAddress(),
		});
		const blobType = await this.#getBlobType();

		const { digest, effects } = await this.#executeTransaction(
			transaction,
			signer,
			'create storage',
		);

		const createdObjectIds = effects?.created?.map((effect) => effect.reference.objectId) ?? [];

		const createdObjects = await this.#suiClient.multiGetObjects({
			ids: createdObjectIds,
			options: {
				showType: true,
				showBcs: true,
			},
		});

		const suiBlobObject = createdObjects.find((object) => object.data?.type === blobType);

		if (!suiBlobObject || suiBlobObject.data?.bcs?.dataType !== 'moveObject') {
			throw new WalrusClientError('Storage object not found in transaction effects');
		}

		return {
			digest,
			storage: Storage().fromBase64(suiBlobObject.data.bcs.bcsBytes),
		};
	}

	/**
	 * Register a blob in a transaction
	 *
	 * @usage
	 * ```ts
	 * tx.transferObjects([await client.registerBlob({ size: 1000, epochs: 3, blobId, rootHash, deletable: true })], owner);
	 * ```
	 */
	async registerBlob({
		size,
		epochs,
		blobId,
		rootHash,
		deletable,
		walCoin,
		owner,
		attributes,
	}: RegisterBlobOptions) {
		const storage = await this.createStorage({ size, epochs, walCoin, owner });
		const { writeCost } = await this.storageCost(size, epochs);
		const systemContract = await this.#getSystemContract();
		const writeAttributes = attributes
			? await this.#writeBlobAttributesForRef({
					attributes,
					existingAttributes: null,
				})
			: null;

		return this.#withWal(writeCost, owner, walCoin ?? null, false, (writeCoin, tx) => {
			const blob = tx.add(
				systemContract.register_blob({
					arguments: [
						tx.object(this.#packageConfig.systemObjectId),
						storage,
						blobIdToInt(blobId),
						BigInt(bcs.u256().parse(rootHash)),
						size,
						1,
						deletable,
						writeCoin,
					],
				}),
			);

			if (writeAttributes) {
				tx.add((tx) => writeAttributes(tx, blob));
			}

			return blob;
		});
	}

	/**
	 * Create a transaction that registers a blob
	 *
	 * @usage
	 * ```ts
	 * const tx = await client.registerBlobTransaction({ size: 1000, epochs: 3, blobId, rootHash, deletable: true });
	 * ```
	 */
	async registerBlobTransaction({
		transaction = new Transaction(),
		...options
	}: RegisterBlobOptions & { transaction?: Transaction }) {
		const registration = transaction.add(await this.registerBlob(options));

		transaction.transferObjects([registration], options.owner);

		return transaction;
	}

	/**
	 * Execute a transaction that registers a blob
	 *
	 * @usage
	 * ```ts
	 * const { digest, blob } = await client.executeRegisterBlobTransaction({ size: 1000, epochs: 3, signer });
	 * ```
	 */
	async executeRegisterBlobTransaction({
		signer,
		...options
	}: RegisterBlobOptions & { transaction?: Transaction; signer: Signer }): Promise<{
		blob: ReturnType<typeof Blob>['$inferType'];
		digest: string;
	}> {
		const transaction = await this.registerBlobTransaction({
			...options,
			owner: options.owner ?? options.transaction?.getData().sender ?? signer.toSuiAddress(),
		});
		const blobType = await this.#getBlobType();
		const { digest, effects } = await this.#executeTransaction(
			transaction,
			signer,
			'register blob',
		);

		const createdObjectIds = effects?.created?.map((effect) => effect.reference.objectId) ?? [];

		const createdObjects = await this.#suiClient.multiGetObjects({
			ids: createdObjectIds,
			options: {
				showType: true,
				showBcs: true,
			},
		});

		const suiBlobObject = createdObjects.find((object) => object.data?.type === blobType);

		if (!suiBlobObject || suiBlobObject.data?.bcs?.dataType !== 'moveObject') {
			throw new WalrusClientError('Blob object not found in transaction effects');
		}

		return {
			digest,
			blob: Blob().fromBase64(suiBlobObject.data.bcs.bcsBytes),
		};
	}

	/**
	 * Certify a blob in a transaction
	 *
	 * @usage
	 * ```ts
	 * tx.add(await client.certifyBlob({ blobId, blobObjectId, confirmations }));
	 * ```
	 */
	async certifyBlob({ blobId, blobObjectId, confirmations, deletable }: CertifyBlobOptions) {
		const systemState = await this.systemState();
		const committee = await this.#getActiveCommittee();

		if (confirmations.length !== systemState.committee.members.length) {
			throw new WalrusClientError(
				'Invalid number of confirmations. Confirmations array must contain an entry for each node',
			);
		}

		const confirmationMessage = StorageConfirmation.serialize({
			intent: IntentType.BLOB_CERT_MSG,
			epoch: systemState.committee.epoch,
			messageContents: {
				blobId,
				blobType: deletable
					? {
							Deletable: {
								objectId: blobObjectId,
							},
						}
					: {
							Permanent: null,
						},
			},
		}).toBase64();

		const filteredConfirmations = confirmations
			.map((confirmation, index) => {
				const isValid =
					confirmation?.serializedMessage === confirmationMessage &&
					bls12381_min_pk_verify(
						fromBase64(confirmation.signature),
						new Uint8Array(committee.nodes[index].info.public_key.bytes),
						fromBase64(confirmation.serializedMessage),
					);

				return isValid
					? {
							index,
							...confirmation,
						}
					: null;
			})
			.filter((confirmation) => confirmation !== null);

		if (!isQuorum(filteredConfirmations.length, systemState.committee.members.length)) {
			throw new NotEnoughBlobConfirmationsError(
				`Too many invalid confirmations received for blob (${filteredConfirmations.length} of ${systemState.committee.members.length})`,
			);
		}

		const combinedSignature = combineSignatures(
			filteredConfirmations,
			filteredConfirmations.map(({ index }) => index),
		);
		const systemContract = await this.#getSystemContract();

		return (tx: Transaction) => {
			systemContract.certify_blob({
				arguments: [
					tx.object(this.#packageConfig.systemObjectId),
					tx.object(blobObjectId),
					tx.pure.vector('u8', fromBase64(combinedSignature.signature)),
					tx.pure.vector(
						'u8',
						signersToBitmap(combinedSignature.signers, systemState.committee.members.length),
					),
					tx.pure.vector('u8', combinedSignature.serializedMessage),
				],
			});
		};
	}

	/**
	 * Create a transaction that certifies a blob
	 *
	 * @usage
	 * ```ts
	 * const tx = await client.certifyBlobTransaction({ blobId, blobObjectId, confirmations });
	 * ```
	 */
	async certifyBlobTransaction({
		transaction = new Transaction(),
		blobId,
		blobObjectId,
		confirmations,
		deletable,
	}: CertifyBlobOptions & {
		transaction?: Transaction;
	}) {
		transaction.add(await this.certifyBlob({ blobId, blobObjectId, confirmations, deletable }));

		return transaction;
	}

	/**
	 * Execute a transaction that certifies a blob
	 *
	 * @usage
	 * ```ts
	 * const { digest } = await client.executeCertifyBlobTransaction({ blobId, blobObjectId, confirmations, signer });
	 * ```
	 */
	async executeCertifyBlobTransaction({
		signer,
		...options
	}: CertifyBlobOptions & {
		transaction?: Transaction;
		signer: Signer;
	}) {
		const transaction = await this.certifyBlobTransaction(options);

		const { digest } = await this.#executeTransaction(transaction, signer, 'certify blob');

		return { digest };
	}

	/**
	 * Delete a blob in a transaction
	 *
	 * @usage
	 * ```ts
	 * const storage = await client.deleteBlob({ blobObjectId });
	 * tx.transferObjects([storage], owner);
	 * ```
	 */
	deleteBlob({ blobObjectId }: DeleteBlobOptions) {
		return (tx: Transaction) =>
			tx.moveCall({
				package: this.#packageConfig.systemObjectId,
				module: 'system',
				function: 'delete_blob',
				arguments: [tx.object(this.#packageConfig.systemObjectId), tx.object(blobObjectId)],
			});
	}

	/**
	 * Create a transaction that deletes a blob
	 *
	 * @usage
	 * ```ts
	 * const tx = await client.deleteBlobTransaction({ blobObjectId, owner });
	 * ```
	 */
	deleteBlobTransaction({
		owner,
		blobObjectId,
		transaction = new Transaction(),
	}: DeleteBlobOptions & { transaction?: Transaction; owner: string }) {
		transaction.transferObjects([this.deleteBlob({ blobObjectId })], owner);

		return transaction;
	}

	/**
	 * Execute a transaction that deletes a blob
	 *
	 * @usage
	 * ```ts
	 * const { digest } = await client.executeDeleteBlobTransaction({ blobObjectId, signer });
	 * ```
	 */
	async executeDeleteBlobTransaction({
		signer,
		transaction = new Transaction(),
		blobObjectId,
	}: DeleteBlobOptions & { signer: Signer; transaction?: Transaction }) {
		const { digest } = await this.#executeTransaction(
			this.deleteBlobTransaction({
				blobObjectId,
				transaction,
				owner: transaction.getData().sender ?? signer.toSuiAddress(),
			}),
			signer,
			'delete blob',
		);

		return { digest };
	}

	/**
	 * Extend a blob in a transaction
	 *
	 * @usage
	 * ```ts
	 * const tx = await client.extendBlobTransaction({ blobObjectId, epochs });
	 * ```
	 */
	async extendBlob({ blobObjectId, epochs, endEpoch, walCoin, owner }: ExtendBlobOptions) {
		const blob = await this.#objectLoader.load(blobObjectId, Blob());
		const numEpochs = typeof epochs === 'number' ? epochs : endEpoch - blob.storage.end_epoch;

		if (numEpochs <= 0) {
			return (_tx: Transaction) => {};
		}

		const { storageCost } = await this.storageCost(Number(blob.storage.storage_size), numEpochs);
		const systemContract = await this.#getSystemContract();
		const subsidiesContract = this.#packageConfig.subsidiesObjectId
			? await this.#getSubsidiesContract()
			: null;

		return this.#withWal(
			storageCost,
			owner,
			walCoin ?? null,
			subsidiesContract !== null,
			(coin, tx) => {
				tx.add(
					subsidiesContract
						? subsidiesContract.extend_blob({
								arguments: [
									this.#packageConfig.subsidiesObjectId!,
									this.#packageConfig.systemObjectId,
									blobObjectId,
									numEpochs,
									coin,
								],
							})
						: systemContract.extend_blob({
								arguments: [this.#packageConfig.systemObjectId, blobObjectId, numEpochs, coin],
							}),
				);
			},
		);
	}

	/**
	 * Create a transaction that extends a blob
	 *
	 * @usage
	 * ```ts
	 * const tx = await client.extendBlobTransaction({ blobObjectId, epochs });
	 * ```
	 */
	async extendBlobTransaction({
		transaction = new Transaction(),
		...options
	}: ExtendBlobOptions & { transaction?: Transaction }) {
		transaction.add(await this.extendBlob(options));

		return transaction;
	}

	/**
	 * Execute a transaction that extends a blob
	 *
	 * @usage
	 * ```ts
	 * const { digest } = await client.executeExtendBlobTransaction({ blobObjectId, signer });
	 * ```
	 */
	async executeExtendBlobTransaction({
		signer,
		...options
	}: ExtendBlobOptions & { signer: Signer; transaction?: Transaction }) {
		const { digest } = await this.#executeTransaction(
			await this.extendBlobTransaction(options),
			signer,
			'extend blob',
		);

		return { digest };
	}

	async readBlobAttributes({
		blobObjectId,
	}: {
		blobObjectId: string;
	}): Promise<Record<string, string> | null> {
		const response = await this.#suiClient.getDynamicFieldObject({
			parentId: blobObjectId,
			name: {
				type: 'vector<u8>',
				value: [...new TextEncoder().encode('metadata')],
			},
		});

		if (response.error?.code === 'dynamicFieldNotFound') {
			return null;
		}

		if (response.error || !response.data) {
			throw new WalrusClientError(
				`Failed to fetch metadata for object ${blobObjectId}: ${response.error}`,
			);
		}

		const metadata = (
			response.data as unknown as {
				content: {
					fields: {
						value: {
							fields: {
								metadata: {
									fields: { contents: { fields: { key: string; value: string } }[] };
								};
							};
						};
					};
				};
			}
		).content.fields.value.fields.metadata.fields.contents;

		return Object.fromEntries(metadata.map(({ fields: { key, value } }) => [key, value]));
	}

	async #writeBlobAttributesForRef({
		attributes,
		existingAttributes,
	}: {
		attributes: Record<string, string | null>;
		existingAttributes: Record<string, string> | null;
	}) {
		const blobContract = await this.#getBlobContract();
		const metadataContract = await this.#getMetadataContract();
		return (tx: Transaction, blob: TransactionObjectArgument) => {
			if (!existingAttributes) {
				tx.add(
					blobContract.add_metadata({
						arguments: [
							blob,
							metadataContract._new({
								arguments: [],
							}),
						],
					}),
				);
			}

			Object.keys(attributes).forEach((key) => {
				const value = attributes[key];

				if (value === null) {
					if (existingAttributes && key in existingAttributes) {
						tx.add(
							blobContract.remove_metadata_pair({
								arguments: [blob, key],
							}),
						);
					}
				} else {
					tx.add(
						blobContract.insert_or_update_metadata_pair({
							arguments: [blob, key, value],
						}),
					);
				}
			});
		};
	}

	/**
	 * Write attributes to a blob
	 *
	 * If attributes already exists, their previous values will be overwritten
	 * If an attribute is set to `null`, it will be removed from the blob
	 *
	 * @usage
	 * ```ts
	 * tx.add(await client.writeBlobAttributes({ blobObjectId, attributes: { key: 'value', keyToRemove: null } }));
	 * ```
	 */
	async writeBlobAttributes({ blobObject, blobObjectId, attributes }: WriteBlobAttributesOptions) {
		const existingAttributes = blobObjectId
			? await this.readBlobAttributes({ blobObjectId })
			: null;

		const writeAttributes = await this.#writeBlobAttributesForRef({
			attributes,
			existingAttributes,
		});

		return (tx: Transaction) => {
			const blob = blobObject ?? tx.object(blobObjectId);

			tx.add((tx) => writeAttributes(tx, blob));
		};
	}

	/**
	 * Create a transaction that writes attributes to a blob
	 *
	 * If attributes already exists, their previous values will be overwritten
	 * If an attribute is set to `null`, it will be removed from the blob
	 *
	 * @usage
	 * ```ts
	 * const tx = await client.writeBlobAttributesTransaction({ blobObjectId, attributes: { key: 'value', keyToRemove: null } });
	 * ```
	 */
	async writeBlobAttributesTransaction({
		transaction = new Transaction(),
		...options
	}: WriteBlobAttributesOptions & { transaction?: Transaction }) {
		transaction.add(await this.writeBlobAttributes(options));
		return transaction;
	}

	/**
	 * Execute a transaction that writes attributes to a blob
	 *
	 * If attributes already exists, their previous values will be overwritten
	 * If an attribute is set to `null`, it will be removed from the blob
	 *
	 * @usage
	 * ```ts
	 * const { digest } = await client.executeWriteBlobAttributesTransaction({ blobObjectId, signer });
	 * ```
	 */
	async executeWriteBlobAttributesTransaction({
		signer,
		...options
	}: WriteBlobAttributesOptions & { signer: Signer; transaction?: Transaction }) {
		const { digest } = await this.#executeTransaction(
			await this.writeBlobAttributesTransaction(options),
			signer,
			'write blob attributes',
		);
		return { digest };
	}

	/**
	 * Write a sliver to a storage node
	 *
	 * @usage
	 * ```ts
	 * const res = await client.writeSliver({ blobId, sliverPairIndex, sliverType, sliver });
	 * ```
	 */
	async writeSliver({ blobId, sliverPairIndex, sliverType, sliver, signal }: WriteSliverOptions) {
		const systemState = await this.systemState();
		const committee = await this.#getActiveCommittee();

		const shardIndex = toShardIndex(sliverPairIndex, blobId, systemState.committee.n_shards);
		const node = await this.#getNodeByShardIndex(committee, shardIndex);

		return await this.#storageNodeClient.storeSliver(
			{ blobId, sliverPairIndex, sliverType, sliver },
			{ nodeUrl: node.networkUrl, signal },
		);
	}

	/**
	 * Write metadata to a storage node
	 *
	 * @usage
	 * ```ts
	 * const res = await client.writeMetadataToNode({ nodeIndex, blobId, metadata });
	 * ```
	 */
	async writeMetadataToNode({ nodeIndex, blobId, metadata, signal }: WriteMetadataOptions) {
		const committee = await this.#getActiveCommittee();
		const node = committee.nodes[nodeIndex];

		return await this.#storageNodeClient.storeBlobMetadata(
			{ blobId, metadata },
			{ nodeUrl: node.networkUrl, signal },
		);
	}

	/**
	 * Get a storage confirmation from a storage node
	 *
	 * @usage
	 * ```ts
	 * const confirmation = await client.getStorageConfirmationFromNode({ nodeIndex, blobId, deletable, objectId });
	 * ```
	 */
	async getStorageConfirmationFromNode({
		nodeIndex,
		blobId,
		deletable,
		objectId,
		signal,
	}: GetStorageConfirmationOptions) {
		const committee = await this.#getActiveCommittee();
		const node = committee.nodes[nodeIndex];

		const result = deletable
			? await this.#storageNodeClient.getDeletableBlobConfirmation(
					{ blobId, objectId },
					{ nodeUrl: node.networkUrl, signal },
				)
			: await this.#storageNodeClient.getPermanentBlobConfirmation(
					{ blobId },
					{ nodeUrl: node.networkUrl, signal },
				);

		return result?.success?.data?.signed ?? null;
	}

	/**
	 * Encode a blob into slivers for each node
	 *
	 * @usage
	 * ```ts
	 * const { blobId, metadata, sliversByNode, rootHash } = await client.encodeBlob(blob);
	 * ```
	 */
	async encodeBlob(blob: Uint8Array) {
		const systemState = await this.systemState();
		const committee = await this.#getActiveCommittee();

		const numShards = systemState.committee.n_shards;
		const { blobId, metadata, sliverPairs, rootHash } = encodeBlob(numShards, blob);

		const sliversByNodeMap = new Map<number, SliversForNode>();

		while (sliverPairs.length > 0) {
			// remove from list so we don't preserve references to the original data
			const { primary, secondary } = sliverPairs.pop()!;
			const sliverPairIndex = primary.index;

			const shardIndex = toShardIndex(sliverPairIndex, blobId, numShards);
			const node = await this.#getNodeByShardIndex(committee, shardIndex);

			if (!sliversByNodeMap.has(node.nodeIndex)) {
				sliversByNodeMap.set(node.nodeIndex, { primary: [], secondary: [] });
			}

			sliversByNodeMap.get(node.nodeIndex)!.primary.push({
				sliverIndex: primary.index,
				sliverPairIndex,
				shardIndex,
				sliver: SliverData.serialize(primary).toBytes(),
			});

			sliversByNodeMap.get(node.nodeIndex)!.secondary.push({
				sliverIndex: secondary.index,
				sliverPairIndex,
				shardIndex,
				sliver: SliverData.serialize(secondary).toBytes(),
			});
		}

		const sliversByNode = new Array<SliversForNode>();

		for (let i = 0; i < systemState.committee.members.length; i++) {
			sliversByNode.push(sliversByNodeMap.get(i) ?? { primary: [], secondary: [] });
		}

		return { blobId, metadata, rootHash, sliversByNode };
	}

	/**
	 * Write slivers to a storage node
	 *
	 * @usage
	 * ```ts
	 * await client.writeSliversToNode({ blobId, slivers, signal });
	 * ```
	 */
	async writeSliversToNode({ blobId, slivers, signal }: WriteSliversToNodeOptions) {
		const controller = new AbortController();
		const combinedSignal = signal
			? AbortSignal.any([controller.signal, signal])
			: controller.signal;

		const primarySliverWrites = slivers.primary.map(({ sliverPairIndex, sliver }) => {
			return this.writeSliver({
				blobId,
				sliverPairIndex,
				sliverType: 'primary',
				sliver,
				signal: combinedSignal,
			});
		});

		const secondarySliverWrites = slivers.secondary.map(({ sliverPairIndex, sliver }) => {
			return this.writeSliver({
				blobId,
				sliverPairIndex,
				sliverType: 'secondary',
				sliver,
				signal: combinedSignal,
			});
		});

		await Promise.all([...primarySliverWrites, ...secondarySliverWrites]).catch((error) => {
			controller.abort(error);
			throw error;
		});
	}

	/**
	 * Write a blob to all storage nodes
	 *
	 * @usage
	 * ```ts
	 * await client.writeEncodedBlobToNodes({ blob, deletable, epochs, signer });
	 * ```
	 */
	async writeEncodedBlobToNodes({
		blobId,
		metadata,
		sliversByNode,
		signal,
		...options
	}: WriteEncodedBlobToNodesOptions) {
		const systemState = await this.systemState();
		const committee = await this.#getActiveCommittee();

		const controller = new AbortController();
		let failures = 0;

		const confirmations = await Promise.all(
			sliversByNode.map((slivers, nodeIndex) => {
				return this.writeEncodedBlobToNode({
					blobId,
					nodeIndex,
					metadata,
					slivers,
					signal: signal ? AbortSignal.any([controller.signal, signal]) : controller.signal,
					...options,
				}).catch(() => {
					failures += committee.nodes[nodeIndex].shardIndices.length;

					if (isAboveValidity(failures, systemState.committee.n_shards)) {
						controller.abort();

						throw new NotEnoughBlobConfirmationsError(
							`Too many failures while writing blob ${blobId} to nodes`,
						);
					}

					return null;
				});
			}),
		);

		return confirmations;
	}

	/**
	 * Write encoded blob to a storage node
	 *
	 * @usage
	 * ```ts
	 * const res = await client.writeEncodedBlobToNode({ nodeIndex, blobId, metadata, slivers });
	 * ```
	 */
	async writeEncodedBlobToNode({
		nodeIndex,
		blobId,
		metadata,
		slivers,
		signal,
		...options
	}: WriteEncodedBlobOptions) {
		await this.writeMetadataToNode({
			nodeIndex,
			blobId,
			metadata,
			signal,
		});

		await this.writeSliversToNode({ blobId, slivers, signal, nodeIndex });

		return this.getStorageConfirmationFromNode({
			nodeIndex,
			blobId,
			...options,
		});
	}

	/**
	 * Write a blob to all storage nodes
	 *
	 * @usage
	 * ```ts
	 * const { blobId, blobObject } = await client.writeBlob({ blob, deletable, epochs, signer });
	 * ```
	 */
	async writeBlob({
		blob,
		deletable,
		epochs,
		signer,
		signal,
		owner,
		attributes,
	}: WriteBlobOptions) {
		const { sliversByNode, blobId, metadata, rootHash } = await this.encodeBlob(blob);

		const suiBlobObject = await this.executeRegisterBlobTransaction({
			signer,
			size: blob.length,
			epochs,
			blobId,
			rootHash,
			deletable,
			owner: owner ?? signer.toSuiAddress(),
			attributes,
		});

		const blobObjectId = suiBlobObject.blob.id.id;

		const confirmations = await this.writeEncodedBlobToNodes({
			blobId,
			metadata,
			sliversByNode,
			deletable,
			objectId: blobObjectId,
			signal,
		});

		await this.executeCertifyBlobTransaction({
			signer,
			blobId,
			blobObjectId,
			confirmations,
			deletable,
		});

		return {
			blobId,
			blobObject: await this.#objectLoader.load(blobObjectId, Blob()),
		};
	}

	async #executeTransaction(transaction: Transaction, signer: Signer, action: string) {
		const { digest, effects } = await this.#suiClient.signAndExecuteTransaction({
			transaction,
			signer,
			options: {
				showEffects: true,
			},
		});

		if (effects?.status.status !== 'success') {
			throw new WalrusClientError(`Failed to ${action}: ${effects?.status.error}`);
		}

		await this.#suiClient.waitForTransaction({
			digest,
		});

		return { digest, effects };
	}

	async #getCommittee(committee: InferBcsType<ReturnType<typeof Committee>>) {
		const stakingPool = await this.#stakingPool(committee);
		const shardIndicesByNodeId = getShardIndicesByNodeId(committee);

		const byShardIndex = new Map<number, StorageNode>();
		const nodes = stakingPool.map(({ node_info }, nodeIndex) => {
			const shardIndices = shardIndicesByNodeId.get(node_info.node_id) ?? [];
			const node: StorageNode = {
				id: node_info.node_id,
				info: node_info,
				networkUrl: `https://${node_info.network_address}`,
				shardIndices,
				nodeIndex,
			};

			for (const shardIndex of shardIndices) {
				byShardIndex.set(shardIndex, node);
			}

			return node;
		});

		return {
			byShardIndex,
			nodes,
		};
	}

	#getActiveCommittee = this.#memo.create('getActiveCommittee', async () => {
		const stakingState = await this.stakingState();
		return this.#getCommittee(stakingState.committee);
	});

	async #stakingPool(committee: InferBcsType<ReturnType<typeof Committee>>) {
		const nodeIds = committee.pos0.contents.map((node) => node.key);
		return this.#objectLoader.loadManyOrThrow(nodeIds, StakingPool());
	}

	async #getNodeByShardIndex(committeeInfo: CommitteeInfo, index: number) {
		const node = committeeInfo.byShardIndex.get(index);
		if (!node) {
			throw new WalrusClientError(`Node for shard index ${index} not found`);
		}
		return node;
	}

	/**
	 * Reset cached data in the client
	 *
	 * @usage
	 * ```ts
	 * client.reset();
	 * ```
	 */
	reset() {
		this.#objectLoader.clearAll();
		this.#readCommittee = null;
		this.#memo.reset();
	}

	#retryOnPossibleEpochChange<T extends (...args: any[]) => Promise<any>>(fn: T): T {
		return (async (...args: Parameters<T>) => {
			try {
				return await fn.apply(this, args);
			} catch (error) {
				if (error instanceof RetryableWalrusClientError) {
					this.reset();
					return await fn.apply(this, args);
				}
				throw error;
			}
		}) as T;
	}
}
