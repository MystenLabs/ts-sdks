// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { CoreClient } from '../client/core.js';
import type { SuiClientTypes } from '../client/types.js';
import { SUI_TYPE_ARG } from '../utils/constants.js';
import type { GraphQLQueryOptions, SuiGraphQLClient } from './client.js';
import type {
	Object_Owner_FieldsFragment,
	Transaction_FieldsFragment,
} from './generated/queries.js';

type GraphQLExecutionError = NonNullable<
	NonNullable<Transaction_FieldsFragment['effects']>['executionError']
>;
import {
	DefaultSuinsNameDocument,
	ExecuteTransactionDocument,
	ExecutionStatus,
	GetAllBalancesDocument,
	GetBalanceDocument,
	GetChainIdentifierDocument,
	GetCoinMetadataDocument,
	GetCoinsDocument,
	GetCurrentSystemStateDocument,
	GetDynamicFieldsDocument,
	GetMoveFunctionDocument,
	GetOwnedObjectsDocument,
	GetReferenceGasPriceDocument,
	GetTransactionBlockDocument,
	MultiGetObjectsDocument,
	ResolveTransactionDocument,
	SimulateTransactionDocument,
	VerifyZkLoginSignatureDocument,
	ZkLoginIntentScope,
} from './generated/queries.js';
import { ObjectError, SimulationError } from '../client/errors.js';
import { chunk, fromBase64, toBase64 } from '@mysten/utils';
import { normalizeStructTag, normalizeSuiAddress } from '../utils/sui-types.js';
import { deriveDynamicFieldID } from '../utils/dynamic-fields.js';
import { formatMoveAbortMessage, parseTransactionEffectsBcs } from '../client/utils.js';
import type { OpenMoveTypeSignatureBody, OpenMoveTypeSignature } from './types.js';
import {
	transactionDataToGrpcTransaction,
	transactionToGrpcJson,
	grpcTransactionToTransactionData,
} from '../client/transaction-resolver.js';
import { BalanceChange as BalanceChangeType } from '../grpc/proto/sui/rpc/v2/balance_change.js';
import { TransactionEffects as TransactionEffectsType } from '../grpc/proto/sui/rpc/v2/effects.js';
import { Transaction as GrpcTransactionType } from '../grpc/proto/sui/rpc/v2/transaction.js';
import { TransactionDataBuilder } from '../transactions/TransactionData.js';
import type { BuildTransactionOptions } from '../transactions/index.js';

export class GraphQLCoreClient extends CoreClient {
	#graphqlClient: SuiGraphQLClient;

	constructor({
		graphqlClient,
		mvr,
	}: {
		graphqlClient: SuiGraphQLClient;
		mvr?: SuiClientTypes.MvrOptions;
	}) {
		super({ network: graphqlClient.network, base: graphqlClient, mvr });
		this.#graphqlClient = graphqlClient;
	}

	async #graphqlQuery<
		Result = Record<string, unknown>,
		Variables = Record<string, unknown>,
		Data = Result,
	>(
		options: GraphQLQueryOptions<Result, Variables>,
		getData?: (result: Result) => Data,
	): Promise<NonNullable<Data>> {
		const { data, errors } = await this.#graphqlClient.query(options);

		handleGraphQLErrors(errors);

		const extractedData = data && (getData ? getData(data) : data);

		if (extractedData == null) {
			throw new Error('Missing response data');
		}

		return extractedData as NonNullable<Data>;
	}

	async getObjects<Include extends SuiClientTypes.ObjectInclude = object>(
		options: SuiClientTypes.GetObjectsOptions<Include>,
	): Promise<SuiClientTypes.GetObjectsResponse<Include>> {
		const batches = chunk(options.objectIds, 50);
		const results: SuiClientTypes.GetObjectsResponse<Include>['objects'] = [];

		for (const batch of batches) {
			const page = await this.#graphqlQuery(
				{
					query: MultiGetObjectsDocument,
					variables: {
						objectKeys: batch.map((address) => ({ address })),
						includeContent: options.include?.content ?? false,
						includePreviousTransaction: options.include?.previousTransaction ?? false,
						includeObjectBcs: options.include?.objectBcs ?? false,
						includeJson: options.include?.json ?? false,
					},
				},
				(result) => result.multiGetObjects,
			);
			results.push(
				...batch
					.map((id) => normalizeSuiAddress(id))
					.map(
						(id) =>
							page.find((obj) => obj?.address === id) ??
							new ObjectError('notFound', `Object ${id} not found`),
					)
					.map((obj) => {
						if (obj instanceof ObjectError) {
							return obj;
						}
						const bcsContent = obj.asMoveObject?.contents?.bcs
							? fromBase64(obj.asMoveObject.contents.bcs)
							: undefined;

						const objectBcs = obj.objectBcs ? fromBase64(obj.objectBcs) : undefined;

						// Determine object type: package or Move object
						// GraphQL already returns normalized struct tags
						let type: string;
						if (obj.asMovePackage) {
							type = 'package';
						} else if (obj.asMoveObject?.contents?.type?.repr) {
							type = obj.asMoveObject.contents.type.repr;
						} else {
							type = '';
						}

						const jsonContent = options.include?.json
							? obj.asMoveObject?.contents?.json
								? (obj.asMoveObject.contents.json as Record<string, unknown>)
								: null
							: undefined;

						return {
							objectId: obj.address,
							version: obj.version?.toString()!,
							digest: obj.digest!,
							owner: mapOwner(obj.owner!),
							type,
							content: bcsContent as SuiClientTypes.Object<Include>['content'],
							previousTransaction: (obj.previousTransaction?.digest ??
								undefined) as SuiClientTypes.Object<Include>['previousTransaction'],
							objectBcs: objectBcs as SuiClientTypes.Object<Include>['objectBcs'],
							json: jsonContent as SuiClientTypes.Object<Include>['json'],
						};
					}),
			);
		}

