// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase58 } from '@mysten/bcs';
import { fromBase64 } from '@mysten/utils';
import { describe, expect, it } from 'vitest';

import { bcs } from '../../../src/bcs/index.js';
import { parseTransactionEffectsBcs } from '../../../src/client/utils.js';

// Mainnet transaction DyNVCcweVUBz7g3vxiKHF6SuoxynYbr6d8AJyDL1dhMm,
// checkpoint 15,000,000 (2023-10-08T03:09:07.028Z).
const V1_EFFECTS_BCS =
	'AACyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGwOHkAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAbA4eQAAAAAACAzESdhjrydlnr6/HuHKVoVUiokk25nYiG2UIpTZCZ7wSDAvRAeUc/6vfqjK6wbMI/2hjmY7fIkOWIIKPCFW8tY1AABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAbB4eQAAAAAACAGkHp5VdlBHbr+Gc1pyExoRdzMTN0eme/sgjO4SzTXiQIBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEgLrfJME6gm+umzwBd6ob02mtQTKyProvihogPS0KMhbE=';

describe('parseTransactionEffectsBcs V1', () => {
	it('maps a historical mainnet transaction to core effects', () => {
		const effects = parseTransactionEffectsBcs(fromBase64(V1_EFFECTS_BCS));

		expect(effects).toMatchObject({
			version: 1,
			status: { success: true, error: null },
			transactionDigest: 'DyNVCcweVUBz7g3vxiKHF6SuoxynYbr6d8AJyDL1dhMm',
			gasObject: null,
			lamportVersion: '15000001',
			changedObjects: [
				{
					objectId: '0x0000000000000000000000000000000000000000000000000000000000000006',
					inputState: 'Exists',
					inputVersion: '15000000',
					inputDigest: '4SLxtHjFAXozbeuAABaT2t7U8VuJw2HxVSzdBWyF4VrY',
					inputOwner: null,
					outputState: 'ObjectWrite',
					outputVersion: '15000001',
					outputDigest: 'SdDyHZMJ9ZxQf2XyBjsqCmJThgSGCZNghRZnDvisBr8',
					outputOwner: { $kind: 'Shared', Shared: { initialSharedVersion: '1' } },
					idOperation: 'None',
				},
			],
			unchangedConsensusObjects: [],
			auxiliaryDataDigest: null,
		});
	});

	it('maps every V1 object-change category and the gas object', () => {
		const digest = (byte: number) => toBase58(new Uint8Array(32).fill(byte));
		const reference = (objectId: string, version: number, digestByte: number) => ({
			objectId,
			version: version.toString(),
			digest: digest(digestByte),
		});
		const effects = parseTransactionEffectsBcs(
			bcs.TransactionEffects.serialize({
				V1: {
					status: { Success: true },
					executedEpoch: 1,
					gasUsed: {
						computationCost: 1,
						storageCost: 2,
						storageRebate: 3,
						nonRefundableStorageFee: 4,
					},
					modifiedAtVersions: [
						['0x2', 20],
						['0x3', 30],
						['0x5', 50],
						['0x7', 70],
					],
					sharedObjects: [reference('0x3', 30, 13), reference('0x8', 80, 18)],
					transactionDigest: digest(1),
					created: [[reference('0x1', 11, 11), { AddressOwner: '0xa' }]],
					mutated: [
						[reference('0x2', 21, 12), { AddressOwner: '0xa' }],
						[reference('0x3', 31, 13), { Shared: { initialSharedVersion: 1 } }],
					],
					unwrapped: [[reference('0x4', 41, 14), { ObjectOwner: '0xb' }]],
					deleted: [reference('0x5', 51, 15)],
					unwrappedThenDeleted: [reference('0x6', 61, 16)],
					wrapped: [reference('0x7', 71, 17)],
					gasObject: [reference('0x2', 21, 12), { AddressOwner: '0xa' }],
					eventsDigest: null,
					dependencies: [],
				},
			}).toBytes(),
		);

		expect(
			effects.changedObjects.map(({ objectId, inputState, outputState, idOperation }) => ({
				objectId,
				inputState,
				outputState,
				idOperation,
			})),
		).toEqual([
			{
				objectId: expect.stringMatching(/01$/),
				inputState: 'DoesNotExist',
				outputState: 'ObjectWrite',
				idOperation: 'Created',
			},
			{
				objectId: expect.stringMatching(/02$/),
				inputState: 'Exists',
				outputState: 'ObjectWrite',
				idOperation: 'None',
			},
			{
				objectId: expect.stringMatching(/03$/),
				inputState: 'Exists',
				outputState: 'ObjectWrite',
				idOperation: 'None',
			},
			{
				objectId: expect.stringMatching(/04$/),
				inputState: 'DoesNotExist',
				outputState: 'ObjectWrite',
				idOperation: 'None',
			},
			{
				objectId: expect.stringMatching(/05$/),
				inputState: 'Exists',
				outputState: 'DoesNotExist',
				idOperation: 'Deleted',
			},
			{
				objectId: expect.stringMatching(/06$/),
				inputState: 'DoesNotExist',
				outputState: 'DoesNotExist',
				idOperation: 'Deleted',
			},
			{
				objectId: expect.stringMatching(/07$/),
				inputState: 'Exists',
				outputState: 'DoesNotExist',
				idOperation: 'Deleted',
			},
		]);
		expect(effects.gasObject).toBe(effects.changedObjects[1]);
		expect(effects.lamportVersion).toBe('71');
		expect(effects.unchangedConsensusObjects).toEqual([
			{
				kind: 'ReadOnlyRoot',
				objectId: expect.stringMatching(/08$/),
				version: '80',
				digest: digest(18),
			},
		]);
	});
});
