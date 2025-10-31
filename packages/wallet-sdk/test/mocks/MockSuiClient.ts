// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from '@mysten/sui/client';
import { CoreClient } from '@mysten/sui/client';
import { normalizeSuiAddress, normalizeStructTag, parseStructTag } from '@mysten/sui/utils';
import type { TransactionPlugin } from '@mysten/sui/transactions';
import { Inputs } from '@mysten/sui/transactions';
import {
	DEFAULT_OBJECTS,
	DEFAULT_MOVE_FUNCTIONS,
	DEFAULT_GAS_PRICE,
	CoinStruct,
	createMockCoin,
	createMockNFT,
	createMockObject,
	createMockMoveFunction,
} from './mockData.js';

export class MockSuiClient extends CoreClient {
	#objects = new Map<string, SuiClientTypes.ObjectResponse>();
	#moveFunctions = new Map<string, SuiClientTypes.FunctionResponse>();
	#gasPrice = DEFAULT_GAS_PRICE;
	#nextDryRunResult: SuiClientTypes.DryRunTransactionResponse | null = null;

	constructor(network: SuiClientTypes.Network = 'testnet') {
		super({
			network,
			base: null as unknown as CoreClient,
		});
		this.base = this;

		this.#initializeDefaults();
	}

	#initializeDefaults() {
		// Add all default objects
		for (const obj of DEFAULT_OBJECTS) {
			this.#objects.set(obj.id, obj);
		}

