// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, expectTypeOf, it } from 'vitest';

import type { SuiClientTypes } from '../../../src/client/index.js';
import {
	GrpcTypes,
	parseGrpcSimulateTransactionResponse,
	parseGrpcTransactionResponse,
} from '../../../src/grpc/index.js';

function expectBytes(bytes: Uint8Array | undefined, expected: number[]) {
	expect(bytes).toBeInstanceOf(Uint8Array);
	expect(Array.from(bytes!)).toEqual(expected);
}

describe('gRPC transaction response parsers', () => {
	it('parses protobuf JSON simulation responses into SDK simulation results', () => {
		const response = GrpcTypes.SimulateTransactionResponse.fromJsonString(
			JSON.stringify({
				transaction: {
					digest: 'transaction-digest',
					transaction: {
						digest: 'transaction-data-digest',
						bcs: {
							name: 'TransactionData',
							value: 'AQIDBA==',
						},
					},
					signatures: [
						{
							bcs: {
								value: 'CQgH',
							},
						},
					],
					effects: {
						status: {
							success: true,
						},
						epoch: '42',
						changedObjects: [
							{
								objectId: '0x2',
								objectType: '0x2::coin::Coin<0x2::sui::SUI>',
							},
						],
					},
					events: {
						events: [
							{
								packageId: '0x2',
								module: 'test',
								sender: '0x1',
								eventType: '0x2::test::Event',
								contents: {
									value: 'BQYH',
								},
							},
						],
					},
				},
				commandOutputs: [
					{
						returnValues: [
							{
								value: {
									value: 'CgsM',
								},
							},
						],
						mutatedByRef: [
							{
								value: {
									value: 'DQ4P',
								},
							},
						],
					},
				],
				suggestedGasPrice: '1000',
			}),
		);

		expect(response.suggestedGasPrice).toBe(1000n);
		expect(response.transaction?.effects?.epoch).toBe(42n);
		expectBytes(response.transaction?.transaction?.bcs?.value, [1, 2, 3, 4]);

		const result = parseGrpcSimulateTransactionResponse(response, {
			include: {
				bcs: true,
				commandResults: true,
				events: true,
				objectTypes: true,
			},
		});

		expect(result.$kind).toBe('Transaction');
		if (result.$kind !== 'Transaction') {
			throw new Error('Expected Transaction result');
		}

		expect(result.Transaction.digest).toBe('transaction-digest');
		expect(result.Transaction.epoch).toBe('42');
		expectTypeOf(result.Transaction.bcs).toEqualTypeOf<Uint8Array>();
		expectTypeOf(result.Transaction.events).toEqualTypeOf<SuiClientTypes.Event[]>();
		expectTypeOf(result.Transaction.objectTypes).toEqualTypeOf<Record<string, string>>();
		expectTypeOf(result.commandResults).toEqualTypeOf<SuiClientTypes.CommandResult[]>();
		expect(result.Transaction.objectTypes).toEqual({
			'0x2': '0x2::coin::Coin<0x2::sui::SUI>',
		});
		expectBytes(result.Transaction.bcs, [1, 2, 3, 4]);
		expectBytes(result.Transaction.events?.[0]?.bcs, [5, 6, 7]);
		expectBytes(result.commandResults?.[0]?.returnValues[0]?.bcs, [10, 11, 12]);
		expectBytes(result.commandResults?.[0]?.mutatedReferences[0]?.bcs, [13, 14, 15]);

		const defaultResult = parseGrpcSimulateTransactionResponse(response);
		if (defaultResult.$kind === 'Transaction') {
			expectTypeOf(defaultResult.Transaction.bcs).toEqualTypeOf<undefined>();
			expectTypeOf(defaultResult.Transaction.events).toEqualTypeOf<undefined>();
			expectTypeOf(defaultResult.commandResults).toEqualTypeOf<undefined>();
		}

		const transactionResult = parseGrpcTransactionResponse(response.transaction!, {
			include: {
				effects: true,
			},
		});
		if (transactionResult.$kind === 'Transaction') {
			expectTypeOf(
				transactionResult.Transaction.effects,
			).toEqualTypeOf<SuiClientTypes.TransactionEffects>();
			expectTypeOf(transactionResult.Transaction.bcs).toEqualTypeOf<undefined>();
		}
	});

	it('returns FailedTransaction for unsuccessful executed transactions', () => {
		const response = GrpcTypes.ExecutedTransaction.create({
			digest: 'failed-transaction-digest',
			effects: {
				status: {
					success: false,
				},
			},
		});

		const result = parseGrpcTransactionResponse(response);

		expect(result.$kind).toBe('FailedTransaction');
		if (result.$kind !== 'FailedTransaction') {
			throw new Error('Expected FailedTransaction result');
		}

		expect(result.FailedTransaction.digest).toBe('failed-transaction-digest');
		expect(result.FailedTransaction.status).toEqual({
			success: false,
			error: {
				$kind: 'Unknown',
				message: 'Transaction failed',
				Unknown: null,
			},
		});
	});
});
