// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { LedgerStreamRequest } from '../../client/core.js';
import type {
	AnyLedgerStreamAdapter,
	ItemFrame,
	LedgerStreamAdapter,
} from '../../client/stream/adapter.js';
import type { SuiClientTypes } from '../../client/types.js';
import type { OpenSubscription, SuiGraphQLClient } from '../client.js';
import { SuiGraphQLRequestError } from '../errors.js';
import { ledgerFamily, type LedgerFamily, type LedgerItem } from './families.js';
import { canResumeSubscription, liveSubscription } from './live.js';
import { fetchGraphQLPage } from './page.js';
import { readChainTip } from './query.js';

export interface GraphQLStreamContext {
	client: SuiGraphQLClient;
	subscribe: OpenSubscription;
	mvr: SuiClientTypes.MvrMethods;
}

export function graphQLLedgerStreamAdapter(
	context: GraphQLStreamContext,
	request: LedgerStreamRequest,
): AnyLedgerStreamAdapter {
	return adapterFor(context.client, ledgerFamily(context, request));
}

function adapterFor<Node>(
	client: SuiGraphQLClient,
	family: LedgerFamily<Node>,
): LedgerStreamAdapter<LedgerItem<Node>, ItemFrame> {
	return {
		transport: 'graphql',
		family: family.name,
		live: 'resume',
		canResume: canResumeSubscription,

		async initialize(signal) {
			const filter = await family.resolveFilter(signal);
			const state = await readChainTip(client, signal);
			return { chain: state.chain, filter, indexedTip: state.tip };
		},
		async indexedTip(signal) {
			return (await readChainTip(client, signal)).tip;
		},
		fetchPage: (request) => fetchGraphQLPage(family, request),
		subscribe: (from, signal, onOpen) => liveSubscription(family, from, signal, onOpen),

		mapItem: (item) => family.map(item),
		retryReason: (error) => (error instanceof SuiGraphQLRequestError ? error.reason : undefined),
	};
}
