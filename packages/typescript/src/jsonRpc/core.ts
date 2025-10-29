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
import { normalizeSuiAddress } from '../utils/sui-types.js';
import { Experimental_CoreClient } from '../experimental/core.js';
import type { Experimental_SuiClientTypes } from '../experimental/types.js';
import { ObjectError } from '../experimental/errors.js';
import { parseTransactionBcs, parseTransactionEffectsBcs } from '../experimental/index.js';
import type { SuiJsonRpcClient } from './client.js';

export class JSONRpcCoreClient extends Experimental_CoreClient {
	#jsonRpcClient: SuiJsonRpcClient;

	constructor({
		jsonRpcClient,
		mvr,
	}: {
		jsonRpcClient: SuiJsonRpcClient;
		mvr?: Experimental_SuiClientTypes.MvrOptions;
	}) {
		super({ network: jsonRpcClient.network, base: jsonRpcClient, mvr });
		this.#jsonRpcClient = jsonRpcClient;
	}

	async getObjects(options: Experimental_SuiClientTypes.GetObjectsOptions) {
		const batches = chunk(options.objectIds, 50);
		const results: Experimental_SuiClientTypes.GetObjectsResponse['objects'] = [];

		for (const batch of batches) {
			const objects = await this.#jsonRpcClient.multiGetObjects({
				ids: batch,
				options: {
					showOwner: true,
					showType: true,
					showBcs: true,
					showPreviousTransaction: true,
				},
				signal: options.signal,
			});

