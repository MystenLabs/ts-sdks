// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { LedgerStreamRequest } from '../../client/core.js';
import type {
	AnyLedgerStreamAdapter,
	ItemFrame,
	LedgerStreamAdapter,
} from '../../client/stream/adapter.js';
import type { SuiClientTypes } from '../../client/types.js';
import type { SuiGraphQLClient } from '../client.js';
import { ledgerFamily, type LedgerFamily, type LedgerItem } from './families.js';
import { followLedger, type FollowOptions } from './follow.js';
import {
	comparePositions,
	graphQLPositionCodec,
	locatePosition,
	positionCoverage,
	type GraphQLPosition,
} from './position.js';
import { classifyGraphQLError, readIndexState } from './query.js';
import { scanLedger } from './scan.js';

export function graphQLLedgerStreamAdapter(
	client: SuiGraphQLClient,
	mvr: SuiClientTypes.MvrMethods,
	request: LedgerStreamRequest,
): AnyLedgerStreamAdapter {
	const follow = { pollInterval: request.options.pollInterval ?? 1000, state: {} };
	return adapterFor(client, ledgerFamily(client, mvr, request), follow);
}

function adapterFor<Node>(
	client: SuiGraphQLClient,
	family: LedgerFamily<Node>,
	follow: FollowOptions,
): LedgerStreamAdapter<GraphQLPosition, LedgerItem<Node>, ItemFrame> {
	const indexState = (signal: AbortSignal) =>
		readIndexState(client, family.name, family.filterFields(), signal);
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
		follow: (session) => followLedger(client, family, session, follow),

		compare: comparePositions,
		coverage: (position) => positionCoverage(position, family.onePerCheckpoint),
		locate: locatePosition,
		mapItem: (item) => family.map(item),
		classify: classifyGraphQLError,
	};
}
