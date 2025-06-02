// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { DataLoader } from '@mysten/utils';
import { TypeTagSerializer } from '../bcs/type-tag-serializer.js';
import type { TransactionPlugin } from '../transactions/index.js';
import { deriveDynamicFieldID } from '../utils/dynamic-fields.js';
import { normalizeStructTag, parseStructTag, SUI_ADDRESS_LENGTH } from '../utils/sui-types.js';
import { Experimental_BaseClient } from './client.js';
import type { ClientWithExtensions, Experimental_SuiClientTypes } from './types.js';
import {
	extractMvrTypes,
	replaceMvrNames,
	resolvePackages,
	resolveTypes,
	validateOverrides,
} from './suins.js';

export type ClientWithCoreApi = ClientWithExtensions<{
	core: Experimental_CoreClient;
}>;

export interface Experimental_CoreClientOptions
	extends Experimental_SuiClientTypes.SuiClientOptions {
	base: Experimental_BaseClient;
	mvr?: Experimental_SuiClientTypes.MvrOptions;
}

export abstract class Experimental_CoreClient
	extends Experimental_BaseClient
	implements Experimental_SuiClientTypes.TransportMethods
{
	core = this;
	#mvrUrl?: string;
	#mvrPageSize: number;
	#mvrOverrides?: {
		packages?: Record<string, string>;
		types?: Record<string, string>;
	};
	#cache = this.base.cache.scope('core');

	constructor(options: Experimental_CoreClientOptions) {
		super(options);
		this.#mvrUrl = options.mvr?.apiUrl;
		this.#mvrPageSize = options.mvr?.pageSize ?? 50;
		this.#mvrOverrides = options.mvr?.overrides;
		validateOverrides(this.#mvrOverrides);
	}

	#mvrPackageDataLoader(url = this.#mvrUrl) {
		return this.#cache.readSync(['#mvrPackageDataLoader', url ?? ''], () => {
			const loader = new DataLoader<string, string>(async (packages) => {
				if (!url) {
					throw new Error('MVR Api URL is not set for the current client');
				}
				const resolved = await resolvePackages(packages, url, this.#mvrPageSize);

				return packages.map(
					(pkg) => resolved[pkg] ?? new Error(`Failed to resolve package: ${pkg}`),
				);
			});
			const overrides = this.#mvrOverrides?.packages;

			if (overrides) {
				for (const [pkg, id] of Object.entries(overrides)) {
					loader.prime(pkg, id);
				}
			}

			return loader;
		});
	}

	#mvrTypeDataLoader(url = this.#mvrUrl) {
		return this.#cache.readSync(['#mvrTypeDataLoader', url ?? ''], () => {
			const loader = new DataLoader<string, string>(async (types) => {
				if (!url) {
					throw new Error('MVR Api URL is not set for the current client');
				}
				const resolved = await resolveTypes(types, url, this.#mvrPageSize);

				return types.map((type) => resolved[type] ?? new Error(`Failed to resolve type: ${type}`));
			});

			const overrides = this.#mvrOverrides?.types;

			if (overrides) {
				for (const [type, id] of Object.entries(overrides)) {
					loader.prime(type, id);
				}
			}

			return loader;
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

	async getDynamicField(
		options: Experimental_SuiClientTypes.GetDynamicFieldOptions,
	): Promise<Experimental_SuiClientTypes.GetDynamicFieldResponse> {
		const fieldId = deriveDynamicFieldID(
			options.parentId,
			TypeTagSerializer.parseFromStr(options.name.type),
			options.name.bcs,
		);
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
			} catch (e) {
				await Promise.race([new Promise((resolve) => setTimeout(resolve, 2_000)), abortPromise]);
			}
		}
	}

	resolveMvrPackage({ name, url }: { name: string; url?: string }): Promise<string> {
		return this.#mvrPackageDataLoader(url).load(name);
	}

	async resolveMvrType({ type, url }: { type: string; url?: string }): Promise<string> {
		const mvrTypes = [...extractMvrTypes(type)];
		const resolvedTypes = await this.#mvrTypeDataLoader(url).loadMany(mvrTypes);

		const typeMap: Record<string, string> = {};

		for (let i = 0; i < mvrTypes.length; i++) {
			const resolvedType = resolvedTypes[i];
			if (resolvedType instanceof Error) {
				throw resolvedType;
			}
			typeMap[mvrTypes[i]] = resolvedType;
		}

		return replaceMvrNames(type, typeMap);
	}

	async resolveMvrNames({
		types,
		packages,
		url,
		overrides,
	}: {
		types?: string[];
		packages?: string[];
		url?: string;
		/** @deprecated */
		overrides?: {
			packages?: Record<string, string>;
			types?: Record<string, string>;
		};
	}): Promise<{ types: Record<string, string>; packages: Record<string, string> }> {
		const mvrTypes = new Set<string>();

		for (const type of types ?? []) {
			extractMvrTypes(type, mvrTypes);
		}

		const filteredTypes = [...mvrTypes].filter((x) => !overrides?.types?.[x]);
		const filteredPackages = packages?.filter((x) => !overrides?.packages?.[x]) ?? [];

		const [resolvedTypes, resolvedPackages] = await Promise.all([
			filteredTypes.length > 0 ? this.#mvrTypeDataLoader(url).loadMany(filteredTypes) : [],
			filteredPackages.length > 0 ? this.#mvrPackageDataLoader(url).loadMany(filteredPackages) : [],
		]);

		const typeMap: Record<string, string> = {
			...overrides?.types,
		};

		for (const [i, type] of filteredTypes.entries()) {
			const resolvedType = resolvedTypes[i];
			if (resolvedType instanceof Error) {
				throw resolvedType;
			}
			typeMap[type] = resolvedType;
		}

		const replacedTypes: Record<string, string> = {};

		for (const type of types ?? []) {
			const resolvedType = replaceMvrNames(type, typeMap);

			replacedTypes[type] = resolvedType;
		}

		const replacedPackages: Record<string, string> = {};

		for (const [i, pkg] of (packages ?? []).entries()) {
			const resolvedPkg = overrides?.packages?.[pkg] ?? resolvedPackages[i];

			if (resolvedPkg instanceof Error) {
				throw resolvedPkg;
			}

			replacedPackages[pkg] = resolvedPkg;
		}

		return {
			types: replacedTypes,
			packages: replacedPackages,
		};
	}
}
