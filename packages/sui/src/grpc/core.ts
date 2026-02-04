// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { CoreClientOptions, SuiClientTypes } from '../client/index.js';
import { CoreClient, formatMoveAbortMessage, SimulationError } from '../client/index.js';
import type { SuiGrpcClient } from './client.js';
import type { Owner } from './proto/sui/rpc/v2/owner.js';
import { Owner_OwnerKind } from './proto/sui/rpc/v2/owner.js';
import { DynamicField_DynamicFieldKind } from './proto/sui/rpc/v2/state_service.js';
import { chunk, fromBase64, toBase64 } from '@mysten/utils';
import type { ExecutedTransaction } from './proto/sui/rpc/v2/executed_transaction.js';
import type { TransactionEffects } from './proto/sui/rpc/v2/effects.js';
import {
	UnchangedConsensusObject_UnchangedConsensusObjectKind,
	ChangedObject_IdOperation,
	ChangedObject_InputObjectState,
	ChangedObject_OutputObjectState,
} from './proto/sui/rpc/v2/effects.js';
import type {
	ExecutionError as GrpcExecutionError,
	MoveAbort as GrpcMoveAbort,
} from './proto/sui/rpc/v2/execution_status.js';
import {
	ExecutionError_ExecutionErrorKind,
	CommandArgumentError_CommandArgumentErrorKind,
	TypeArgumentError_TypeArgumentErrorKind,
	PackageUpgradeError_PackageUpgradeErrorKind,
} from './proto/sui/rpc/v2/execution_status.js';
import type { BuildTransactionOptions } from '../transactions/index.js';
import { TransactionDataBuilder } from '../transactions/index.js';
import { bcs } from '../bcs/index.js';
import { normalizeStructTag, normalizeSuiAddress } from '../utils/sui-types.js';
import { SUI_TYPE_ARG } from '../utils/constants.js';
import type { OpenSignature, OpenSignatureBody } from './proto/sui/rpc/v2/move_package.js';
import {
	Ability,
	FunctionDescriptor_Visibility,
	OpenSignature_Reference,
	OpenSignatureBody_Type,
} from './proto/sui/rpc/v2/move_package.js';
import {
	applyGrpcResolvedTransaction,
	transactionDataToGrpcTransaction,
	transactionToGrpcTransaction,
	grpcTransactionToTransactionData,
} from '../client/transaction-resolver.js';
import { Value } from './proto/google/protobuf/struct.js';

export interface GrpcCoreClientOptions extends CoreClientOptions {
	client: SuiGrpcClient;
}
export class GrpcCoreClient extends CoreClient {
	#client: SuiGrpcClient;
	constructor({ client, ...options }: GrpcCoreClientOptions) {
		super(options);
		this.#client = client;
	}

	async getObjects<Include extends SuiClientTypes.ObjectInclude = object>(
		options: SuiClientTypes.GetObjectsOptions<Include>,
	): Promise<SuiClientTypes.GetObjectsResponse<Include>> {
		const batches = chunk(options.objectIds, 50);
		const results: SuiClientTypes.GetObjectsResponse<Include>['objects'] = [];

		const paths = ['owner', 'object_type', 'digest', 'version', 'object_id'];
		if (options.include?.content) {
			paths.push('contents');
		}
		if (options.include?.previousTransaction) {
			paths.push('previous_transaction');
		}
		if (options.include?.objectBcs) {
			paths.push('bcs');
		}
		if (options.include?.json) {
			paths.push('json');
		}

		for (const batch of batches) {
			const response = await this.#client.ledgerService.batchGetObjects({
				requests: batch.map((id) => ({ objectId: id })),
				readMask: {
					paths,
				},
			});

