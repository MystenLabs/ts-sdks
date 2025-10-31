// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64 } from '@mysten/bcs';

import { bcs } from '../bcs/index.js';
import type {
	ObjectOwner,
	SuiMoveAbilitySet,
	SuiMoveNormalizedType,
	SuiMoveVisibility,
	SuiObjectChange,
	SuiObjectData,
	SuiTransactionBlockResponse,
	TransactionEffects,
} from './types/index.js';
import { Transaction } from '../transactions/Transaction.js';
import { jsonRpcClientResolveTransactionPlugin } from './json-rpc-resolver.js';
import { TransactionDataBuilder } from '../transactions/TransactionData.js';
import { chunk } from '@mysten/utils';
import { normalizeSuiAddress, normalizeStructTag } from '../utils/sui-types.js';
import { CoreClient } from '../client/core.js';
import type { SuiClientTypes } from '../client/types.js';
import { ObjectError } from '../client/errors.js';
import { parseTransactionBcs, parseTransactionEffectsBcs } from '../client/index.js';
import type { SuiJsonRpcClient } from './client.js';

export class JSONRpcCoreClient extends CoreClient {
	#jsonRpcClient: SuiJsonRpcClient;

	constructor({
		jsonRpcClient,
		mvr,
	}: {
		jsonRpcClient: SuiJsonRpcClient;
		mvr?: SuiClientTypes.MvrOptions;
	}) {
		super({ network: jsonRpcClient.network, base: jsonRpcClient, mvr });
		this.#jsonRpcClient = jsonRpcClient;
	}

	async listObjects<Include extends SuiClientTypes.ObjectInclude = object>(
		options: SuiClientTypes.ListObjectsOptions<Include>,
	) {
		const batches = chunk(options.objectIds, 50);
		const results: SuiClientTypes.ListObjectsResponse<Include>['objects'] = [];

		for (const batch of batches) {
			const objects = await this.#jsonRpcClient.multiGetObjects({
				ids: batch,
				options: {
					showOwner: true,
					showType: true,
					showBcs: options.include?.content ?? false,
					showPreviousTransaction: options.include?.previousTransaction ?? false,
				},
				signal: options.signal,
			});

