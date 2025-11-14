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
	#objects = new Map<string, SuiClientTypes.ObjectResponse<{ content: true }>>();
	#moveFunctions = new Map<string, SuiClientTypes.FunctionResponse>();
	#gasPrice = DEFAULT_GAS_PRICE;
	#nextDryRunResult: SuiClientTypes.SimulateTransactionResponse<any> | null = null;

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
			this.#objects.set(obj.objectId, obj);
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
		this.#objects.set(coin.objectId, coin);
	}

	addNFT(params: {
		objectId: string;
		nftType: string;
		owner: SuiClientTypes.ObjectOwner;
		version?: string;
		digest?: string;
	}): void {
		const nft = createMockNFT(params);
		this.#objects.set(nft.objectId, nft);
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
		this.#objects.set(obj.objectId, obj);
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

	setNextDryRunResult(result: SuiClientTypes.SimulateTransactionResponse<any>): void {
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

	async listObjects<Include extends SuiClientTypes.ObjectInclude = object>(
		options: SuiClientTypes.ListObjectsOptions<Include>,
	): Promise<SuiClientTypes.ListObjectsResponse<Include>> {
		const objects = options.objectIds.map((id): SuiClientTypes.ObjectResponse<Include> | Error => {
			const normalizedId = normalizeSuiAddress(id);
			const obj = this.#objects.get(normalizedId);

			if (!obj) {
				return new Error(`Object not found: ${id}`);
			}

			return obj as SuiClientTypes.ObjectResponse<Include>;
		});

		return { objects };
	}

	async listCoins<Include extends SuiClientTypes.ObjectInclude = object>(
		options: SuiClientTypes.ListCoinsOptions<Include>,
	): Promise<SuiClientTypes.ListCoinsResponse<Include>> {
		const coinObjects = Array.from(this.#objects.values()).filter((obj) => {
			const parsedType = parseStructTag(obj.type);
			const parsedCoinType = parseStructTag('0x2::coin::Coin');

			const isCoin =
				parsedType.address === parsedCoinType.address &&
				parsedType.module === parsedCoinType.module &&
				parsedType.name === parsedCoinType.name;

			if (!isCoin) return false;

			// Filter by owner using helper function
			const isOwnedByAddress = this.#isOwnedByAddress(obj, options.owner);
			if (!isOwnedByAddress) return false;

			// Filter by coin type
			const coinType = obj.type.match(/0x2::coin::Coin<(.+)>/)?.[1];
			return coinType === options.coinType;
		});

		const objects: SuiClientTypes.CoinResponse<Include>[] = coinObjects.map((obj) => {
			// Parse balance from BCS content
			let balance = '0';
			try {
				const parsedCoin = CoinStruct.parse(obj.content);
				balance = parsedCoin.balance.value.toString();
			} catch {
				// Fallback to 0 if parsing fails
			}

			return {
				...(obj as any),
				balance,
			};
		});

		return {
			objects,
			hasNextPage: false,
			cursor: null,
		};
	}

	async listOwnedObjects<Include extends SuiClientTypes.ObjectInclude = object>(
		options: SuiClientTypes.ListOwnedObjectsOptions<Include>,
	): Promise<SuiClientTypes.ListOwnedObjectsResponse<Include>> {
		const ownedObjects = Array.from(this.#objects.values()).filter((obj) => {
			return this.#isOwnedByAddress(obj, options.owner);
		});

		return {
			objects: ownedObjects as SuiClientTypes.ObjectResponse<Include>[],
			hasNextPage: false,
			cursor: null,
		};
	}

	async getBalance(
		options: SuiClientTypes.GetBalanceOptions,
	): Promise<SuiClientTypes.GetBalanceResponse> {
		const coins = await this.listCoins({
			owner: options.owner,
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

	async listBalances(
		options: SuiClientTypes.ListBalancesOptions,
	): Promise<SuiClientTypes.ListBalancesResponse> {
		const parsedCoinType = parseStructTag('0x2::coin::Coin');
		const allObjects = Array.from(this.#objects.values()).filter((obj) => {
			const parsedType = parseStructTag(obj.type);

			const isCoin =
				parsedType.address === parsedCoinType.address &&
				parsedType.module === parsedCoinType.module &&
				parsedType.name === parsedCoinType.name;
			const isOwnedByAddress = this.#isOwnedByAddress(obj, options.owner);
			return isCoin && isOwnedByAddress;
		});

		const balancesByType = new Map<string, bigint>();

		for (const obj of allObjects) {
			const coinType = obj.type.match(/0x2::coin::Coin<(.+)>/)?.[1];
			if (!coinType) continue;

			try {
				const parsedCoin = CoinStruct.parse(obj.content);
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

	async getTransaction<Include extends SuiClientTypes.TransactionInclude = object>(
		_options: SuiClientTypes.GetTransactionOptions<Include>,
	): Promise<SuiClientTypes.GetTransactionResponse<Include>> {
		throw new Error('getTransaction not implemented in MockSuiClient');
	}

	async executeTransaction<Include extends SuiClientTypes.TransactionInclude = object>(
		_options: SuiClientTypes.ExecuteTransactionOptions<Include>,
	): Promise<SuiClientTypes.ExecuteTransactionResponse<Include>> {
		throw new Error('executeTransaction not implemented in MockSuiClient');
	}

	async defaultNameServiceName(
		_options: SuiClientTypes.DefaultNameServiceNameOptions,
	): Promise<SuiClientTypes.DefaultNameServiceNameResponse> {
		throw new Error('defaultNameServiceName not implemented in MockSuiClient');
	}

	async simulateTransaction<Include extends SuiClientTypes.TransactionInclude = object>(
		_options: SuiClientTypes.SimulateTransactionOptions<Include>,
	): Promise<SuiClientTypes.SimulateTransactionResponse<Include>> {
		if (this.#nextDryRunResult) {
			const result = this.#nextDryRunResult;
			this.#nextDryRunResult = null;
			return result as SuiClientTypes.SimulateTransactionResponse<Include>;
		}

		// Default dry run response - minimal valid structure
		return {
			transaction: {
				digest: 'mockTransactionDigest',
				signatures: [],
				epoch: '1',
				effects: {
					bcs: new Uint8Array(),
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
						objectId: normalizeSuiAddress('0xa5c01'),
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
				objectTypes: undefined,
				transaction: undefined,
				balanceChanges: undefined,
				events: undefined,
			},
		} as any;
	}

	async getReferenceGasPrice(
		_options?: SuiClientTypes.GetReferenceGasPriceOptions,
	): Promise<SuiClientTypes.GetReferenceGasPriceResponse> {
		return { referenceGasPrice: this.#gasPrice };
	}

	async listDynamicFields(
		_options: SuiClientTypes.ListDynamicFieldsOptions,
	): Promise<SuiClientTypes.ListDynamicFieldsResponse> {
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
							objectId: firstSuiCoin.objectId,
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
		const resolved = await this.listObjects({ objectIds: dedupedIds });

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