			results.push(
				...response.response.objects.map((object): SuiClientTypes.Object<Include> | Error => {
					if (object.result.oneofKind === 'error') {
						// TODO: improve error handling
						return new Error(object.result.error.message);
					}

					if (object.result.oneofKind !== 'object') {
						return new Error('Unexpected result type');
					}

					const bcsContent = object.result.object.contents?.value ?? undefined;
					const objectBcs = object.result.object.bcs?.value ?? undefined;

					// Package objects have type "package" which is not a struct tag, so don't normalize it
					const objectType = object.result.object.objectType;
					const type =
						objectType && objectType.includes('::')
							? normalizeStructTag(objectType)
							: (objectType ?? '');

					const jsonContent = options.include?.json
						? object.result.object.json
							? (Value.toJson(object.result.object.json) as Record<string, unknown>)
							: null
						: undefined;

					return {
						objectId: object.result.object.objectId!,
						version: object.result.object.version?.toString()!,
						digest: object.result.object.digest!,
						content: bcsContent as SuiClientTypes.Object<Include>['content'],
						owner: mapOwner(object.result.object.owner)!,
						type,
						previousTransaction: (object.result.object.previousTransaction ??
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
		const paths = ['owner', 'object_type', 'digest', 'version', 'object_id'];
		if (options.include?.content) {
			paths.push('contents');
		}
		if (options.include?.previousTransaction) {
			paths.push('previous_transaction');
		}
		if (options.include?.objectBcs) {
			paths.push('bcs');
		}
		if (options.include?.json) {
			paths.push('json');
		}

		const response = await this.#client.stateService.listOwnedObjects({
			owner: options.owner,
			objectType: options.type
				? (await this.mvr.resolveType({ type: options.type })).type
				: undefined,
			pageToken: options.cursor ? fromBase64(options.cursor) : undefined,
			pageSize: options.limit,
			readMask: {
				paths,
			},
		});

		const objects = response.response.objects.map(
			(object): SuiClientTypes.Object<Include> => ({
				objectId: object.objectId!,
				version: object.version?.toString()!,
				digest: object.digest!,
				content: object.contents?.value as SuiClientTypes.Object<Include>['content'],
				owner: mapOwner(object.owner)!,
				type: object.objectType!,
				previousTransaction: (object.previousTransaction ??
					undefined) as SuiClientTypes.Object<Include>['previousTransaction'],
				objectBcs: object.bcs?.value as SuiClientTypes.Object<Include>['objectBcs'],
				json: (options.include?.json
					? object.json
						? (Value.toJson(object.json) as Record<string, unknown>)
						: null
					: undefined) as SuiClientTypes.Object<Include>['json'],
			}),
		);

		return {
			objects,
			cursor: response.response.nextPageToken ? toBase64(response.response.nextPageToken) : null,
			hasNextPage: response.response.nextPageToken !== undefined,
		};
	}
	async listCoins(
		options: SuiClientTypes.ListCoinsOptions,
	): Promise<SuiClientTypes.ListCoinsResponse> {
		const paths = ['owner', 'object_type', 'digest', 'version', 'object_id', 'balance'];
		const coinType = options.coinType ?? SUI_TYPE_ARG;

		const response = await this.#client.stateService.listOwnedObjects({
			owner: options.owner,
			objectType: `0x2::coin::Coin<${(await this.mvr.resolveType({ type: coinType })).type}>`,
			pageToken: options.cursor ? fromBase64(options.cursor) : undefined,
			readMask: {
				paths,
			},
		});

		return {
			objects: response.response.objects.map(
				(object): SuiClientTypes.Coin => ({
					objectId: object.objectId!,
					version: object.version?.toString()!,
					digest: object.digest!,
					owner: mapOwner(object.owner)!,
					type: object.objectType!,
					balance: object.balance?.toString()!,
				}),
			),
			cursor: response.response.nextPageToken ? toBase64(response.response.nextPageToken) : null,
			hasNextPage: response.response.nextPageToken !== undefined,
		};
	}