			for (const [idx, object] of objects.entries()) {
				if (object.error) {
					results.push(ObjectError.fromResponse(object.error, batch[idx]));
				} else {
					results.push(parseObject(object.data!));
				}
			}
		}

		return {
			objects: results,
		};
	}
	async getOwnedObjects(options: Experimental_SuiClientTypes.GetOwnedObjectsOptions) {
		const objects = await this.#jsonRpcClient.getOwnedObjects({
			owner: options.address,
			limit: options.limit,
			cursor: options.cursor,
			options: {
				showOwner: true,
				showType: true,
				showBcs: true,
				showPreviousTransaction: true,
			},
			filter: options.type ? { StructType: options.type } : null,
			signal: options.signal,
		});

		return {
			objects: objects.data.map((result) => {
				if (result.error) {
					throw ObjectError.fromResponse(result.error);
				}

				return parseObject(result.data!);
			}),
			hasNextPage: objects.hasNextPage,
			cursor: objects.nextCursor ?? null,
		};
	}

	async getCoins(options: Experimental_SuiClientTypes.GetCoinsOptions) {
		const coins = await this.#jsonRpcClient.getCoins({
			owner: options.address,
			coinType: options.coinType,
			limit: options.limit,
			cursor: options.cursor,
			signal: options.signal,
		});

		return {
			objects: coins.data.map((coin) => {
				return {
					id: coin.coinObjectId,
					version: coin.version,
					digest: coin.digest,
					balance: coin.balance,
					type: `0x2::coin::Coin<${coin.coinType}>`,
					content: Promise.resolve(
						Coin.serialize({
							id: coin.coinObjectId,
							balance: {
								value: coin.balance,
							},
						}).toBytes(),
					),
					owner: {
						$kind: 'ObjectOwner' as const,
						ObjectOwner: options.address,
					},
					previousTransaction: coin.previousTransaction,
				};
			}),
			hasNextPage: coins.hasNextPage,
			cursor: coins.nextCursor ?? null,
		};
	}

	async getBalance(options: Experimental_SuiClientTypes.GetBalanceOptions) {
		const balance = await this.#jsonRpcClient.getBalance({
			owner: options.address,
			coinType: options.coinType,
			signal: options.signal,
		});

		return {
			balance: {
				coinType: balance.coinType,
				balance: balance.totalBalance,
			},
		};
	}
	async getAllBalances(options: Experimental_SuiClientTypes.GetAllBalancesOptions) {
		const balances = await this.#jsonRpcClient.getAllBalances({
			owner: options.address,
			signal: options.signal,
		});

		return {
			balances: balances.map((balance) => ({
				coinType: balance.coinType,
				balance: balance.totalBalance,
			})),
			hasNextPage: false,
			cursor: null,
		};
	}
	async getTransaction(options: Experimental_SuiClientTypes.GetTransactionOptions) {
		const transaction = await this.#jsonRpcClient.getTransactionBlock({
			digest: options.digest,
			options: {
				showRawInput: true,
				showObjectChanges: true,
				showRawEffects: true,
				showEvents: true,
				showEffects: true,
				showBalanceChanges: true,
			},
			signal: options.signal,
		});

		return {
			transaction: parseTransaction(transaction),
		};
	}
	async executeTransaction(options: Experimental_SuiClientTypes.ExecuteTransactionOptions) {
		const transaction = await this.#jsonRpcClient.executeTransactionBlock({
			transactionBlock: options.transaction,
			signature: options.signatures,
			options: {
				showRawEffects: true,
				showEvents: true,
				showObjectChanges: true,
				showRawInput: true,
				showEffects: true,
				showBalanceChanges: true,
			},
			signal: options.signal,
		});

		return {
			transaction: parseTransaction(transaction),
		};
	}
	async dryRunTransaction(options: Experimental_SuiClientTypes.DryRunTransactionOptions) {
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
				effects,
				objectTypes: Promise.resolve(objectTypes),
				signatures: [],
				transaction: parseTransactionBcs(options.transaction),
				balanceChanges: result.balanceChanges.map((change) => ({
					coinType: change.coinType,
					address: parseOwnerAddress(change.owner)!,
					amount: change.amount,
				})),
			},
		};
	}
	async getReferenceGasPrice(options?: Experimental_SuiClientTypes.GetReferenceGasPriceOptions) {
		const referenceGasPrice = await this.#jsonRpcClient.getReferenceGasPrice({
			signal: options?.signal,
		});
		return {
			referenceGasPrice: String(referenceGasPrice),
		};
	}

	async getDynamicFields(options: Experimental_SuiClientTypes.GetDynamicFieldsOptions) {
		const dynamicFields = await this.#jsonRpcClient.getDynamicFields({
			parentId: options.parentId,
			limit: options.limit,
			cursor: options.cursor,
		});

		return {
			dynamicFields: dynamicFields.data.map((dynamicField) => {
				return {
					id: dynamicField.objectId,
					type: dynamicField.objectType,
					name: {
						type: dynamicField.name.type,
						bcs: fromBase64(dynamicField.bcsName),
					},
				};
			}),
			hasNextPage: dynamicFields.hasNextPage,
			cursor: dynamicFields.nextCursor,
		};
	}

	async verifyZkLoginSignature(options: Experimental_SuiClientTypes.VerifyZkLoginSignatureOptions) {
		const result = await this.#jsonRpcClient.verifyZkLoginSignature({
			bytes: options.bytes,
			signature: options.signature,
			intentScope: options.intentScope,
			author: options.author,
		});

		return {
			success: result.success,
			errors: result.errors,
		};
	}

	async defaultNameServiceName(
		options: Experimental_SuiClientTypes.DefaultNameServiceNameOptions,
	): Promise<Experimental_SuiClientTypes.DefaultNameServiceNameResponse> {
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
		options: Experimental_SuiClientTypes.GetMoveFunctionOptions,
	): Promise<Experimental_SuiClientTypes.GetMoveFunctionResponse> {
		const result = await this.#jsonRpcClient.getNormalizedMoveFunction({
			package: (await this.mvr.resolvePackage({ package: options.packageId })).package,
			module: options.moduleName,
			function: options.name,
		});

		return {
			function: {
				packageId: normalizeSuiAddress(options.packageId),
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

function parseObject(object: SuiObjectData): Experimental_SuiClientTypes.ObjectResponse {
	return {
		id: object.objectId,
		version: object.version,
		digest: object.digest,
		type: object.type!,
		content: Promise.resolve(
			object.bcs?.dataType === 'moveObject' ? fromBase64(object.bcs.bcsBytes) : new Uint8Array(),
		),
		owner: parseOwner(object.owner!),
		previousTransaction: object.previousTransaction ?? null,
	};
}

function parseOwner(owner: ObjectOwner): Experimental_SuiClientTypes.ObjectOwner {
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

function parseTransaction(
	transaction: SuiTransactionBlockResponse,
): Experimental_SuiClientTypes.TransactionResponse {
	const parsedTx = bcs.SenderSignedData.parse(fromBase64(transaction.rawTransaction!))[0];
	const objectTypes: Record<string, string> = {};

	transaction.objectChanges?.forEach((change) => {
		if (change.type !== 'published') {
			objectTypes[change.objectId] = change.objectType;
		}
	});

	const bytes = bcs.TransactionData.serialize(parsedTx.intentMessage.value).toBytes();

	const data = TransactionDataBuilder.restore({
		version: 2,
		sender: parsedTx.intentMessage.value.V1.sender,
		expiration: parsedTx.intentMessage.value.V1.expiration,
		gasData: parsedTx.intentMessage.value.V1.gasData,
		inputs: parsedTx.intentMessage.value.V1.kind.ProgrammableTransaction!.inputs,
		commands: parsedTx.intentMessage.value.V1.kind.ProgrammableTransaction!.commands,
	});

	return {
		digest: transaction.digest,
		epoch: transaction.effects?.executedEpoch ?? null,
		effects: parseTransactionEffectsBcs(new Uint8Array(transaction.rawEffects!)),
		objectTypes: Promise.resolve(objectTypes),
		transaction: {
			...data,
			bcs: bytes,
		},
		signatures: parsedTx.txSignatures,
		balanceChanges:
			transaction.balanceChanges?.map((change) => ({
				coinType: change.coinType,
				address: parseOwnerAddress(change.owner)!,
				amount: change.amount,
			})) ?? [],
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
	effects: Experimental_SuiClientTypes.TransactionEffects;
	objectTypes: Record<string, string>;
} {
	const changedObjects: Experimental_SuiClientTypes.ChangedObject[] = [];
	const unchangedConsensusObjects: Experimental_SuiClientTypes.UnchangedConsensusObject[] = [];
	const objectTypes: Record<string, string> = {};

	objectChanges?.forEach((change) => {
		switch (change.type) {
			case 'published':
				changedObjects.push({
					id: change.packageId,
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
					id: change.objectId,
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
					id: change.objectId,
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
					id: change.objectId,
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
					id: change.objectId,
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
					id: change.objectId,
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
			digest: effects.transactionDigest,
			version: 2,
			status:
				effects.status.status === 'success'
					? { success: true, error: null }
					: { success: false, error: effects.status.error! },
			gasUsed: effects.gasUsed,
			transactionDigest: effects.transactionDigest,
			gasObject: {
				id: effects.gasObject?.reference.objectId,
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
	id: bcs.Address,
	balance: Balance,
});

function parseNormalizedSuiMoveType(
	type: SuiMoveNormalizedType,
): Experimental_SuiClientTypes.OpenSignature {
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
): Experimental_SuiClientTypes.OpenSignatureBody {
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

function parseAbilities(abilitySet: SuiMoveAbilitySet): Experimental_SuiClientTypes.Ability[] {
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

function parseVisibility(visibility: SuiMoveVisibility): Experimental_SuiClientTypes.Visibility {
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
