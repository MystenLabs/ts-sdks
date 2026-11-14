// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { parseCheckpointNumber } from '../query-filters.js';
import type { SuiClientTypes } from '../types.js';
import type { Bound, LedgerStreamAdapter } from './adapter.js';
import { SuiStreamError } from './errors.js';
import { passRequest } from './pager.js';
import { decodeToken, filterHash, sameBytes, type StreamToken } from './token.js';

/** Milliseconds between polls when `pollInterval` isn't set. */
export const DEFAULT_POLL_INTERVAL = 1000;

/** finite: read to the end. poll: read to the tip repeatedly. follow: the live handoff. */
type StreamMode = 'finite' | 'poll' | 'follow';

export interface StreamPlan {
	mode: StreamMode;
	order: SuiClientTypes.Order;
	pollInterval: number;
	token?: StreamToken;
	/** Where the stream starts; undefined for a fresh follow at the live tip. */
	start?: Bound;
	/** The exclusive checkpoint end of a finite stream, in traversal order. */
	end?: bigint;
	/** Why a finite stream completes, unless it stops at the retention limit. */
	completion: SuiClientTypes.StreamCompletionFrame['reason'];
}

type Adapter = Pick<LedgerStreamAdapter<unknown, any>, 'transport' | 'family' | 'live'>;

/**
 * Checks every option that needs no network, so a failing or retrying request can never hide an
 * option or token error.
 */
export function validateOptions(
	options: SuiClientTypes.StreamOptions<SuiClientTypes.StreamFrameOptions>,
	adapter: Adapter,
): StreamPlan {
	const token =
		options.start?.resumeToken !== undefined ? decodeToken(options.start.resumeToken) : undefined;
	if (token && (token.transport !== adapter.transport || token.family !== adapter.family)) {
		throw incompatibleToken();
	}
	const order = options.order ?? token?.order ?? 'ascending';
	if (token && token.order !== order) {
		throw new SuiStreamError('IncompatibleToken', 'A resume token cannot change traversal order');
	}
	if (options.end && options.end.checkpoint === undefined) {
		throw new SuiStreamError('InvalidOptions', 'end must be a checkpoint');
	}

	const follow = options.follow ?? (order === 'ascending' && !options.end);
	if (follow && (order === 'descending' || options.end)) {
		throw new SuiStreamError(
			'InvalidOptions',
			'Following requires ascending order without an end bound',
		);
	}
	if (!follow && order === 'ascending' && !options.start) {
		throw new SuiStreamError('InvalidOptions', 'Ascending finite streams require a start');
	}
	const pollInterval = options.pollInterval ?? DEFAULT_POLL_INTERVAL;
	if (!(pollInterval > 0)) {
		throw new SuiStreamError('InvalidOptions', 'pollInterval must be a positive number');
	}

	const startCheckpoint = checkpointOption(options.start?.checkpoint, 'start');
	const end = checkpointOption(options.end?.checkpoint, 'end');
	if (startCheckpoint !== undefined && end !== undefined) {
		if (order === 'ascending' ? startCheckpoint > end : startCheckpoint < end) {
			throw new SuiStreamError('InvalidOptions', 'Stream start and end bounds are reversed');
		}
	}

	let completion: StreamPlan['completion'] = 'checkpointBound';
	if (end === undefined) completion = order === 'ascending' ? 'indexedTip' : 'genesis';
	return {
		mode: !follow ? 'finite' : options.delivery === 'poll' ? 'poll' : 'follow',
		order,
		pollInterval,
		token,
		start: token
			? { position: token.position }
			: startCheckpoint !== undefined
				? { checkpoint: startCheckpoint }
				: undefined,
		end,
		completion,
	};
}

/**
 * Checks the token against the stream's identity and fills in what depends on the indexed tip,
 * reading it at most once.
 */
export async function planStream(
	plan: StreamPlan,
	identity: { chain: string; filter: unknown },
	adapter: Adapter,
	readIndexedTip: () => Promise<bigint>,
): Promise<StreamPlan> {
	const { token, order, mode } = plan;
	if (
		token &&
		(token.chain !== identity.chain || !sameBytes(token.filter, filterHash(identity.filter)))
	) {
		throw incompatibleToken();
	}
	const anchorsAtLiveTip = mode === 'follow' && adapter.live === 'fromTip';
	const needsStart = !plan.start && !anchorsAtLiveTip;
	const needsEnd = mode === 'finite' && order === 'ascending' && plan.end === undefined;
	if (!needsStart && !needsEnd) return plan;

	const tip = await readIndexedTip();
	return {
		...plan,
		start: needsStart ? { checkpoint: order === 'ascending' ? tip + 1n : tip } : plan.start,
		end: needsEnd ? tip + 1n : plan.end,
	};
}

/** Whether a finite stream's bounds leave nothing to read. */
export function isEmptyRange(plan: StreamPlan, family: Adapter['family']): boolean {
	if (plan.mode !== 'finite' || !plan.start) return false;
	const { range } = passRequest(plan.start, plan.end, plan.order, family);
	return range.start !== undefined && range.end !== undefined && range.start >= range.end;
}

function incompatibleToken() {
	return new SuiStreamError(
		'IncompatibleToken',
		'Resume token belongs to a different transport, chain, stream family or filter',
	);
}

function checkpointOption(
	value: SuiClientTypes.CheckpointNumber | undefined,
	label: string,
): bigint | undefined {
	if (value === undefined) return undefined;
	try {
		return parseCheckpointNumber(value, label);
	} catch (error) {
		throw new SuiStreamError('InvalidOptions', (error as Error).message, { cause: error });
	}
}
