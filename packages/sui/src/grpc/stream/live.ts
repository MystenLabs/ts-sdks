// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { LiveEvent, LiveSubscription } from '../../client/stream/index.js';
import type { LedgerCall } from './call.js';
import type { GrpcFamily, GrpcItem, LiveFrame } from './families.js';

/** A subscription call as live events. gRPC subscriptions start at the live tip. */
export function liveSubscription(
	call: LedgerCall<LiveFrame>,
	family: GrpcFamily,
): LiveSubscription<GrpcItem> {
	return {
		[Symbol.asyncIterator]: () => liveEvents(call, family),
		readAhead: (enabled) => call.readAhead(enabled),
	};
}

/** @yields `Connected` with the first frame, then one Item or Progress event per frame. */
async function* liveEvents(
	call: LedgerCall<LiveFrame>,
	family: GrpcFamily,
): AsyncGenerator<LiveEvent<GrpcItem>> {
	let connected = false;
	try {
		for await (const frame of call) {
			if (!connected) {
				connected = true;
				yield { $kind: 'Connected' };
			}
			const item = family.item(frame);
			const position = family.position(frame, item);
			yield item ? { $kind: 'Item', position, item } : { $kind: 'Progress', position };
		}
	} finally {
		await call.return();
	}
}