		return {
			objects: results,
		};
	}
	async listOwnedObjects<Include extends SuiClientTypes.ObjectInclude = object>(
		options: SuiClientTypes.ListOwnedObjectsOptions<Include>,
	): Promise<SuiClientTypes.ListOwnedObjectsResponse<Include>> {
		const objects = await this.#graphqlQuery(
			{
				query: GetOwnedObjectsDocument,
				variables: {
					owner: options.owner,
					limit: options.limit,
					cursor: options.cursor,
					filter: options.type
						? { type: (await this.mvr.resolveType({ type: options.type })).type }
						: undefined,
					includeContent: options.include?.content ?? false,
					includePreviousTransaction: options.include?.previousTransaction ?? false,
					includeObjectBcs: options.include?.objectBcs ?? false,
					includeJson: options.include?.json ?? false,
				},
			},
			(result) => result.address?.objects,
		);

		return {
			objects: objects.nodes.map(
				(obj): SuiClientTypes.Object<Include> => ({
					objectId: obj.address,
					version: obj.version?.toString()!,
					digest: obj.digest!,
					owner: mapOwner(obj.owner!),
					type: obj.contents?.type?.repr!,
					content: (obj.contents?.bcs
						? fromBase64(obj.contents.bcs)
						: undefined) as SuiClientTypes.Object<Include>['content'],
					previousTransaction: (obj.previousTransaction?.digest ??
						undefined) as SuiClientTypes.Object<Include>['previousTransaction'],
					objectBcs: (obj.objectBcs
						? fromBase64(obj.objectBcs)
						: undefined) as SuiClientTypes.Object<Include>['objectBcs'],
					json: (options.include?.json
						? obj.contents?.json
							? (obj.contents.json as Record<string, unknown>)
							: null
						: undefined) as SuiClientTypes.Object<Include>['json'],
				}),
			),
			hasNextPage: objects.pageInfo.hasNextPage,
			cursor: objects.pageInfo.endCursor ?? null,
		};
	}
	async listCoins(
		options: SuiClientTypes.ListCoinsOptions,
	): Promise<SuiClientTypes.ListCoinsResponse> {
		const coinType = options.coinType ?? SUI_TYPE_ARG;
		const coins = await this.#graphqlQuery(
			{
				query: GetCoinsDocument,
				variables: {
					owner: options.owner,
					cursor: options.cursor,
					first: options.limit,
					type: `0x2::coin::Coin<${(await this.mvr.resolveType({ type: coinType })).type}>`,
				},
			},
			(result) => result.address?.objects,
		);

		return {
			cursor: coins.pageInfo.endCursor ?? null,
			hasNextPage: coins.pageInfo.hasNextPage,
			objects: coins.nodes.map(
				(coin): SuiClientTypes.Coin => ({
					objectId: coin.address,
					version: coin.version?.toString()!,
					digest: coin.digest!,
					owner: mapOwner(coin.owner!),
					type: coin.contents?.type?.repr!,
					balance: (coin.contents?.json as { balance: string })?.balance,
				}),
			),
		};
	}

	async getBalance(
		options: SuiClientTypes.GetBalanceOptions,
	): Promise<SuiClientTypes.GetBalanceResponse> {
		const coinType = options.coinType ?? SUI_TYPE_ARG;
		const result = await this.#graphqlQuery(
			{
				query: GetBalanceDocument,
				variables: {
					owner: options.owner,
					coinType: (await this.mvr.resolveType({ type: coinType })).type,
				},
			},
			(result) => result.address?.balance,
		);

		const addressBalance = BigInt(result.addressBalance ?? '0');
		const coinBalance = BigInt(result.totalBalance ?? '0') - addressBalance;

		return {
			balance: {
				coinType: result.coinType?.repr ?? coinType,
				balance: result.totalBalance ?? '0',
				coinBalance: coinBalance.toString(),
				addressBalance: addressBalance.toString(),
			},
		};
	}
	async getCoinMetadata(
		options: SuiClientTypes.GetCoinMetadataOptions,
	): Promise<SuiClientTypes.GetCoinMetadataResponse> {
		const coinType = (await this.mvr.resolveType({ type: options.coinType })).type;

		const { data, errors } = await this.#graphqlClient.query({
			query: GetCoinMetadataDocument,
			variables: {
				coinType,
			},
		});

		handleGraphQLErrors(errors);

		if (!data?.coinMetadata) {
			return { coinMetadata: null };
		}

		return {
			coinMetadata: {
				id: data.coinMetadata.address!,
				decimals: data.coinMetadata.decimals!,
				name: data.coinMetadata.name!,
				symbol: data.coinMetadata.symbol!,
				description: data.coinMetadata.description!,
				iconUrl: data.coinMetadata.iconUrl ?? null,
			},
		};
	}

	async listBalances(
		options: SuiClientTypes.ListBalancesOptions,
	): Promise<SuiClientTypes.ListBalancesResponse> {
		const balances = await this.#graphqlQuery(
			{
				query: GetAllBalancesDocument,
				variables: { owner: options.owner },
			},
			(result) => result.address?.balances,
		);

		return {
			cursor: balances.pageInfo.endCursor ?? null,
			hasNextPage: balances.pageInfo.hasNextPage,
			balances: balances.nodes.map((balance) => {
				const addressBalance = BigInt(balance.addressBalance ?? '0');
				const coinBalance = BigInt(balance.totalBalance ?? '0') - addressBalance;
				return {
					coinType: balance.coinType?.repr!,
					balance: balance.totalBalance!,
					coinBalance: coinBalance.toString(),
					addressBalance: addressBalance.toString(),
				};
			}),
		};
	}
	async getTransaction<Include extends SuiClientTypes.TransactionInclude = object>(
		options: SuiClientTypes.GetTransactionOptions<Include>,
	): Promise<SuiClientTypes.TransactionResult<Include>> {
		const result = await this.#graphqlQuery(
			{
				query: GetTransactionBlockDocument,
				variables: {
					digest: options.digest,
					includeTransaction: options.include?.transaction ?? false,
					includeEffects: options.include?.effects ?? false,
					includeEvents: options.include?.events ?? false,
					includeBalanceChanges: options.include?.balanceChanges ?? false,
					includeObjectTypes: options.include?.objectTypes ?? false,
					includeBcs: options.include?.bcs ?? false,
				},
			},
			(result) => result.transaction,
		);

		return parseTransaction(result, options.include);
	}
	async executeTransaction<Include extends SuiClientTypes.TransactionInclude = object>(
		options: SuiClientTypes.ExecuteTransactionOptions<Include>,
	): Promise<SuiClientTypes.TransactionResult<Include>> {
		const result = await this.#graphqlQuery(
			{
				query: ExecuteTransactionDocument,
				variables: {
					transactionDataBcs: toBase64(options.transaction),
					signatures: options.signatures,
					includeTransaction: options.include?.transaction ?? false,
					includeEffects: options.include?.effects ?? false,
					includeEvents: options.include?.events ?? false,
					includeBalanceChanges: options.include?.balanceChanges ?? false,
					includeObjectTypes: options.include?.objectTypes ?? false,
					includeBcs: options.include?.bcs ?? false,
				},
			},
			(result) => result.executeTransaction,
		);

		if (result.errors) {
			if (result.errors.length === 1) {
				throw new Error(result.errors[0]);
			}
			throw new AggregateError(result.errors.map((error) => new Error(error)));
		}

		return parseTransaction(result.effects?.transaction!, options.include);
	}
	async simulateTransaction<Include extends SuiClientTypes.SimulateTransactionInclude = object>(
		options: SuiClientTypes.SimulateTransactionOptions<Include>,
	): Promise<SuiClientTypes.SimulateTransactionResult<Include>> {
		if (!(options.transaction instanceof Uint8Array)) {
			await options.transaction.prepareForSerialization({ client: this });
		}

		const result = await this.#graphqlQuery(
			{
				query: SimulateTransactionDocument,
				variables: {
					transaction:
						options.transaction instanceof Uint8Array
							? {
									bcs: {
										value: toBase64(options.transaction),
									},
								}
							: transactionToGrpcJson(options.transaction),
					includeTransaction: options.include?.transaction ?? false,
					includeEffects: options.include?.effects ?? false,
					includeEvents: options.include?.events ?? false,
					includeBalanceChanges: options.include?.balanceChanges ?? false,
					includeObjectTypes: options.include?.objectTypes ?? false,
					includeCommandResults: options.include?.commandResults ?? false,
					includeBcs: options.include?.bcs ?? false,
				},
			},
			(result) => result.simulateTransaction,
		);

		if (result.error && !result.effects?.transaction) {
			throw new SimulationError(result.error);
		}

		const transactionResult = parseTransaction(result.effects?.transaction!, options.include);

		const commandResults =
			options.include?.commandResults && result.outputs
				? result.outputs.map((output) => ({
						returnValues: (output.returnValues ?? []).map((rv) => ({
							bcs: rv.value?.bcs ? fromBase64(rv.value.bcs) : null,
						})),
						mutatedReferences: (output.mutatedReferences ?? []).map((mr) => ({
							bcs: mr.value?.bcs ? fromBase64(mr.value.bcs) : null,
						})),
					}))
				: undefined;

		if (transactionResult.$kind === 'Transaction') {
			return {
				$kind: 'Transaction',
				Transaction: transactionResult.Transaction,
				commandResults:
					commandResults as SuiClientTypes.SimulateTransactionResult<Include>['commandResults'],
			};
		} else {
			return {
				$kind: 'FailedTransaction',
				FailedTransaction: transactionResult.FailedTransaction,
				commandResults:
					commandResults as SuiClientTypes.SimulateTransactionResult<Include>['commandResults'],
			};
		}
	}
	async getReferenceGasPrice(): Promise<SuiClientTypes.GetReferenceGasPriceResponse> {
		const result = await this.#graphqlQuery(
			{
				query: GetReferenceGasPriceDocument,
			},
			(result) => result.epoch?.referenceGasPrice,
		);

		return {
			referenceGasPrice: result ?? '',
		};
	}

	async getCurrentSystemState(): Promise<SuiClientTypes.GetCurrentSystemStateResponse> {
		const result = await this.#graphqlQuery(
			{
				query: GetCurrentSystemStateDocument,
			},
			(result) => result.epoch,
		);

		if (!result) {
			throw new Error('Epoch data not found in response');
		}

		const startMs = result.startTimestamp
			? new Date(result.startTimestamp).getTime().toString()
			: (null as never);

		// Parse the system state JSON from the MoveValue
		const systemStateJson = result.systemState?.json as
			| {
					system_state_version?: string | number;
					safe_mode?: boolean;
					safe_mode_storage_rewards?: string;
					safe_mode_computation_rewards?: string;
					safe_mode_storage_rebates?: string | number;
					safe_mode_non_refundable_storage_fee?: string | number;
					parameters?: {
						epoch_duration_ms?: string | number;
						stake_subsidy_start_epoch?: string | number;
						max_validator_count?: string | number;
						min_validator_joining_stake?: string | number;
						validator_low_stake_threshold?: string | number;
						validator_low_stake_grace_period?: string | number;
					};
					storage_fund?: {
						total_object_storage_rebates?: string;
						non_refundable_balance?: string;
					};
					stake_subsidy?: {
						balance?: string;
						distribution_counter?: string | number;
						current_distribution_amount?: string | number;
						stake_subsidy_period_length?: string | number;
						stake_subsidy_decrease_rate?: number;
					};
			  }
			| undefined;

		return {
			systemState: {
				systemStateVersion: systemStateJson?.system_state_version?.toString() ?? (null as never),
				epoch: result.epochId?.toString() ?? (null as never),
				protocolVersion: result.protocolConfigs?.protocolVersion?.toString() ?? (null as never),
				referenceGasPrice: result.referenceGasPrice ?? (null as never),
				epochStartTimestampMs: startMs,
				safeMode: systemStateJson?.safe_mode ?? false,
				safeModeStorageRewards: systemStateJson?.safe_mode_storage_rewards ?? (null as never),
				safeModeComputationRewards:
					systemStateJson?.safe_mode_computation_rewards ?? (null as never),
				safeModeStorageRebates:
					systemStateJson?.safe_mode_storage_rebates?.toString() ?? (null as never),
				safeModeNonRefundableStorageFee:
					systemStateJson?.safe_mode_non_refundable_storage_fee?.toString() ?? (null as never),
				parameters: {
					epochDurationMs:
						systemStateJson?.parameters?.epoch_duration_ms?.toString() ?? (null as never),
					stakeSubsidyStartEpoch:
						systemStateJson?.parameters?.stake_subsidy_start_epoch?.toString() ?? (null as never),
					maxValidatorCount:
						systemStateJson?.parameters?.max_validator_count?.toString() ?? (null as never),
					minValidatorJoiningStake:
						systemStateJson?.parameters?.min_validator_joining_stake?.toString() ?? (null as never),
					validatorLowStakeThreshold:
						systemStateJson?.parameters?.validator_low_stake_threshold?.toString() ??
						(null as never),
					validatorLowStakeGracePeriod:
						systemStateJson?.parameters?.validator_low_stake_grace_period?.toString() ??
						(null as never),
				},
				storageFund: {
					totalObjectStorageRebates:
						systemStateJson?.storage_fund?.total_object_storage_rebates ?? (null as never),
					nonRefundableBalance:
						systemStateJson?.storage_fund?.non_refundable_balance ?? (null as never),
				},
				stakeSubsidy: {
					balance: systemStateJson?.stake_subsidy?.balance ?? (null as never),
					distributionCounter:
						systemStateJson?.stake_subsidy?.distribution_counter?.toString() ?? (null as never),
					currentDistributionAmount:
						systemStateJson?.stake_subsidy?.current_distribution_amount?.toString() ??
						(null as never),
					stakeSubsidyPeriodLength:
						systemStateJson?.stake_subsidy?.stake_subsidy_period_length?.toString() ??
						(null as never),
					stakeSubsidyDecreaseRate:
						systemStateJson?.stake_subsidy?.stake_subsidy_decrease_rate ?? (null as never),
				},
			},
		};
	}

	async listDynamicFields(
		options: SuiClientTypes.ListDynamicFieldsOptions,
	): Promise<SuiClientTypes.ListDynamicFieldsResponse> {
		const result = await this.#graphqlQuery(
			{
				query: GetDynamicFieldsDocument,
				variables: {
					parentId: options.parentId,
					first: options.limit,
					cursor: options.cursor,
				},
			},
			(result) => result.address?.dynamicFields,
		);

		return {
			dynamicFields: result.nodes.map((dynamicField) => {
				const valueType =
					dynamicField.value?.__typename === 'MoveObject'
						? dynamicField.value.contents?.type?.repr!
						: dynamicField.value?.type?.repr!;
				return {
					fieldId: deriveDynamicFieldID(
						options.parentId,
						dynamicField.name?.type?.repr!,
						fromBase64(dynamicField.name?.bcs!),
					),
					type: normalizeStructTag(
						dynamicField.value?.__typename === 'MoveObject'
							? `0x2::dynamic_field::Field<0x2::dynamic_object_field::Wrapper<${dynamicField.name?.type?.repr}>,0x2::object::ID>`
							: `0x2::dynamic_field::Field<${dynamicField.name?.type?.repr},${valueType}>`,
					),
					name: {
						type: dynamicField.name?.type?.repr!,
						bcs: fromBase64(dynamicField.name?.bcs!),
					},
					valueType,
				};
			}),
			cursor: result.pageInfo.endCursor ?? null,
			hasNextPage: result.pageInfo.hasNextPage,
		};
	}

	async verifyZkLoginSignature(
		options: SuiClientTypes.VerifyZkLoginSignatureOptions,
	): Promise<SuiClientTypes.ZkLoginVerifyResponse> {
		const intentScope =
			options.intentScope === 'TransactionData'
				? ZkLoginIntentScope.TransactionData
				: ZkLoginIntentScope.PersonalMessage;

		const result = await this.#graphqlQuery(
			{
				query: VerifyZkLoginSignatureDocument,
				variables: {
					bytes: options.bytes,
					signature: options.signature,
					intentScope,
					author: options.address,
				},
			},
			(result) => result.verifyZkLoginSignature,
		);

		return {
			success: result.success ?? false,
			errors: result.error ? [result.error] : [],
		};
	}

	async defaultNameServiceName(
		options: SuiClientTypes.DefaultNameServiceNameOptions,
	): Promise<SuiClientTypes.DefaultNameServiceNameResponse> {
		const name = await this.#graphqlQuery(
			{
				query: DefaultSuinsNameDocument,
				signal: options.signal,
				variables: {
					address: options.address,
				},
			},
			(result) => result.address?.defaultNameRecord?.domain ?? null,
		);

		return {
			data: { name: name },
		};
	}

	async getMoveFunction(
		options: SuiClientTypes.GetMoveFunctionOptions,
	): Promise<SuiClientTypes.GetMoveFunctionResponse> {
		const moveFunction = await this.#graphqlQuery(
			{
				query: GetMoveFunctionDocument,
				variables: {
					package: (await this.mvr.resolvePackage({ package: options.packageId })).package,
					module: options.moduleName,
					function: options.name,
				},
			},
			(result) => result.package?.module?.function,
		);

		let visibility: 'public' | 'private' | 'friend' | 'unknown' = 'unknown';

		switch (moveFunction.visibility) {
			case 'PUBLIC':
				visibility = 'public';
				break;
			case 'PRIVATE':
				visibility = 'private';
				break;
			case 'FRIEND':
				visibility = 'friend';
				break;
		}

		return {
			function: {
				packageId: normalizeSuiAddress(options.packageId),
				moduleName: options.moduleName,
				name: moveFunction.name,
				visibility,
				isEntry: moveFunction.isEntry ?? false,
				typeParameters:
					moveFunction.typeParameters?.map(({ constraints }) => ({
						isPhantom: false,
						constraints:
							constraints.map((constraint) => {
								switch (constraint) {
									case 'COPY':
										return 'copy';
									case 'DROP':
										return 'drop';
									case 'STORE':
										return 'store';
									case 'KEY':
										return 'key';
									default:
										return 'unknown';
								}
							}) ?? [],
					})) ?? [],
				parameters:
					moveFunction.parameters?.map((param) => parseNormalizedSuiMoveType(param.signature)) ??
					[],
				returns:
					moveFunction.return?.map(({ signature }) => parseNormalizedSuiMoveType(signature)) ?? [],
			},
		};
	}

	async getChainIdentifier(
		_options?: SuiClientTypes.GetChainIdentifierOptions,
	): Promise<SuiClientTypes.GetChainIdentifierResponse> {
		return this.cache.read(['chainIdentifier'], async () => {
			const checkpoint = await this.#graphqlQuery(
				{
					query: GetChainIdentifierDocument,
				},
				(result) => result.checkpoint,
			);
			if (!checkpoint?.digest) {
				throw new Error('Genesis checkpoint digest not found');
			}
			return {
				chainIdentifier: checkpoint.digest,
			};
		});
	}

	resolveTransactionPlugin() {
		const graphqlClient = this.#graphqlClient;
		return async function resolveTransactionData(
			transactionData: TransactionDataBuilder,
			options: BuildTransactionOptions,
			next: () => Promise<void>,
		) {
			const snapshot = transactionData.snapshot();
			// If sender is not set, use a dummy address for resolution purposes
			if (!snapshot.sender) {
				snapshot.sender = '0x0000000000000000000000000000000000000000000000000000000000000000';
			}
			const grpcTransaction = transactionDataToGrpcTransaction(snapshot);
			const transactionJson = GrpcTransactionType.toJson(grpcTransaction);

			const { data, errors } = await graphqlClient.query({
				query: ResolveTransactionDocument,
				variables: {
					transaction: transactionJson,
					doGasSelection:
						!options.onlyTransactionKind &&
						(snapshot.gasData.budget == null || snapshot.gasData.payment == null),
				},
			});

			handleGraphQLErrors(errors);

			if (data?.simulateTransaction?.error) {
				throw new SimulationError(
					`Transaction resolution failed: ${data.simulateTransaction.error}`,
				);
			}

			const transactionEffects = data?.simulateTransaction?.effects?.transaction?.effects;
			if (!options.onlyTransactionKind && transactionEffects?.status === ExecutionStatus.Failure) {
				const executionError = parseGraphQLExecutionError(transactionEffects.executionError);
				const errorMessage = executionError?.message ?? 'Transaction failed';
				throw new SimulationError(`Transaction resolution failed: ${errorMessage}`, {
					executionError,
				});
			}

			const resolvedTransactionBcs =
				data?.simulateTransaction?.effects?.transaction?.transactionBcs;

			if (!resolvedTransactionBcs) {
				throw new Error('simulateTransaction did not return resolved transaction data');
			}

			const resolvedBuilder = TransactionDataBuilder.fromBytes(fromBase64(resolvedTransactionBcs));
			const resolved = resolvedBuilder.snapshot();

			if (options.onlyTransactionKind) {
				transactionData.applyResolvedData({
					...resolved,
					gasData: {
						budget: null,
						owner: null,
						payment: null,
						price: null,
					},
					expiration: null,
				});
			} else {
				transactionData.applyResolvedData(resolved);
			}

			return await next();
		};
	}
}
export type GraphQLResponseErrors = Array<{
	message: string;
	locations?: { line: number; column: number }[];
	path?: (string | number)[];
}>;

