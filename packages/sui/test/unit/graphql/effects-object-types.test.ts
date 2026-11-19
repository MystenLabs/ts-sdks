// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase58, toBase64 } from '@mysten/bcs';
import { describe, expect, it, vi } from 'vitest';

import { bcs } from '../../../src/bcs/index.js';
import { SuiGraphQLClient } from '../../../src/graphql/index.js';
import { normalizeSuiAddress } from '../../../src/utils/index.js';

const SUI_COIN_TYPE = '0x2::coin::Coin<0x2::sui::SUI>';
const CREATED_TYPE = '0xabc::counter::Counter';

const digest = (byte: number) => toBase58(new Uint8Array(32).fill(byte));

const EFFECTS_BCS = toBase64(
	bcs.TransactionEffects.serialize({
		V2: {
			status: { Success: true },
			executedEpoch: 1,
			gasUsed: { computationCost: 1, storageCost: 2, storageRebate: 3, nonRefundableStorageFee: 4 },
			transactionDigest: digest(1),
			gasObjectIndex: 1,
			eventsDigest: null,
			dependencies: [],
			lamportVersion: 10,
			changedObjects: [
				[
					'0x1',
					{
						inputState: { NotExist: true },
						outputState: { ObjectWrite: [digest(2), { AddressOwner: '0xa' }] },
						idOperation: { Created: true },
					},
				],
				[
					'0x2',
					{
						inputState: { Exist: [['9', digest(3)], { AddressOwner: '0xa' }] },
						outputState: { ObjectWrite: [digest(4), { AddressOwner: '0xa' }] },
						idOperation: { None: true },
					},
				],
				[
					'0x3',
					{
						inputState: { Exist: [['9', digest(5)], { AddressOwner: '0xa' }] },
						outputState: { NotExist: true },
						idOperation: { Deleted: true },
					},
				],
			],
			unchangedConsensusObjects: [],
			auxDataDigest: null,
		},
	}).toBytes(),
);

const DEFAULT_EFFECTS_JSON = {
	changedObjects: [
		{ objectId: normalizeSuiAddress('0x1'), objectType: CREATED_TYPE },
		{ objectId: normalizeSuiAddress('0x2'), objectType: SUI_COIN_TYPE },
		// Missing type falls back to null
		{ objectId: normalizeSuiAddress('0x3') },
	],
};

function createClient({
	effectsJson = DEFAULT_EFFECTS_JSON,
	objectChangeTypes = {},
}: {
	effectsJson?: unknown;
	objectChangeTypes?: Record<string, string>;
} = {}) {
	const requests: Array<{ query: string; variables?: Record<string, unknown> }> = [];
	const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
		const request = JSON.parse(String(init?.body));
		requests.push(request);
		const { includeEffects, includeEffectsJson, includeObjectTypes } = request.variables;

		return Response.json({
			data: {
				transaction: {
					digest: digest(1),
					signatures: [],
					effects: {
						status: 'SUCCESS',
						timestamp: null,
						checkpoint: null,
						executionError: null,
						epoch: { epochId: 1 },
						...(includeEffects ? { effectsBcs: EFFECTS_BCS } : {}),
						...(includeObjectTypes
							? {
									objectChanges: {
										pageInfo: { hasNextPage: false, endCursor: null },
										nodes: Object.entries(objectChangeTypes).map(([address, type]) => ({
											address,
											outputState: { asMoveObject: { contents: { type: { repr: type } } } },
										})),
									},
								}
							: {}),
						...(includeEffectsJson
							? {
									effectsJson,
								}
							: {}),
					},
				},
			},
		});
	});

	return {
		client: new SuiGraphQLClient({
			url: 'https://graphql.test.invalid',
			network: 'unknown',
			fetch,
		}),
		requests,
	};
}

describe('GraphQL effects object types', () => {
	it('merges object types from effectsJson into BCS-decoded effects', async () => {
		const { client, requests } = createClient();

		const result = await client.core.getTransaction({
			digest: digest(1),
			include: { effects: true },
		});

		expect(requests[0].variables).toMatchObject({
			includeEffects: true,
			includeObjectTypes: false,
			includeEffectsJson: true,
		});
		const effects = result.Transaction!.effects;
		expect(
			effects.changedObjects.map(({ objectId, objectType }) => [objectId, objectType]),
		).toEqual([
			[normalizeSuiAddress('0x1'), CREATED_TYPE],
			[normalizeSuiAddress('0x2'), SUI_COIN_TYPE],
			[normalizeSuiAddress('0x3'), null],
		]);
		expect(effects.gasObject).toMatchObject({
			objectId: normalizeSuiAddress('0x2'),
			objectType: SUI_COIN_TYPE,
		});
	});

	it('does not request effectsJson when neither effects nor objectTypes are included', async () => {
		const { client, requests } = createClient();

		await client.core.getTransaction({ digest: digest(1) });

		expect(requests[0].variables).toMatchObject({
			includeEffects: false,
			includeEffectsJson: false,
		});
	});

	it('ignores unknown fields in effectsJson', async () => {
		const { client } = createClient({
			effectsJson: {
				someNewField: 'value',
				changedObjects: [
					{
						objectId: normalizeSuiAddress('0x1'),
						objectType: CREATED_TYPE,
						someNewChangeField: 1,
					},
					{ objectId: normalizeSuiAddress('0x2'), objectType: SUI_COIN_TYPE },
				],
			},
		});

		const result = await client.core.getTransaction({
			digest: digest(1),
			include: { effects: true },
		});

		expect(
			result.Transaction!.effects.changedObjects.map(({ objectId, objectType }) => [
				objectId,
				objectType,
			]),
		).toEqual([
			[normalizeSuiAddress('0x1'), CREATED_TYPE],
			[normalizeSuiAddress('0x2'), SUI_COIN_TYPE],
			[normalizeSuiAddress('0x3'), null],
		]);
	});

	it('leaves object types null when effectsJson cannot be parsed', async () => {
		const { client } = createClient({ effectsJson: { changedObjects: 'not a list' } });

		const result = await client.core.getTransaction({
			digest: digest(1),
			include: { effects: true },
		});

		const effects = result.Transaction!.effects;
		expect(effects.changedObjects.map(({ objectType }) => objectType)).toEqual([null, null, null]);
		expect(effects.gasObject?.objectType).toBeNull();
	});

	it('takes effects object types from effectsJson only, even when objectTypes are included', async () => {
		const OTHER_TYPE = '0xdef::other::Other';
		const { client } = createClient({
			objectChangeTypes: { [normalizeSuiAddress('0x1')]: OTHER_TYPE },
		});

		const result = await client.core.getTransaction({
			digest: digest(1),
			include: { effects: true, objectTypes: true },
		});

		expect(result.Transaction!.effects.changedObjects[0].objectType).toBe(CREATED_TYPE);
		expect(result.Transaction!.objectTypes).toEqual({
			[normalizeSuiAddress('0x1')]: OTHER_TYPE,
			[normalizeSuiAddress('0x2')]: SUI_COIN_TYPE,
		});
	});
});
