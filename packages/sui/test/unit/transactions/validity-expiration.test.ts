// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase58 } from '@mysten/bcs';
import { describe, expect, it } from 'vitest';

import { bcs } from '../../../src/bcs/index.js';
import {
	grpcTransactionToTransactionData,
	transactionDataToGrpcTransaction,
} from '../../../src/client/transaction-resolver.js';
import type { Transaction as GrpcTransaction } from '../../../src/grpc/proto/sui/rpc/v2/transaction.js';
import { TransactionExpiration_TransactionExpirationKind } from '../../../src/grpc/proto/sui/rpc/v2/transaction.js';
import { Transaction } from '../../../src/transactions/Transaction.js';

const CHAIN = toBase58(new Uint8Array(32).fill(7));

const VALIDITY = {
	minEpoch: '11',
	maxEpoch: '12',
	minTimestamp: null,
	maxTimestamp: null,
	chain: CHAIN,
	nonce: 42,
	allowedProposers: {
		epoch: '11',
		proposers: [0, 2, 5],
	},
};

describe('Validity transaction expiration', () => {
	it('round-trips through bcs', () => {
		const bytes = bcs.TransactionExpiration.serialize({ Validity: VALIDITY }).toBytes();
		const parsed = bcs.TransactionExpiration.parse(bytes);

		expect(parsed).toEqual({ $kind: 'Validity', Validity: VALIDITY });
	});

	it('round-trips through bcs without a proposer set', () => {
		const validity = { ...VALIDITY, allowedProposers: null };
		const bytes = bcs.TransactionExpiration.serialize({ Validity: validity }).toBytes();
		const parsed = bcs.TransactionExpiration.parse(bytes);

		expect(parsed).toEqual({ $kind: 'Validity', Validity: validity });
	});

	it('converts to a grpc transaction', () => {
		const tx = new Transaction();
		tx.setExpiration({ Validity: VALIDITY });

		const grpcTx = transactionDataToGrpcTransaction(tx.getData());

		expect(grpcTx.expiration).toEqual({
			kind: TransactionExpiration_TransactionExpirationKind.VALIDITY,
			minEpoch: 11n,
			epoch: 12n,
			chain: CHAIN,
			nonce: 42,
			allowedProposers: {
				epoch: 11n,
				proposers: [0, 2, 5],
			},
		});
	});

	it('parses from a grpc transaction', () => {
		const grpcTx = {
			kind: {
				data: {
					oneofKind: 'programmableTransaction',
					programmableTransaction: { inputs: [], commands: [] },
				},
			},
			expiration: {
				kind: TransactionExpiration_TransactionExpirationKind.VALIDITY,
				minEpoch: 11n,
				epoch: 12n,
				chain: CHAIN,
				nonce: 42,
				allowedProposers: {
					epoch: 11n,
					proposers: [0, 2, 5],
				},
			},
		} as unknown as GrpcTransaction;

		const data = grpcTransactionToTransactionData(grpcTx);

		expect(data.expiration).toEqual({ $kind: 'Validity', Validity: VALIDITY });
	});

	it('parses a grpc transaction without a proposer set', () => {
		const grpcTx = {
			kind: {
				data: {
					oneofKind: 'programmableTransaction',
					programmableTransaction: { inputs: [], commands: [] },
				},
			},
			expiration: {
				kind: TransactionExpiration_TransactionExpirationKind.VALIDITY,
				minEpoch: 11n,
				epoch: 12n,
				chain: CHAIN,
				nonce: 42,
			},
		} as unknown as GrpcTransaction;

		const data = grpcTransactionToTransactionData(grpcTx);

		expect(data.expiration).toEqual({
			$kind: 'Validity',
			Validity: { ...VALIDITY, allowedProposers: null },
		});
	});
});
