// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// The queue ID derivation must agree with `queue::queue_id`, which is
// `derived_object::derive_address(desk_id, expiry_market_id)`. The expected IDs were printed by a
// Move unit test calling `sui::derived_object::derive_address` with these inputs (Sui 1.80.1), so a
// drift in the key type or its BCS fails here.
import { describe, expect, test } from 'vitest';
import { deriveQueueId } from '../../src/predict/queue-id.js';

describe('deriveQueueId', () => {
	test('matches derived_object::derive_address on the Move vectors', () => {
		expect(deriveQueueId('0x' + '11'.repeat(32), '0x' + '22'.repeat(32))).toBe(
			'0x3dede74fcc288c47a32e11d6414c3da0f18007845b51032123eecef54bde800f',
		);
		expect(deriveQueueId('0x5', '0xabc')).toBe(
			'0xbebec318cfb6decd8b25538973ccc57183556ab7028032f7c1fa244c6467d7bb',
		);
	});

	test('a different desk gives the same market a different queue', () => {
		const market = '0x' + '22'.repeat(32);
		expect(deriveQueueId('0x' + '11'.repeat(32), market)).not.toBe(
			deriveQueueId('0x' + '12'.repeat(32), market),
		);
	});
});