	async getBalance(
		options: SuiClientTypes.GetBalanceOptions,
	): Promise<SuiClientTypes.GetBalanceResponse> {
		const coinType = options.coinType ?? SUI_TYPE_ARG;
		const result = await this.#client.stateService.getBalance({
			owner: options.owner,
			coinType: (await this.mvr.resolveType({ type: coinType })).type,
		});

		return {
			balance: {
				balance: result.response.balance?.balance?.toString() ?? '0',
				coinType: result.response.balance?.coinType ?? coinType,
				coinBalance: result.response.balance?.coinBalance?.toString() ?? '0',
				addressBalance: result.response.balance?.addressBalance?.toString() ?? '0',
			},
		};
	}

	async getCoinMetadata(
		options: SuiClientTypes.GetCoinMetadataOptions,
	): Promise<SuiClientTypes.GetCoinMetadataResponse> {
		const coinType = (await this.mvr.resolveType({ type: options.coinType })).type;

		let response;
		try {
			({ response } = await this.#client.stateService.getCoinInfo({
				coinType,
			}));
		} catch {
			return { coinMetadata: null };
		}

		if (!response.metadata) {
			return { coinMetadata: null };
		}

		return {
			coinMetadata: {
				id: response.metadata.id ?? null,
				decimals: response.metadata.decimals ?? 0,
				name: response.metadata.name ?? '',
				symbol: response.metadata.symbol ?? '',
				description: response.metadata.description ?? '',
				iconUrl: response.metadata.iconUrl ?? null,
			},
		};
	}

	async listBalances(
		options: SuiClientTypes.ListBalancesOptions,
	): Promise<SuiClientTypes.ListBalancesResponse> {
		const result = await this.#client.stateService.listBalances({
			owner: options.owner,
			pageToken: options.cursor ? fromBase64(options.cursor) : undefined,
			pageSize: options.limit,
		});

		return {
			hasNextPage: !!result.response.nextPageToken,
			cursor: result.response.nextPageToken ? toBase64(result.response.nextPageToken) : null,
			balances: result.response.balances.map((balance) => ({
				balance: balance.balance?.toString() ?? '0',
				coinType: balance.coinType!,
				coinBalance: balance.coinBalance?.toString() ?? '0',
				addressBalance: balance.addressBalance?.toString() ?? '0',
			})),
		};
	}
	async getTransaction<Include extends SuiClientTypes.TransactionInclude = object>(
		options: SuiClientTypes.GetTransactionOptions<Include>,
	): Promise<SuiClientTypes.TransactionResult<Include>> {
		const paths = ['digest', 'transaction.digest', 'signatures', 'effects.status'];
		if (options.include?.transaction) {
			paths.push(
				'transaction.sender',
				'transaction.gas_payment',
				'transaction.expiration',
				'transaction.kind',
			);
		}
		if (options.include?.bcs) {
			paths.push('transaction.bcs');
		}
		if (options.include?.balanceChanges) {
			paths.push('balance_changes');
		}
		if (options.include?.effects) {
			paths.push('effects');
		}
		if (options.include?.events) {
			paths.push('events');
		}
		if (options.include?.objectTypes) {
			paths.push('effects.changed_objects.object_type');
			paths.push('effects.changed_objects.object_id');
		}

		const { response } = await this.#client.ledgerService.getTransaction({
			digest: options.digest,
			readMask: {
				paths,
			},
		});

		if (!response.transaction) {
			throw new Error(`Transaction ${options.digest} not found`);
		}

		return parseTransaction(response.transaction, options.include);
	}
	async executeTransaction<Include extends SuiClientTypes.TransactionInclude = object>(
		options: SuiClientTypes.ExecuteTransactionOptions<Include>,
	): Promise<SuiClientTypes.TransactionResult<Include>> {
		const paths = ['digest', 'transaction.digest', 'signatures', 'effects.status'];
		if (options.include?.transaction) {
			paths.push(
				'transaction.sender',
				'transaction.gas_payment',
				'transaction.expiration',
				'transaction.kind',
			);
		}
		if (options.include?.bcs) {
			paths.push('transaction.bcs');
		}
		if (options.include?.balanceChanges) {
			paths.push('balance_changes');
		}
		if (options.include?.effects) {
			paths.push('effects');
		}
		if (options.include?.events) {
			paths.push('events');
		}
		if (options.include?.objectTypes) {
			paths.push('effects.changed_objects.object_type');
			paths.push('effects.changed_objects.object_id');
		}

		const { response } = await this.#client.transactionExecutionService.executeTransaction({
			transaction: {
				bcs: {
					value: options.transaction,
				},
			},
			signatures: options.signatures.map((signature) => ({
				bcs: {
					value: fromBase64(signature),
				},
				signature: {
					oneofKind: undefined,
				},
			})),
			readMask: {
				paths,
			},
		});

		return parseTransaction(response.transaction!, options.include);
	}
	async simulateTransaction<Include extends SuiClientTypes.SimulateTransactionInclude = object>(
		options: SuiClientTypes.SimulateTransactionOptions<Include>,
	): Promise<SuiClientTypes.SimulateTransactionResult<Include>> {
		const paths = [
			'transaction.digest',
			'transaction.transaction.digest',
			'transaction.signatures',
			'transaction.effects.status',
		];
		if (options.include?.transaction) {
			paths.push(
				'transaction.transaction.sender',
				'transaction.transaction.gas_payment',
				'transaction.transaction.expiration',
				'transaction.transaction.kind',
			);
		}
		if (options.include?.bcs) {
			paths.push('transaction.transaction.bcs');
		}
		if (options.include?.balanceChanges) {
			paths.push('transaction.balance_changes');
		}
		if (options.include?.effects) {
			paths.push('transaction.effects');
		}
		if (options.include?.events) {
			paths.push('transaction.events');
		}
		if (options.include?.objectTypes) {
			// Use effects.changed_objects to match JSON-RPC behavior (which uses objectChanges)
			paths.push('transaction.effects.changed_objects.object_type');
			paths.push('transaction.effects.changed_objects.object_id');
		}
		if (options.include?.commandResults) {
			paths.push('command_outputs');
		}

		if (!(options.transaction instanceof Uint8Array)) {
			await options.transaction.prepareForSerialization({ client: this });
		}

		const { response } = await this.#client.transactionExecutionService.simulateTransaction({
			transaction:
				options.transaction instanceof Uint8Array
					? {
							bcs: {
								value: options.transaction,
							},
						}
					: transactionToGrpcTransaction(options.transaction),
			readMask: {
				paths,
			},
			doGasSelection: false,
		});

		const transactionResult = parseTransaction(response.transaction!, options.include);

		// Add command results if requested
		const commandResults =
			options.include?.commandResults && response.commandOutputs
				? response.commandOutputs.map((output) => ({
						returnValues: (output.returnValues ?? []).map((rv) => ({
							bcs: rv.value?.value ?? null,
						})),
						mutatedReferences: (output.mutatedByRef ?? []).map((mr) => ({
							bcs: mr.value?.value ?? null,
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
		const response = await this.#client.ledgerService.getEpoch({
			readMask: {
				paths: ['reference_gas_price'],
			},
		});

		return {
			referenceGasPrice: response.response.epoch?.referenceGasPrice?.toString() ?? '',
		};
	}

	async getCurrentSystemState(): Promise<SuiClientTypes.GetCurrentSystemStateResponse> {
		const response = await this.#client.ledgerService.getEpoch({
			readMask: {
				paths: [
					'system_state.version',
					'system_state.epoch',
					'system_state.protocol_version',
					'system_state.reference_gas_price',
					'system_state.epoch_start_timestamp_ms',
					'system_state.safe_mode',
					'system_state.safe_mode_storage_rewards',
					'system_state.safe_mode_computation_rewards',
					'system_state.safe_mode_storage_rebates',
					'system_state.safe_mode_non_refundable_storage_fee',
					'system_state.parameters',
					'system_state.storage_fund',
					'system_state.stake_subsidy',
				],
			},
		});

		const epoch = response.response.epoch;
		const systemState = epoch?.systemState;
		if (!systemState) {
			throw new Error('System state not found in response');
		}

		const startMs = epoch?.start?.seconds
			? Number(epoch.start.seconds) * 1000 + Math.floor((epoch.start.nanos || 0) / 1_000_000)
			: systemState.epochStartTimestampMs
				? Number(systemState.epochStartTimestampMs)
				: (null as never);

		return {
			systemState: {
				systemStateVersion: systemState.version?.toString() ?? (null as never),
				epoch: systemState.epoch?.toString() ?? (null as never),
				protocolVersion: systemState.protocolVersion?.toString() ?? (null as never),
				referenceGasPrice: systemState.referenceGasPrice?.toString() ?? (null as never),
				epochStartTimestampMs: startMs.toString(),
				safeMode: systemState.safeMode ?? false,
				safeModeStorageRewards: systemState.safeModeStorageRewards?.toString() ?? (null as never),
				safeModeComputationRewards:
					systemState.safeModeComputationRewards?.toString() ?? (null as never),
				safeModeStorageRebates: systemState.safeModeStorageRebates?.toString() ?? (null as never),
				safeModeNonRefundableStorageFee:
					systemState.safeModeNonRefundableStorageFee?.toString() ?? (null as never),
				parameters: {
					epochDurationMs: systemState.parameters?.epochDurationMs?.toString() ?? (null as never),
					stakeSubsidyStartEpoch:
						systemState.parameters?.stakeSubsidyStartEpoch?.toString() ?? (null as never),
					maxValidatorCount:
						systemState.parameters?.maxValidatorCount?.toString() ?? (null as never),
					minValidatorJoiningStake:
						systemState.parameters?.minValidatorJoiningStake?.toString() ?? (null as never),
					validatorLowStakeThreshold:
						systemState.parameters?.validatorLowStakeThreshold?.toString() ?? (null as never),
					validatorLowStakeGracePeriod:
						systemState.parameters?.validatorLowStakeGracePeriod?.toString() ?? (null as never),
				},
				storageFund: {
					totalObjectStorageRebates:
						systemState.storageFund?.totalObjectStorageRebates?.toString() ?? (null as never),
					nonRefundableBalance:
						systemState.storageFund?.nonRefundableBalance?.toString() ?? (null as never),
				},
				stakeSubsidy: {
					balance: systemState.stakeSubsidy?.balance?.toString() ?? (null as never),
					distributionCounter:
						systemState.stakeSubsidy?.distributionCounter?.toString() ?? (null as never),
					currentDistributionAmount:
						systemState.stakeSubsidy?.currentDistributionAmount?.toString() ?? (null as never),
					stakeSubsidyPeriodLength:
						systemState.stakeSubsidy?.stakeSubsidyPeriodLength?.toString() ?? (null as never),
					stakeSubsidyDecreaseRate:
						systemState.stakeSubsidy?.stakeSubsidyDecreaseRate ?? (null as never),
				},
			},
		};
	}

	async listDynamicFields(
		options: SuiClientTypes.ListDynamicFieldsOptions,
	): Promise<SuiClientTypes.ListDynamicFieldsResponse> {
		const response = await this.#client.stateService.listDynamicFields({
			parent: options.parentId,
			pageToken: options.cursor ? fromBase64(options.cursor) : undefined,
			pageSize: options.limit,
			readMask: {
				paths: ['field_id', 'name', 'value_type', 'kind'],
			},
		});

		return {
			dynamicFields: response.response.dynamicFields.map((field) => {
				const isDynamicObject = field.kind === DynamicField_DynamicFieldKind.OBJECT;
				const fieldType = isDynamicObject
					? `0x2::dynamic_field::Field<0x2::dynamic_object_field::Wrapper<${field.name?.name!}>,0x2::object::ID>`
					: `0x2::dynamic_field::Field<${field.name?.name!},${field.valueType!}>`;
				return {
					fieldId: field.fieldId!,
					name: {
						type: field.name?.name!,
						bcs: field.name?.value!,
					},
					valueType: field.valueType!,
					type: normalizeStructTag(fieldType),
				};
			}),
			cursor: response.response.nextPageToken ? toBase64(response.response.nextPageToken) : null,
			hasNextPage: response.response.nextPageToken !== undefined,
		};
	}

	async verifyZkLoginSignature(
		options: SuiClientTypes.VerifyZkLoginSignatureOptions,
	): Promise<SuiClientTypes.ZkLoginVerifyResponse> {
		const messageBytes = fromBase64(options.bytes);

		// For PersonalMessage, the server expects BCS-encoded vector<u8>
		// For TransactionData, the server expects the raw BCS-encoded TransactionData as-is
		const messageValue =
			options.intentScope === 'PersonalMessage'
				? bcs.byteVector().serialize(messageBytes).toBytes()
				: messageBytes;

		const { response } = await this.#client.signatureVerificationService.verifySignature({
			message: {
				name: options.intentScope,
				value: messageValue,
			},
			signature: {
				bcs: {
					value: fromBase64(options.signature),
				},
				signature: {
					oneofKind: undefined,
				},
			},
			address: options.address,
			jwks: [],
		});

		return {
			success: response.isValid ?? false,
			errors: response.reason ? [response.reason] : [],
		};
	}

	async defaultNameServiceName(
		options: SuiClientTypes.DefaultNameServiceNameOptions,
	): Promise<SuiClientTypes.DefaultNameServiceNameResponse> {
		const name =
			(
				await this.#client.nameService.reverseLookupName({
					address: options.address,
				})
			).response.record?.name ?? null;
		return {
			data: {
				name,
			},
		};
	}

	async getMoveFunction(
		options: SuiClientTypes.GetMoveFunctionOptions,
	): Promise<SuiClientTypes.GetMoveFunctionResponse> {
		const resolvedPackageId = (await this.mvr.resolvePackage({ package: options.packageId }))
			.package;
		const { response } = await this.#client.movePackageService.getFunction({
			packageId: resolvedPackageId,
			moduleName: options.moduleName,
			name: options.name,
		});

		let visibility: 'public' | 'private' | 'friend' | 'unknown' = 'unknown';

		switch (response.function?.visibility) {
			case FunctionDescriptor_Visibility.PUBLIC:
				visibility = 'public';
				break;
			case FunctionDescriptor_Visibility.PRIVATE:
				visibility = 'private';
				break;
			case FunctionDescriptor_Visibility.FRIEND:
				visibility = 'friend';
				break;
		}

		return {
			function: {
				packageId: normalizeSuiAddress(resolvedPackageId),
				moduleName: options.moduleName,
				name: response.function?.name!,
				visibility,
				isEntry: response.function?.isEntry ?? false,
				typeParameters:
					response.function?.typeParameters?.map(({ constraints }) => ({
						isPhantom: false,
						constraints:
							constraints.map((constraint) => {
								switch (constraint) {
									case Ability.COPY:
										return 'copy';
									case Ability.DROP:
										return 'drop';
									case Ability.STORE:
										return 'store';
									case Ability.KEY:
										return 'key';
									default:
										return 'unknown';
								}
							}) ?? [],
					})) ?? [],
				parameters:
					response.function?.parameters?.map((param) => parseNormalizedSuiMoveType(param)) ?? [],
				returns: response.function?.returns?.map((ret) => parseNormalizedSuiMoveType(ret)) ?? [],
			},
		};
	}

	async getChainIdentifier(
		_options?: SuiClientTypes.GetChainIdentifierOptions,
	): Promise<SuiClientTypes.GetChainIdentifierResponse> {
		return this.cache.read(['chainIdentifier'], async () => {
			const { response } = await this.#client.ledgerService.getServiceInfo({});
			if (!response.chainId) {
				throw new Error('Chain identifier not found in service info');
			}
			return {
				chainIdentifier: response.chainId,
			};
		});
	}

	resolveTransactionPlugin() {
		const client = this.#client;
		return async function resolveTransactionData(
			transactionData: TransactionDataBuilder,
			options: BuildTransactionOptions,
			next: () => Promise<void>,
		) {
			const snapshot = transactionData.snapshot();
			// If sender is not set, use a dummy address for resolution purposes
			// The resolved transaction will not include the sender if it wasn't set originally
			if (!snapshot.sender) {
				snapshot.sender = '0x0000000000000000000000000000000000000000000000000000000000000000';
			}
			const grpcTransaction = transactionDataToGrpcTransaction(snapshot);

			let response;
			try {
				const result = await client.transactionExecutionService.simulateTransaction({
					transaction: grpcTransaction,
					doGasSelection:
						!options.onlyTransactionKind &&
						(snapshot.gasData.budget == null || snapshot.gasData.payment == null),
					readMask: {
						paths: [
							'transaction.transaction.sender',
							'transaction.transaction.gas_payment',
							'transaction.transaction.expiration',
							'transaction.transaction.kind',
							'transaction.effects.status',
						],
					},
				});
				response = result.response;
			} catch (error) {
				// https://github.com/timostamm/protobuf-ts/pull/739
				if (error instanceof Error && error.message) {
					throw new SimulationError(decodeURIComponent(error.message), { cause: error });
				}
				throw error;
			}

			if (
				!options.onlyTransactionKind &&
				response.transaction?.effects?.status &&
				!response.transaction.effects.status.success
			) {
				const executionError = response.transaction.effects.status.error
					? parseGrpcExecutionError(response.transaction.effects.status.error)
					: undefined;
				const errorMessage = executionError?.message ?? 'Transaction failed';
				throw new SimulationError(`Transaction resolution failed: ${errorMessage}`, {
					executionError,
				});
			}

			if (!response.transaction?.transaction) {
				throw new Error('simulateTransaction did not return resolved transaction data');
			}

			applyGrpcResolvedTransaction(transactionData, response.transaction.transaction, options);

			return await next();
		};
	}
}

