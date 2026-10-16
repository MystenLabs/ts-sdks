// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import {
	boundaryPosition,
	itemPosition,
	progressPosition,
} from '../../../../src/client/stream/index.js';
import {
	framePosition,
	GRPC_FAMILIES,
	type GrpcItem,
} from '../../../../src/grpc/stream/families.js';

// Cursors are fake bytes: nothing reads them.
const cursor = new Uint8Array([7, 7]);
const through = (checkpoint: bigint) => ({ $kind: 'Through', checkpoint }) as const;

describe('gRPC frames as stream positions', () => {
	it('maps an event to an item with its indexes and the watermark', () => {
		const event = { checkpoint: 5n, transactionIndex: 2n, eventIndex: 1 };
		const item = { $kind: 'Event', event } as GrpcItem;
		expect(framePosition({ watermark: { cursor, checkpoint: 4n } }, item)).toEqual(
			itemPosition(5n, { cursor, transactionIndex: 2n, eventIndex: 1, coverage: through(4n) }),
		);
	});

	it('maps a frame without an item to progress', () => {
		expect(framePosition({ watermark: { cursor } }, undefined)).toEqual(progressPosition(cursor));
	});

	it('positions checkpoints by sequence number alone', () => {
		const { position } = GRPC_FAMILIES.checkpoints;
		const checkpoint = { $kind: 'Checkpoint', checkpoint: { sequenceNumber: 9n } } as GrpcItem;
		expect(position({ watermark: { cursor, checkpoint: 9n } }, checkpoint)).toEqual(
			itemPosition(9n),
		);
		expect(position({ cursor: 9n }, undefined)).toEqual(boundaryPosition(10n));
	});

	it('rejects a transaction without its index', () => {
		const item = { $kind: 'Transaction', transaction: { checkpoint: 5n } } as GrpcItem;
		expect(() => framePosition({ watermark: { cursor } }, item)).toThrow('transaction index');
	});
});
