// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { LiveEvent, StreamPosition } from '../../client/stream/index.js';
import {
	assertAdvancing,
	CoverageTracker,
	positionCoverage,
	SuiStreamError,
} from '../../client/stream/index.js';
import type { LedgerCall } from './call.js';
import type { GrpcFamily, GrpcItem, LiveFrame } from './families.js';

/**
 * The events of one subscription call, with coverage carried on from `committed` (contiguous once
 * the gap is replayed).
 *
 * @yields `Connected` once, then one Item or Progress event per frame.
 */
export async function* liveEvents(
	call: LedgerCall<LiveFrame>,
	family: GrpcFamily,
	committed: StreamPosition | undefined,
): AsyncGenerator<LiveEvent<GrpcItem>> {
	const tracker = new CoverageTracker(
		'ascending',
		family.name,
		committed ? positionCoverage(committed, family.name) : { $kind: 'Unknown' },
	);
	let previous: StreamPosition | undefined;
	let connected = false;
	for await (const frame of call) {
		if (!connected) {
			connected = true;
			yield { $kind: 'Connected' };
		}
		const item = family.item(frame);
		const raw = family.livePosition(frame, item);
		// Every subscription frame after the first covered checkpoint reports coverage.
		if (previous?.coverage.$kind === 'Through' && raw.coverage.$kind !== 'Through') {
			throw new SuiStreamError('Protocol', 'Subscription watermark stopped reporting coverage');
		}
		assertAdvancing(previous, raw, 'ascending');
		previous = raw;
		const position = tracker.apply(raw);
		yield item ? { $kind: 'Item', position, item } : { $kind: 'Progress', position };
	}
}