function mapOwner(owner: Owner | null | undefined): SuiClientTypes.ObjectOwner | null {
	if (!owner) {
		return null;
	}
	if (owner.kind === Owner_OwnerKind.IMMUTABLE) {
		return {
			$kind: 'Immutable',
			Immutable: true,
		};
	}
	if (owner.kind === Owner_OwnerKind.ADDRESS) {
		return {
			AddressOwner: owner.address!,
			$kind: 'AddressOwner',
		};
	}
	if (owner.kind === Owner_OwnerKind.OBJECT) {
		return {
			$kind: 'ObjectOwner',
			ObjectOwner: owner.address!,
		};
	}

	if (owner.kind === Owner_OwnerKind.SHARED) {
		return {
			$kind: 'Shared',
			Shared: {
				initialSharedVersion: owner.version?.toString()!,
			},
		};
	}

	if (owner.kind === Owner_OwnerKind.CONSENSUS_ADDRESS) {
		return {
			$kind: 'ConsensusAddressOwner',
			ConsensusAddressOwner: {
				startVersion: owner.version?.toString()!,
				owner: owner.address!,
			},
		};
	}

	throw new Error(
		`Unknown owner kind ${JSON.stringify(owner, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))}`,
	);
}

function parseGrpcExecutionError(error: GrpcExecutionError): SuiClientTypes.ExecutionError {
	const message = error.description ?? 'Unknown error';
	const command = error.command != null ? Number(error.command) : undefined;
	const details = error.errorDetails;

	switch (details?.oneofKind) {
		case 'abort': {
			const abort = details.abort;
			const cleverError = abort.cleverError;
			return {
				$kind: 'MoveAbort',
				message: formatMoveAbortMessage({
					command,
					location: abort.location,
					abortCode: String(abort.abortCode ?? 0n),
					cleverError: cleverError
						? {
								lineNumber:
									cleverError.lineNumber != null ? Number(cleverError.lineNumber) : undefined,
								constantName: cleverError.constantName,
								value:
									cleverError.value?.oneofKind === 'rendered'
										? cleverError.value.rendered
										: undefined,
							}
						: undefined,
				}),
				command,
				MoveAbort: parseMoveAbort(abort),
			};
		}

		case 'sizeError':
			return {
				$kind: 'SizeError',
				message,
				command,
				SizeError: {
					name: mapErrorName(error.kind),
					size: Number(details.sizeError.size ?? 0n),
					maxSize: Number(details.sizeError.maxSize ?? 0n),
				},
			};

		case 'commandArgumentError':
			return {
				$kind: 'CommandArgumentError',
				message,
				command,
				CommandArgumentError: {
					argument: details.commandArgumentError.argument ?? 0,
					name: mapErrorName(details.commandArgumentError.kind),
				},
			};

		case 'typeArgumentError':
			return {
				$kind: 'TypeArgumentError',
				message,
				command,
				TypeArgumentError: {
					typeArgument: details.typeArgumentError.typeArgument ?? 0,
					name: mapErrorName(details.typeArgumentError.kind),
				},
			};

		case 'packageUpgradeError':
			return {
				$kind: 'PackageUpgradeError',
				message,
				command,
				PackageUpgradeError: {
					name: mapErrorName(details.packageUpgradeError.kind),
					packageId: details.packageUpgradeError.packageId,
					digest: details.packageUpgradeError.digest,
				},
			};

		case 'indexError':
			return {
				$kind: 'IndexError',
				message,
				command,
				IndexError: {
					index: details.indexError.index,
					subresult: details.indexError.subresult,
				},
			};

		case 'coinDenyListError':
			return {
				$kind: 'CoinDenyListError',
				message,
				command,
				CoinDenyListError: {
					name: mapErrorName(error.kind),
					coinType: details.coinDenyListError.coinType!,
					address: details.coinDenyListError.address,
				},
			};

		case 'congestedObjects':
			return {
				$kind: 'CongestedObjects',
				message,
				command,
				CongestedObjects: {
					name: mapErrorName(error.kind),
					objects: details.congestedObjects.objects,
				},
			};

		case 'objectId':
			return {
				$kind: 'ObjectIdError',
				message,
				command,
				ObjectIdError: {
					name: mapErrorName(error.kind),
					objectId: details.objectId,
				},
			};

		default:
			return {
				$kind: 'Unknown',
				message,
				command,
				Unknown: null,
			};
	}
}

