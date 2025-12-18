// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { ClientWithCoreApi } from '@mysten/sui/client';
import type { Transaction, TransactionObjectArgument } from '@mysten/sui/transactions';
import { coinWithBalance } from '@mysten/sui/transactions';
import { fromBase64, fromHex, parseStructTag } from '@mysten/sui/utils';

import type { HexString } from './PriceServiceConnection.js';
import { PriceServiceConnection } from './PriceServiceConnection.js';
import { extractVaaBytesFromAccumulatorMessage } from './pyth-helpers.js';
import { State as PythState } from '../contracts/pyth/state.js';
import { State as WormholeState } from '../contracts/wormhole/state.js';

const MAX_ARGUMENT_SIZE = 16 * 1024;
export type ObjectId = string;
export class SuiPriceServiceConnection extends PriceServiceConnection {
	/**
	 * Fetch price feed update data.
	 *
	 * @param priceIds Array of hex-encoded price IDs.
	 * @returns Array of buffers containing the price update data.
	 */
	async getPriceFeedsUpdateData(priceIds: HexString[]): Promise<Uint8Array[]> {
		const latestVaas = await this.getLatestVaas(priceIds);
		return latestVaas.map((vaa) => fromBase64(vaa));
	}
}

type ParsedPythState = ReturnType<typeof PythState.parse>;

export class SuiPythClient {
	#pythState?: Promise<ParsedPythState>;
	#wormholePackageId?: Promise<ObjectId>;
	#priceFeedObjectIdCache: Map<HexString, Promise<ObjectId>> = new Map();
	#priceTableInfo?: Promise<{ id: ObjectId; fieldType: ObjectId }>;
	provider: ClientWithCoreApi;
	pythStateId: ObjectId;
	wormholeStateId: ObjectId;

