// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { chunk, DataLoader } from '@mysten/utils';
import { isValidNamedPackage, isValidNamedType } from '../utils/move-registry.js';
import type { StructTag } from '../utils/sui-types.js';
import {
	isValidSuiAddress,
	normalizeStructTag,
	normalizeSuiAddress,
	parseStructTag,
} from '../utils/sui-types.js';
import type { ClientCache } from './cache.js';
import type { TransactionDataBuilder } from '../transactions/TransactionData.js';
import { PACKAGE_VERSION } from '../version.js';
import type { Experimental_SuiClientTypes } from './types.js';

const NAME_SEPARATOR = '/';
const MVR_API_HEADER = {
	'Mvr-Source': `@mysten/sui@${PACKAGE_VERSION}`,
};

export interface MvrClientOptions {
	cache: ClientCache;
	url?: string;
	pageSize?: number;
	overrides?: {
		packages?: Record<string, string>;
		types?: Record<string, string>;
	};
}

export class MvrClient implements Experimental_SuiClientTypes.MvrMethods {
	#cache: ClientCache;
	#url?: string;
	#pageSize: number;
	#overrides: {
		packages?: Record<string, string>;
		types?: Record<string, string>;
	};

	constructor({ cache, url, pageSize = 50, overrides }: MvrClientOptions) {
		this.#cache = cache;
		this.#url = url;
		this.#pageSize = pageSize;
		this.#overrides = {
			packages: overrides?.packages,
			types: overrides?.types,
		};

		validateOverrides(this.#overrides);
	}

	get #mvrPackageDataLoader() {
		return this.#cache.readSync(['#mvrPackageDataLoader', this.#url ?? ''], () => {
			const loader = new DataLoader<string, string>(async (packages) => {
				if (!this.#url) {
					throw new Error(
						`MVR Api URL is not set for the current client (resolving ${packages.join(', ')})`,
					);
				}
				const resolved = await this.#resolvePackages(packages);

				return packages.map(
					(pkg) => resolved[pkg] ?? new Error(`Failed to resolve package: ${pkg}`),
				);
			});
			const overrides = this.#overrides?.packages;

			if (overrides) {
				for (const [pkg, id] of Object.entries(overrides)) {
					loader.prime(pkg, id);
				}
			}

			return loader;
		});
	}

	get #mvrTypeDataLoader() {
		return this.#cache.readSync(['#mvrTypeDataLoader', this.#url ?? ''], () => {
			const loader = new DataLoader<string, string>(async (types) => {
				if (!this.#url) {
					throw new Error(
						`MVR Api URL is not set for the current client (resolving ${types.join(', ')})`,
					);
				}
				const resolved = await this.#resolveTypes(types);

				return types.map((type) => resolved[type] ?? new Error(`Failed to resolve type: ${type}`));
			});

			const overrides = this.#overrides?.types;

			if (overrides) {
				for (const [type, id] of Object.entries(overrides)) {
					loader.prime(type, id);
				}
			}

			return loader;
		});
	}

	async #resolvePackages(packages: readonly string[]) {
		if (packages.length === 0) return {};

		const batches = chunk(packages, this.#pageSize);
		const results: Record<string, string> = {};

		await Promise.all(
			batches.map(async (batch) => {
				const data = await this.#fetch<{ resolution: Record<string, { package_id: string }> }>(
					'/v1/resolution/bulk',
					{
						names: batch,
					},
				);

				if (!data?.resolution) return;

				for (const pkg of Object.keys(data?.resolution)) {
					const pkgData = data.resolution[pkg]?.package_id;

					if (!pkgData) continue;

					results[pkg] = pkgData;
				}
			}),
		);

		return results;
	}

	async #resolveTypes(types: readonly string[]) {
		if (types.length === 0) return {};

		const batches = chunk(types, this.#pageSize);
		const results: Record<string, string> = {};

		await Promise.all(
			batches.map(async (batch) => {
				const data = await this.#fetch<{ resolution: Record<string, { type_tag: string }> }>(
					'/v1/struct-definition/bulk',
					{
						types: batch,
					},
				);

				if (!data?.resolution) return;

				for (const type of Object.keys(data?.resolution)) {
					const typeData = data.resolution[type]?.type_tag;
					if (!typeData) continue;

					results[type] = typeData;
				}
			}),
		);

		return results;
	}

	async #fetch<T>(url: string, body: Record<string, unknown>): Promise<T> {
		if (!this.#url) {
			throw new Error('MVR Api URL is not set for the current client');
		}

		const response = await fetch(`${this.#url}${url}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...MVR_API_HEADER,
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const errorBody = await response.json().catch(() => ({}));
			throw new Error(`Failed to resolve types: ${errorBody?.message}`);
		}

		return response.json();
	}

	async resolvePackage({
		package: name,
	}: Experimental_SuiClientTypes.MvrResolvePackageOptions): Promise<Experimental_SuiClientTypes.MvrResolvePackageResponse> {
		if (!hasMvrName(name)) {
			return {
				package: name,
			};
		}
		const resolved = await this.#mvrPackageDataLoader.load(name);
		return {
			package: resolved,
		};
	}

	async resolveType({
		type,
	}: Experimental_SuiClientTypes.MvrResolveTypeOptions): Promise<Experimental_SuiClientTypes.MvrResolveTypeResponse> {
		if (!hasMvrName(type)) {
			return {
				type,
			};
		}

		const mvrTypes = [...extractMvrTypes(type)];
		const resolvedTypes = await this.#mvrTypeDataLoader.loadMany(mvrTypes);

		const typeMap: Record<string, string> = {};

		for (let i = 0; i < mvrTypes.length; i++) {
			const resolvedType = resolvedTypes[i];
			if (resolvedType instanceof Error) {
				throw resolvedType;
			}
			typeMap[mvrTypes[i]] = resolvedType;
		}

		return {
			type: replaceMvrNames(type, typeMap),
		};
	}

	async resolve({
		types = [],
		packages = [],
	}: Experimental_SuiClientTypes.MvrResolveOptions): Promise<Experimental_SuiClientTypes.MvrResolveResponse> {
		const mvrTypes = new Set<string>();

		for (const type of types ?? []) {
			extractMvrTypes(type, mvrTypes);
		}

		const typesArray = [...mvrTypes];
		const [resolvedTypes, resolvedPackages] = await Promise.all([
			typesArray.length > 0 ? this.#mvrTypeDataLoader.loadMany(typesArray) : [],
			packages.length > 0 ? this.#mvrPackageDataLoader.loadMany(packages) : [],
		]);

		const typeMap: Record<string, string> = {
			...this.#overrides?.types,
		};

		for (const [i, type] of typesArray.entries()) {
			const resolvedType = resolvedTypes[i];
			if (resolvedType instanceof Error) {
				throw resolvedType;
			}
			typeMap[type] = resolvedType;
		}

		const replacedTypes: Record<
			string,
			{
				type: string;
			}
		> = {};

		for (const type of types ?? []) {
			const resolvedType = replaceMvrNames(type, typeMap);

			replacedTypes[type] = {
				type: resolvedType,
			};
		}

		const replacedPackages: Record<
			string,
			{
				package: string;
			}
		> = {};

		for (const [i, pkg] of (packages ?? []).entries()) {
			const resolvedPkg = this.#overrides?.packages?.[pkg] ?? resolvedPackages[i];

			if (resolvedPkg instanceof Error) {
				throw resolvedPkg;
			}

			replacedPackages[pkg] = {
				package: resolvedPkg,
			};
		}

		return {
			types: replacedTypes,
			packages: replacedPackages,
		};
	}
}

function validateOverrides(overrides?: {
	packages?: Record<string, string>;
	types?: Record<string, string>;
}) {
	if (overrides?.packages) {
		for (const [pkg, id] of Object.entries(overrides.packages)) {
			if (!isValidNamedPackage(pkg)) {
				throw new Error(`Invalid package name: ${pkg}`);
			}
			if (!isValidSuiAddress(normalizeSuiAddress(id))) {
				throw new Error(`Invalid package ID: ${id}`);
			}
		}
	}

	if (overrides?.types) {
		for (const [type, val] of Object.entries(overrides.types)) {
			// validate that types are first-level only.
			if (parseStructTag(type).typeParams.length > 0) {
				throw new Error(
					'Type overrides must be first-level only. If you want to supply generic types, just pass each type individually.',
				);
			}

			const parsedValue = parseStructTag(val);

			if (!isValidSuiAddress(parsedValue.address)) {
				throw new Error(`Invalid type: ${val}`);
			}
		}
	}
}

/**
 * Extracts all named types from a given type.
 */
export function extractMvrTypes(type: string | StructTag, types = new Set<string>()) {
	if (typeof type === 'string' && !hasMvrName(type)) return types;

	const tag = isStructTag(type) ? type : parseStructTag(type);

	if (hasMvrName(tag.address)) types.add(`${tag.address}::${tag.module}::${tag.name}`);

	for (const param of tag.typeParams) {
		extractMvrTypes(param, types);
	}

	return types;
}

/**
 * Traverses a type, and replaces any found names with their resolved equivalents,
 * based on the supplied type cache.
 */
function replaceMvrNames(tag: string | StructTag, typeCache: Record<string, string>): string {
	const type = isStructTag(tag) ? tag : parseStructTag(tag);

	const typeTag = `${type.address}::${type.module}::${type.name}`;
	const cacheHit = typeCache[typeTag];

	return normalizeStructTag({
		...type,
		address: cacheHit ? cacheHit.split('::')[0] : type.address,
		typeParams: type.typeParams.map((param) => replaceMvrNames(param, typeCache)),
	});
}

export function hasMvrName(nameOrType: string) {
	return (
		nameOrType.includes(NAME_SEPARATOR) || nameOrType.includes('@') || nameOrType.includes('.sui')
	);
}

function isStructTag(type: string | StructTag): type is StructTag {
	return (
		typeof type === 'object' &&
		'address' in type &&
		'module' in type &&
		'name' in type &&
		'typeParams' in type
	);
}

export type NamedPackagesOverrides = {
	packages: Record<string, string>;
	types: Record<string, string>;
};

/**
 * Looks up all `.move` names in a transaction block.
 * Returns a list of all the names found.
 */
export function findNamesInTransaction(builder: TransactionDataBuilder): {
	packages: string[];
	types: string[];
} {
	const packages: Set<string> = new Set();
	const types: Set<string> = new Set();

	for (const command of builder.commands) {
		switch (command.$kind) {
			case 'MakeMoveVec':
				if (command.MakeMoveVec.type) {
					getNamesFromTypeList([command.MakeMoveVec.type]).forEach((type) => {
						types.add(type);
					});
				}
				break;
			case 'MoveCall':
				const moveCall = command.MoveCall;

				const pkg = moveCall.package.split('::')[0];
				if (hasMvrName(pkg)) {
					if (!isValidNamedPackage(pkg)) throw new Error(`Invalid package name: ${pkg}`);
					packages.add(pkg);
				}

				getNamesFromTypeList(moveCall.typeArguments ?? []).forEach((type) => {
					types.add(type);
				});

				break;
			default:
				break;
		}
	}

	return {
		packages: [...packages],
		types: [...types],
	};
}

/**
 * Replace all names & types in a transaction block
 * with their resolved names/types.
 */
export function replaceNames(
	builder: TransactionDataBuilder,
	resolved: Experimental_SuiClientTypes.MvrResolveResponse,
) {
	for (const command of builder.commands) {
		// Replacements for `MakeMoveVec` commands (that can include types)
		if (command.MakeMoveVec?.type) {
			if (!hasMvrName(command.MakeMoveVec.type)) continue;
			if (!resolved.types[command.MakeMoveVec.type])
				throw new Error(`No resolution found for type: ${command.MakeMoveVec.type}`);
			command.MakeMoveVec.type = resolved.types[command.MakeMoveVec.type].type;
		}
		// Replacements for `MoveCall` commands (that can include packages & types)
		const tx = command.MoveCall;
		if (!tx) continue;

		const nameParts = tx.package.split('::');
		const name = nameParts[0];

		if (hasMvrName(name) && !resolved.packages[name])
			throw new Error(`No address found for package: ${name}`);

		// Replace package name with address.
		if (hasMvrName(name)) {
			nameParts[0] = resolved.packages[name].package;
			tx.package = nameParts.join('::');
		}

		const types = tx.typeArguments;
		if (!types) continue;

		for (let i = 0; i < types.length; i++) {
			if (!hasMvrName(types[i])) continue;

			if (!resolved.types[types[i]]) throw new Error(`No resolution found for type: ${types[i]}`);
			types[i] = resolved.types[types[i]].type;
		}

		tx.typeArguments = types;
	}
}

/**
 * Returns a list of unique types that include a name
 * from the given list. This list is retrieved from the Transaction Data.
 */
function getNamesFromTypeList(types: string[]) {
	const names = new Set<string>();
	for (const type of types) {
		if (hasMvrName(type)) {
			if (!isValidNamedType(type)) throw new Error(`Invalid type with names: ${type}`);
			names.add(type);
		}
	}
	return names;
}
