// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { gunzipSync } from 'node:zlib';

import { fromBase64, toBase64 } from '@mysten/bcs';
import { describe, expect, it } from 'vitest';

import { bcs } from '../../../src/bcs/index.js';
import { parseTransactionDataBcs } from '../../../src/client/transaction-data.js';
import { GENESIS_TRANSACTION_GZIP_BASE64 } from './fixtures/genesis-transaction.js';

// BCS `TransactionData` of system transactions captured from a `sui start --force-regenesis
// --epoch-duration-ms 15000` localnet on the pinned `testnet-v1.82.1` image, keyed by digest.
const FIXTURES = {
	// EtjisPKCjzHU2919Y8k7uGgPEpbnehMN2MXLuTGrgoC4
	CONSENSUS_COMMIT_PROLOGUE_V4:
		'AAkAAAAAAAAAAAEAAAAAAAAAAFmakjehAQAAIP2G0NcO5ly/bfi4+5/i6wWOS2XYtGi66HWY11UVGoN1AQAg26EyL4VohCbNKFGHxjCV3RwyBUA/r9a+NXR28x2l1HIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAA==',
	// FnRLaJFCiQDLmx8HEJsaNfLAnGX1TULDnuLWBhDrLACm
	SETTLEMENT_PROLOGUE:
		'AAoDAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKzAEAAAAAAAAAAQAIAAAAAAAAAAAACAEAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAhZhY2N1bXVsYXRvcl9zZXR0bGVtZW50E3NldHRsZW1lbnRfcHJvbG9ndWUABgEAAAEBAAECAAEBAAEBAAEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAhRhY2N1bXVsYXRvcl9tZXRhZGF0YSFyZWNvcmRfYWNjdW11bGF0b3Jfb2JqZWN0X2NoYW5nZXMAAwEAAAEBAAEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAA',
	// FsQJvWB6LUA1WawMtuoyRbhDcycFoD54VV5ykcKi176m
	SETTLEMENT_NON_EXCLUSIVE_WRITE:
		'AAoIAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKzAEAAAAAAAAAAgAIAgAAAAAAAAAACCAAAAAAAAAAAAgAAAAAAAAAAAAIAMLrCwAAAAAAIO9yNfxzsROPO+/vubE3tUyzkXEZr3dR9rzEtWi+Ejy7ABAAwusLAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAhZhY2N1bXVsYXRvcl9zZXR0bGVtZW50E3NldHRsZW1lbnRfcHJvbG9ndWUABgEAAAEBAAECAAEDAAEEAAEDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAhZhY2N1bXVsYXRvcl9zZXR0bGVtZW50C3NldHRsZV91MTI4AQcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgdiYWxhbmNlB0JhbGFuY2UBBwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACA3N1aQNTVUkABAEAAAEFAAEGAAEHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAA',
	// 86619p3V2og4PVaJJ63eBEUX8Hkeazh243bPM3KVDcLe
	AUTHENTICATOR_STATE_UPDATE:
		'AAQAAAAAAAAAABMAAAAAAAAAARRodHRwczovL2F1dGguM2Rvcy5pb0A2ZDM2MWRjOTYzN2EyNzVlYjU4NWE5MTVhZjI2MTk4ZmYwZDk3MzI2Y2ExM2Y0YmFmMGU0ODA1ZjcyZjJhOWEwA1JTQQRBUUFC1gJ5XzhoSHdxN3cyeUU0OTY4c2JRRjk4aUdVaG51MEJ3eUI1a2hUeFZQQWNVbk1DWWRwNjF6WWNSV21sMnpkWTRIQWZxLU5uamJfcEFsaTZJNjZWcGU5SUU4R2Y4dUdSQjBvWUlvMlM2dFlNRWUwbGhSYUVEWVZiTWRRa3VLeFRJWU1OQlhTZF9rQ0hLSk0xWlVBbzd1Rm9xX2JXdXp0MmhSRzItNzl6LVljYml3MHdpbDByekZIbHBOQktzQkxLTTRHU0dVd09lamFMMnpDaUVfcmpmNzdBdk9hSkxSZDRJX0RCWUcxNnQ4RDFCa3hiaGtjUUNtT3hZR0cwTnFqUDN6MGx6LXcxQUxxSENOZmh6Y3paT3NnYUNyYlNsY1RLY0JUcTFzeUFVVWhRbW91blc3bkc1Y2xCSWZQUVJWSDdqQ29QenRpSlVaZzZYejFBTjZWMDd4bncFUlMyNTYAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAA=',
	// 1JAkAPCW9fvBUzwcNVaPuF1gBdL61wwPt2n4ezQyv1V
	RANDOMNESS_STATE_UPDATE:
		'AAYAAAAAAAAAAAAAAAAAAAAAMKiZ9dLmDoorn82azrO6Ue+0wI271wtkgyMn2AkbnhHdVM26SP/p/5y6Rxuts0dcYQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAA=',
	// 2TY7DPHEzHLRaKuWtChVXiYiQtQf2DyWzKVG5DgQzFtw
	END_OF_EPOCH:
		'AAUFAgAAAAAAAAAAAQAAAAAAAAAGAQAAAAAAAAAHAAAMAAAAAAAAAAAAAQAAAAAAAACLAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABNWSN6EBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAA=',
};

