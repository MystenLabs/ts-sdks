// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import {
	comparePositions,
	frontierPosition,
	graphQLPositionCodec,
	itemPosition,
	positionCoverage,
	type GraphQLPosition,
} from '../../../../src/graphql/stream/position.js';

const item = (cursor: string, checkpoint: number) =>
	itemPosition(cursor, BigInt(checkpoint), cursor);

describe('GraphQL stream positions', () => {
	it.each<[string, GraphQLPosition, GraphQLPosition, -1 | 0 | 1 | undefined]>([
		['equal cursors', item('a', 1), item('a', 1), 0],
		['earlier checkpoint', item('a', 1), item('b', 2), -1],
		['later checkpoint', item('a', 3), item('b', 2), 1],
		['same checkpoint, different cursors', item('a', 2), item('b', 2), undefined],
		['a frontier', frontierPosition('f', 9n), item('b', 2), undefined],
	])('compares %s', (_name, a, b, expected) => {
		expect(comparePositions(a, b)).toBe(expected);
	});

	it.each<[string, GraphQLPosition, boolean, unknown]>([
		[
			'a transaction or event covers the checkpoints before it',
			item('a', 5),
			false,
			{ $kind: 'Through', checkpoint: 4n },
		],
		['an item at genesis covers nothing yet', item('a', 0), false, { $kind: 'None' }],
		['a checkpoint covers itself', item('a', 5), true, { $kind: 'Through', checkpoint: 5n }],
		['a frontier makes no claim', frontierPosition('f', 9n), false, { $kind: 'Unknown' }],
	])('%s', (_name, position, onePerCheckpoint, coverage) => {
		expect(positionCoverage(position, onePerCheckpoint)).toEqual(coverage);
	});

	it.each([item('a', 5), frontierPosition('f', 9n)])(
		'round-trips %o through its bytes',
		(position) => {
			const schema = graphQLPositionCodec.schema;
			expect(schema.parse(schema.serialize(position).toBytes())).toEqual(position);
			expect(() => graphQLPositionCodec.validate(position)).not.toThrow();
		},
	);

	it.each<[string, GraphQLPosition]>([
		['an empty cursor', item('', 5)],
		['an item without an identity', { ...item('a', 5), itemId: null }],
		[
			'a frontier without its indexed checkpoint',
			{ ...frontierPosition('f', 9n), indexedCheckpoint: null },
		],
	])('rejects %s as InvalidToken', (_name, position) => {
		expect(() => graphQLPositionCodec.validate(position)).toThrow(
			expect.objectContaining({ code: 'InvalidToken' }),
		);
	});
});
