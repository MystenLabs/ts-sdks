// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64 } from '@mysten/bcs';

import { bcs } from '../../bcs/index.js';
import type {
	ObjectOwner,
	SuiClient,
	SuiObjectData,
	SuiTransactionBlockResponse,
} from '../../client/index.js';
import { batch } from '../../transactions/plugins/utils.js';
import { Transaction } from '../../transactions/Transaction.js';
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
					balance: BigInt(coin.balance),
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
				balance: BigInt(balance.totalBalance),
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
				balance: BigInt(balance.totalBalance),
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
				showEffects: true,
				showEvents: true,
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
				// TODO: Effects aren't returned as bcs from dryRun, once we define structured effects we can return those instead
				effects: result.effects as never,
				signatures: [],
				bcs: options.transaction,
			},
		};
	}
	async getReferenceGasPrice() {
		const referenceGasPrice = await this.#jsonRpcClient.getReferenceGasPrice();
		return {
			referenceGasPrice,
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
			ConsensusV2Owner: {
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
		effects: new Uint8Array(transaction.rawEffects!),
		bcs: bcs.TransactionData.serialize(parsedTx.intentMessage.value).toBytes(),
		signatures: parsedTx.txSignatures,
	};
}

const Balance = bcs.struct('Balance', {
	value: bcs.u64(),
});

const Coin = bcs.struct('Coin', {
	id: bcs.Address,
	balance: Balance,
});