const SYSTEM_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';
const ACCUMULATOR_ROOT = '0x0000000000000000000000000000000000000000000000000000000000000acc';

function parse(base64: string) {
	const bytes = fromBase64(base64);
	const data = bcs.TransactionData.parse(bytes);
	expect(toBase64(bcs.TransactionData.serialize(data).toBytes())).toEqual(base64);
	return data.V1;
}

describe('system transaction BCS', () => {
	it('decodes and round-trips the genesis transaction', () => {
		const base64 = toBase64(gunzipSync(fromBase64(GENESIS_TRANSACTION_GZIP_BASE64)));
		const data = parse(base64);

		expect(data.kind.$kind).toEqual('Genesis');
		expect(data.sender).toEqual(SYSTEM_ADDRESS);
		const objects = data.kind.Genesis!.objects.map((object) => object.RawObject);
		expect(objects).toHaveLength(128);

		const packages = objects.flatMap(({ data }) => (data.Package ? [data.Package] : []));
		expect(packages.map((pkg) => pkg.id)).toEqual([
			'0x0000000000000000000000000000000000000000000000000000000000000001',
			'0x0000000000000000000000000000000000000000000000000000000000000002',
			'0x0000000000000000000000000000000000000000000000000000000000000003',
			'0x000000000000000000000000000000000000000000000000000000000000000b',
			'0x000000000000000000000000000000000000000000000000000000000000dee9',
		]);
		expect(packages[1].moduleMap.has('coin')).toBe(true);

		const moveObjects = objects.flatMap(({ data }) => (data.Move ? [data.Move] : []));
		expect(new Set(moveObjects.map((object) => object.type.$kind))).toEqual(
			new Set(['Other', 'GasCoin', 'StakedSui']),
		);
		expect(new Set(objects.map(({ owner }) => owner.$kind))).toEqual(
			new Set(['AddressOwner', 'ObjectOwner', 'Shared', 'Immutable']),
		);
	});

	it('decodes and round-trips a consensus commit prologue V4', () => {
		const data = parse(FIXTURES.CONSENSUS_COMMIT_PROLOGUE_V4);

		expect(data.kind.$kind).toEqual('ConsensusCommitPrologueV4');
		expect(data.kind.ConsensusCommitPrologueV4).toMatchObject({
			epoch: '0',
			round: '1',
			subDagIndex: null,
			consensusDeterminedVersionAssignments: {
				$kind: 'CancelledTransactionsV2',
				CancelledTransactionsV2: [],
			},
		});
	});

	it('decodes and round-trips an authenticator state update', () => {
		const data = parse(FIXTURES.AUTHENTICATOR_STATE_UPDATE);

		expect(data.kind.$kind).toEqual('AuthenticatorStateUpdate');
		const update = data.kind.AuthenticatorStateUpdate!;
		expect(update.authenticatorObjInitialSharedVersion).toEqual('1');
		expect(update.newActiveJwks).toHaveLength(1);
		expect(update.newActiveJwks[0]).toMatchObject({
			jwkId: { iss: 'https://auth.3dos.io' },
			jwk: { kty: 'RSA', e: 'AQAB', alg: 'RS256' },
			epoch: '0',
		});
	});

	it('decodes and round-trips a randomness state update', () => {
		const data = parse(FIXTURES.RANDOMNESS_STATE_UPDATE);

		expect(data.kind.$kind).toEqual('RandomnessStateUpdate');
		expect(data.kind.RandomnessStateUpdate).toMatchObject({
			epoch: '0',
			randomnessRound: '0',
			randomnessObjInitialSharedVersion: '1',
		});
		expect(data.kind.RandomnessStateUpdate!.randomBytes).toHaveLength(48);
	});

	it('decodes and round-trips an end-of-epoch transaction', () => {
		const data = parse(FIXTURES.END_OF_EPOCH);

		expect(data.kind.$kind).toEqual('EndOfEpochTransaction');
		expect(data.kind.EndOfEpochTransaction).toEqual([
			{
				$kind: 'AuthenticatorStateExpire',
				AuthenticatorStateExpire: { minEpoch: '0', authenticatorObjInitialSharedVersion: '1' },
			},
			{ $kind: 'BridgeCommitteeInit', BridgeCommitteeInit: '1' },
			{
				$kind: 'StoreExecutionTimeObservations',
				StoreExecutionTimeObservations: { $kind: 'V1', V1: [] },
			},
			{ $kind: 'WriteAccumulatorStorageCost', WriteAccumulatorStorageCost: { storageCost: '0' } },
			{
				$kind: 'ChangeEpoch',
				ChangeEpoch: expect.objectContaining({
					epoch: '1',
					protocolVersion: '139',
					systemPackages: [],
				}),
			},
		]);
	});

	it('decodes and round-trips an accumulator settlement prologue', () => {
		const data = parse(FIXTURES.SETTLEMENT_PROLOGUE);

		expect(data.kind.$kind).toEqual('ProgrammableSystemTransaction');
		const { inputs, commands } = data.kind.ProgrammableSystemTransaction!;
		expect(inputs[0].Object?.SharedObject).toEqual({
			objectId: ACCUMULATOR_ROOT,
			initialSharedVersion: '1',
			mutable: true,
		});
		expect(commands.map((command) => command.MoveCall?.function)).toEqual([
			'settlement_prologue',
			'record_accumulator_object_changes',
		]);
	});

	it('decodes and round-trips a settlement taking non-exclusive write access', () => {
		const data = parse(FIXTURES.SETTLEMENT_NON_EXCLUSIVE_WRITE);

		expect(data.kind.$kind).toEqual('ProgrammableSystemTransaction');
		const { inputs, commands } = data.kind.ProgrammableSystemTransaction!;
		expect(inputs[0].Object?.SharedObject).toEqual({
			objectId: ACCUMULATOR_ROOT,
			initialSharedVersion: '1',
			mutable: false,
			mutability: 'NonExclusiveWrite',
		});
		expect(commands.map((command) => command.MoveCall?.function)).toEqual([
			'settlement_prologue',
			'settle_u128',
		]);
	});

	it('keeps non-exclusive write access through the client transaction data', () => {
		const data = parseTransactionDataBcs(fromBase64(FIXTURES.SETTLEMENT_NON_EXCLUSIVE_WRITE));

		expect(data.kind.$kind).toEqual('ProgrammableSystemTransaction');
		expect(data.kind.ProgrammableSystemTransaction!.inputs[0]).toEqual({
			$kind: 'Object',
			Object: {
				$kind: 'SharedObject',
				SharedObject: {
					objectId: ACCUMULATOR_ROOT,
					initialSharedVersion: '1',
					mutable: false,
					mutability: 'NonExclusiveWrite',
				},
			},
		});
	});

	it('encodes shared object mutability as the bool it replaced', () => {
		const ref = { objectId: ACCUMULATOR_ROOT, initialSharedVersion: '1' };
		const tail = (bytes: Uint8Array) => bytes[bytes.length - 1];

		expect(tail(bcs.SharedObjectRef.serialize({ ...ref, mutable: false }).toBytes())).toBe(0);
		expect(tail(bcs.SharedObjectRef.serialize({ ...ref, mutable: true }).toBytes())).toBe(1);
		expect(
			tail(
				bcs.SharedObjectRef.serialize({
					...ref,
					mutable: false,
					mutability: 'NonExclusiveWrite',
				}).toBytes(),
			),
		).toBe(2);
	});

	it('decodes the accumulator field object types and party owners at their Rust indices', () => {
		expect(bcs.MoveObjectType.parse(new Uint8Array([4]))).toEqual({
			$kind: 'SuiBalanceAccumulatorField',
			SuiBalanceAccumulatorField: true,
		});
		expect(bcs.MoveObjectType.parse(new Uint8Array([5, 2]))).toEqual({
			$kind: 'BalanceAccumulatorField',
			BalanceAccumulatorField: 'u64',
		});

		const party = {
			startVersion: '7',
			permissions: {
				defaultPermissions: '3',
				members: [[ACCUMULATOR_ROOT, '63'] as [string, string]],
			},
		};
		const bytes = bcs.Owner.serialize({ Party: party }).toBytes();
		expect(bytes[0]).toBe(5);
		expect(bytes).toHaveLength(1 + 8 + 8 + 1 + 32 + 8);
		expect(bcs.Owner.parse(bytes)).toEqual({ $kind: 'Party', Party: party });
	});
});
