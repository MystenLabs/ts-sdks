// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, expectTypeOf, it } from 'vitest';

import { bcs } from '../../../src/bcs/index.js';
import { parseTransactionDataBcs } from '../../../src/client/transaction-data.js';
import type { SuiClientTypes } from '../../../src/client/types.js';
import { Transaction } from '../../../src/transactions/index.js';

const address = `0x${'11'.repeat(32)}`;
const digest = '11111111111111111111111111111111';
const changeEpoch = {
	epoch: '5',
	protocolVersion: '100',
	storageCharge: '11',
	computationCharge: '12',
	storageRebate: '13',
	nonRefundableStorageFee: '14',
	epochStartTimestampMs: '15',
	systemPackages: [['9', [new Uint8Array([1, 2, 3])], [address]]],
} satisfies Extract<
	typeof bcs.TransactionKind.$inferInput,
	{ ChangeEpoch: unknown }
>['ChangeEpoch'];
const consensus = { epoch: '5', round: '7', commitTimestampMs: '1234' };
const consensusV2 = { ...consensus, consensusCommitDigest: digest };
const consensusV3 = {
	...consensusV2,
	subDagIndex: '2',
	consensusDeterminedVersionAssignments: { CancelledTransactions: [[digest, [[address, '10']]]] },
} satisfies Extract<
	typeof bcs.TransactionKind.$inferInput,
	{ ConsensusCommitPrologueV3: unknown }
>['ConsensusCommitPrologueV3'];
const programmable = {
	inputs: [{ Pure: { bytes: 'AQ==' } }],
	commands: [
		{
			MoveCall: {
				package: address,
				module: 'example',
				function: 'run',
				typeArguments: [{ u64: true }],
				arguments: [{ Input: 0 }],
			},
		},
	],
} satisfies typeof bcs.ProgrammableTransaction.$inferInput;
const kinds = {
	ProgrammableTransaction: { ProgrammableTransaction: programmable },
	ProgrammableSystemTransaction: { ProgrammableSystemTransaction: programmable },
	ChangeEpoch: { ChangeEpoch: changeEpoch },
	Genesis: { Genesis: { objects: [] } },
	ConsensusCommitPrologue: { ConsensusCommitPrologue: consensus },
	ConsensusCommitPrologueV2: { ConsensusCommitPrologueV2: consensusV2 },
	ConsensusCommitPrologueV3: { ConsensusCommitPrologueV3: consensusV3 },
	ConsensusCommitPrologueV4: {
		ConsensusCommitPrologueV4: { ...consensusV3, additionalStateDigest: digest },
	},
	AuthenticatorStateUpdate: {
		AuthenticatorStateUpdate: {
			epoch: '5',
			round: '7',
			authenticatorObjInitialSharedVersion: '1',
			newActiveJwks: [
				{
					epoch: '5',
					jwkId: { iss: 'issuer', kid: 'key' },
					jwk: { kty: 'RSA', e: 'AQAB', n: 'modulus', alg: 'RS256' },
				},
			],
		},
	},
	RandomnessStateUpdate: {
		RandomnessStateUpdate: {
			epoch: '5',
			randomnessRound: '8',
			randomBytes: new Uint8Array([1, 2, 3]),
			randomnessObjInitialSharedVersion: '2',
		},
	},
	EndOfEpochTransaction: {
		EndOfEpochTransaction: [
			{ ChangeEpoch: changeEpoch },
			{ AuthenticatorStateCreate: true },
			{ AuthenticatorStateExpire: { minEpoch: '3', authenticatorObjInitialSharedVersion: '1' } },
			{ RandomnessStateCreate: true },
			{ DenyListStateCreate: true },
			{ BridgeStateCreate: digest },
			{ BridgeCommitteeInit: '5' },
			{
				StoreExecutionTimeObservations: {
					V1: [[{ TransferObjects: true }, [[new Uint8Array([4, 5]), { secs: '6', nanos: 7 }]]]],
				},
			},
			{ AccumulatorRootCreate: true },
			{ CoinRegistryCreate: true },
			{ DisplayRegistryCreate: true },
			{ AddressAliasStateCreate: true },
			{ WriteAccumulatorStorageCost: { storageCost: '123' } },
			{ ForwardingAddressRegistryCreate: true },
		],
	},
} satisfies Record<SuiClientTypes.TransactionKind['$kind'], typeof bcs.TransactionKind.$inferInput>;

