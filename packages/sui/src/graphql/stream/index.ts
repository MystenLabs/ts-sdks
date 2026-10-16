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
import { followLedger } from './follow.js';
import {
	comparePositions,
	graphQLPositionCodec,
	locatePosition,
	positionCoverage,
	type GraphQLPosition,
} from './position.js';
import { classifyGraphQLError, readChainTip } from './query.js';
import { scanLedger } from './scan.js';

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
	return {
		transport: 'graphql',
		family: family.name,
		position: graphQLPositionCodec,
		// Subscriptions carry no progress, so a fresh follow is anchored at the indexed tip.
		anchorsAtLiveTip: false,

		async initialize(signal) {
			const filter = await family.resolveFilter(signal);
			const { chain, tip } = await readChainTip(client, signal);
			return { chain, filter, indexedTip: tip };
		},
		async indexedTip(signal) {
			return (await readChainTip(client, signal)).tip;
		},
		scan: (request) => scanLedger(family, request),
		follow: (session) => followLedger(family, session),

		compare: comparePositions,
		coverage: (position) => positionCoverage(position, family.onePerCheckpoint),
		locate: locatePosition,
		mapItem: (item) => family.map(item),
		classify: classifyGraphQLError,
	};
}
