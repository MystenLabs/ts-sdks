// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * GraphQL ledger streams: the transport adapter behind `GraphQLCoreClient.streamCheckpoints`,
 * `streamTransactions` and `streamEvents`. The shared core (`client/stream/`) owns tokens,
 * retries, deduplication and gap repair; this adapter supplies one scan pass (`scan.ts`), the live
 * handoff (`follow.ts`) and position ordering (`position.ts`) over the per-family queries
 * (`families.ts`).
 */

import type { LedgerStreamRequest } from '../../client/core.js';
import type {
	AnyLedgerStreamAdapter,
	ItemFrame,
	LedgerStreamAdapter,
} from '../../client/stream/adapter.js';
import type { SuiClientTypes } from '../../client/types.js';
import type { SuiGraphQLClient } from '../client.js';
import { ledgerFamily, type LedgerFamily, type LedgerItem } from './families.js';
import { followLedger } from './follow.js';
import {
	comparePositions,
	graphQLPositionCodec,
	positionCoverage,
	type GraphQLPosition,
} from './position.js';
import { classifyGraphQLError, readIndexState } from './query.js';
import { scanLedger } from './scan.js';

/** Builds the adapter for `request`. Performs no I/O. */
export function graphQLLedgerStreamAdapter(
	client: SuiGraphQLClient,
	mvr: SuiClientTypes.MvrMethods,
	request: LedgerStreamRequest,
): AnyLedgerStreamAdapter {
	return adapterFor(client, ledgerFamily(client, mvr, request));
}

function adapterFor<Node>(
	client: SuiGraphQLClient,
	family: LedgerFamily<Node>,
): LedgerStreamAdapter<GraphQLPosition, LedgerItem<Node>, ItemFrame> {
	const indexState = (signal: AbortSignal) => readIndexState(client, family.name, signal);
	return {
		transport: 'graphql',
		family: family.name,
		position: graphQLPositionCodec,
		// Subscriptions carry no progress, so a fresh follow is anchored at the indexed tip.
		anchorsAtLiveTip: false,

		async initialize(signal) {
			const filter = await family.resolveFilter(signal);
			const { chain } = await indexState(signal);
			return { chain, filter };
		},
		async indexedTip(signal) {
			return (await indexState(signal)).tip;
		},
		async *scan(request) {
			yield* scanLedger(client, family, request, await indexState(request.signal));
		},
		follow: (session) => followLedger(client, family, session),

		compare: comparePositions,
		coverage: (position) => positionCoverage(position, family.onePerCheckpoint),
		locate: (position) => ({ checkpoint: position.checkpoint, boundary: false }),
		mapItem: (item) => family.map(item),
		classify: classifyGraphQLError,
	};
}