			for (const [idx, object] of objects.entries()) {
				if (object.error) {
					results.push(ObjectError.fromResponse(object.error, batch[idx]));
				} else {
					results.push(parseObject(object.data!, options.include));
				}
			}
		}

		return {
			objects: results,
		};
	}
	async listOwnedObjects<Include extends SuiClientTypes.ObjectInclude = object>(
		options: SuiClientTypes.ListOwnedObjectsOptions<Include>,
	) {
		const objects = await this.#jsonRpcClient.getOwnedObjects({
			owner: options.owner,
			limit: options.limit,
			cursor: options.cursor,
			options: {
				showOwner: true,
				showType: true,
				showBcs: options.include?.content ?? false,
				showPreviousTransaction: options.include?.previousTransaction ?? false,
			},
			filter: options.type ? { StructType: options.type } : null,
			signal: options.signal,
		});

		return {
			objects: objects.data.map((result) => {
				if (result.error) {
					throw ObjectError.fromResponse(result.error);
				}

				return parseObject(result.data!, options.include);
			}),
			hasNextPage: objects.hasNextPage,
			cursor: objects.nextCursor ?? null,
		};
	}

	async listCoins<Include extends SuiClientTypes.ObjectInclude = object>(
		options: SuiClientTypes.ListCoinsOptions<Include>,
	) {
		const coins = await this.#jsonRpcClient.getCoins({
			owner: options.owner,
			coinType: options.coinType,
			limit: options.limit,
			cursor: options.cursor,
			signal: options.signal,
		});

		return {
			objects: coins.data.map(
				(coin): SuiClientTypes.CoinResponse<Include> => ({
					objectId: coin.coinObjectId,
					version: coin.version,
					digest: coin.digest,
					balance: coin.balance,
					type: normalizeStructTag(`0x2::coin::Coin<${coin.coinType}>`),
					content: (options.include?.content
						? Coin.serialize({
								objectId: coin.coinObjectId,
								balance: {
									value: coin.balance,
								},
							}).toBytes()
						: undefined) as SuiClientTypes.CoinResponse<Include>['content'],
					owner: {
						$kind: 'AddressOwner' as const,
						AddressOwner: options.owner,
					},
					previousTransaction: (options.include?.previousTransaction
						? coin.previousTransaction
						: undefined) as SuiClientTypes.CoinResponse<Include>['previousTransaction'],
				}),
			),
			hasNextPage: coins.hasNextPage,
			cursor: coins.nextCursor ?? null,
		};
	}

	async getBalance(options: SuiClientTypes.GetBalanceOptions) {
		const balance = await this.#jsonRpcClient.getBalance({
			owner: options.owner,
			coinType: options.coinType,
			signal: options.signal,
		});

		return {
			balance: {
				coinType: normalizeStructTag(balance.coinType),
				balance: balance.totalBalance,
			},
		};
	}
	async listBalances(options: SuiClientTypes.ListBalancesOptions) {
		const balances = await this.#jsonRpcClient.getAllBalances({
			owner: options.owner,
			signal: options.signal,
		});

		return {
			balances: balances.map((balance) => ({
				coinType: normalizeStructTag(balance.coinType),
				balance: balance.totalBalance,
			})),
			hasNextPage: false,
			cursor: null,
		};
	}
	async getTransaction<Include extends SuiClientTypes.TransactionInclude = object>(
		options: SuiClientTypes.GetTransactionOptions<Include>,
	) {
		const transaction = await this.#jsonRpcClient.getTransactionBlock({
			digest: options.digest,
			options: {
				// showRawInput is always needed to extract signatures from SenderSignedData
				showRawInput: true,
				showObjectChanges: options.include?.objectTypes ?? false,
				showRawEffects: options.include?.effects ?? false,
				showEvents: options.include?.events ?? false,
				showEffects: options.include?.effects ?? false,
				showBalanceChanges: options.include?.balanceChanges ?? false,
			},
			signal: options.signal,
		});

		return {
			transaction: parseTransaction(transaction, options.include),
		};
	}
	async executeTransaction<Include extends SuiClientTypes.TransactionInclude = object>(
		options: SuiClientTypes.ExecuteTransactionOptions<Include>,
	) {
		const transaction = await this.#jsonRpcClient.executeTransactionBlock({
			transactionBlock: options.transaction,
			signature: options.signatures,
			options: {
				// showRawInput is always needed to extract signatures from SenderSignedData
				showRawInput: true,
				showRawEffects: options.include?.effects ?? false,
				showEvents: options.include?.events ?? false,
				showObjectChanges: options.include?.objectTypes ?? false,
				showEffects: options.include?.effects ?? false,
				showBalanceChanges: options.include?.balanceChanges ?? false,
			},
			signal: options.signal,
		});

		return {
			transaction: parseTransaction(transaction, options.include),
		};
	}
	async simulateTransaction<Include extends SuiClientTypes.TransactionInclude = object>(
		options: SuiClientTypes.SimulateTransactionOptions<Include>,
	) {
		const tx = Transaction.from(options.transaction);
		const result = await this.#jsonRpcClient.dryRunTransactionBlock({
			transactionBlock: options.transaction,
			signal: options.signal,
		});

		const { effects, objectTypes } = parseTransactionEffectsJson({
			effects: result.effects,
			objectChanges: result.objectChanges,
		});

		return {
			transaction: {
				digest: await tx.getDigest(),
				epoch: null,
				effects: (options.include?.effects
					? effects
					: undefined) as SuiClientTypes.TransactionResponse<Include>['effects'],
				objectTypes: (options.include?.objectTypes
					? Promise.resolve(objectTypes)
					: undefined) as SuiClientTypes.TransactionResponse<Include>['objectTypes'],
				signatures: [],
				transaction: (options.include?.transaction
					? parseTransactionBcs(options.transaction)
					: undefined) as SuiClientTypes.TransactionResponse<Include>['transaction'],
				balanceChanges: (options.include?.balanceChanges
					? result.balanceChanges.map((change) => ({
							coinType: normalizeStructTag(change.coinType),
							address: parseOwnerAddress(change.owner)!,
							amount: change.amount,
						}))
					: undefined) as SuiClientTypes.TransactionResponse<Include>['balanceChanges'],
				events: (options.include?.events
					? (result.events?.map((event) => ({
							packageId: event.packageId,
							module: event.transactionModule,
							sender: event.sender,
							eventType: event.type,
							bcs: 'bcs' in event ? fromBase64(event.bcs) : new Uint8Array(),
						})) ?? [])
					: undefined) as SuiClientTypes.TransactionResponse<Include>['events'],
			},
		};
	}
	async getReferenceGasPrice(options?: SuiClientTypes.GetReferenceGasPriceOptions) {
		const referenceGasPrice = await this.#jsonRpcClient.getReferenceGasPrice({
			signal: options?.signal,
		});
		return {
			referenceGasPrice: String(referenceGasPrice),
		};
	}

	async listDynamicFields(options: SuiClientTypes.ListDynamicFieldsOptions) {
		const dynamicFields = await this.#jsonRpcClient.getDynamicFields({
			parentId: options.parentId,
			limit: options.limit,
			cursor: options.cursor,
		});

		return {
			dynamicFields: dynamicFields.data.map((dynamicField) => {
				const isDynamicObject = dynamicField.type === 'DynamicObject';
				const fullType = isDynamicObject
					? `0x2::dynamic_field::Field<0x2::dynamic_object_field::Wrapper<${dynamicField.name.type}>, 0x2::object::ID>`
					: `0x2::dynamic_field::Field<${dynamicField.name.type}, ${dynamicField.objectType}>`;

				return {
					fieldId: dynamicField.objectId,
					type: normalizeStructTag(fullType),
					name: {
						type: dynamicField.name.type,
						bcs: fromBase64(dynamicField.bcsName),
					},
					valueType: dynamicField.objectType,
				};
			}),
			hasNextPage: dynamicFields.hasNextPage,
			cursor: dynamicFields.nextCursor,
		};
	}

	async verifyZkLoginSignature(options: SuiClientTypes.VerifyZkLoginSignatureOptions) {
		const result = await this.#jsonRpcClient.verifyZkLoginSignature({
			bytes: options.bytes,
			signature: options.signature,
			intentScope: options.intentScope,
			author: options.address,
		});

		return {
			success: result.success,
			errors: result.errors,
		};
	}

	async defaultNameServiceName(
		options: SuiClientTypes.DefaultNameServiceNameOptions,
	): Promise<SuiClientTypes.DefaultNameServiceNameResponse> {
		const name = (await this.#jsonRpcClient.resolveNameServiceNames(options)).data[0];
		return {
			data: {
				name,
			},
		};
	}

	resolveTransactionPlugin() {
		return jsonRpcClientResolveTransactionPlugin(this.#jsonRpcClient);
	}

	async getMoveFunction(
		options: SuiClientTypes.GetMoveFunctionOptions,
	): Promise<SuiClientTypes.GetMoveFunctionResponse> {
		const resolvedPackageId = (await this.mvr.resolvePackage({ package: options.packageId }))
			.package;
		const result = await this.#jsonRpcClient.getNormalizedMoveFunction({
			package: resolvedPackageId,
			module: options.moduleName,
			function: options.name,
		});

		return {
			function: {
				packageId: normalizeSuiAddress(resolvedPackageId),
				moduleName: options.moduleName,
				name: options.name,
				visibility: parseVisibility(result.visibility),
				isEntry: result.isEntry,
				typeParameters: result.typeParameters.map((abilities) => ({
					isPhantom: false,
					constraints: parseAbilities(abilities),
				})),
				parameters: result.parameters.map((param) => parseNormalizedSuiMoveType(param)),
				returns: result.return.map((ret) => parseNormalizedSuiMoveType(ret)),
			},
		};
	}
}