function handleGraphQLErrors(errors: GraphQLResponseErrors | undefined): void {
	if (!errors || errors.length === 0) return;

	const errorInstances = errors.map((error) => new GraphQLResponseError(error));

	if (errorInstances.length === 1) {
		throw errorInstances[0];
	}

	throw new AggregateError(errorInstances);
}

class GraphQLResponseError extends Error {
	locations?: Array<{ line: number; column: number }>;

	constructor(error: GraphQLResponseErrors[0]) {
		super(error.message);
		this.locations = error.locations;
	}
}

function mapOwner(owner: Object_Owner_FieldsFragment): SuiClientTypes.ObjectOwner {
	switch (owner.__typename) {
		case 'AddressOwner':
			return { $kind: 'AddressOwner', AddressOwner: owner.address?.address! };
		case 'ConsensusAddressOwner':
			return {
				$kind: 'ConsensusAddressOwner',
				ConsensusAddressOwner: {
					owner: owner?.address?.address!,
					startVersion: String(owner.startVersion),
				},
			};
		case 'ObjectOwner':
			return { $kind: 'ObjectOwner', ObjectOwner: owner.address?.address! };
		case 'Immutable':
			return { $kind: 'Immutable', Immutable: true };
		case 'Shared':
			return {
				$kind: 'Shared',
				Shared: { initialSharedVersion: String(owner.initialSharedVersion) },
			};
	}
}

