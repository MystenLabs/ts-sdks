// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { TypeTagSerializer } from '../bcs/type-tag-serializer.js';
import type { TransactionPlugin } from '../transactions/index.js';
import { deriveDynamicFieldID } from '../utils/dynamic-fields.js';
import { normalizeStructTag, parseStructTag, SUI_ADDRESS_LENGTH } from '../utils/sui-types.js';
import { BaseClient } from './client.js';
import type { ClientWithExtensions, SuiClientTypes } from './types.js';
import { MvrClient } from './mvr.js';

export type ClientWithCoreApi = ClientWithExtensions<{
	core: CoreClient;
}>;

export interface CoreClientOptions extends SuiClientTypes.SuiClientOptions {
	base: BaseClient;
	mvr?: SuiClientTypes.MvrOptions;
}

const DEFAULT_MVR_URLS: Record<string, string> = {
	mainnet: 'https://mainnet.mvr.mystenlabs.com',
	testnet: 'https://testnet.mvr.mystenlabs.com',
};

export abstract class CoreClient extends BaseClient implements SuiClientTypes.TransportMethods {
	core = this;
	mvr: SuiClientTypes.MvrMethods;

	constructor(options: CoreClientOptions) {
		super(options);

		this.mvr = new MvrClient({
			cache: this.cache.scope('core.mvr'),
			url: options.mvr?.url ?? DEFAULT_MVR_URLS[this.network],
			pageSize: options.mvr?.pageSize,
			overrides: options.mvr?.overrides,
		});
	}

	abstract getObjects<Include extends SuiClientTypes.ObjectInclude = object>(
		options: SuiClientTypes.GetObjectsOptions<Include>,
	): Promise<SuiClientTypes.GetObjectsResponse<Include>>;

	async getObject<Include extends SuiClientTypes.ObjectInclude = object>(
		options: SuiClientTypes.GetObjectOptions<Include>,
	): Promise<SuiClientTypes.GetObjectResponse<Include>> {
		const { objectId } = options;
		const {
			objects: [result],
		} = await this.getObjects({
			objectIds: [objectId],
			signal: options.signal,
			include: options.include,
		});
		if (result instanceof Error) {
			throw result;
		}
		return { object: result };
	}

	abstract listCoins(
		options: SuiClientTypes.ListCoinsOptions,
	): Promise<SuiClientTypes.ListCoinsResponse>;

	abstract listOwnedObjects<Include extends SuiClientTypes.ObjectInclude = object>(
		options: SuiClientTypes.ListOwnedObjectsOptions<Include>,
	): Promise<SuiClientTypes.ListOwnedObjectsResponse<Include>>;

	abstract getBalance(
		options: SuiClientTypes.GetBalanceOptions,
	): Promise<SuiClientTypes.GetBalanceResponse>;

	abstract listBalances(
		options: SuiClientTypes.ListBalancesOptions,
	): Promise<SuiClientTypes.ListBalancesResponse>;

	abstract getTransaction<Include extends SuiClientTypes.TransactionInclude = object>(
		options: SuiClientTypes.GetTransactionOptions<Include>,
	): Promise<SuiClientTypes.TransactionResult<Include>>;

	abstract executeTransaction<Include extends SuiClientTypes.TransactionInclude = object>(
		options: SuiClientTypes.ExecuteTransactionOptions<Include>,
	): Promise<SuiClientTypes.TransactionResult<Include>>;

	abstract simulateTransaction<Include extends SuiClientTypes.SimulateTransactionInclude = object>(
		options: SuiClientTypes.SimulateTransactionOptions<Include>,
	): Promise<SuiClientTypes.SimulateTransactionResult<Include>>;

	abstract getReferenceGasPrice(
		options?: SuiClientTypes.GetReferenceGasPriceOptions,
	): Promise<SuiClientTypes.GetReferenceGasPriceResponse>;

	abstract listDynamicFields(
		options: SuiClientTypes.ListDynamicFieldsOptions,
	): Promise<SuiClientTypes.ListDynamicFieldsResponse>;

	abstract resolveTransactionPlugin(): TransactionPlugin;

	abstract verifyZkLoginSignature(
		options: SuiClientTypes.VerifyZkLoginSignatureOptions,
	): Promise<SuiClientTypes.ZkLoginVerifyResponse>;

	abstract getMoveFunction(
		options: SuiClientTypes.GetMoveFunctionOptions,
	): Promise<SuiClientTypes.GetMoveFunctionResponse>;

	abstract defaultNameServiceName(
		options: SuiClientTypes.DefaultNameServiceNameOptions,
	): Promise<SuiClientTypes.DefaultNameServiceNameResponse>;

	async getDynamicField(
		options: SuiClientTypes.GetDynamicFieldOptions,
	): Promise<SuiClientTypes.GetDynamicFieldResponse> {
		const normalizedNameType = TypeTagSerializer.parseFromStr(
			(
				await this.core.mvr.resolveType({
					type: options.name.type,
				})
			).type,
		);
		const fieldId = deriveDynamicFieldID(options.parentId, normalizedNameType, options.name.bcs);
		const {
			objects: [fieldObject],
		} = await this.getObjects({
			objectIds: [fieldId],
			signal: options.signal,
			include: {
				previousTransaction: true,
				content: true,
			},
		});

		if (fieldObject instanceof Error) {
			throw fieldObject;
		}

		const fieldType = parseStructTag(fieldObject.type);
		const content = await fieldObject.content;

		return {
			dynamicField: {
				fieldId: fieldObject.objectId,
				digest: fieldObject.digest,
				version: fieldObject.version,
				type: fieldObject.type,
				previousTransaction: fieldObject.previousTransaction,
				name: {
					type:
						typeof fieldType.typeParams[0] === 'string'
							? fieldType.typeParams[0]
							: normalizeStructTag(fieldType.typeParams[0]),
					bcs: options.name.bcs,
				},
				value: {
					type:
						typeof fieldType.typeParams[1] === 'string'
							? fieldType.typeParams[1]
							: normalizeStructTag(fieldType.typeParams[1]),
					bcs: content.slice(SUI_ADDRESS_LENGTH + options.name.bcs.length),
				},
			},
		};
	}

	async waitForTransaction<Include extends SuiClientTypes.TransactionInclude = object>(
		options: SuiClientTypes.WaitForTransactionOptions<Include>,
	): Promise<SuiClientTypes.TransactionResult<Include>> {
		const { signal, timeout = 60 * 1000, include } = options;

		const digest =
			'result' in options && options.result
				? (options.result.Transaction ?? options.result.FailedTransaction)!.digest
				: options.digest;

		const abortSignal = signal
			? AbortSignal.any([AbortSignal.timeout(timeout), signal])
			: AbortSignal.timeout(timeout);

		const abortPromise = new Promise((_, reject) => {
			abortSignal.addEventListener('abort', () => reject(abortSignal.reason));
		});

		abortPromise.catch(() => {
			// Swallow unhandled rejections that might be thrown after early return
		});

		while (true) {
			abortSignal.throwIfAborted();
			try {
				return await this.getTransaction({
					digest,
					include,
					signal: abortSignal,
				});
			} catch {
				await Promise.race([new Promise((resolve) => setTimeout(resolve, 2_000)), abortPromise]);
			}
		}
	}
}
