// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64 } from '@mysten/bcs';

import { bcs } from '../../bcs/index.js';
import type {
	ObjectOwner,
	SuiClient,
	SuiObjectChange,
	SuiObjectData,
	SuiTransactionBlockResponse,
	TransactionEffects,
} from '../../client/index.js';
import { batch } from '../../transactions/plugins/utils.js';
import { Transaction } from '../../transactions/Transaction.js';
import { normalizeStructTag } from '../../utils/sui-types.js';
import { Experimental_CoreClient } from '../core.js';
import { ObjectError } from '../errors.js';
import type { Experimental_SuiClientTypes } from '../types.js';

export class JSONRpcTransport extends Experimental_CoreClient {
	#jsonRpcClient: SuiClient;

	constructor(jsonRpcClient: SuiClient) {
		super({ network: jsonRpcClient.network });
		this.#jsonRpcClient = jsonRpcClient;
	}

	async getObjects(options: Experimental_SuiClientTypes.GetObjectsOptions) {
		const batches = batch(options.objectIds, 50);
		const results: Experimental_SuiClientTypes.GetObjectsResponse['objects'] = [];

		for (const batch of batches) {
			const objects = await this.#jsonRpcClient.multiGetObjects({
				ids: batch,
				options: {
					showOwner: true,
					showType: true,
					showBcs: true,
				},
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
			},
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
		});

		return {
			objects: coins.data.map((coin) => {
				return {
					id: coin.coinObjectId,
					version: coin.version,
					digest: coin.digest,
					balance: coin.balance,
					type: `0x2::coin::Coin<${coin.coinType}>`,
					content: Coin.serialize({
						id: coin.coinObjectId,
						balance: {
							value: coin.balance,
						},
					}).toBytes(),
					owner: {
						$kind: 'ObjectOwner' as const,
						ObjectOwner: options.address,
					},
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
			},
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
			},
		});

		return {
			transaction: parseTransaction(transaction),
		};
	}
	async dryRunTransaction(options: Experimental_SuiClientTypes.DryRunTransactionOptions) {
		const tx = Transaction.from(options.transaction);
		const result = await this.#jsonRpcClient.dryRunTransactionBlock({
			transactionBlock: options.transaction,
		});

		return {
			transaction: {
				digest: await tx.getDigest(),
				effects: parseTransactionEffectsJson({
					effects: result.effects,
					objectChanges: result.objectChanges,
				}),
				signatures: [],
				bcs: options.transaction,
			},
		};
	}
	async getReferenceGasPrice() {
		const referenceGasPrice = await this.#jsonRpcClient.getReferenceGasPrice();
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
			dynamicFields: dynamicFields.data.map((dynamicField) => ({
				id: dynamicField.objectId,
				version: dynamicField.version,
				digest: dynamicField.digest,
				type: dynamicField.objectType,
				name: {
					type: dynamicField.name.type,
					bcs: fromBase64(dynamicField.bcsName),
				},
			})),
			hasNextPage: dynamicFields.hasNextPage,
			cursor: dynamicFields.nextCursor,
		};
	}
}

function parseObject(object: SuiObjectData): Experimental_SuiClientTypes.ObjectResponse {
	return {
		id: object.objectId,
		version: object.version,
		digest: object.digest,
		type: object.type!,
		content:
			object.bcs?.dataType === 'moveObject' ? fromBase64(object.bcs.bcsBytes) : new Uint8Array(),
		owner: parseOwner(object.owner!),
	};
}

