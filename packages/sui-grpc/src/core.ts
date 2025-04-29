// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Experimental_SuiClientTypes } from '@mysten/sui/experimental';
import { Experimental_CoreClient } from '@mysten/sui/experimental';
import type { SuiGrpcClient } from './client.js';
import type { Owner } from './proto/sui/rpc/v2beta/owner.js';
import { Owner_OwnerKind } from './proto/sui/rpc/v2beta/owner.js';
import { chunk, fromBase64, fromHex, toBase64, toHex } from '@mysten/utils';
import { bcs } from '@mysten/sui/bcs';
import type { ExecutedTransaction } from './proto/sui/rpc/v2beta/executed_transaction.js';
export interface GrpcCoreClientOptions {
	client: SuiGrpcClient;
}
export class GrpcCoreClient extends Experimental_CoreClient {
	#client: SuiGrpcClient;
	constructor(options: GrpcCoreClientOptions) {
		super({ network: options.client.network });
		this.#client = options.client;
	}

	async getObjects(
		options: Experimental_SuiClientTypes.GetObjectsOptions,
	): Promise<Experimental_SuiClientTypes.GetObjectsResponse> {
		const batches = chunk(options.objectIds, 50);
		const results: Experimental_SuiClientTypes.GetObjectsResponse['objects'] = [];

		for (const batch of batches) {
			const response = await this.#client.ledgerServiceClient.batchGetObjects({
				requests: batch.map((id) => ({ objectId: id })),
				readMask: {
					paths: ['owner', 'object_type', 'bcs', 'digest', 'version', 'object_id'],
				},
			});

			results.push(
				...response.response.objects.map(
					// TODO: GRPC currently errors on missing objects
					(object): Experimental_SuiClientTypes.ObjectResponse | Error => {
						return {
							id: object.objectId!,
							version: object.version?.toString()!,
							digest: object.digest!,
							content: object.bcs?.value!,
							owner: mapOwner(object.owner!),
							type: object.objectType!,
						};
					},
				),
			);
		}

		return {
			objects: results,
		};
	}
	async getOwnedObjects(
		options: Experimental_SuiClientTypes.GetOwnedObjectsOptions,
	): Promise<Experimental_SuiClientTypes.GetOwnedObjectsResponse> {
		const response = await this.#client.liveDataService.listOwnedObjects({
			owner: options.address,
			objectType: options.type,
			pageToken: options.cursor ? fromBase64(options.cursor) : undefined,
		});

		const objects = response.response.objects.map(
			(object): Experimental_SuiClientTypes.ObjectResponse => ({
				id: object.objectId!,
				version: object.version?.toString()!,
				digest: object.digest!,
				// TODO: List owned objects doesn't return content right now
				content: new Uint8Array(),
				owner: mapOwner(object.owner!),
				type: object.objectType!,
			}),
		);

		return {
			objects,
			cursor: response.response.nextPageToken ? toBase64(response.response.nextPageToken) : null,
			hasNextPage: response.response.nextPageToken !== undefined,
		};
	}
	async getCoins(
		options: Experimental_SuiClientTypes.GetCoinsOptions,
	): Promise<Experimental_SuiClientTypes.GetCoinsResponse> {
		// TODO: we need coins sorted by balance
		const response = await this.#client.liveDataService.listOwnedObjects({
			owner: options.address,
			objectType: `0x2::coin::Coin<${options.coinType}>`,
			pageToken: options.cursor ? fromBase64(options.cursor) : undefined,
		});

		return {
			objects: response.response.objects.map(
				(object): Experimental_SuiClientTypes.CoinResponse => ({
					id: object.objectId!,
					version: object.version?.toString()!,
					digest: object.digest!,
					// TODO: List owned objects doesn't return content right now
					content: new Uint8Array(),
					owner: mapOwner(object.owner!),
					type: object.objectType!,
					balance: object.balance?.toString()!,
				}),
			),
			cursor: response.response.nextPageToken ? toBase64(response.response.nextPageToken) : null,
			hasNextPage: response.response.nextPageToken !== undefined,
		};
	}

	async getBalance(
		_options: Experimental_SuiClientTypes.GetBalanceOptions,
	): Promise<Experimental_SuiClientTypes.GetBalanceResponse> {
		// TODO: GRPC doesn't expose balances yet
		throw new Error('Not implemented');
	}
	async getAllBalances(
		_options: Experimental_SuiClientTypes.GetAllBalancesOptions,
	): Promise<Experimental_SuiClientTypes.GetAllBalancesResponse> {
		// TODO: GRPC doesn't expose balances yet
		throw new Error('Not implemented');
	}
	async getTransaction(
		options: Experimental_SuiClientTypes.GetTransactionOptions,
	): Promise<Experimental_SuiClientTypes.GetTransactionResponse> {
		const { response } = await this.#client.ledgerServiceClient.getTransaction({
			digest: options.digest,
			readMask: {
				paths: ['effects.bcs', 'digest', 'transaction', 'input_objects', 'output_objects'],
			},
		});
		return {
			transaction: parseTransaction(response),
		};
	}
	async executeTransaction(
		options: Experimental_SuiClientTypes.ExecuteTransactionOptions,
	): Promise<Experimental_SuiClientTypes.ExecuteTransactionResponse> {
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
			})),
			readMask: {
				paths: [
					'transaction.effects.bcs',
					'transaction.digest',
					'transaction.transaction',
					'transaction.input_objects',
					'transaction.output_objects',
				],
			},
		});
		return {
			transaction: parseTransaction(response.transaction!),
		};
	}
	async dryRunTransaction(
		options: Experimental_SuiClientTypes.DryRunTransactionOptions,
	): Promise<Experimental_SuiClientTypes.DryRunTransactionResponse> {
		throw new Error('Not implemented');
	}
	async getReferenceGasPrice(): Promise<Experimental_SuiClientTypes.GetReferenceGasPriceResponse> {
		const response = await this.#client.ledgerServiceClient.getEpoch({});

		return {
			referenceGasPrice: response.response.referenceGasPrice?.toString()!,
		};
	}

	async getDynamicFields(
		options: Experimental_SuiClientTypes.GetDynamicFieldsOptions,
	): Promise<Experimental_SuiClientTypes.GetDynamicFieldsResponse> {
		const response = await this.#client.liveDataService.listDynamicFields({
			parent: options.parentId,
			pageToken: options.cursor ? fromBase64(options.cursor) : undefined,
		});

		return {
			dynamicFields: response.response.dynamicFields.map((field) => ({
				id: field.fieldId!,
				name: {
					type: field.nameType!,
					bcs: field.nameValue!,
				},
				type: field.dynamicObjectId
					? `0x2::dynamic_field::Field<0x2::dynamic_object_field::Wrapper<${field.nameType!}>,0x2::object::ID>`
					: `0x2::dynamic_field::Field<${field.nameType!},${field.valueType!}>`,
			})),
			cursor: response.response.nextPageToken ? toBase64(response.response.nextPageToken) : null,
			hasNextPage: response.response.nextPageToken !== undefined,
		};
	}

	// TODO: GRPC doesn't expose zklogin signature verification yet
	// async verifyZkLoginSignature(
	// 	options: Experimental_SuiClientTypes.VerifyZkLoginSignatureOptions,
	// ): Promise<Experimental_SuiClientTypes.ZkLoginVerifyResponse> {
	// 	throw new Error('Not implemented');
	// }
}