function serialize(kind: typeof bcs.TransactionKind.$inferInput) {
	return bcs.TransactionData.serialize({
		V1: {
			sender: address,
			gasData: {
				owner: address,
				payment: [{ objectId: address, version: '9007199254740993', digest }],
				price: '9007199254740994',
				budget: '9007199254740995',
			},
			expiration: { None: true },
			kind,
		},
	}).toBytes();
}

describe('ledger transaction data', () => {
	it.each(Object.entries(kinds))(
		'decodes %s without requiring a programmable transaction',
		(name, kind) => {
			const bytes = serialize(kind);
			const result = parseTransactionDataBcs(bytes);
			expect(result.kind.$kind).toBe(name);
			expect(result.sender).toBe(address);
			expect(result.gasData.price).toBe('9007199254740994');
			expect(result.gasData.payment[0].version).toBe('9007199254740993');
			expect(result.expiration).toEqual({ $kind: 'None', None: true });
			// Every payload must survive, including system packages, JWKs and epoch operations.
			expect(bcs.TransactionData.serialize({ V1: result }).toBytes()).toEqual(bytes);
			expect(result).not.toHaveProperty('version');
			expect(result).not.toHaveProperty('inputs');
			expect(result).not.toHaveProperty('commands');
		},
	);

	it('exposes resolved programmable input and command unions', () => {
		const { kind } = parseTransactionDataBcs(serialize(kinds.ProgrammableTransaction));
		if (kind.$kind !== 'ProgrammableTransaction') throw new Error('Expected PTB');
		expectTypeOf(
			kind.ProgrammableTransaction,
		).toEqualTypeOf<SuiClientTypes.ProgrammableTransaction>();
		expect(kind.ProgrammableTransaction.inputs).toEqual([
			{ $kind: 'Pure', Pure: { bytes: 'AQ==' } },
		]);
		expect(kind.ProgrammableTransaction.commands[0].MoveCall?.typeArguments).toEqual(['u64']);
		expect(kind.ProgrammableTransaction.commands[0].MoveCall?.arguments).toEqual([
			{ $kind: 'Input', Input: 0 },
		]);
	});

	it('preserves all nested end-of-epoch variants', () => {
		const { kind } = parseTransactionDataBcs(serialize(kinds.EndOfEpochTransaction));
		if (kind.$kind !== 'EndOfEpochTransaction') throw new Error('Expected end of epoch');
		expect(kind.EndOfEpochTransaction).toHaveLength(14);
		expect(kind.EndOfEpochTransaction.at(-2)).toEqual({
			$kind: 'WriteAccumulatorStorageCost',
			WriteAccumulatorStorageCost: { storageCost: '123' },
		});
	});

	it('keeps the builder serialization model separate', () => {
		const tx = Transaction.from(serialize(kinds.ProgrammableTransaction));
		const data = tx.getData();
		expect(data.version).toBe(2);
		expect(data.commands[0].MoveCall?.typeArguments).toEqual(['u64']);
		expect(data.commands[0].MoveCall?.arguments).toEqual([{ $kind: 'Input', Input: 0 }]);
		expect(data).not.toHaveProperty('kind');
	});

	it('rejects malformed transaction bytes', () => {
		expect(() => parseTransactionDataBcs(new Uint8Array())).toThrow();
		expect(() => parseTransactionDataBcs(new Uint8Array([255]))).toThrow();
		const valid = serialize(kinds.Genesis);
		expect(() => parseTransactionDataBcs(valid.slice(0, -1))).toThrow();
	});
});