		// Add all default move functions
		for (const fn of DEFAULT_MOVE_FUNCTIONS) {
			const normalizedPackageId = normalizeSuiAddress(fn.packageId);
			const key = `${normalizedPackageId}::${fn.moduleName}::${fn.name}`;
			this.#moveFunctions.set(key, fn);
		}
	}

	// Helper methods to add objects during tests
	addCoin(params: {
		objectId: string;
		coinType: string;
		balance: bigint;
		owner: SuiClientTypes.ObjectOwner;
		version?: string;
		digest?: string;
	}): void {
		const coin = createMockCoin(params);
		this.#objects.set(coin.id, coin);
	}

	addNFT(params: {
		objectId: string;
		nftType: string;
		owner: SuiClientTypes.ObjectOwner;
		version?: string;
		digest?: string;
	}): void {
		const nft = createMockNFT(params);
		this.#objects.set(nft.id, nft);
	}

	addObject(params: {
		objectId: string;
		objectType: string;
		owner: SuiClientTypes.ObjectOwner;
		version?: string;
		digest?: string;
		content?: Uint8Array;
	}): void {
		const obj = createMockObject(params);
		this.#objects.set(obj.id, obj);
	}

	addMoveFunction(params: {
		packageId: string;
		moduleName: string;
		name: string;
		visibility: SuiClientTypes.Visibility;
		isEntry: boolean;
		typeParameters?: SuiClientTypes.TypeParameter[];
		parameters: SuiClientTypes.OpenSignature[];
		returns?: SuiClientTypes.OpenSignature[];
	}): void {
		const fn = createMockMoveFunction(params);
		const normalizedPackageId = normalizeSuiAddress(fn.packageId);
		const key = `${normalizedPackageId}::${fn.moduleName}::${fn.name}`;
		this.#moveFunctions.set(key, fn);
	}

	setNextDryRunResult(result: SuiClientTypes.DryRunTransactionResponse): void {
		this.#nextDryRunResult = result;
	}

	setGasPrice(price: string): void {
		this.#gasPrice = price;
	}

	// Helper function to check if an object is owned by the given address
	#isOwnedByAddress(obj: SuiClientTypes.ObjectResponse, address: string): boolean {
		switch (obj.owner.$kind) {
			case 'AddressOwner':
				return obj.owner.AddressOwner === address;
			case 'ObjectOwner':
				return obj.owner.ObjectOwner === address;
			case 'ConsensusAddressOwner':
				return obj.owner.ConsensusAddressOwner.owner === address;
			case 'Shared':
			case 'Immutable':
			case 'Unknown':
			default:
				return false;
		}
	}

	async getObjects(
		options: SuiClientTypes.GetObjectsOptions,
	): Promise<SuiClientTypes.GetObjectsResponse> {
		const objects = options.objectIds.map((id): SuiClientTypes.ObjectResponse | Error => {
			const normalizedId = normalizeSuiAddress(id);
			const obj = this.#objects.get(normalizedId);

			if (!obj) {
				return new Error(`Object not found: ${id}`);
			}

			return obj;
		});

		return { objects };
	}

	async getCoins(
		options: SuiClientTypes.GetCoinsOptions,
	): Promise<SuiClientTypes.GetCoinsResponse> {
		const coinObjects = Array.from(this.#objects.values()).filter((obj) => {
			const parsedType = parseStructTag(obj.type);
			const parsedCoinType = parseStructTag('0x2::coin::Coin');

			const isCoin =
				parsedType.address === parsedCoinType.address &&
				parsedType.module === parsedCoinType.module &&
				parsedType.name === parsedCoinType.name;

			if (!isCoin) return false;

			// Filter by owner using helper function
			const isOwnedByAddress = this.#isOwnedByAddress(obj, options.address);
			if (!isOwnedByAddress) return false;

			// Filter by coin type
			const coinType = obj.type.match(/0x2::coin::Coin<(.+)>/)?.[1];
			return coinType === options.coinType;
		});

		const objects: SuiClientTypes.CoinResponse[] = await Promise.all(
			coinObjects.map(async (obj) => {
				// Parse balance from BCS content
				let balance = '0';
				try {
					const content = await obj.content;
					const parsedCoin = CoinStruct.parse(content);
					balance = parsedCoin.balance.value.toString();
				} catch {
					// Fallback to 0 if parsing fails
				}

				return {
					...obj,
					balance,
				};
			}),
		);

		return {
			objects,
			hasNextPage: false,
			cursor: null,
		};
	}

	async getOwnedObjects(
		options: SuiClientTypes.GetOwnedObjectsOptions,
	): Promise<SuiClientTypes.GetOwnedObjectsResponse> {
		const ownedObjects = Array.from(this.#objects.values()).filter((obj) => {
			return this.#isOwnedByAddress(obj, options.address);
		});

		return {
			objects: ownedObjects,
			hasNextPage: false,
			cursor: null,
		};
	}

	async getBalance(
		options: SuiClientTypes.GetBalanceOptions,
	): Promise<SuiClientTypes.GetBalanceResponse> {
		const coins = await this.getCoins({
			address: options.address,
			coinType: options.coinType,
		});

		const totalBalance = coins.objects.reduce((sum: bigint, coin: SuiClientTypes.CoinResponse) => {
			return sum + BigInt(coin.balance);
		}, 0n);

		return {
			balance: {
				coinType: options.coinType,
				balance: totalBalance.toString(),
			},
		};
	}

	async getAllBalances(
		options: SuiClientTypes.GetAllBalancesOptions,
	): Promise<SuiClientTypes.GetAllBalancesResponse> {
		const parsedCoinType = parseStructTag('0x2::coin::Coin');
		const allObjects = Array.from(this.#objects.values()).filter((obj) => {
			const parsedType = parseStructTag(obj.type);

			const isCoin =
				parsedType.address === parsedCoinType.address &&
				parsedType.module === parsedCoinType.module &&
				parsedType.name === parsedCoinType.name;
			const isOwnedByAddress = this.#isOwnedByAddress(obj, options.address);
			return isCoin && isOwnedByAddress;
		});

		const balancesByType = new Map<string, bigint>();

		for (const obj of allObjects) {
			const coinType = obj.type.match(/0x2::coin::Coin<(.+)>/)?.[1];
			if (!coinType) continue;

			try {
				const content = await obj.content;
				const parsedCoin = CoinStruct.parse(content);
				const balance = BigInt(parsedCoin.balance.value);
				const current = balancesByType.get(coinType) || 0n;
				balancesByType.set(coinType, current + balance);
			} catch {
				// Skip if parsing fails
			}
		}

		const balances: SuiClientTypes.CoinBalance[] = Array.from(balancesByType.entries()).map(
			([coinType, totalBalance]) => ({
				coinType,
				balance: totalBalance.toString(),
			}),
		);

		return {
			balances,
			hasNextPage: false,
			cursor: null,
		};
	}

	async getTransaction(
		_options: SuiClientTypes.GetTransactionOptions,
	): Promise<SuiClientTypes.GetTransactionResponse> {
		throw new Error('getTransaction not implemented in MockSuiClient');
	}

	async executeTransaction(
		_options: SuiClientTypes.ExecuteTransactionOptions,
	): Promise<SuiClientTypes.ExecuteTransactionResponse> {
		throw new Error('executeTransaction not implemented in MockSuiClient');
	}

	async defaultNameServiceName(
		_options: SuiClientTypes.DefaultNameServiceNameOptions,
	): Promise<SuiClientTypes.DefaultNameServiceNameResponse> {
		throw new Error('defaultNameServiceName not implemented in MockSuiClient');
	}

	async dryRunTransaction(
		_options: SuiClientTypes.DryRunTransactionOptions,
	): Promise<SuiClientTypes.DryRunTransactionResponse> {
		if (this.#nextDryRunResult) {
			const result = this.#nextDryRunResult;
			this.#nextDryRunResult = null;
			return result;
		}

		// Default dry run response - minimal valid structure
		return {
			transaction: {
				digest: 'mockTransactionDigest',
				signatures: [],
				epoch: '1',
				effects: {
					bcs: new Uint8Array(),
					digest: 'mockEffectsDigest',
					version: 1,
					transactionDigest: 'mockTransactionDigest',
					status: { success: true, error: null },
					gasUsed: {
						computationCost: '100000',
						storageCost: '100000',
						storageRebate: '0',
						nonRefundableStorageFee: '0',
					},
					gasObject: {
						id: normalizeSuiAddress('0xa5c01'),
						inputState: 'Exists',
						inputVersion: '100',
						inputDigest: '11111111111111111111111111111111',
						inputOwner: {
							$kind: 'AddressOwner',
							AddressOwner: '0x0000000000000000000000000000000000000000000000000000000000000123',
						},
						outputState: 'ObjectWrite',
						outputVersion: '101',
						outputDigest: '11111111111111111111111111111112',
						outputOwner: {
							$kind: 'AddressOwner',
							AddressOwner: '0x0000000000000000000000000000000000000000000000000000000000000123',
						},
						idOperation: 'None',
					},
					eventsDigest: null,
					dependencies: [],
					lamportVersion: '1',
					changedObjects: [],
					unchangedConsensusObjects: [],
					auxiliaryDataDigest: null,
				},
				objectTypes: Promise.resolve({}),
				transaction: {
					bcs: new Uint8Array(),
				} as SuiClientTypes.TransactionData,
				balanceChanges: [],
			},
		};
	}

	async getReferenceGasPrice(
		_options?: SuiClientTypes.GetReferenceGasPriceOptions,
	): Promise<SuiClientTypes.GetReferenceGasPriceResponse> {
		return { referenceGasPrice: this.#gasPrice };
	}

	async getDynamicFields(
		_options: SuiClientTypes.GetDynamicFieldsOptions,
	): Promise<SuiClientTypes.GetDynamicFieldsResponse> {
		return {
			dynamicFields: [],
			hasNextPage: false,
			cursor: null,
		};
	}

	resolveTransactionPlugin(): TransactionPlugin {
		// For mock purposes, return a plugin that automatically sets up gas configuration and resolves objects
		return async (transactionData, _options, next) => {
			// Resolve UnresolvedObject inputs
			await this.#resolveObjectReferences(transactionData);

			// Set up gas configuration if not already set
			if (!transactionData.gasData.budget) {
				transactionData.gasData.budget = '10000000';
			}
			if (!transactionData.gasData.price) {
				transactionData.gasData.price = this.#gasPrice;
			}
			if (!transactionData.gasData.payment || transactionData.gasData.payment.length === 0) {
				// Use the first SUI coin from default objects
				const suiCoinType = normalizeStructTag('0x2::coin::Coin<0x2::sui::SUI>');
				const firstSuiCoin = Array.from(this.#objects.values()).find(
					(obj) =>
						obj.type === suiCoinType &&
						obj.owner.$kind === 'AddressOwner' &&
						obj.owner.AddressOwner === transactionData.sender,
				);

				if (firstSuiCoin) {
					transactionData.gasData.payment = [
						{
							objectId: firstSuiCoin.id,
							version: firstSuiCoin.version,
							digest: firstSuiCoin.digest,
						},
					];
					transactionData.gasData.owner = transactionData.sender;
				}
			}

			// Proceed to the next plugin
			await next();
		};
	}

	async #resolveObjectReferences(transactionData: {
		inputs: Array<{
			UnresolvedObject?: {
				objectId: string;
				version?: string | number | null;
				initialSharedVersion?: string | number | null;
				mutable?: boolean | null;
			};
			[key: string]: unknown;
		}>;
	}) {
		// Find all UnresolvedObject inputs that need resolution
		const objectsToResolve = transactionData.inputs.filter((input) => {
			return (
				input.UnresolvedObject &&
				!(input.UnresolvedObject.version || input.UnresolvedObject?.initialSharedVersion)
			);
		});

		if (objectsToResolve.length === 0) {
			return;
		}

		// Get unique object IDs
		const dedupedIds = [
			...new Set(
				objectsToResolve.map((input) => normalizeSuiAddress(input.UnresolvedObject!.objectId)),
			),
		] as string[];

		// Fetch objects using our multiGetObjects
		const resolved = await this.getObjects({ objectIds: dedupedIds });

		const objectsById = new Map(dedupedIds.map((id, index) => [id, resolved.objects[index]]));

		// Update each UnresolvedObject input
		for (const [index, input] of transactionData.inputs.entries()) {
			if (!input.UnresolvedObject) {
				continue;
			}

			const id = normalizeSuiAddress(input.UnresolvedObject.objectId);
			const resolvedObject = objectsById.get(id);

			if (!resolvedObject || resolvedObject instanceof Error) {
				throw new Error(`Failed to resolve object: ${id}`);
			}

			// Determine the type of reference based on owner
			if (resolvedObject.owner.$kind === 'Shared') {
				transactionData.inputs[index] = Inputs.SharedObjectRef({
					objectId: id,
					initialSharedVersion: resolvedObject.owner.Shared.initialSharedVersion,
					mutable: input.UnresolvedObject.mutable ?? true,
				});
			} else {
				// For owned objects, use ObjectRef
				transactionData.inputs[index] = Inputs.ObjectRef({
					objectId: id,
					digest: resolvedObject.digest,
					version: resolvedObject.version,
				});
			}
		}
	}

	async verifyZkLoginSignature(
		_options: SuiClientTypes.VerifyZkLoginSignatureOptions,
	): Promise<SuiClientTypes.ZkLoginVerifyResponse> {
		throw new Error('verifyZkLoginSignature not implemented in MockSuiClient');
	}

	async getMoveFunction(
		options: SuiClientTypes.GetMoveFunctionOptions,
	): Promise<SuiClientTypes.GetMoveFunctionResponse> {
		const normalizedPackageId = normalizeSuiAddress(options.packageId);
		const key = `${normalizedPackageId}::${options.moduleName}::${options.name}`;
		const fn = this.#moveFunctions.get(key);

		if (!fn) {
			throw new Error(`Move function not found: ${key}`);
		}

		return { function: fn };
	}
}