function mapOwner(owner: Owner): Experimental_SuiClientTypes.ObjectOwner {
	if (owner.kind === Owner_OwnerKind.IMMUTABLE) {
		return {
			$kind: 'Immutable',
			Immutable: true,
		};
	}
	if (owner.kind === Owner_OwnerKind.ADDRESS) {
		return {
			$kind: 'AddressOwner',
			AddressOwner: owner.address!,
		};
	}
	if (owner.kind === Owner_OwnerKind.OBJECT) {
		return {
			$kind: 'ObjectOwner',
			ObjectOwner: owner.address!,
		};
	}

	if (owner.kind === Owner_OwnerKind.SHARED) {
		if (owner.address) {
			return {
				$kind: 'ConsensusV2',
				ConsensusV2: {
					authenticator: {
						$kind: 'SingleOwner',
						SingleOwner: owner.address,
					},
					startVersion: owner.version?.toString()!,
				},
			};
		}
		return {
			$kind: 'Shared',
			Shared: {
				initialSharedVersion: owner.version?.toString()!,
			},
		};
	}

	throw new Error('Unknown owner kind');
}

export function parseTransactionEffects({
	effects,
	epoch,
	objectTypes,
}: {
	effects: Uint8Array;
	objectTypes: Record<string, string>;
	epoch?: string | null;
}): Experimental_SuiClientTypes.TransactionEffects {
	const fixed = fromHex(toHex(effects));

	// compare fixed and effects
	console.log(effects, fixed);
	for (let i = 0; i < fixed.length; i++) {
		if (fixed[i] !== effects[i]) {
			console.log(`byte ${i} is different: ${fixed[i]} !== ${effects[i]}`);
		}
	}

	const parsed = bcs.TransactionEffects.parse(fromHex(toHex(effects)));

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

function parseTransaction(
	transaction: ExecutedTransaction,
): Experimental_SuiClientTypes.TransactionResponse {
	const objectTypes: Record<string, string> = {};
	transaction.inputObjects.forEach((object) => {
		if (object.objectId && object.objectType) {
			objectTypes[object.objectId] = object.objectType;
		}
	});

	transaction.outputObjects.forEach((object) => {
		if (object.objectId && object.objectType) {
			objectTypes[object.objectId] = object.objectType;
		}
	});

	const effects = parseTransactionEffects({
		effects: transaction.effects?.bcs?.value!,
		epoch: transaction.effects?.epoch?.toString(),
		objectTypes,
	});

	console.dir(effects, { depth: null });

	return {
		effects,
		digest: transaction.digest!,
		bcs: transaction.transaction?.bcs?.value!,
		signatures: transaction.signatures.map((signature) => toBase64(signature.bcs?.value!)),
	};
}
