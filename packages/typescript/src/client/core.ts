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

	abstract getObjects(
		options: SuiClientTypes.GetObjectsOptions,
	): Promise<SuiClientTypes.GetObjectsResponse>;

	async getObject(
		options: SuiClientTypes.GetObjectOptions,
	): Promise<SuiClientTypes.GetObjectResponse> {
		const { objectId } = options;
		const {
			objects: [result],
		} = await this.getObjects({ objectIds: [objectId], signal: options.signal });
		if (result instanceof Error) {
			throw result;
		}
		return { object: result };
	}

	abstract getCoins(
		options: SuiClientTypes.GetCoinsOptions,
	): Promise<SuiClientTypes.GetCoinsResponse>;

	abstract getOwnedObjects(
		options: SuiClientTypes.GetOwnedObjectsOptions,
	): Promise<SuiClientTypes.GetOwnedObjectsResponse>;

	abstract getBalance(
		options: SuiClientTypes.GetBalanceOptions,
	): Promise<SuiClientTypes.GetBalanceResponse>;

	abstract getAllBalances(
		options: SuiClientTypes.GetAllBalancesOptions,
	): Promise<SuiClientTypes.GetAllBalancesResponse>;

	abstract getTransaction(
		options: SuiClientTypes.GetTransactionOptions,
	): Promise<SuiClientTypes.GetTransactionResponse>;

	abstract executeTransaction(
		options: SuiClientTypes.ExecuteTransactionOptions,
	): Promise<SuiClientTypes.ExecuteTransactionResponse>;

	abstract dryRunTransaction(
		options: SuiClientTypes.DryRunTransactionOptions,
	): Promise<SuiClientTypes.DryRunTransactionResponse>;

	abstract getReferenceGasPrice(
		options?: SuiClientTypes.GetReferenceGasPriceOptions,
	): Promise<SuiClientTypes.GetReferenceGasPriceResponse>;

	abstract getDynamicFields(
		options: SuiClientTypes.GetDynamicFieldsOptions,
	): Promise<SuiClientTypes.GetDynamicFieldsResponse>;

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
		});

		if (fieldObject instanceof Error) {
			throw fieldObject;
		}

		const fieldType = parseStructTag(fieldObject.type);
		const content = await fieldObject.content;

		return {
			dynamicField: {
				id: fieldObject.id,
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

	async waitForTransaction({
		signal,
		timeout = 60 * 1000,
		...input
	}: {
		/** An optional abort signal that can be used to cancel the wait. */
		signal?: AbortSignal;
		/** The amount of time to wait for transaction. Defaults to one minute. */
		timeout?: number;
	} & SuiClientTypes.GetTransactionOptions): Promise<SuiClientTypes.GetTransactionResponse> {
		const abortSignal = signal
			? AbortSignal.any([AbortSignal.timeout(timeout), signal])
			: AbortSignal.timeout(timeout);

		const abortPromise = new Promise((_, reject) => {
			abortSignal.addEventListener('abort', () => reject(abortSignal.reason));
		});

		abortPromise.catch(() => {
			// Swallow unhandled rejections that might be thrown after early return
		});

		// eslint-disable-next-line no-constant-condition
		while (true) {
			abortSignal.throwIfAborted();
			try {
				return await this.getTransaction({
					...input,
					signal: abortSignal,
				});
			} catch {
				await Promise.race([new Promise((resolve) => setTimeout(resolve, 2_000)), abortPromise]);
			}
		}
	}
}
