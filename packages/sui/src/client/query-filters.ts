// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { normalizeSuiAddress } from '../utils/sui-types.js';
import type { SuiClientTypes } from './types.js';

export interface ResolvedPagination {
	descending: boolean;
	after: string | undefined;
	before: string | undefined;
}

/**
 * Validates pagination bounds and resolves the traversal direction.
 *
 * `after` and `before` are exclusive ledger-position bounds. Until every
 * transport can combine bounds freely, a query accepts at most one bound, and
 * the bound must match the traversal direction (`after` implies ascending,
 * `before` implies descending).
 */
export function resolvePagination(options: {
	after?: string | null;
	before?: string | null;
	order?: 'ascending' | 'descending';
}): ResolvedPagination {
	if (options.after != null && options.before != null) {
		throw new Error('Only one of `after` or `before` may be provided');
	}

	const descending = options.order ? options.order === 'descending' : options.before != null;

	if (options.after != null && descending) {
		throw new Error('`after` can not be combined with descending queries');
	}

	if (options.before != null && !descending) {
		throw new Error('`before` can not be combined with ascending queries');
	}

	return { descending, after: options.after ?? undefined, before: options.before ?? undefined };
}

export type ResolvedTransactionFilter =
	| { $kind: 'sender'; sender: string }
	| { $kind: 'function'; package: string; module?: string; function?: string };

export type ResolvedEventFilter =
	| { $kind: 'sender'; sender: string }
	| { $kind: 'emitModule'; package: string; module: string }
	| { $kind: 'eventTypeModule'; package: string; module: string }
	| { $kind: 'eventType'; eventType: string };

/**
 * Validates a transaction filter and resolves any MVR names it contains.
 *
 * Every transport resolves filters through this function so that validation
 * errors and MVR handling are identical across clients.
 */
export async function resolveTransactionFilter(
	mvr: SuiClientTypes.MvrMethods,
	filter: SuiClientTypes.TransactionFilter,
): Promise<ResolvedTransactionFilter> {
	assertSinglePredicate(filter, ['sender', 'function'], 'transaction');

	if (filter.sender != null) {
		return { $kind: 'sender', sender: normalizeSuiAddress(filter.sender) };
	}

	const [pkg, module, fn, ...rest] = filter.function!.split('::');

	if (!pkg || rest.length > 0 || module === '' || fn === '') {
		throw new Error(
			`Invalid function filter "${filter.function}": expected "package", "package::module", or "package::module::function"`,
		);
	}

	return {
		$kind: 'function',
		package: normalizeSuiAddress((await mvr.resolvePackage({ package: pkg })).package),
		module,
		function: fn,
	};
}

/**
 * Validates an event filter and resolves any MVR names it contains.
 *
 * `emitModule` must name a module (`package::module`), and `eventType` must be
 * at least module-qualified (`package::module` or a full type). Every transport
 * resolves filters through this function so that validation errors and MVR
 * handling are identical across clients.
 */
export async function resolveEventFilter(
	mvr: SuiClientTypes.MvrMethods,
	filter: SuiClientTypes.EventFilter,
): Promise<ResolvedEventFilter> {
	assertSinglePredicate(filter, ['sender', 'emitModule', 'eventType'], 'event');

	if (filter.sender != null) {
		return { $kind: 'sender', sender: normalizeSuiAddress(filter.sender) };
	}

	if (filter.emitModule != null) {
		const [pkg, module, ...rest] = filter.emitModule.split('::');

		if (!pkg || !module || rest.length > 0) {
			throw new Error(
				`Invalid emitModule filter "${filter.emitModule}": expected "package::module"`,
			);
		}

		return {
			$kind: 'emitModule',
			package: normalizeSuiAddress((await mvr.resolvePackage({ package: pkg })).package),
			module,
		};
	}

	const eventType = filter.eventType!;
	const segments = eventType.split('::');

	if (segments.length === 2 && segments.every((segment) => segment !== '')) {
		return {
			$kind: 'eventTypeModule',
			package: normalizeSuiAddress((await mvr.resolvePackage({ package: segments[0] })).package),
			module: segments[1],
		};
	}

	if (segments.length < 3 || segments.some((segment) => segment === '')) {
		throw new Error(
			`Invalid eventType filter "${eventType}": expected "package::module" or a fully qualified type name`,
		);
	}

	return {
		$kind: 'eventType',
		eventType: (await mvr.resolveType({ type: eventType })).type,
	};
}

function assertSinglePredicate(
	filter: Record<string, unknown>,
	predicates: string[],
	kind: string,
): void {
	const present = predicates.filter((predicate) => filter[predicate] != null);

	if (present.length !== 1) {
		throw new Error(
			`A ${kind} filter must specify exactly one of ${predicates.join(', ')}${
				present.length ? ` (got ${present.join(', ')})` : ''
			}`,
		);
	}
}
