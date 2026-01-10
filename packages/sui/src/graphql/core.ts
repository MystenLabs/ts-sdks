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
	GetCoinsDocument,
	GetCurrentSystemStateDocument,
	GetDynamicFieldsDocument,
	GetMoveFunctionDocument,
	GetOwnedObjectsDocument,
	GetReferenceGasPriceDocument,
	GetTransactionBlockDocument,
	MultiGetObjectsDocument,
	SimulateTransactionDocument,
	VerifyZkLoginSignatureDocument,
	ZkLoginIntentScope,
} from './generated/queries.js';
import { ObjectError } from '../client/errors.js';
import { chunk, fromBase64, toBase64 } from '@mysten/utils';
import { normalizeStructTag, normalizeSuiAddress } from '../utils/sui-types.js';
import { deriveDynamicFieldID } from '../utils/dynamic-fields.js';
import { parseTransactionBcs, parseTransactionEffectsBcs } from '../client/utils.js';
import type { OpenMoveTypeSignatureBody, OpenMoveTypeSignature } from './types.js';
import { transactionToGrpcJson } from '../client/transaction-resolver.js';
import { coreClientResolveTransactionPlugin } from '../client/core-resolver.js';

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
					type: (await this.mvr.resolveType({ type: coinType })).type,
				},
			},
			(result) => result.address?.balance,
		);

		return {
			balance: {
				coinType: result.coinType?.repr ?? coinType,
				balance: result.totalBalance ?? '0',
				// TODO: support address balances
				coinBalance: result.totalBalance ?? '0',
				addressBalance: '0',
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
			balances: balances.nodes.map((balance) => ({
				coinType: balance.coinType?.repr!,
				balance: balance.totalBalance!,
				// TODO: support address balances
				coinBalance: balance.totalBalance!,
				addressBalance: '0',
			})),
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
				},
			},
			(result) => result.simulateTransaction,
		);

		if (result.error) {
			throw new Error(result.error);
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

		return {
			systemState: {
				systemStateVersion: result.systemStateVersion?.toString() ?? (null as never),
				epoch: result.epochId?.toString() ?? (null as never),
				protocolVersion: result.protocolConfigs?.protocolVersion?.toString() ?? (null as never),
				referenceGasPrice: result.referenceGasPrice ?? (null as never),
				epochStartTimestampMs: startMs,
				safeMode: result.safeMode?.enabled ?? false,
				safeModeStorageRewards:
					result.safeMode?.gasSummary?.storageCost?.toString() ?? (null as never),
				safeModeComputationRewards:
					result.safeMode?.gasSummary?.computationCost?.toString() ?? (null as never),
				safeModeStorageRebates:
					result.safeMode?.gasSummary?.storageRebate?.toString() ?? (null as never),
				safeModeNonRefundableStorageFee:
					result.safeMode?.gasSummary?.nonRefundableStorageFee?.toString() ?? (null as never),
				parameters: {
					epochDurationMs: result.systemParameters?.durationMs?.toString() ?? (null as never),
					stakeSubsidyStartEpoch:
						result.systemParameters?.stakeSubsidyStartEpoch?.toString() ?? (null as never),
					maxValidatorCount:
						result.systemParameters?.maxValidatorCount?.toString() ?? (null as never),
					minValidatorJoiningStake:
						result.systemParameters?.minValidatorJoiningStake?.toString() ?? (null as never),
					validatorLowStakeThreshold:
						result.systemParameters?.validatorLowStakeThreshold?.toString() ?? (null as never),
					validatorLowStakeGracePeriod:
						result.systemParameters?.validatorLowStakeGracePeriod?.toString() ?? (null as never),
				},
				storageFund: {
					totalObjectStorageRebates:
						result.storageFund?.totalObjectStorageRebates?.toString() ?? (null as never),
					nonRefundableBalance:
						result.storageFund?.nonRefundableBalance?.toString() ?? (null as never),
				},
				stakeSubsidy: {
					balance: result.systemStakeSubsidy?.balance?.toString() ?? (null as never),
					distributionCounter:
						result.systemStakeSubsidy?.distributionCounter?.toString() ?? (null as never),
					currentDistributionAmount:
						result.systemStakeSubsidy?.currentDistributionAmount?.toString() ?? (null as never),
					stakeSubsidyPeriodLength:
						result.systemStakeSubsidy?.periodLength?.toString() ?? (null as never),
					stakeSubsidyDecreaseRate: result.systemStakeSubsidy?.decreaseRate ?? (null as never),
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
			(result) => result.address?.defaultSuinsName ?? null,
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
		return coreClientResolveTransactionPlugin;
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
		transaction.effects?.unchangedConsensusObjects?.nodes.forEach((node) => {
			if (node.__typename === 'ConsensusObjectRead') {
				const type = node.object?.asMoveObject?.contents?.type?.repr;
				const address = node.object?.asMoveObject?.address;

				if (type && address) {
					objectTypes[address] = type;
				}
			}
		});

		transaction.effects?.objectChanges?.nodes.forEach((node) => {
			const address = node.address;
			const type =
				node.inputState?.asMoveObject?.contents?.type?.repr ??
				node.outputState?.asMoveObject?.contents?.type?.repr;

			if (address && type) {
				objectTypes[address] = type;
			}
		});
	}

	if (transaction.effects?.balanceChanges?.pageInfo.hasNextPage) {
		throw new Error('Pagination for balance changes is not supported');
	}

	// Get status from GraphQL response
	const status: SuiClientTypes.ExecutionStatus =
		transaction.effects?.status === ExecutionStatus.Success
			? { success: true, error: null }
			: {
					success: false,
					error: parseGraphQLExecutionError(transaction.effects?.executionError),
				};

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
		transaction: (include?.transaction
			? parseTransactionBcs(fromBase64(transaction.transactionBcs!))
			: undefined) as SuiClientTypes.Transaction<Include>['transaction'],
		signatures: transaction.signatures.map((sig) => sig.signatureBytes!),
		balanceChanges: (include?.balanceChanges
			? (transaction.effects?.balanceChanges?.nodes.map((change) => ({
					coinType: change?.coinType?.repr!,
					address: change.owner?.address!,
					amount: change.amount!,
				})) ?? [])
			: undefined) as SuiClientTypes.Transaction<Include>['balanceChanges'],
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
	const message = executionError?.message ?? 'Transaction failed';
	const name = mapGraphQLExecutionErrorKind(executionError);

	if (name === 'MoveAbort' && executionError?.abortCode != null) {
		return {
			$kind: 'MoveAbort',
			message,
			MoveAbort: {
				abortCode: executionError.abortCode!,
				location: parseGraphQLMoveLocation(executionError),
				cleverError: parseGraphQLCleverError(executionError),
			},
		};
	}

	return {
		$kind: 'Unknown',
		message,
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