	constructor(provider: ClientWithCoreApi, pythStateId: ObjectId, wormholeStateId: ObjectId) {
		this.provider = provider;
		this.pythStateId = pythStateId;
		this.wormholeStateId = wormholeStateId;
	}
	/**
	 * Verifies the VAAs using the Wormhole contract.
	 *
	 * @param vaas Array of VAA buffers to verify.
	 * @param tx Transaction block to add commands to.
	 * @returns Array of verified VAAs.
	 */
	async verifyVaas(vaas: Uint8Array[], tx: Transaction) {
		const wormholePackageId = await this.getWormholePackageId();
		const verifiedVaas = [];
		for (const vaa of vaas) {
			const [verifiedVaa] = tx.moveCall({
				target: `${wormholePackageId}::vaa::parse_and_verify`,
				arguments: [tx.object(this.wormholeStateId), tx.pure.vector('u8', vaa), tx.object.clock()],
			});
			verifiedVaas.push(verifiedVaa);
		}
		return verifiedVaas;
	}
	/**
	 * Adds the necessary commands for updating the Pyth price feeds to the transaction block.
	 *
	 * @param tx Transaction block to add commands to.
	 * @param updates Array of price feed updates received from the price service.
	 * @param feedIds Array of feed IDs to update (in hex format).
	 * @param feeCoin Optional custom SUI coin to use for Pyth oracle fees. If not provided, uses gas coin.
	 */
	async updatePriceFeeds(
		tx: Transaction,
		updates: Uint8Array[],
		feedIds: HexString[],
		feeCoin?: TransactionObjectArgument,
	): Promise<ObjectId[]> {
		const packageId = await this.getPythPackageId();
		let priceUpdatesHotPotato;
		if (updates.length > 1) {
			throw new Error(
				'SDK does not support sending multiple accumulator messages in a single transaction',
			);
		}
		const vaa = extractVaaBytesFromAccumulatorMessage(updates[0]);
		const verifiedVaas = await this.verifyVaas([vaa], tx);
		[priceUpdatesHotPotato] = tx.moveCall({
			target: `${packageId}::pyth::create_authenticated_price_infos_using_accumulator`,
			arguments: [
				tx.object(this.pythStateId),
				tx.pure(
					bcs
						.vector(bcs.U8)
						.serialize(Array.from(updates[0]), {
							maxSize: MAX_ARGUMENT_SIZE,
						})
						.toBytes(),
				),
				verifiedVaas[0],
				tx.object.clock(),
			],
		});
		const priceInfoObjects: ObjectId[] = [];
		const baseUpdateFee = await this.getBaseUpdateFee();
		for (const feedId of feedIds) {
			const priceInfoObjectId = await this.getPriceFeedObjectId(feedId);
			if (!priceInfoObjectId) {
				throw new Error(`Price feed ${feedId} not found, please create it first`);
			}
			priceInfoObjects.push(priceInfoObjectId);

			const feePayment = feeCoin
				? tx.splitCoins(feeCoin, [tx.pure.u64(baseUpdateFee)])[0]
				: coinWithBalance({ balance: baseUpdateFee });

			[priceUpdatesHotPotato] = tx.moveCall({
				target: `${packageId}::pyth::update_single_price_feed`,
				arguments: [
					tx.object(this.pythStateId),
					priceUpdatesHotPotato,
					tx.object(priceInfoObjectId),
					feePayment,
					tx.object.clock(),
				],
			});
		}
		tx.moveCall({
			target: `${packageId}::hot_potato_vector::destroy`,
			arguments: [priceUpdatesHotPotato],
			typeArguments: [`${packageId}::price_info::PriceInfo`],
		});
		return priceInfoObjects;
	}
	/**
	 * Get the price feed object ID for a given feed ID, caching the promise.
	 * @param feedId
	 */
	getPriceFeedObjectId(feedId: HexString): Promise<ObjectId | undefined> {
		if (!this.#priceFeedObjectIdCache.has(feedId)) {
			this.#priceFeedObjectIdCache.set(
				feedId,
				this.#fetchPriceFeedObjectId(feedId).catch((err) => {
					// Remove failed promises from the cache to allow retries
					this.#priceFeedObjectIdCache.delete(feedId);
					throw err;
				}),
			);
		}

		return this.#priceFeedObjectIdCache.get(feedId)!;
	}

	/**
	 * Fetches the price feed object ID for a given feed ID (no caching).
	 * Throws an error if the object is not found.
	 */
	async #fetchPriceFeedObjectId(feedId: HexString): Promise<ObjectId> {
		const { id: tableId, fieldType } = await this.getPriceTableInfo();

		const result = await this.provider.core.getDynamicField({
			parentId: tableId,
			name: {
				type: `${fieldType}::price_identifier::PriceIdentifier`,
				bcs: bcs.byteVector().serialize(fromHex(feedId)).toBytes(),
			},
		});

		if (!result.dynamicField) {
			throw new Error(`Price feed object ID for feed ID ${feedId} not found.`);
		}

		return bcs.Address.parse(result.dynamicField.value.bcs);
	}

	/**
	 * Fetches the price table object ID for the current state ID, caching the promise.
	 * @returns Price table object ID and field type
	 */
	getPriceTableInfo(): Promise<{ id: ObjectId; fieldType: ObjectId }> {
		if (!this.#priceTableInfo) {
			const promise = this.#fetchPriceTableInfo().catch((err) => {
				// Clear the cached promise on error
				this.#priceTableInfo = undefined;
				throw err;
			});

			this.#priceTableInfo = promise;
		}

		return this.#priceTableInfo;
	}

	/**
	 * Fetches the price table object ID and field type (no caching).
	 * @returns Price table object ID and field type
	 */
	async #fetchPriceTableInfo(): Promise<{ id: ObjectId; fieldType: ObjectId }> {
		const result = await this.provider.core.getDynamicObjectField({
			parentId: this.pythStateId,
			name: {
				type: 'vector<u8>',
				bcs: bcs.string().serialize('price_info').toBytes(),
			},
		});

		if (!result.object) {
			throw new Error('Price Table not found, contract may not be initialized');
		}

		const tableType = parseStructTag(result.object.type);
		const priceIdentifier = tableType.typeParams[0];
		if (
			typeof priceIdentifier === 'object' &&
			priceIdentifier !== null &&
			priceIdentifier.name === 'PriceIdentifier' &&
			'address' in priceIdentifier
		) {
			return { id: result.object.objectId, fieldType: priceIdentifier.address };
		} else {
			throw new Error('fieldType not found');
		}
	}
	/**
	 * Fetches the package ID for the Wormhole contract, with caching.
	 */
	getWormholePackageId(): Promise<ObjectId> {
		if (!this.#wormholePackageId) {
			this.#wormholePackageId = this.#fetchWormholePackageId();
		}
		return this.#wormholePackageId;
	}

	/**
	 * Fetches the package ID for the Wormhole contract (no caching).
	 */
	async #fetchWormholePackageId(): Promise<ObjectId> {
		const result = await this.provider.core.getObject({
			objectId: this.wormholeStateId,
			include: { content: true },
		});

		if (!result.object?.content) {
			throw new Error('Unable to fetch Wormhole state object');
		}

		const state = WormholeState.parse(result.object.content);
		return state.upgrade_cap.package;
	}

	/**
	 * Fetches and caches the parsed Pyth state object.
	 * This is shared between getPythPackageId and getBaseUpdateFee to avoid redundant fetches.
	 */
	#getPythState(): Promise<ParsedPythState> {
		if (!this.#pythState) {
			this.#pythState = this.#fetchPythState();
		}
		return this.#pythState;
	}

	/**
	 * Fetches the Pyth state object (no caching).
	 */
	async #fetchPythState(): Promise<ParsedPythState> {
		const result = await this.provider.core.getObject({
			objectId: this.pythStateId,
			include: { content: true },
		});

		if (!result.object?.content) {
			throw new Error('Unable to fetch Pyth state object');
		}

		return PythState.parse(result.object.content);
	}

	/**
	 * Fetches the package ID for the Pyth contract, with caching.
	 * Uses the shared Pyth state cache.
	 */
	async getPythPackageId(): Promise<ObjectId> {
		const state = await this.#getPythState();
		return state.upgrade_cap.package;
	}

	/**
	 * Returns the cached base update fee, fetching it if necessary.
	 * Uses the shared Pyth state cache.
	 */
	async getBaseUpdateFee(): Promise<number> {
		const state = await this.#getPythState();
		return Number(state.base_update_fee);
	}
}
