// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { TypeTagSerializer } from '../bcs/type-tag-serializer.js';
import type { TransactionPlugin } from '../transactions/index.js';
import { deriveDynamicFieldID } from '../utils/dynamic-fields.js';
import { normalizeStructTag, parseStructTag, SUI_ADDRESS_LENGTH } from '../utils/sui-types.js';
import { Experimental_BaseClient } from './client.js';
import type { ClientWithExtensions, Experimental_SuiClientTypes } from './types.js';
import { MvrClient } from './mvr.js';

export type ClientWithCoreApi = ClientWithExtensions<{
	core: Experimental_CoreClient;
}>;

export interface Experimental_CoreClientOptions
	extends Experimental_SuiClientTypes.SuiClientOptions {
	base: Experimental_BaseClient;
	mvr?: Experimental_SuiClientTypes.MvrOptions;
}

const DEFAULT_MVR_URLS: Record<string, string> = {
	mainnet: 'https://mainnet.mvr.mystenlabs.com',
	testnet: 'https://testnet.mvr.mystenlabs.com',
};

export abstract class Experimental_CoreClient
	extends Experimental_BaseClient
	implements Experimental_SuiClientTypes.TransportMethods
{
	core = this;
	mvr: Experimental_SuiClientTypes.MvrMethods;

	constructor(options: Experimental_CoreClientOptions) {
		super(options);

		this.mvr = new MvrClient({
			cache: this.cache.scope('core.mvr'),
			url: options.mvr?.url ?? DEFAULT_MVR_URLS[this.network],
			pageSize: options.mvr?.pageSize,
			overrides: options.mvr?.overrides,
		});
	}

	abstract getObjects(
		options: Experimental_SuiClientTypes.GetObjectsOptions,
	): Promise<Experimental_SuiClientTypes.GetObjectsResponse>;

	async getObject(
		options: Experimental_SuiClientTypes.GetObjectOptions,
	): Promise<Experimental_SuiClientTypes.GetObjectResponse> {
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
		options: Experimental_SuiClientTypes.GetCoinsOptions,
	): Promise<Experimental_SuiClientTypes.GetCoinsResponse>;

	abstract getOwnedObjects(
		options: Experimental_SuiClientTypes.GetOwnedObjectsOptions,
	): Promise<Experimental_SuiClientTypes.GetOwnedObjectsResponse>;

	abstract getBalance(
		options: Experimental_SuiClientTypes.GetBalanceOptions,
	): Promise<Experimental_SuiClientTypes.GetBalanceResponse>;

	abstract getAllBalances(
		options: Experimental_SuiClientTypes.GetAllBalancesOptions,
	): Promise<Experimental_SuiClientTypes.GetAllBalancesResponse>;

	abstract getTransaction(
		options: Experimental_SuiClientTypes.GetTransactionOptions,
	): Promise<Experimental_SuiClientTypes.GetTransactionResponse>;

	abstract executeTransaction(
		options: Experimental_SuiClientTypes.ExecuteTransactionOptions,
	): Promise<Experimental_SuiClientTypes.ExecuteTransactionResponse>;

	abstract dryRunTransaction(
		options: Experimental_SuiClientTypes.DryRunTransactionOptions,
	): Promise<Experimental_SuiClientTypes.DryRunTransactionResponse>;

	abstract getReferenceGasPrice(
		options?: Experimental_SuiClientTypes.GetReferenceGasPriceOptions,
	): Promise<Experimental_SuiClientTypes.GetReferenceGasPriceResponse>;

	abstract getDynamicFields(
		options: Experimental_SuiClientTypes.GetDynamicFieldsOptions,
	): Promise<Experimental_SuiClientTypes.GetDynamicFieldsResponse>;

	abstract resolveTransactionPlugin(): TransactionPlugin;

	abstract verifyZkLoginSignature(
		options: Experimental_SuiClientTypes.VerifyZkLoginSignatureOptions,
	): Promise<Experimental_SuiClientTypes.ZkLoginVerifyResponse>;

	abstract getMoveFunction(
		options: Experimental_SuiClientTypes.GetMoveFunctionOptions,
	): Promise<Experimental_SuiClientTypes.GetMoveFunctionResponse>;

	abstract defaultNameServiceName(
		options: Experimental_SuiClientTypes.DefaultNameServiceNameOptions,
	): Promise<Experimental_SuiClientTypes.DefaultNameServiceNameResponse>;

	async getDynamicField(
		options: Experimental_SuiClientTypes.GetDynamicFieldOptions,
	): Promise<Experimental_SuiClientTypes.GetDynamicFieldResponse> {
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
	} & Experimental_SuiClientTypes.GetTransactionOptions): Promise<Experimental_SuiClientTypes.GetTransactionResponse> {
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