function parseObject<Include extends SuiClientTypes.ObjectInclude = object>(
	object: SuiObjectData,
	include?: Include,
): SuiClientTypes.ObjectResponse<Include> {
	const bcsContent =
		object.bcs?.dataType === 'moveObject' ? fromBase64(object.bcs.bcsBytes) : undefined;

	// Package objects have type "package" which is not a struct tag, so don't normalize it
	const type =
		object.type && object.type.includes('::')
			? normalizeStructTag(object.type)
			: (object.type ?? '');

	return {
		objectId: object.objectId,
		version: object.version,
		digest: object.digest,
		type,
		content: (include?.content
			? bcsContent
			: undefined) as SuiClientTypes.ObjectResponse<Include>['content'],
		owner: parseOwner(object.owner!),
		previousTransaction: (include?.previousTransaction
			? (object.previousTransaction ?? undefined)
			: undefined) as SuiClientTypes.ObjectResponse<Include>['previousTransaction'],
	};
}

function parseOwner(owner: ObjectOwner): SuiClientTypes.ObjectOwner {
	if (owner === 'Immutable') {
		return {
			$kind: 'Immutable',
			Immutable: true,
		};
	}

	if ('ConsensusAddressOwner' in owner) {
		return {
			$kind: 'ConsensusAddressOwner',
			ConsensusAddressOwner: {
				owner: owner.ConsensusAddressOwner.owner,
				startVersion: owner.ConsensusAddressOwner.start_version,
			},
		};
	}

	if ('AddressOwner' in owner) {
		return {
			$kind: 'AddressOwner',
			AddressOwner: owner.AddressOwner,
		};
	}

	if ('ObjectOwner' in owner) {
		return {
			$kind: 'ObjectOwner',
			ObjectOwner: owner.ObjectOwner,
		};
	}

	if ('Shared' in owner) {
		return {
			$kind: 'Shared',
			Shared: {
				initialSharedVersion: owner.Shared.initial_shared_version,
			},
		};
	}

	throw new Error(`Unknown owner type: ${JSON.stringify(owner)}`);
}

