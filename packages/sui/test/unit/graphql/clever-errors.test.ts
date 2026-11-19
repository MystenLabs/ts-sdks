// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';

import { SimulationError } from '../../../src/client/index.js';
import { SuiGraphQLClient } from '../../../src/graphql/index.js';
import { parseTransactionEffects } from '../../../src/grpc/core.js';
import { GrpcTypes } from '../../../src/grpc/index.js';
import { Transaction } from '../../../src/transactions/index.js';

const PACKAGE = '0x' + 'a'.repeat(64);
const SENDER = '0x' + 'b'.repeat(64);

/** Resolves a transaction against a GraphQL server whose simulation aborts with these execution error fields. */
async function resolveAbortError(abort: Record<string, unknown>) {
	const fetch = vi.fn(async () =>
		Response.json({
			data: {
				simulateTransaction: {
					effects: {
						transaction: {
							transactionBcs: null,
							effects: {
								epoch: { epochId: 1 },
								status: 'FAILURE',
								executionError: {
									message: 'MoveAbort in 1st command',
									instructionOffset: 3,
									module: { name: 'm', package: { address: PACKAGE } },
									function: { name: 'f' },
									identifier: null,
									constant: null,
									sourceLineNumber: null,
									...abort,
								},
							},
						},
					},
				},
			},
		}),
	);
	const client = new SuiGraphQLClient({
		url: 'https://graphql.test.invalid',
		network: 'unknown',
		fetch,
	});

	const tx = new Transaction();
	tx.moveCall({ target: `${PACKAGE}::m::f` });
	tx.setSender(SENDER);
	tx.setGasBudget(50_000_000);
	tx.setGasPayment([]);

	const error = await tx.build({ client }).catch((e) => e);
	expect(error).toBeInstanceOf(SimulationError);
	const executionError = (error as SimulationError).executionError;
	if (executionError?.$kind !== 'MoveAbort') {
		throw new Error(`expected a MoveAbort, got ${executionError?.$kind}`);
	}
	return executionError;
}

async function resolveAbort(abort: Record<string, unknown>) {
	return (await resolveAbortError(abort)).MoveAbort;
}

describe('GraphQL clever errors', () => {
	it('reports the declared error code, which the server returns as the abort code', async () => {
		const abort = await resolveAbort({
			abortCode: '7',
			identifier: 'ENotAllowed',
			constant: 'not allowed',
			sourceLineNumber: 42,
		});

		expect(abort.abortCode).toBe('7');
		expect(abort.cleverError).toEqual({
			errorCode: 7,
			constantName: 'ENotAllowed',
			value: 'not allowed',
			lineNumber: 42,
		});
	});

	it('has no error code when the abort code is the raw clever error bitset', async () => {
		// Version 1 bitset with no error code (0xff), line 42 and no constants.
		const abortCode = BigInt('0xc0ff002affffffff').toString();
		const abort = await resolveAbort({ abortCode, sourceLineNumber: 42 });

		expect(abort.abortCode).toBe(abortCode);
		expect(abort.cleverError).toEqual({
			errorCode: undefined,
			constantName: undefined,
			value: undefined,
			lineNumber: 42,
		});
	});

	it('has no clever error for a plain abort code', async () => {
		const abort = await resolveAbort({ abortCode: '42' });

		expect(abort.abortCode).toBe('42');
		expect(abort.cleverError).toBeUndefined();
	});

	it('formats a raw constant in the message the same way as gRPC', async () => {
		// A `vector<u64>` constant is not rendered, so both transports report its BCS bytes as base64.
		const raw = 'AgEAAAAAAAAAAgAAAAAAAAA=';
		const graphqlError = await resolveAbortError({
			abortCode: '7',
			identifier: 'ENotAllowed',
			constant: raw,
			sourceLineNumber: 42,
		});

		const grpcEffects = parseTransactionEffects({
			effects: GrpcTypes.TransactionEffects.fromJson({
				status: {
					success: false,
					error: {
						command: '0',
						kind: 'MOVE_ABORT',
						abort: {
							abortCode: BigInt('0x8007002a00000000').toString(),
							location: { package: PACKAGE, module: 'm', functionName: 'f', instruction: 3 },
							cleverError: {
								errorCode: '7',
								lineNumber: '42',
								constantName: 'ENotAllowed',
								constantType: 'vector<u64>',
								raw,
							},
						},
					},
				},
			}),
		});
		const grpcError = grpcEffects!.status.error!;

		expect(graphqlError.MoveAbort.cleverError?.value).toBe(raw);
		expect(grpcError.$kind === 'MoveAbort' && grpcError.MoveAbort.cleverError?.value).toBe(raw);
		expect(graphqlError.message).toBe(
			`MoveAbort in 1st command, 'ENotAllowed': ${raw}, in '${PACKAGE}::m::f' (line 42)`,
		);
		expect(graphqlError.message).toBe(grpcError.message);
	});
});
