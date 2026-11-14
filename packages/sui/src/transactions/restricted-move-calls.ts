// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
	isValidMoveIdentifier,
	isValidSuiAddress,
	normalizeSuiAddress,
} from '../utils/sui-types.js';
import type { Command } from './data/internal.js';

/** Move calls a transaction can't make unless the client or build call sets `restrictedMoveCalls`. */
export const DEFAULT_RESTRICTED_MOVE_CALLS: readonly string[] = Object.freeze([
	'0x2::address_alias',
]);

export interface RestrictedMoveCall {
	/** Index of the MoveCall command in the transaction. */
	index: number;
	/** `pkg::module::function`, with a normalized package address. */
	target: string;
	/** The first `restrictedMoveCalls` entry that matched the call. */
	matchedBy: string;
}

function normalizeEntry(entry: string) {
	const [pkg, ...path] = entry.split('::');
	if (
		// normalizeSuiAddress pads these to the zero address.
		!pkg ||
		pkg.toLowerCase() === '0x' ||
		!isValidSuiAddress(normalizeSuiAddress(pkg)) ||
		path.length > 2 ||
		!path.every(isValidMoveIdentifier)
	) {
		throw new Error(
			`Invalid restrictedMoveCalls entry "${entry}": expected "package", "package::module" or "package::module::function"`,
		);
	}
	return [normalizeSuiAddress(pkg), ...path].join('::');
}

/** Throws if an entry isn't `package`, `package::module` or `package::module::function`. */
export function validateRestrictedMoveCalls(restrictedMoveCalls: readonly string[]) {
	restrictedMoveCalls.forEach(normalizeEntry);
}

/**
 * Finds MoveCall commands matching any of `restrictedMoveCalls` (`package`, `package::module` or
 * `package::module::function`). Throws if an entry is malformed.
 */
export function findRestrictedMoveCalls(
	data: { commands: readonly Command[] },
	restrictedMoveCalls: readonly string[] = DEFAULT_RESTRICTED_MOVE_CALLS,
): RestrictedMoveCall[] {
	const entries = restrictedMoveCalls.map((entry) => ({ entry, prefix: normalizeEntry(entry) }));
	const result: RestrictedMoveCall[] = [];

	data.commands.forEach((command, index) => {
		if (!command.MoveCall) return;
		const { package: pkg, module, function: fn } = command.MoveCall;
		const target = `${normalizeSuiAddress(pkg)}::${module}::${fn}`;
		// The `::` keeps `0x2::address_alias` from matching `0x2::address_alias_x`.
		const match = entries.find(
			({ prefix }) => target === prefix || target.startsWith(`${prefix}::`),
		);
		if (match) {
			result.push({ index, target, matchedBy: match.entry });
		}
	});

	return result;
}

export function assertNoRestrictedMoveCalls(
	data: { commands: readonly Command[] },
	restrictedMoveCalls: readonly string[] | undefined,
) {
	const calls = findRestrictedMoveCalls(data, restrictedMoveCalls);
	if (calls.length === 0) return;

	const list = calls
		.map((call) => `command ${call.index} calls ${call.target} (restricted by "${call.matchedBy}")`)
		.join(', ');
	throw new Error(
		`Transaction has restricted Move calls: ${list}. To allow them, set \`restrictedMoveCalls\` on the client or in \`build()\`/\`toJSON()\` options (\`[]\` allows all).`,
	);
}