function parseOwnerAddress(owner: ObjectOwner): string | null {
	if (owner === 'Immutable') {
		return null;
	}

	if ('ConsensusAddressOwner' in owner) {
		return owner.ConsensusAddressOwner.owner;
	}

	if ('AddressOwner' in owner) {
		return owner.AddressOwner;
	}

	if ('ObjectOwner' in owner) {
		return owner.ObjectOwner;
	}

	if ('Shared' in owner) {
		return null;
	}

	throw new Error(`Unknown owner type: ${JSON.stringify(owner)}`);
}

function parseTransaction<Include extends SuiClientTypes.TransactionInclude = object>(
	transaction: SuiTransactionBlockResponse,
	include?: Include,
): SuiClientTypes.TransactionResponse<Include> {
	const objectTypes: Record<string, string> = {};

	if (include?.objectTypes) {
		transaction.objectChanges?.forEach((change) => {
			if (change.type !== 'published') {
				objectTypes[change.objectId] = change.objectType;
			}
		});
	}

	let transactionData: SuiClientTypes.TransactionData | undefined;
	let signatures: string[] = [];

	if (transaction.rawTransaction) {
		const parsedTx = bcs.SenderSignedData.parse(fromBase64(transaction.rawTransaction))[0];
		signatures = parsedTx.txSignatures;

		if (include?.transaction) {
			const bytes = bcs.TransactionData.serialize(parsedTx.intentMessage.value).toBytes();
			const data = TransactionDataBuilder.restore({
				version: 2,
				sender: parsedTx.intentMessage.value.V1.sender,
				expiration: parsedTx.intentMessage.value.V1.expiration,
				gasData: parsedTx.intentMessage.value.V1.gasData,
				inputs: parsedTx.intentMessage.value.V1.kind.ProgrammableTransaction!.inputs,
				commands: parsedTx.intentMessage.value.V1.kind.ProgrammableTransaction!.commands,
			});
			transactionData = {
				...data,
				bcs: bytes,
			};
		}
	}

	return {
		digest: transaction.digest,
		epoch: transaction.effects?.executedEpoch ?? null,
		effects: (include?.effects
			? parseTransactionEffectsBcs(new Uint8Array(transaction.rawEffects!))
			: undefined) as SuiClientTypes.TransactionResponse<Include>['effects'],
		objectTypes: (include?.objectTypes
			? Promise.resolve(objectTypes)
			: undefined) as SuiClientTypes.TransactionResponse<Include>['objectTypes'],
		transaction: transactionData as SuiClientTypes.TransactionResponse<Include>['transaction'],
		signatures,
		balanceChanges: (include?.balanceChanges
			? (transaction.balanceChanges?.map((change) => ({
					coinType: normalizeStructTag(change.coinType),
					address: parseOwnerAddress(change.owner)!,
					amount: change.amount,
				})) ?? [])
			: undefined) as SuiClientTypes.TransactionResponse<Include>['balanceChanges'],
		events: (include?.events
			? (transaction.events?.map((event) => ({
					packageId: event.packageId,
					module: event.transactionModule,
					sender: event.sender,
					eventType: event.type,
					bcs: 'bcs' in event ? fromBase64(event.bcs) : new Uint8Array(),
				})) ?? [])
			: undefined) as SuiClientTypes.TransactionResponse<Include>['events'],
	};
}

