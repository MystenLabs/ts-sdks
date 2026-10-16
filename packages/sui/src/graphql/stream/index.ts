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
import { liveSubscription } from './live.js';
import { fetchGraphQLPage } from './page.js';
import { classifyGraphQLError, readChainTip } from './query.js';

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
): LedgerStreamAdapter<LedgerItem<Node>, ItemFrame> {
	return {
		transport: 'graphql',
		family: family.name,
		// The chain identity is read with the indexed tip, so a fresh follow is anchored there.
		anchorsAtLiveTip: false,
		resumesSubscriptions: true,

		async initialize(signal) {
			const filter = await family.resolveFilter(signal);
			const { chain, tip } = await readChainTip(client, signal);
			return { chain, filter, indexedTip: tip };
		},
		async indexedTip(signal) {
			return (await readChainTip(client, signal)).tip;
		},
		fetchPage: (request) => fetchGraphQLPage(family, request),
		subscribe: (from, signal) => liveSubscription(family, from, signal),

		mapItem: (item) => family.map(item),
		classify: classifyGraphQLError,
	};
}