function parseTransaction<Include extends SuiClientTypes.TransactionInclude = object>(
	transaction: Transaction_FieldsFragment,
	include?: Include,
): SuiClientTypes.TransactionResult<Include> {
	const objectTypes: Record<string, string> = {};

	if (include?.objectTypes) {
		const effectsJson = transaction.effects?.effectsJson;
		if (effectsJson) {
			const effects = TransactionEffectsType.fromJson(
				effectsJson as Parameters<typeof TransactionEffectsType.fromJson>[0],
			);
			effects.changedObjects?.forEach((change) => {
				if (change.objectId && change.objectType) {
					objectTypes[change.objectId] = change.objectType;
				}
			});
		}

		const objectChanges = transaction.effects?.objectChanges?.nodes;
		if (objectChanges) {
			for (const change of objectChanges) {
				const type = change.outputState?.asMoveObject?.contents?.type?.repr;
				if (change.address && type) {
					objectTypes[change.address] = type;
				}
			}
		}
	}

	let balanceChanges: SuiClientTypes.BalanceChange[] | undefined;
	if (include?.balanceChanges) {
		const balanceChangesJson = transaction.effects?.balanceChangesJson;
		if (Array.isArray(balanceChangesJson)) {
			balanceChanges = balanceChangesJson.map((json) => {
				const change = BalanceChangeType.fromJson(
					json as Parameters<typeof BalanceChangeType.fromJson>[0],
				);
				return {
					coinType: change.coinType!,
					address: change.address!,
					amount: change.amount!,
				};
			});
		} else {
			balanceChanges = [];
		}
	}

	// Get status from GraphQL response
	const status: SuiClientTypes.ExecutionStatus =
		transaction.effects?.status === ExecutionStatus.Success
			? { success: true, error: null }
			: {
					success: false,
					error: parseGraphQLExecutionError(transaction.effects?.executionError),
				};

	let transactionData: SuiClientTypes.TransactionData | undefined;
	if (include?.transaction && transaction.transactionJson) {
		const grpcTx = GrpcTransactionType.fromJson(
			transaction.transactionJson as Parameters<typeof GrpcTransactionType.fromJson>[0],
		);
		const resolved = grpcTransactionToTransactionData(grpcTx);
		transactionData = {
			gasData: resolved.gasData,
			sender: resolved.sender,
			expiration: resolved.expiration,
			commands: resolved.commands,
			inputs: resolved.inputs,
			version: resolved.version,
		};
	}

	const bcsBytes =
		include?.bcs && transaction.transactionBcs ? fromBase64(transaction.transactionBcs) : undefined;

	const result: SuiClientTypes.Transaction<Include> = {
		digest: transaction.digest!,
		status,
		effects: (include?.effects
			? parseTransactionEffectsBcs(fromBase64(transaction.effects?.effectsBcs!))
			: undefined) as SuiClientTypes.Transaction<Include>['effects'],
		epoch: transaction.effects?.epoch?.epochId?.toString() ?? null,
		objectTypes: (include?.objectTypes
			? objectTypes
			: undefined) as SuiClientTypes.Transaction<Include>['objectTypes'],
		transaction: transactionData as SuiClientTypes.Transaction<Include>['transaction'],
		bcs: bcsBytes as SuiClientTypes.Transaction<Include>['bcs'],
		signatures: transaction.signatures.map((sig) => sig.signatureBytes!),
		balanceChanges: balanceChanges as SuiClientTypes.Transaction<Include>['balanceChanges'],
		events: (include?.events
			? (transaction.effects?.events?.nodes.map((event) => {
					const eventType = event.contents?.type?.repr!;
					const [packageId, module] = eventType.split('::');
					return {
						packageId,
						module,
						sender: event.sender?.address!,
						eventType,
						bcs: event.contents?.bcs ? fromBase64(event.contents.bcs) : new Uint8Array(),
					};
				}) ?? [])
			: undefined) as SuiClientTypes.Transaction<Include>['events'],
	};

	return status.success
		? { $kind: 'Transaction', Transaction: result, FailedTransaction: undefined as never }
		: { $kind: 'FailedTransaction', Transaction: undefined as never, FailedTransaction: result };
}