function parseTransactionEffectsJson({
	bytes,
	effects,
	objectChanges,
}: {
	bytes?: Uint8Array;
	effects: TransactionEffects;
	objectChanges: SuiObjectChange[] | null;
}): {
	effects: SuiClientTypes.TransactionEffects;
	objectTypes: Record<string, string>;
} {
	const changedObjects: SuiClientTypes.ChangedObject[] = [];
	const unchangedConsensusObjects: SuiClientTypes.UnchangedConsensusObject[] = [];
	const objectTypes: Record<string, string> = {};

	objectChanges?.forEach((change) => {
		switch (change.type) {
			case 'published':
				changedObjects.push({
					objectId: change.packageId,
					inputState: 'DoesNotExist',
					inputVersion: null,
					inputDigest: null,
					inputOwner: null,
					outputState: 'PackageWrite',
					outputVersion: change.version,
					outputDigest: change.digest,
					outputOwner: null,
					idOperation: 'Created',
				});
				break;
			case 'transferred':
				changedObjects.push({
					objectId: change.objectId,
					inputState: 'Exists',
					inputVersion: change.version,
					inputDigest: change.digest,
					inputOwner: {
						$kind: 'AddressOwner' as const,
						AddressOwner: change.sender,
					},
					outputState: 'ObjectWrite',
					outputVersion: change.version,
					outputDigest: change.digest,
					outputOwner: parseOwner(change.recipient),
					idOperation: 'None',
				});
				objectTypes[change.objectId] = change.objectType;
				break;
			case 'mutated':
				changedObjects.push({
					objectId: change.objectId,
					inputState: 'Exists',
					inputVersion: change.previousVersion,
					inputDigest: null,
					inputOwner: parseOwner(change.owner),
					outputState: 'ObjectWrite',
					outputVersion: change.version,
					outputDigest: change.digest,
					outputOwner: parseOwner(change.owner),
					idOperation: 'None',
				});
				objectTypes[change.objectId] = change.objectType;
				break;
			case 'deleted':
				changedObjects.push({
					objectId: change.objectId,
					inputState: 'Exists',
					inputVersion: change.version,
					inputDigest: effects.deleted?.find((d) => d.objectId === change.objectId)?.digest ?? null,
					inputOwner: null,
					outputState: 'DoesNotExist',
					outputVersion: null,
					outputDigest: null,
					outputOwner: null,
					idOperation: 'Deleted',
				});
				objectTypes[change.objectId] = change.objectType;
				break;
			case 'wrapped':
				changedObjects.push({
					objectId: change.objectId,
					inputState: 'Exists',
					inputVersion: change.version,
					inputDigest: null,
					inputOwner: {
						$kind: 'AddressOwner' as const,
						AddressOwner: change.sender,
					},
					outputState: 'ObjectWrite',
					outputVersion: change.version,
					outputDigest:
						effects.wrapped?.find((w) => w.objectId === change.objectId)?.digest ?? null,
					outputOwner: {
						$kind: 'ObjectOwner' as const,
						ObjectOwner: change.sender,
					},
					idOperation: 'None',
				});
				objectTypes[change.objectId] = change.objectType;
				break;
			case 'created':
				changedObjects.push({
					objectId: change.objectId,
					inputState: 'DoesNotExist',
					inputVersion: null,
					inputDigest: null,
					inputOwner: null,
					outputState: 'ObjectWrite',
					outputVersion: change.version,
					outputDigest: change.digest,
					outputOwner: parseOwner(change.owner),
					idOperation: 'Created',
				});
				objectTypes[change.objectId] = change.objectType;
				break;
		}
	});

	return {
		objectTypes,
		effects: {
			bcs: bytes ?? null,
			version: 2,
			status:
				effects.status.status === 'success'
					? { success: true, error: null }
					: { success: false, error: effects.status.error! },
			gasUsed: effects.gasUsed,
			transactionDigest: effects.transactionDigest,
			gasObject: {
				objectId: effects.gasObject?.reference.objectId,
				inputState: 'Exists',
				inputVersion: null,
				inputDigest: null,
				inputOwner: null,
				outputState: 'ObjectWrite',
				outputVersion: effects.gasObject.reference.version,
				outputDigest: effects.gasObject.reference.digest,
				outputOwner: parseOwner(effects.gasObject.owner),
				idOperation: 'None',
			},
			eventsDigest: effects.eventsDigest ?? null,
			dependencies: effects.dependencies ?? [],
			lamportVersion: effects.gasObject.reference.version,
			changedObjects,
			unchangedConsensusObjects,
			auxiliaryDataDigest: null,
		},
	};
}

