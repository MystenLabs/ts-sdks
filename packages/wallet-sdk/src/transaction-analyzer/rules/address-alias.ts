// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { normalizeSuiAddress } from '@mysten/sui/utils';
import type { TransactionAnalysisIssue } from '../analyzer.js';
import { createAnalyzer } from '../analyzer.js';
import { data } from './core.js';

const SUI_FRAMEWORK_ADDRESS = normalizeSuiAddress('0x2');
const ADDRESS_ALIAS_MODULE = 'address_alias';

export interface AddressAliasChange {
	/** Index of the MoveCall command in the transaction. */
	index: number;
	/** The `0x2::address_alias` function called, e.g. `enable`, `add`, `replace_all`, `remove`. */
	function: string;
}

export interface AddressAliasChangesOptions {
	/**
	 * Don't report an issue for address alias changes. Only set this if your app
	 * is meant to change address aliases and shows the user what the change does.
	 */
	allowAddressAliasChanges?: boolean;
}

/**
 * Finds MoveCalls into `0x2::address_alias`, which enable or change the set of
 * addresses that can sign transactions for an account. Each one adds an issue,
 * because an alias change can give another key control of the account. Set
 * `allowAddressAliasChanges: true` to turn the issues off. The result always
 * lists the calls.
 *
 * Every function in that module is `entry`, and `AddressAliases` has only `key`,
 * so aliases can only change through a direct MoveCall in the transaction.
 * Checking the transaction's commands finds every change.
 *
 * Part of {@link defaultRules}.
 */
export const addressAliasChanges = createAnalyzer({
	dependencies: { data },
	analyze:
		({ allowAddressAliasChanges = false }: AddressAliasChangesOptions) =>
		({ data }) => {
			const result: AddressAliasChange[] = [];

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

			if (allowAddressAliasChanges || result.length === 0) {
				return { result };
			}

			const issues: TransactionAnalysisIssue[] = result.map((change) => ({
				message: `Command ${change.index} calls 0x2::address_alias::${change.function}, which changes which addresses can sign for this account`,
			}));

			return { result, issues };
		},
});
