// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { boundaryPosition, itemPosition } from '../../../../src/client/stream/index.js';
import type { GrpcTypes } from '../../../../src/grpc/index.js';
import {
	framePosition,
	GRPC_FAMILIES,
	type GrpcItem,
} from '../../../../src/grpc/stream/families.js';

// Cursors are fake bytes: nothing reads them.
const cursor = new Uint8Array([7, 7]);
const watermark = (checkpoint: bigint | undefined, at: GrpcTypes.LedgerPosition) => ({
	watermark: { cursor, checkpoint, cursorPosition: at },
});
const through = (checkpoint: bigint) => ({ $kind: 'Through', checkpoint }) as const;

describe('gRPC frames as stream positions', () => {
	it('maps an event to an item with its indexes and the watermark', () => {
		const event = { checkpoint: 5n, transactionIndex: 2n, eventIndex: 1 };
		const item = { $kind: 'Event', event } as GrpcItem;
		expect(
			framePosition(watermark(4n, { checkpoint: 5n, transactionIndex: 2n, eventIndex: 2 }), item),
		).toEqual(
			itemPosition(5n, { cursor, transactionIndex: 2n, eventIndex: 1, coverage: through(4n) }),
		);
	});

	it.each([
		['inside a checkpoint', { checkpoint: 5n, transactionIndex: 2n, eventIndex: 0 }, 2n, 0],
		['at a checkpoint start', { checkpoint: 5n, transactionIndex: 0n, eventIndex: 0 }, null, null],
		['at a checkpoint start without indexes', { checkpoint: 5n }, null, null],
	])(
		'places a frame without an item at its cursor position %s',
		(_, at, transactionIndex, eventIndex) => {
			const position = framePosition(watermark(4n, at), undefined);
			expect(position).toMatchObject({
				kind: 'Boundary',
				checkpoint: 5n,
				transactionIndex,
				eventIndex,
			});
			expect(position.cursor).toEqual(transactionIndex === null ? null : cursor);
			expect(position.coverage).toEqual(through(4n));
		},
	);

	it.each([
		['a frame without an item', undefined],
		[
			'an item frame',
			{ $kind: 'Event', event: { checkpoint: 5n, transactionIndex: 0n, eventIndex: 0 } },
		],
	])('fails %s whose watermark has no cursor position', (_, item) => {
		expect(() => framePosition({ watermark: { cursor } }, item as GrpcItem | undefined)).toThrow(
			expect.objectContaining({
				code: 'Protocol',
				message: expect.stringContaining('cursor position'),
			}),
		);
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
		expect(() => framePosition(watermark(5n, { checkpoint: 6n }), item)).toThrow(
			'transaction index',
		);
	});
});
