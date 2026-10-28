// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';

import { SuiGraphQLClient } from '../../../src/graphql/index.js';
import { normalizeSuiAddress } from '../../../src/utils/index.js';

function event(sender: { address: string } | null, sequenceNumber: number) {
	return {
		sequenceNumber,
		transaction: { digest: 'digest', effects: { checkpoint: { sequenceNumber: 7 } } },
		transactionModule: { package: { address: '0x3' }, name: 'sui_system' },
		sender,
		contents: {
			type: { repr: '0x3::validator_set::ValidatorEpochInfoEventV2' },
			bcs: '',
			json: {},
		},
	};
}

describe('GraphQL listEvents sender', () => {
	it('maps events without a sender (system transactions) to the zero address', async () => {
		const client = new SuiGraphQLClient({ network: 'localnet', url: 'http://localhost' });
		client.query = vi.fn(async () => ({
			data: {
				events: {
					pageInfo: {
						hasNextPage: false,
						hasPreviousPage: false,
						startCursor: 'a',
						endCursor: 'b',
					},
					edges: [{ cursor: 'a' }, { cursor: 'b' }],
					nodes: [event(null, 0), event({ address: '0xa' }, 1)],
				},
			},
		})) as never;

		const { events } = await client.core.listEvents({});

		expect(events.map((e) => e.sender)).toEqual([
			normalizeSuiAddress('0x0'),
			normalizeSuiAddress('0xa'),
		]);
		expect(events[0]).toMatchObject({
			packageId: normalizeSuiAddress('0x3'),
			module: 'sui_system',
			checkpoint: '7',
			transactionDigest: 'digest',
			eventIndex: 0,
		});
	});
});