function parseNormalizedSuiMoveType(type: OpenMoveTypeSignature): SuiClientTypes.OpenSignature {
	let reference: 'mutable' | 'immutable' | null = null;

	if (type.ref === '&') {
		reference = 'immutable';
	} else if (type.ref === '&mut') {
		reference = 'mutable';
	}

	return {
		reference,
		body: parseNormalizedSuiMoveTypeBody(type.body),
	};
}

function parseGraphQLExecutionError(
	executionError: GraphQLExecutionError | null | undefined,
): SuiClientTypes.ExecutionError {
	const name = mapGraphQLExecutionErrorKind(executionError);

	if (name === 'MoveAbort' && executionError?.abortCode != null) {
		const location = parseGraphQLMoveLocation(executionError);
		const cleverError = parseGraphQLCleverError(executionError);
		const commandMatch = executionError.message?.match(/in (\d+)\w* command/);
		const command = commandMatch ? parseInt(commandMatch[1], 10) - 1 : undefined;

		return {
			$kind: 'MoveAbort',
			message: formatMoveAbortMessage({
				command,
				location: location
					? {
							package: location.package,
							module: location.module,
							functionName: location.functionName,
							instruction: location.instruction,
						}
					: undefined,
				abortCode: executionError.abortCode!,
				cleverError: cleverError
					? {
							lineNumber: cleverError.lineNumber,
							constantName: cleverError.constantName,
							value: cleverError.value,
						}
					: undefined,
			}),
			command,
			MoveAbort: {
				abortCode: executionError.abortCode!,
				location,
				cleverError,
			},
		};
	}

	return {
		$kind: 'Unknown',
		message: executionError?.message ?? 'Transaction failed',
		Unknown: null,
	};
}

