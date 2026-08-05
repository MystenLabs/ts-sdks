// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi, SuiClientTypes } from '@mysten/sui/client';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { describe, expect, it, vi } from 'vitest';

import { kiosk } from '../../src/client/kiosk-client.js';
import { getAllObjects, queryEvents } from '../../src/query/client-utils.js';

describe('Kiosk Core API queries', () => {
	it('registers the kiosk extension on a gRPC client', () => {
		const client = new SuiGrpcClient({
			network: 'localnet',
			baseUrl: 'http://127.0.0.1:9000',
		});

		const extendedClient = client.$extend(kiosk());

		expect(extendedClient.kiosk.client).toBe(client);
	});

	it('fetches objects and maps Core display data to the Kiosk response shape', async () => {
		const object: SuiClientTypes.Object<{
			content: true;
			previousTransaction: true;
			display: true;
		}> = {
			objectId: '0x1',
			version: '1',
			digest: 'digest',
			owner: { $kind: 'AddressOwner', AddressOwner: '0x2' },
			type: '0x2::example::Item',
			content: new Uint8Array([1, 2, 3]),
			previousTransaction: 'transaction',
			objectBcs: undefined,
			json: undefined,
			display: {
				output: { name: 'Example' },
				errors: { description: 'rendering failed' },
			},
		};
		const getObjects = vi.fn().mockResolvedValue({ objects: [object, new Error('not found')] });
		const client = { core: { getObjects } } as unknown as ClientWithCoreApi;

		await expect(getAllObjects(client, ['0x1', '0x2'])).resolves.toEqual([
			{
				...object,
				display: {
					data: { name: 'Example' },
					error: JSON.stringify({ description: 'rendering failed' }),
				},
			},
		]);
		expect(getObjects).toHaveBeenCalledWith({
			objectIds: ['0x1', '0x2'],
			include: {
				content: true,
				previousTransaction: true,
				display: true,
			},
		});
	});

	it('queries transfer policy events through the Core API', async () => {
		const listEvents = vi.fn().mockResolvedValue({
			events: [
				{
					packageId: '0x2',
					module: 'transfer_policy',
					sender: '0x3',
					eventType: '0x2::transfer_policy::TransferPolicyCreated<0x4::example::Item>',
					bcs: new Uint8Array(),
					json: { id: '0x5' },
					checkpoint: '1',
					transactionDigest: 'transaction',
					eventIndex: 0,
				},
			],
			hasNextPage: false,
			startCursor: 'start',
			endCursor: 'end',
		});
		const client = { core: { listEvents } } as unknown as ClientWithCoreApi;
		const eventType = '0x2::transfer_policy::TransferPolicyCreated<0x4::example::Item>';

		await expect(queryEvents(client, eventType)).resolves.toEqual([{ json: { id: '0x5' } }]);
		expect(listEvents).toHaveBeenCalledWith({
			filter: { eventType },
			limit: 50,
			order: 'descending',
		});
	});

	it('continues scan-limited event pages until it finds matching events', async () => {
		const eventType = '0x2::transfer_policy::TransferPolicyCreated<0x4::example::Item>';
		const listEvents = vi
			.fn()
			.mockResolvedValueOnce({
				events: [],
				hasNextPage: true,
				startCursor: null,
				endCursor: 'scan-frontier',
			})
			.mockResolvedValueOnce({
				events: [{ json: { id: '0x5' } }],
				hasNextPage: false,
				startCursor: 'event',
				endCursor: 'event',
			});
		const client = { core: { listEvents } } as unknown as ClientWithCoreApi;

		await expect(queryEvents(client, eventType)).resolves.toEqual([{ json: { id: '0x5' } }]);
		expect(listEvents).toHaveBeenNthCalledWith(2, {
			filter: { eventType },
			limit: 50,
			order: 'descending',
			before: 'scan-frontier',
		});
	});

	it('preserves the existing ascending GraphQL event window', async () => {
		const eventType = '0x2::transfer_policy::TransferPolicyCreated<0x4::example::Item>';
		const listEvents = vi.fn().mockResolvedValue({
			events: [],
			hasNextPage: false,
			startCursor: null,
			endCursor: null,
		});
		const client = {
			core: { listEvents },
			[Symbol.for('@mysten/SuiGraphQLClient')]: true,
		} as unknown as ClientWithCoreApi;

		await queryEvents(client, eventType);
		expect(listEvents).toHaveBeenCalledWith({
			filter: { eventType },
			limit: 50,
			order: 'ascending',
		});
	});
});
