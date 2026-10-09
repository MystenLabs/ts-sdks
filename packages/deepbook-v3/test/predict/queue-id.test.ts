// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// The queue ID derivation must agree with `queue::queue_id(registry_id, expiry_market_id)`, which
// is `derived_object::derive_address(registry_id, expiry_market_id)`. The expected IDs were printed
// by a Move unit test calling `deepbook_predict_orders::queue::queue_id` with these inputs, at
// deepbookv3 d8fa6aa8 on Sui 1.80.1, so a drift in the parent, the key type or its BCS fails here.
import { describe, expect, test } from 'vitest';
import { deriveQueueId } from '../../src/predict/queue-id.js';
import { MARKET, QUEUE, REGISTRY } from './queue-fixtures.js';

describe('deriveQueueId', () => {
	test('matches queue::queue_id on the Move vectors', () => {
		expect(deriveQueueId('0x' + '11'.repeat(32), '0x' + '22'.repeat(32))).toBe(
			'0x3dede74fcc288c47a32e11d6414c3da0f18007845b51032123eecef54bde800f',
		);
		expect(deriveQueueId('0x5', '0xabc')).toBe(
			'0xbebec318cfb6decd8b25538973ccc57183556ab7028032f7c1fa244c6467d7bb',
		);
		// The fixtures' registry and market.
		expect(deriveQueueId('0x' + 'd5'.repeat(32), '0x' + 'cd'.repeat(32))).toBe(
			'0x39654419289e2e59e58c71947dadfac3fb61a6c3ac8730c466ea1680e1a08264',
		);
		expect(deriveQueueId(REGISTRY, MARKET)).toBe(QUEUE);
		expect(QUEUE).toBe('0x39654419289e2e59e58c71947dadfac3fb61a6c3ac8730c466ea1680e1a08264');
	});

	test('a different registry gives the same market a different queue', () => {
		const market = '0x' + '22'.repeat(32);
		expect(deriveQueueId('0x' + '11'.repeat(32), market)).not.toBe(
			deriveQueueId('0x' + '12'.repeat(32), market),
		);
	});
});
