// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { isValidNamedPackage, isValidNamedType } from '../../utils/move-registry.js';
import type { TransactionDataBuilder } from '../TransactionData.js';

export type NamedPackagesPluginCache = {
	packages: Record<string, string>;
	types: Record<string, string>;
};

const NAME_SEPARATOR = '/';

export type NameResolutionRequest = {
	id: number;
	type: 'package' | 'moveType';
	name: string;
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
		if (command.MakeMoveVec?.type) {
			getNamesFromTypeList([command.MakeMoveVec.type]).forEach((type) => {
				types.add(type);
			});
			continue;
		}
		if (!('MoveCall' in command)) continue;
		const tx = command.MoveCall;

		if (!tx) continue;

		const pkg = tx.package.split('::')[0];
		if (hasMvrName(pkg)) {
			if (!isValidNamedPackage(pkg)) throw new Error(`Invalid package name: ${pkg}`);
			packages.add(pkg);
		}

		getNamesFromTypeList(tx.typeArguments ?? []).forEach((type) => {
			types.add(type);
		});
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
export function replaceNames(builder: TransactionDataBuilder, cache: NamedPackagesPluginCache) {
	for (const command of builder.commands) {
		// Replacements for `MakeMoveVec` commands (that can include types)
		if (command.MakeMoveVec?.type) {
			if (!hasMvrName(command.MakeMoveVec.type)) continue;
			if (!cache.types[command.MakeMoveVec.type])
				throw new Error(`No resolution found for type: ${command.MakeMoveVec.type}`);
			command.MakeMoveVec.type = cache.types[command.MakeMoveVec.type];
		}
		// Replacements for `MoveCall` commands (that can include packages & types)
		const tx = command.MoveCall;
		if (!tx) continue;

		const nameParts = tx.package.split('::');
		const name = nameParts[0];

		if (hasMvrName(name) && !cache.packages[name])
			throw new Error(`No address found for package: ${name}`);

		// Replace package name with address.
		if (hasMvrName(name)) {
			nameParts[0] = cache.packages[name];
			tx.package = nameParts.join('::');
		}

		const types = tx.typeArguments;
		if (!types) continue;

		for (let i = 0; i < types.length; i++) {
			if (!hasMvrName(types[i])) continue;

			if (!cache.types[types[i]]) throw new Error(`No resolution found for type: ${types[i]}`);
			types[i] = cache.types[types[i]];
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

function hasMvrName(nameOrType: string) {
	return (
		nameOrType.includes(NAME_SEPARATOR) || nameOrType.includes('@') || nameOrType.includes('.sui')
	);
}