function parseMoveAbort(abort: GrpcMoveAbort): SuiClientTypes.MoveAbort {
	return {
		abortCode: String(abort.abortCode ?? 0n),
		location: { ...abort.location },
		cleverError: abort.cleverError
			? {
					errorCode:
						abort.cleverError.errorCode != null ? Number(abort.cleverError.errorCode) : undefined,
					lineNumber:
						abort.cleverError.lineNumber != null ? Number(abort.cleverError.lineNumber) : undefined,
					constantName: abort.cleverError.constantName,
					constantType: abort.cleverError.constantType,
					value:
						abort.cleverError.value?.oneofKind === 'rendered'
							? abort.cleverError.value.rendered
							: abort.cleverError.value?.oneofKind === 'raw'
								? toBase64(abort.cleverError.value.raw)
								: undefined,
				}
			: undefined,
	};
}

function mapErrorName(
	kind:
		| ExecutionError_ExecutionErrorKind
		| CommandArgumentError_CommandArgumentErrorKind
		| TypeArgumentError_TypeArgumentErrorKind
		| PackageUpgradeError_PackageUpgradeErrorKind
		| undefined,
): string {
	if (kind == null) {
		return 'Unknown';
	}
	const name = CommandArgumentError_CommandArgumentErrorKind[kind];
	if (!name || name.endsWith('_UNKNOWN')) {
		return 'Unknown';
	}
	return name
		.split('_')
		.map((word) => word.charAt(0) + word.slice(1).toLowerCase())
		.join('');
}

