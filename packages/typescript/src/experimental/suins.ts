// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { chunk } from '@mysten/utils';
import { isValidNamedPackage } from '../utils/move-registry.js';
import type { StructTag } from '../utils/sui-types.js';
import {
	isValidSuiAddress,
	normalizeStructTag,
	normalizeSuiAddress,
	parseStructTag,
} from '../utils/sui-types.js';

const NAME_SEPARATOR = '/';

export async function resolvePackages(
	packages: readonly string[],
	apiUrl: string,
	pageSize: number,
) {
	if (packages.length === 0) return {};

	const batches = chunk(packages, pageSize);
	const results: Record<string, string> = {};

	await Promise.all(
		batches.map(async (batch) => {
			const response = await fetch(`${apiUrl}/v1/resolution/bulk`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					names: batch,
				}),
			});

			if (!response.ok) {
				const errorBody = await response.json().catch(() => ({}));
				throw new Error(`Failed to resolve packages: ${errorBody?.message}`);
			}

			const data = await response.json();

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

export async function resolveTypes(types: readonly string[], apiUrl: string, pageSize: number) {
	if (types.length === 0) return {};

	const batches = chunk(types, pageSize);
	const results: Record<string, string> = {};

	await Promise.all(
		batches.map(async (batch) => {
			const response = await fetch(`${apiUrl}/v1/struct-definition/bulk`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					types: batch,
				}),
			});

			if (!response.ok) {
				const errorBody = await response.json().catch(() => ({}));
				throw new Error(`Failed to resolve types: ${errorBody?.message}`);
			}

			const data = await response.json();

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

export function validateOverrides(overrides?: {
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
export function replaceMvrNames(
	tag: string | StructTag,
	typeCache: Record<string, string>,
): string {
	const type = isStructTag(tag) ? tag : parseStructTag(tag);

	const typeTag = `${type.address}::${type.module}::${type.name}`;
	const cacheHit = typeCache[typeTag];

	return normalizeStructTag({
		...type,
		address: cacheHit ? cacheHit.split('::')[0] : type.address,
		typeParams: type.typeParams.map((param) => replaceMvrNames(param, typeCache)),
	});
}

function hasMvrName(nameOrType: string) {
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
