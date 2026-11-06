// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { normalizeSuiAddress } from '../utils/sui-types.js';
import type { SuiClientTypes } from './types.js';

export interface ResolvedPagination {
	descending: boolean;
	after: string | undefined;
	before: string | undefined;
	limit: number;
}

/**
 * Default page size applied when `limit` is omitted, so every transport
 * requests the same page size instead of falling back to differing server
 * defaults.
 */
const DEFAULT_PAGE_SIZE = 50;

/**
 * Resolves pagination bounds and the traversal direction.
 *
 * `after` and `before` are exclusive, order-independent ledger-position bounds
 * that can be combined to read a window. Without an explicit `order`, queries
 * bounded only by `before` read in descending order, and every other query
 * reads in ascending order.
 */
export function resolvePagination(options: {
	after?: string | null;
	before?: string | null;
	order?: SuiClientTypes.Order;
	limit?: number;
}): ResolvedPagination {
	const descending = options.order
		? options.order === 'descending'
		: options.before != null && options.after == null;

	return {
		descending,
		after: options.after ?? undefined,
		before: options.before ?? undefined,
		limit: options.limit ?? DEFAULT_PAGE_SIZE,
	};
}

export interface ResolvedCheckpointRange {
	/** Inclusive lower checkpoint bound. */
	start?: bigint;
	/** Exclusive upper checkpoint bound. */
	end?: bigint;
}

/**
 * Validates `startCheckpoint`/`endCheckpoint` and converts them to bigints, so
 * every transport rejects the same ranges.
 */
export function resolveCheckpointRange(options: {
	startCheckpoint?: SuiClientTypes.CheckpointNumber;
	endCheckpoint?: SuiClientTypes.CheckpointNumber;
}): ResolvedCheckpointRange {
	const start =
		options.startCheckpoint == null
			? undefined
			: parseCheckpointNumber(options.startCheckpoint, 'startCheckpoint');
	const end =
		options.endCheckpoint == null
			? undefined
			: parseCheckpointNumber(options.endCheckpoint, 'endCheckpoint');

	if (start != null && end != null && end < start) {
		throw new Error('`endCheckpoint` must be greater than or equal to `startCheckpoint`');
	}

	return { start, end };
}

/**
 * Validates a checkpoint sequence number and converts it to a bigint. Values
 * are capped at `Number.MAX_SAFE_INTEGER` because GraphQL represents
 * checkpoints as `UInt53`.
 */
export function parseCheckpointNumber(
	value: SuiClientTypes.CheckpointNumber,
	label: string,
): bigint {
	const valid =
		typeof value === 'bigint'
			? value >= 0n && value <= BigInt(Number.MAX_SAFE_INTEGER)
			: typeof value === 'number'
				? Number.isSafeInteger(value) && value >= 0
				: /^\d+$/.test(value) && BigInt(value) <= BigInt(Number.MAX_SAFE_INTEGER);

	if (!valid) {
		throw new Error(`Invalid ${label} "${value}": expected a non-negative integer`);
	}

	return BigInt(value);
}

/** A validated transaction filter with addresses normalized and MVR names resolved. */
export interface ResolvedTransactionFilter {
	sender?: string;
	affectedAddress?: string;
	affectedObject?: string;
	/** A normalized Move path: `0x…`, `0x…::module`, or `0x…::module::function`. */
	function?: string;
}

/** A validated event filter with addresses normalized and MVR names resolved. */
export interface ResolvedEventFilter {
	sender?: string;
	/** `0x…` or `0x…::module`. */
	emitModule?: string;
	/** `0x…`, `0x…::module`, or a fully qualified type name. */
	eventType?: string;
}

/**
 * Validates a transaction filter and resolves any MVR names it contains.
 *
 * Every transport resolves filters through this function so that validation
 * errors and MVR handling are identical across clients.
 */
export async function resolveTransactionFilter(
	mvr: SuiClientTypes.MvrMethods,
	filter: SuiClientTypes.TransactionFilter,
	signal?: AbortSignal,
): Promise<ResolvedTransactionFilter> {
	assertAtMostOne(filter, ['affectedAddress', 'affectedObject', 'function'], 'A transaction');

	const resolved: ResolvedTransactionFilter = {};

	if (filter.sender != null) {
		resolved.sender = normalizeSuiAddress(filter.sender);
	}

	if (filter.affectedAddress != null) {
		resolved.affectedAddress = normalizeSuiAddress(filter.affectedAddress);
	}

	if (filter.affectedObject != null) {
		resolved.affectedObject = normalizeSuiAddress(filter.affectedObject);
	}

	if (filter.function != null) {
		const [pkg, module, fn, ...rest] = filter.function.split('::');

		if (!pkg || rest.length > 0 || module === '' || fn === '') {
			throw new Error(
				`Invalid function filter "${filter.function}": expected "package", "package::module", or "package::module::function"`,
			);
		}

		resolved.function = [await resolvePackage(mvr, pkg, signal), module, fn]
			.filter((segment) => segment != null)
			.join('::');
	}

	return resolved;
}

/**
 * Validates an event filter and resolves any MVR names it contains.
 *
 * Every transport resolves filters through this function so that validation
 * errors and MVR handling are identical across clients.
 */
export async function resolveEventFilter(
	mvr: SuiClientTypes.MvrMethods,
	filter: SuiClientTypes.EventFilter,
	signal?: AbortSignal,
): Promise<ResolvedEventFilter> {
	assertAtMostOne(filter, ['emitModule', 'eventType'], 'An event');

	const resolved: ResolvedEventFilter = {};

	if (filter.sender != null) {
		resolved.sender = normalizeSuiAddress(filter.sender);
	}

	if (filter.emitModule != null) {
		const segments = filter.emitModule.split('::');

		if (segments.length > 2 || segments.some((segment) => segment === '')) {
			throw new Error(
				`Invalid emitModule filter "${filter.emitModule}": expected "package" or "package::module"`,
			);
		}

		const [pkg, module] = segments;
		resolved.emitModule = [await resolvePackage(mvr, pkg, signal), module]
			.filter((segment) => segment != null)
			.join('::');
	}

	if (filter.eventType != null) {
		const eventType = filter.eventType;
		const segments = eventType.split('::');

		if (segments.some((segment) => segment === '')) {
			throw new Error(
				`Invalid eventType filter "${eventType}": expected "package", "package::module", or a fully qualified type name`,
			);
		}

		if (segments.length <= 2) {
			const [pkg, module] = segments;
			resolved.eventType = [await resolvePackage(mvr, pkg, signal), module]
				.filter((segment) => segment != null)
				.join('::');
		} else {
			resolved.eventType = (await mvr.resolveType({ type: eventType, signal })).type;
		}
	}

	return resolved;
}

async function resolvePackage(
	mvr: SuiClientTypes.MvrMethods,
	pkg: string,
	signal?: AbortSignal,
): Promise<string> {
	return normalizeSuiAddress((await mvr.resolvePackage({ package: pkg, signal })).package);
}

function assertAtMostOne(filter: Record<string, unknown>, predicates: string[], subject: string) {
	const present = predicates.filter((predicate) => filter[predicate] != null);

	if (present.length > 1) {
		throw new Error(
			`${subject} filter may specify at most one of ${predicates.join(', ')} (got ${present.join(', ')})`,
		);
	}
}