function mapIdOperation(
	operation: ChangedObject_IdOperation | undefined,
): null | 'Created' | 'Deleted' | 'Unknown' | 'None' {
	if (operation == null) {
		return null;
	}
	switch (operation) {
		case ChangedObject_IdOperation.CREATED:
			return 'Created';
		case ChangedObject_IdOperation.DELETED:
			return 'Deleted';
		case ChangedObject_IdOperation.NONE:
		case ChangedObject_IdOperation.ID_OPERATION_UNKNOWN:
			return 'None';
		default:
			operation satisfies never;
			return 'Unknown';
	}
}

function mapInputObjectState(
	state: ChangedObject_InputObjectState | undefined,
): null | 'Exists' | 'DoesNotExist' | 'Unknown' {
	if (state == null) {
		return null;
	}
	switch (state) {
		case ChangedObject_InputObjectState.EXISTS:
			return 'Exists';
		case ChangedObject_InputObjectState.DOES_NOT_EXIST:
			return 'DoesNotExist';
		case ChangedObject_InputObjectState.UNKNOWN:
			return 'Unknown';
		default:
			state satisfies never;
			return 'Unknown';
	}
}

function mapOutputObjectState(
	state: ChangedObject_OutputObjectState | undefined,
): null | 'ObjectWrite' | 'PackageWrite' | 'DoesNotExist' | 'AccumulatorWriteV1' | 'Unknown' {
	if (state == null) {
		return null;
	}
	switch (state) {
		case ChangedObject_OutputObjectState.OBJECT_WRITE:
			return 'ObjectWrite';
		case ChangedObject_OutputObjectState.PACKAGE_WRITE:
			return 'PackageWrite';
		case ChangedObject_OutputObjectState.DOES_NOT_EXIST:
			return 'DoesNotExist';
		case ChangedObject_OutputObjectState.ACCUMULATOR_WRITE:
			return 'AccumulatorWriteV1';
		case ChangedObject_OutputObjectState.UNKNOWN:
			return 'Unknown';
		default:
			state satisfies never;
			return 'Unknown';
	}
}

