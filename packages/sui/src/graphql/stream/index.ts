// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { LedgerStreamRequest } from '../../client/core.js';
import { isMvrRequestFailure } from '../../client/mvr.js';
import type {
	AnyLedgerStreamAdapter,
	ItemFrame,
	LedgerStreamAdapter,
} from '../../client/stream/adapter.js';
import type { SuiClientTypes } from '../../client/types.js';
import type { SuiGraphQLClient } from '../client.js';
import { isRetryableStatus, markNetworkFailure, SuiGraphQLRequestError } from '../errors.js';
import { ledgerFamily, type LedgerFamily, type LedgerItem } from './families.js';
import { canResumeSubscription, liveSubscription } from './live.js';
import { fetchGraphQLPage } from './page.js';
import {
	classifyGraphQLError,
	graphQLAttemptLimit,
	graphQLRetryReason,
	readChainTip,
} from './query.js';

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
		liveAtIndexedTip: true,
		canResume: canResumeSubscription,

		async initialize(signal) {
			const filter = await family.resolveFilter(signal).catch((cause: unknown) => {
				// Only a request that never reached MVR, or MVR rate limiting or an outage, is worth
				// retrying. Unknown names, invalid filters and bad MVR responses stay fatal.
				signal.throwIfAborted();
				const status = cause instanceof Error && 'status' in cause ? cause.status : undefined;
				if (typeof status === 'number' && isRetryableStatus(status)) {
					throw new SuiGraphQLRequestError('MVR name resolution failed', {
						status,
						retryable: true,
						cause,
					});
				}
				if (!isMvrRequestFailure(cause)) throw cause;
				throw markNetworkFailure(
					new SuiGraphQLRequestError('MVR name resolution failed', { retryable: true, cause }),
				);
			});
			const { chain, tip, retainedFrom } = await readChainTip(
				client,
				family.name === 'checkpoints',
				signal,
			);
			return { chain, filter, indexedTip: tip, retainedFrom };
		},
		async indexedTip(signal) {
			return (await readChainTip(client, false, signal)).tip;
		},
		fetchPage: (request) => fetchGraphQLPage(family, request),
		subscribe: (from, signal) => liveSubscription(family, from, signal),

		mapItem: (item) => family.map(item),
		classify: classifyGraphQLError,
		retryReason: graphQLRetryReason,
		attemptLimit: graphQLAttemptLimit,
	};
}
