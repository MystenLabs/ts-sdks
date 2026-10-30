// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { normalizeSuiAddress } from '@mysten/sui/utils';
import { createAnalyzer } from '../analyzer.js';
import { data } from './core.js';

const SUI_FRAMEWORK_ADDRESS = normalizeSuiAddress('0x2');
const ADDRESS_ALIAS_MODULE = 'address_alias';

export interface AddressAliasCall {
	/** Index of the MoveCall command in the transaction. */
	index: number;
	/** The `0x2::address_alias` function called, e.g. `enable`, `add`, `replace_all`, `remove`. */
	function: string;
}

/**
 * MoveCalls into `0x2::address_alias`, which enables or changes the set of
 * addresses that can sign transactions for an account.
 *
 * Every function in that module is `entry`, and `AddressAliases` has only `key`,
 * so the module can only be reached by a direct MoveCall command in the
 * transaction. Checking the transaction's commands therefore finds every alias
 * change.
 */
export const addressAliasCalls = createAnalyzer({
	dependencies: { data },
	analyze:
		() =>
		({ data }) => {
			const result: AddressAliasCall[] = [];

			data.commands.forEach((command, index) => {
				if (command.$kind !== 'MoveCall') return;
				const { package: packageId, module, function: fn } = command.MoveCall;
				if (
					normalizeSuiAddress(packageId) === SUI_FRAMEWORK_ADDRESS &&
					module === ADDRESS_ALIAS_MODULE
				) {
					result.push({ index, function: fn });
				}
			});

			return { result };
		},
});