function mapUnchangedConsensusObjectKind(
	kind: UnchangedConsensusObject_UnchangedConsensusObjectKind | undefined,
): null | SuiClientTypes.UnchangedConsensusObject['kind'] {
	if (kind == null) {
		return null;
	}
	switch (kind) {
		case UnchangedConsensusObject_UnchangedConsensusObjectKind.UNCHANGED_CONSENSUS_OBJECT_KIND_UNKNOWN:
			return 'Unknown';
		case UnchangedConsensusObject_UnchangedConsensusObjectKind.READ_ONLY_ROOT:
			return 'ReadOnlyRoot';
		case UnchangedConsensusObject_UnchangedConsensusObjectKind.MUTATE_CONSENSUS_STREAM_ENDED:
			return 'MutateConsensusStreamEnded';
		case UnchangedConsensusObject_UnchangedConsensusObjectKind.READ_CONSENSUS_STREAM_ENDED:
			return 'ReadConsensusStreamEnded';
		case UnchangedConsensusObject_UnchangedConsensusObjectKind.CANCELED:
			return 'Cancelled';
		case UnchangedConsensusObject_UnchangedConsensusObjectKind.PER_EPOCH_CONFIG:
			return 'PerEpochConfig';
		default:
			kind satisfies never;
			return 'Unknown';
	}
}

export function parseTransactionEffects({
	effects,
}: {
	effects: TransactionEffects | undefined;
}): SuiClientTypes.TransactionEffects | null {
	if (!effects) {
		return null;
	}

	const changedObjects = effects.changedObjects.map((change): SuiClientTypes.ChangedObject => {
		return {
			objectId: change.objectId!,
			inputState: mapInputObjectState(change.inputState)!,
			inputVersion: change.inputVersion?.toString() ?? null,
			inputDigest: change.inputDigest ?? null,
			inputOwner: mapOwner(change.inputOwner),
			outputState: mapOutputObjectState(change.outputState)!,
			outputVersion: change.outputVersion?.toString() ?? null,
			outputDigest: change.outputDigest ?? null,
			outputOwner: mapOwner(change.outputOwner),
			idOperation: mapIdOperation(change.idOperation)!,
		};
	});

	return {
		bcs: effects.bcs?.value!,

		version: 2,
		status: effects.status?.success
			? {
					success: true,
					error: null,
				}
			: {
					success: false,
					error: parseGrpcExecutionError(effects.status!.error!),
				},
		gasUsed: {
			computationCost: effects.gasUsed?.computationCost?.toString()!,
			storageCost: effects.gasUsed?.storageCost?.toString()!,
			storageRebate: effects.gasUsed?.storageRebate?.toString()!,
			nonRefundableStorageFee: effects.gasUsed?.nonRefundableStorageFee?.toString()!,
		},
		transactionDigest: effects.transactionDigest!,
		gasObject: {
			objectId: effects.gasObject?.objectId!,
			inputState: mapInputObjectState(effects.gasObject?.inputState)!,
			inputVersion: effects.gasObject?.inputVersion?.toString() ?? null,
			inputDigest: effects.gasObject?.inputDigest ?? null,
			inputOwner: mapOwner(effects.gasObject?.inputOwner),
			outputState: mapOutputObjectState(effects.gasObject?.outputState)!,
			outputVersion: effects.gasObject?.outputVersion?.toString() ?? null,
			outputDigest: effects.gasObject?.outputDigest ?? null,
			outputOwner: mapOwner(effects.gasObject?.outputOwner),
			idOperation: mapIdOperation(effects.gasObject?.idOperation)!,
		},
		eventsDigest: effects.eventsDigest ?? null,
		dependencies: effects.dependencies,
		lamportVersion: effects.lamportVersion?.toString() ?? null,
		changedObjects,
		unchangedConsensusObjects: effects.unchangedConsensusObjects.map(
			(object): SuiClientTypes.UnchangedConsensusObject => {
				return {
					kind: mapUnchangedConsensusObjectKind(object.kind)!,
					// TODO: we are inconsistent about id vs objectId
					objectId: object.objectId!,
					version: object.version?.toString() ?? null,
					digest: object.digest ?? null,
				};
			},
		),
		auxiliaryDataDigest: effects.auxiliaryDataDigest ?? null,
	};
}

