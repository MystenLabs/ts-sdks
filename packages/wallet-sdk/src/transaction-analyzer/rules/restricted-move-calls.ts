// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { findRestrictedMoveCalls, validateRestrictedMoveCalls } from '@mysten/sui/transactions';
import type { RestrictedMoveCall } from '@mysten/sui/transactions';
import { createAnalyzer } from '../analyzer.js';
import { data } from './core.js';

export type { RestrictedMoveCall };

export interface RestrictedMoveCallsOptions {
	/**
	 * `package`, `package::module` or `package::module::function` entries. Same format and default
	 * as the `restrictedMoveCalls` build option: `DEFAULT_RESTRICTED_MOVE_CALLS`. The list replaces
	 * the default.
	 */
	restrictedMoveCalls?: readonly string[];
}

/**
 * Creates an analyzer that reports restricted MoveCalls. It only reports what it finds and adds
 * no issues: the caller decides what to do, for example warn the user or refuse to sign. It uses
 * its own list (default `DEFAULT_RESTRICTED_MOVE_CALLS`), not the client's. Each call returns a
 * new analyzer, so several lists can run in the same `analyze()` call:
 *
 * ```ts
 * await analyze(
 *   {
 *     blockedMoveCalls: restrictedMoveCalls(),
 *     warnMoveCalls: restrictedMoveCalls({ restrictedMoveCalls: ['0x2::allowance'] }),
 *   },
 *   { client, transaction },
 * );
 * ```
 *
 * Throws if an entry is malformed or an option other than `restrictedMoveCalls` is passed.
 */
export function restrictedMoveCalls(options: RestrictedMoveCallsOptions = {}) {
	// Unknown keys (e.g. the old `addressAliases`/`targets`) would otherwise be ignored and allow calls.
	const unexpected = Object.keys(options).find((key) => key !== 'restrictedMoveCalls');
	if (unexpected) {
		throw new Error(
			`Unexpected restrictedMoveCalls option "${unexpected}": pass restrictedMoveCalls instead`,
		);
	}
	// Copied so entries can't change after they are validated here.
	const entries = options.restrictedMoveCalls?.slice();
	if (entries) validateRestrictedMoveCalls(entries);

	return createAnalyzer({
		dependencies: { data },
		analyze:
			() =>
			({ data }) => ({ result: findRestrictedMoveCalls(data, entries) }),
	});
}
