// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { Transaction } from '@mysten/sui/transactions';
import { describe, expect, test } from 'vitest';
import { PredictInputError, PredictMoveError, decodeMoveAbort } from '../../src/predict/errors.js';
import type { MoveAbortError } from '../../src/predict/errors.js';
import type { ReadClient } from '../../src/predict/reads/inspect.js';
import { inspectReturns } from '../../src/predict/reads/inspect.js';

// The structured MoveAbort execution error `@mysten/sui` surfaces on a failed
// simulate. `abortName` comes from the fullnode's chain-decoded clever-error
// `constantName`, never a local table.
const ABORT: MoveAbortError = {
	MoveAbort: {
		abortCode: '6',
		location: { module: 'expiry_market' },
		cleverError: { constantName: 'EMintQuantityBelowMin' },
	},
};

describe('decodeMoveAbort', () => {
	test('decodes a structured MoveAbort to module/code/name', () => {
		const e = decodeMoveAbort(ABORT);
		expect(e).toBeInstanceOf(PredictMoveError);
		expect(e).toMatchObject({
			module: 'expiry_market',
			code: 6n,
			abortName: 'EMintQuantityBelowMin',
		});
	});

	test('no cleverError → abortName null (non-clever / JSON-RPC abort)', () => {
		const e = decodeMoveAbort({
			MoveAbort: { abortCode: '99', location: { module: 'expiry_market' } },
		});
		expect(e?.module).toBe('expiry_market');
		expect(e?.code).toBe(99n);
		expect(e?.abortName).toBeNull();
	});

	test('u64 abort codes above 2^53 decode exactly (clever-error packing)', () => {
		// A clever-error abort code packs module/line/constant into the high bits, so it
		// routinely exceeds Number.MAX_SAFE_INTEGER; BigInt(<string>) must keep it exact.
		const e = decodeMoveAbort({
			MoveAbort: {
				abortCode: '9223372036854775814',
				location: { module: 'expiry_market' },
				cleverError: { constantName: 'EMintQuantityBelowMin' },
			},
		});
		expect(e?.code).toBe(9223372036854775814n);
		expect(e?.abortName).toBe('EMintQuantityBelowMin');
	});

	test('accepts abortCode as a number or bigint', () => {
		expect(decodeMoveAbort({ MoveAbort: { abortCode: 6 } })?.code).toBe(6n);
		expect(decodeMoveAbort({ MoveAbort: { abortCode: 6n } })?.code).toBe(6n);
	});

	test('no MoveAbort → null', () => {
		expect(decodeMoveAbort({})).toBeNull();
		expect(decodeMoveAbort(null)).toBeNull();
		expect(decodeMoveAbort(undefined)).toBeNull();
	});

	test('MoveAbort without a location decodes with an empty module', () => {
		const e = decodeMoveAbort({ MoveAbort: { abortCode: '6' } });
		expect(e).toBeInstanceOf(PredictMoveError);
		expect(e?.module).toBe('');
		expect(e?.code).toBe(6n);
	});

	test('MoveAbort without an abortCode defaults code to 0n', () => {
		expect(decodeMoveAbort({ MoveAbort: { location: { module: 'plp' } } })?.code).toBe(0n);
	});

	test('message includes module and abort name when the name is known', () => {
		const msg = decodeMoveAbort(ABORT)!.message;
		expect(msg).toContain('expiry_market');
		expect(msg).toContain('EMintQuantityBelowMin');
	});

	test('message includes the raw code when the abort is unnamed', () => {
		const msg = decodeMoveAbort({
			MoveAbort: { abortCode: '99', location: { module: 'expiry_market' } },
		})!.message;
		expect(msg).toContain('expiry_market');
		expect(msg).toContain('99');
	});
});

describe('PredictInputError', () => {
	test('is an Error subclass carrying its message', () => {
		const e = new PredictInputError('bad input');
		expect(e).toBeInstanceOf(Error);
		expect(e.message).toBe('bad input');
	});
});

describe('inspectReturns decodes aborts on FailedTransaction', () => {
	function failingClient(error: unknown): ReadClient {
		return {
			core: {
				async simulateTransaction() {
					return {
						$kind: 'FailedTransaction',
						FailedTransaction: { status: { success: false, error } },
						commandResults: undefined,
					};
				},
			},
		} as unknown as ReadClient;
	}

	test('throws PredictMoveError from the structured MoveAbort arm (chain-decoded name)', async () => {
		const client = failingClient({
			MoveAbort: {
				abortCode: '6',
				location: { module: 'expiry_market' },
				cleverError: { constantName: 'EMintQuantityBelowMin' },
			},
		});
		const err = await inspectReturns(client, new Transaction()).catch((e) => e);
		expect(err).toBeInstanceOf(PredictMoveError);
		expect(err.module).toBe('expiry_market');
		expect(err.code).toBe(6n);
		expect(err.abortName).toBe('EMintQuantityBelowMin');
	});

	test('falls back to a plain Error when the failure carries no MoveAbort', async () => {
		const client = failingClient({ message: 'InsufficientGas' });
		const err = await inspectReturns(client, new Transaction()).catch((e) => e);
		expect(err).toBeInstanceOf(Error);
		expect(err).not.toBeInstanceOf(PredictMoveError);
		expect(err.message).toContain('InsufficientGas');
	});
});