function parseOwner(owner: ObjectOwner): Experimental_SuiClientTypes.ObjectOwner {
	if (owner === 'Immutable') {
		return {
			$kind: 'Immutable',
			Immutable: true,
		};
	}

	if ('ConsensusV2' in owner) {
		return {
			$kind: 'ConsensusV2',
			ConsensusV2: {
				authenticator: {
					$kind: 'SingleOwner',
					SingleOwner: owner.ConsensusV2.authenticator.SingleOwner,
				},
				startVersion: owner.ConsensusV2.start_version,
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

function parseTransaction(
	transaction: SuiTransactionBlockResponse,
): Experimental_SuiClientTypes.TransactionResponse {
	const parsedTx = bcs.SenderSignedData.parse(fromBase64(transaction.rawTransaction!))[0];

	return {
		digest: transaction.digest,
		effects: parseTransactionEffects({
			effects: new Uint8Array(transaction.rawEffects!),
			objectChanges: transaction.objectChanges ?? null,
		}),
		bcs: bcs.TransactionData.serialize(parsedTx.intentMessage.value).toBytes(),
		signatures: parsedTx.txSignatures,
	};
}

function parseTransactionEffects({
	effects,
	epoch,
	objectChanges,
}: {
	effects: Uint8Array;
	objectChanges: SuiObjectChange[] | null;
	epoch?: string | null;
}): Experimental_SuiClientTypes.TransactionEffects {
	const parsed = bcs.TransactionEffects.parse(effects);
	const objectTypes: Record<string, string> = {};

	objectChanges?.forEach((change) => {
		if (change.type !== 'published') {
			objectTypes[change.objectId] = change.objectType;
		}
	});

	switch (parsed.$kind) {
		case 'V1':
			return parseTransactionEffectsV1({ bytes: effects, effects: parsed.V1, epoch, objectTypes });
		case 'V2':
			return parseTransactionEffectsV2({ bytes: effects, effects: parsed.V2, epoch, objectTypes });
		default:
			throw new Error(
				`Unknown transaction effects version: ${(parsed as { $kind: string }).$kind}`,
			);
	}
}

function parseTransactionEffectsV1(_: {
	bytes: Uint8Array;
	effects: NonNullable<(typeof bcs.TransactionEffects.$inferType)['V1']>;
	epoch?: string | null;
	objectTypes: Record<string, string>;
}): Experimental_SuiClientTypes.TransactionEffects {
	throw new Error('V1 effects are not supported yet');
}

function parseTransactionEffectsV2({
	bytes,
	effects,
	epoch,
	objectTypes,
}: {
	bytes: Uint8Array;
	effects: NonNullable<(typeof bcs.TransactionEffects.$inferType)['V2']>;
	epoch?: string | null;
	objectTypes: Record<string, string>;
}): Experimental_SuiClientTypes.TransactionEffects {
	const changedObjects = effects.changedObjects.map(
		([id, change]): Experimental_SuiClientTypes.ChangedObject => {
			return {
				id,
				inputState: change.inputState.$kind === 'Exist' ? 'Exists' : 'DoesNotExist',
				inputVersion: change.inputState.Exist?.[0][0] ?? null,
				inputDigest: change.inputState.Exist?.[0][1] ?? null,
				inputOwner: change.inputState.Exist?.[1] ?? null,
				outputState:
					change.outputState.$kind === 'NotExist' ? 'DoesNotExist' : change.outputState.$kind,
				outputVersion:
					change.outputState.$kind === 'PackageWrite'
						? change.outputState.PackageWrite?.[0]
						: change.outputState.ObjectWrite
							? effects.lamportVersion
							: null,
				outputDigest:
					change.outputState.$kind === 'PackageWrite'
						? change.outputState.PackageWrite?.[1]
						: (change.outputState.ObjectWrite?.[0] ?? null),
				outputOwner: change.outputState.ObjectWrite ? change.outputState.ObjectWrite[1] : null,
				idOperation: change.idOperation.$kind,
				objectType: objectTypes[id] ?? null,
			};
		},
	);

	return {
		bcs: bytes,
		digest: effects.transactionDigest,
		version: 2,
		status:
			effects.status.$kind === 'Success'
				? {
						success: true,
						error: null,
					}
				: {
						success: false,
						// TODO: add command
						error: effects.status.Failed.error.$kind,
					},
		epoch: epoch ?? null,
		gasUsed: effects.gasUsed,
		transactionDigest: effects.transactionDigest,
		gasObject:
			effects.gasObjectIndex === null ? null : (changedObjects[effects.gasObjectIndex] ?? null),
		eventsDigest: effects.eventsDigest,
		dependencies: effects.dependencies,
		lamportVersion: effects.lamportVersion,
		changedObjects,
		unchangedSharedObjects: effects.unchangedSharedObjects.map(
			([objectId, object]): Experimental_SuiClientTypes.UnchangedSharedObject => {
				return {
					kind: object.$kind,
					objectId: objectId,
					version:
						object.$kind === 'ReadOnlyRoot'
							? object.ReadOnlyRoot[0]
							: (object[object.$kind] as string | null),
					digest: object.$kind === 'ReadOnlyRoot' ? object.ReadOnlyRoot[1] : null,
					objectType: objectTypes[objectId] ?? null,
				};
			},
		),
		auxiliaryDataDigest: effects.auxDataDigest,
	};
}

function parseTransactionEffectsJson({
	bytes,
	effects,
	epoch,
	objectChanges,
}: {
	bytes?: Uint8Array;
	effects: TransactionEffects;
	epoch?: string | null;
	objectChanges: SuiObjectChange[] | null;
}): Experimental_SuiClientTypes.TransactionEffects {
	const changedObjects: Experimental_SuiClientTypes.ChangedObject[] = [];
	const unchangedSharedObjects: Experimental_SuiClientTypes.UnchangedSharedObject[] = [];

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
					objectType: null,
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
					objectType: change.objectType,
				});
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
					objectType: change.objectType,
				});
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
					objectType: change.objectType,
				});
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
					objectType: change.objectType,
				});
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
					objectType: change.objectType,
				});
				break;
		}
	});

	return {
		bcs: bytes ?? null,
		digest: effects.transactionDigest,
		version: 2,
		status:
			effects.status.status === 'success'
				? { success: true, error: null }
				: { success: false, error: effects.status.error! },
		epoch: epoch ?? null,
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
			objectType: normalizeStructTag('0x2::coin::Coin<0x2::sui::SUI>'),
		},
		eventsDigest: effects.eventsDigest ?? null,
		dependencies: effects.dependencies ?? [],
		lamportVersion: effects.gasObject.reference.version,
		changedObjects,
		unchangedSharedObjects,
		auxiliaryDataDigest: null,
	};
}

const Balance = bcs.struct('Balance', {
	value: bcs.u64(),
});

const Coin = bcs.struct('Coin', {
	id: bcs.Address,
	balance: Balance,
});
