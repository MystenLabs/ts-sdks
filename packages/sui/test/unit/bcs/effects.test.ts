// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs as bcsBase, fromBase64 } from '@mysten/bcs';
import { describe, expect, it } from 'vitest';

import { bcs } from '../../../src/bcs/index.js';
import { EFFECTS } from './fixtures/effects.js';

function roundTrip(base64: string) {
	const bytes = fromBase64(base64);
	const effects = bcs.TransactionEffects.parse(bytes);
	expect(bcs.TransactionEffects.serialize(effects).toBytes()).toEqual(bytes);
	return effects;
}

describe('TransactionEffects BCS', () => {
	it('round-trips V2 effects with a Move abort, consensus objects and an accumulator write', () => {
		const effects = roundTrip(EFFECTS.V2_MOVE_ABORT).V2!;

		const abort = effects.status.Failure!.error.MoveAbort!;
		expect(abort.abortCode).toEqual('13906835540144554009');
		expect(abort.location.module.name).toEqual('withdrawal_queue');
		expect(abort.location.functionName).toEqual('approve_withdrawal');

		const [shared, accumulator] = effects.changedObjects;
		expect(shared.inputState.Exist).toMatchObject({
			version: '1094181445',
			digest: expect.any(String),
			owner: { $kind: 'Shared' },
		});
		expect(shared.outputState.ObjectWrite).toMatchObject({
			digest: expect.any(String),
			owner: { $kind: 'Shared' },
		});
		expect(accumulator.outputState.AccumulatorWriteV1!.value.$kind).toEqual('Integer');

		expect(effects.unchangedConsensusObjects).toEqual([
			{
				objectId: '0x0000000000000000000000000000000000000000000000000000000000000006',
				kind: {
					$kind: 'ReadOnlyRoot',
					ReadOnlyRoot: { version: '1094181453', digest: expect.any(String) },
				},
			},
		]);
	});

	it('round-trips V2 effects with a package write', () => {
		const effects = roundTrip(EFFECTS.V2_PUBLISH).V2!;
		const packageWrite = effects.changedObjects.find((change) => change.outputState.PackageWrite)!;
		expect(packageWrite.inputState.$kind).toEqual('NotExist');
		expect(packageWrite.outputState.PackageWrite).toEqual({
			version: '1',
			digest: expect.any(String),
		});
	});

	it('round-trips V2 effects with a wrapped object', () => {
		const effects = roundTrip(EFFECTS.V2_WRAP).V2!;
		expect(effects.changedObjects.map((change) => change.outputState.$kind)).toContain('NotExist');
	});

	it('round-trips V1 effects', () => {
		const created = roundTrip(EFFECTS.V1_CREATED).V1!;
		expect(created.created).toEqual([
			{
				reference: {
					objectId: expect.any(String),
					version: expect.any(String),
					digest: expect.any(String),
				},
				owner: expect.objectContaining({ $kind: expect.any(String) }),
			},
		]);
		expect(created.modifiedAtVersions[0]).toEqual({
			objectId: expect.any(String),
			version: '2017608',
		});
		expect(created.gasObject.owner.$kind).toEqual('AddressOwner');

		const unwrapped = roundTrip(EFFECTS.V1_UNWRAPPED).V1!;
		expect(unwrapped.unwrapped).toHaveLength(1);

		const aborted = roundTrip(EFFECTS.V1_MOVE_ABORT).V1!;
		expect(aborted.status.Failure!.error.MoveAbort).toMatchObject({
			location: { module: { name: 's' }, functionName: 'transfer_coins_with_threshold' },
			abortCode: '104',
		});
	});

	it('encodes accumulator values like the Rust tuples', () => {
		const effects = bcs.TransactionEffects.parse(fromBase64(EFFECTS.V2_MOVE_ABORT)).V2!;
		const accumulator = effects.changedObjects.find(
			(change) => change.outputState.AccumulatorWriteV1,
		)!;
		const tupleLayout = bcsBase.enum('AccumulatorValue', {
			Integer: bcsBase.u64(),
			IntegerTuple: bcsBase.tuple([bcsBase.u64(), bcsBase.u64()]),
			EventDigest: bcsBase.vector(bcsBase.tuple([bcsBase.u64(), bcs.ObjectDigest])),
		});
		const digest = effects.transactionDigest;

		for (const [value, tupleValue] of [
			[
				{ IntegerTuple: { first: '1', second: '2' } },
				{ IntegerTuple: ['1', '2'] as [string, string] },
			],
			[
				{ EventDigest: [{ eventIndex: '3', digest }] },
				{ EventDigest: [['3', digest] as [string, string]] },
			],
		] as const) {
			const bytes = bcs.TransactionEffects.serialize({
				V2: {
					...effects,
					changedObjects: [
						{
							...accumulator,
							outputState: {
								AccumulatorWriteV1: { ...accumulator.outputState.AccumulatorWriteV1!, value },
							},
						},
					],
					unchangedConsensusObjects: [],
					auxDataDigest: null,
				},
			}).toBytes();
			const expected = tupleLayout.serialize(tupleValue).toBytes();
			// The value is followed by the ID operation, an empty vector and a `None`.
			expect(bytes.slice(-expected.length - 3, -3)).toEqual(expected);

			const parsed = bcs.TransactionEffects.parse(bytes).V2!;
			expect(parsed.changedObjects[0].outputState.AccumulatorWriteV1!.value).toMatchObject(value);
		}
	});
});