function mapGraphQLExecutionErrorKind(
	executionError: GraphQLExecutionError | null | undefined,
): string {
	if (executionError?.abortCode != null) {
		return 'MoveAbort';
	}

	const match = executionError?.message?.match(/^(\w+)/);
	return match?.[1] ?? 'Unknown';
}

function parseGraphQLMoveLocation(
	executionError: GraphQLExecutionError,
): SuiClientTypes.MoveLocation | undefined {
	const hasLocation = executionError.module?.package?.address && executionError.module?.name;
	if (!hasLocation) {
		return undefined;
	}

	return {
		package: executionError.module?.package?.address,
		module: executionError.module?.name,
		functionName: executionError.function?.name,
		instruction: executionError.instructionOffset ?? undefined,
	};
}

function parseGraphQLCleverError(
	executionError: GraphQLExecutionError,
): SuiClientTypes.CleverError | undefined {
	const hasCleverError = executionError.identifier || executionError.constant;
	if (!hasCleverError) {
		return undefined;
	}

	return {
		constantName: executionError.identifier ?? undefined,
		value: executionError.constant ?? undefined,
		lineNumber: executionError.sourceLineNumber ?? undefined,
	};
}

function parseNormalizedSuiMoveTypeBody(
	type: OpenMoveTypeSignatureBody,
): SuiClientTypes.OpenSignatureBody {
	switch (type) {
		case 'address':
			return { $kind: 'address' };
		case 'bool':
			return { $kind: 'bool' };
		case 'u8':
			return { $kind: 'u8' };
		case 'u16':
			return { $kind: 'u16' };
		case 'u32':
			return { $kind: 'u32' };
		case 'u64':
			return { $kind: 'u64' };
		case 'u128':
			return { $kind: 'u128' };
		case 'u256':
			return { $kind: 'u256' };
	}

	if (typeof type === 'string') {
		throw new Error(`Unknown type: ${type}`);
	}

	if ('vector' in type) {
		return {
			$kind: 'vector',
			vector: parseNormalizedSuiMoveTypeBody(type.vector),
		};
	}

	if ('datatype' in type) {
		return {
			$kind: 'datatype',
			datatype: {
				typeName: `${normalizeSuiAddress(type.datatype.package)}::${type.datatype.module}::${type.datatype.type}`,
				typeParameters: type.datatype.typeParameters.map((t) => parseNormalizedSuiMoveTypeBody(t)),
			},
		};
	}

	if ('typeParameter' in type) {
		return {
			$kind: 'typeParameter',
			index: type.typeParameter,
		};
	}

	throw new Error(`Unknown type: ${JSON.stringify(type)}`);
}