function parseTransaction<Include extends SuiClientTypes.TransactionInclude = object>(
	transaction: ExecutedTransaction,
	include?: Include,
): SuiClientTypes.TransactionResult<Include> {
	const objectTypes: Record<string, string> = {};
	if (include?.objectTypes) {
		transaction.effects?.changedObjects?.forEach((change) => {
			if (change.objectId && change.objectType) {
				objectTypes[change.objectId] = change.objectType;
			}
		});
	}

	let transactionData: SuiClientTypes.TransactionData | undefined;
	if (include?.transaction) {
		const tx = transaction.transaction;

		if (!tx) {
			throw new Error('Transaction data is required but missing from gRPC response');
		}

		const resolved = grpcTransactionToTransactionData(tx);
		transactionData = {
			gasData: resolved.gasData,
			sender: resolved.sender,
			expiration: resolved.expiration,
			commands: resolved.commands,
			inputs: resolved.inputs,
			version: resolved.version,
		};
	}

	const bcsBytes = include?.bcs ? transaction.transaction?.bcs?.value : undefined;

	const effects = include?.effects
		? parseTransactionEffects({
				effects: transaction.effects,
			})
		: undefined;

	const status: SuiClientTypes.ExecutionStatus = transaction.effects?.status?.success
		? { success: true, error: null }
		: {
				success: false,
				error: transaction.effects?.status?.error
					? parseGrpcExecutionError(transaction.effects.status.error)
					: {
							$kind: 'Unknown',
							message: 'Transaction failed',
							Unknown: null,
						},
			};

	const result: SuiClientTypes.Transaction<Include> = {
		digest: transaction.digest!,
		epoch: transaction.effects?.epoch?.toString() ?? null,
		status,
		effects: effects as SuiClientTypes.Transaction<Include>['effects'],
		objectTypes: (include?.objectTypes
			? objectTypes
			: undefined) as SuiClientTypes.Transaction<Include>['objectTypes'],
		transaction: transactionData as SuiClientTypes.Transaction<Include>['transaction'],
		bcs: bcsBytes as SuiClientTypes.Transaction<Include>['bcs'],
		signatures: transaction.signatures?.map((sig) => toBase64(sig.bcs?.value!)) ?? [],
		balanceChanges: (include?.balanceChanges
			? (transaction.balanceChanges?.map((change) => ({
					coinType: change.coinType!,
					address: change.address!,
					amount: change.amount!,
				})) ?? [])
			: undefined) as SuiClientTypes.Transaction<Include>['balanceChanges'],
		events: (include?.events
			? (transaction.events?.events.map((event) => ({
					packageId: normalizeSuiAddress(event.packageId!),
					module: event.module!,
					sender: normalizeSuiAddress(event.sender!),
					eventType: event.eventType!,
					bcs: event.contents?.value ?? new Uint8Array(),
				})) ?? [])
			: undefined) as SuiClientTypes.Transaction<Include>['events'],
	};

	return status.success
		? {
				$kind: 'Transaction',
				Transaction: result,
			}
		: {
				$kind: 'FailedTransaction',
				FailedTransaction: result,
			};
}

function parseNormalizedSuiMoveType(type: OpenSignature): SuiClientTypes.OpenSignature {
	let reference: 'mutable' | 'immutable' | null = null;

	if (type.reference === OpenSignature_Reference.IMMUTABLE) {
		reference = 'immutable';
	} else if (type.reference === OpenSignature_Reference.MUTABLE) {
		reference = 'mutable';
	}

	return {
		reference,
		body: parseNormalizedSuiMoveTypeBody(type.body!),
	};
}

function parseNormalizedSuiMoveTypeBody(type: OpenSignatureBody): SuiClientTypes.OpenSignatureBody {
	switch (type.type) {
		case OpenSignatureBody_Type.TYPE_UNKNOWN:
			return { $kind: 'unknown' };
		case OpenSignatureBody_Type.ADDRESS:
			return { $kind: 'address' };
		case OpenSignatureBody_Type.BOOL:
			return { $kind: 'bool' };
		case OpenSignatureBody_Type.U8:
			return { $kind: 'u8' };
		case OpenSignatureBody_Type.U16:
			return { $kind: 'u16' };
		case OpenSignatureBody_Type.U32:
			return { $kind: 'u32' };
		case OpenSignatureBody_Type.U64:
			return { $kind: 'u64' };
		case OpenSignatureBody_Type.U128:
			return { $kind: 'u128' };
		case OpenSignatureBody_Type.U256:
			return { $kind: 'u256' };
		case OpenSignatureBody_Type.VECTOR:
			return {
				$kind: 'vector',
				vector: parseNormalizedSuiMoveTypeBody(type.typeParameterInstantiation[0]),
			};
		case OpenSignatureBody_Type.DATATYPE:
			return {
				$kind: 'datatype',
				datatype: {
					typeName: type.typeName!,
					typeParameters: type.typeParameterInstantiation.map((t) =>
						parseNormalizedSuiMoveTypeBody(t),
					),
				},
			};
		case OpenSignatureBody_Type.TYPE_PARAMETER:
			return {
				$kind: 'typeParameter',
				index: type.typeParameter!,
			};
		default:
			return { $kind: 'unknown' };
	}
}
