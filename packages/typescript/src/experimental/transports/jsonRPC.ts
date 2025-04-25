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
import { parseTransactionEffects } from './utils.js';

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
			},
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
	const objectTypes: Record<string, string> = {};

	transaction.objectChanges?.forEach((change) => {
		if (change.type !== 'published') {
			objectTypes[change.objectId] = change.objectType;
		}
	});

	return {
		digest: transaction.digest,
		effects: parseTransactionEffects({
			effects: new Uint8Array(transaction.rawEffects!),
			objectTypes,
		}),
		bcs: bcs.TransactionData.serialize(parsedTx.intentMessage.value).toBytes(),
		signatures: parsedTx.txSignatures,
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