const Balance = bcs.struct('Balance', {
	value: bcs.u64(),
});

const Coin = bcs.struct('Coin', {
	objectId: bcs.Address,
	balance: Balance,
});

function parseNormalizedSuiMoveType(type: SuiMoveNormalizedType): SuiClientTypes.OpenSignature {
	if (typeof type !== 'string') {
		if ('Reference' in type) {
			return {
				reference: 'immutable',
				body: parseNormalizedSuiMoveTypeBody(type.Reference),
			};
		}

		if ('MutableReference' in type) {
			return {
				reference: 'mutable',
				body: parseNormalizedSuiMoveTypeBody(type.MutableReference),
			};
		}
	}

	return {
		reference: null,
		body: parseNormalizedSuiMoveTypeBody(type),
	};
}

function parseNormalizedSuiMoveTypeBody(
	type: SuiMoveNormalizedType,
): SuiClientTypes.OpenSignatureBody {
	switch (type) {
		case 'Address':
			return { $kind: 'address' };
		case 'Bool':
			return { $kind: 'bool' };
		case 'U8':
			return { $kind: 'u8' };
		case 'U16':
			return { $kind: 'u16' };
		case 'U32':
			return { $kind: 'u32' };
		case 'U64':
			return { $kind: 'u64' };
		case 'U128':
			return { $kind: 'u128' };
		case 'U256':
			return { $kind: 'u256' };
	}

	if (typeof type === 'string') {
		throw new Error(`Unknown type: ${type}`);
	}

	if ('Vector' in type) {
		return {
			$kind: 'vector',
			vector: parseNormalizedSuiMoveTypeBody(type.Vector),
		};
	}

	if ('Struct' in type) {
		return {
			$kind: 'datatype',
			datatype: {
				typeName: `${normalizeSuiAddress(type.Struct.address)}::${type.Struct.module}::${type.Struct.name}`,
				typeParameters: type.Struct.typeArguments.map((t) => parseNormalizedSuiMoveTypeBody(t)),
			},
		};
	}

	if ('TypeParameter' in type) {
		return {
			$kind: 'typeParameter',
			index: type.TypeParameter,
		};
	}

	throw new Error(`Unknown type: ${JSON.stringify(type)}`);
}

function parseAbilities(abilitySet: SuiMoveAbilitySet): SuiClientTypes.Ability[] {
	return abilitySet.abilities.map((ability) => {
		switch (ability) {
			case 'Copy':
				return 'copy';
			case 'Drop':
				return 'drop';
			case 'Store':
				return 'store';
			case 'Key':
				return 'key';
			default:
				return 'unknown';
		}
	});
}

function parseVisibility(visibility: SuiMoveVisibility): SuiClientTypes.Visibility {
	switch (visibility) {
		case 'Public':
			return 'public';
		case 'Private':
			return 'private';
		case 'Friend':
			return 'friend';
		default:
			return 'unknown';
	}
}
