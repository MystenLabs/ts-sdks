// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { Transaction } from '@mysten/sui/transactions';
import { describe, expect, test } from 'vitest';
import {
	ABORT_NAMES,
	PredictInputError,
	PredictMoveError,
	PredictPreflightError,
	abortNameFor,
	decodeMoveAbort,
	describePredictError,
} from '../../src/predict/errors.js';
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

	test('no cleverError and a code outside the table → abortName null', () => {
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

// Predict's error constants are plain u64 codes, so the fullnode surfaces no clever-error name and
// the SDK names them from ABORT_NAMES. The expected names are the Move constants at deepbookv3
// af9f7c37 (`const EName: u64 = code;`).
describe('plain abort codes decode to their constant names', () => {
	const plain = (module: string, code: number) =>
		decodeMoveAbort({ MoveAbort: { abortCode: String(code), location: { module } } });

	test.each([
		['queue', 0, 'EWrongDesk'],
		['queue', 3, 'EQueueFull'],
		['queue', 9, 'ERecordNotOpen'],
		['queue', 12, 'EMarketNotExpired'],
		['desk', 0, 'EPackageVersionDisabled'],
		['desk', 2, 'EProtocolFrozen'],
		['order_queue', 0, 'ERecordNotOpen'],
		['delayed_execution_config', 10, 'EInvalidOrderFee'],
		['delayed_execution_config', 15, 'EInvalidLimits'],
		['expiry_market', 1, 'EMarketNotSettled'],
		['expiry_market', 13, 'EDelayedExecutionRequired'],
		['expiry_market', 14, 'EOrderFailsLimits'],
		['expiry_market', 15, 'EInsufficientMarketCash'],
		['expiry_market', 22, 'EWrongPrice'],
		['protocol_config', 3, 'EPackageVersionDisabled'],
		['protocol_config', 13, 'ECutoverNotReached'],
		['protocol_config', 15, 'EOrderFlowNotAllowed'],
		['lazer_price', 2, 'EFeedMissing'],
		['pricing', 0, 'EZeroForward'],
		['pricing', 12, 'EBlockScholesPriceUnavailable'],
		['pricing', 16, 'EBlockScholesInputTooWide'],
		['pricing', 19, 'EPythForwardRequired'],
	] as [string, number, string][])('%s code %i is %s', (module, code, name) => {
		expect(plain(module, code)?.abortName).toBe(name);
		expect(abortNameFor(module, BigInt(code))).toBe(name);
	});

	test('each module lists distinct names, so an index is a code', () => {
		for (const names of Object.values(ABORT_NAMES)) {
			expect(new Set(names).size).toBe(names.length);
		}
		expect(ABORT_NAMES.queue).toHaveLength(13);
		expect(ABORT_NAMES.desk).toHaveLength(3);
		expect(ABORT_NAMES.expiry_market).toHaveLength(23);
		expect(ABORT_NAMES.protocol_config).toHaveLength(16);
		expect(ABORT_NAMES.pricing).toHaveLength(20);
	});

	test('an unknown module or a code past the table stays unnamed', () => {
		expect(plain('oracle', 6)?.abortName).toBeNull();
		expect(plain('queue', 13)?.abortName).toBeNull();
		expect(abortNameFor('queue', -1n)).toBeNull();
		for (const inherited of ['__proto__', 'constructor', 'hasOwnProperty', 'toString']) {
			expect(abortNameFor(inherited, 0n)).toBeNull();
			expect(plain(inherited, 0)?.abortName).toBeNull();
		}
		// A clever-error code packs bits far above any table index.
		expect(abortNameFor('queue', 9223372036854775814n)).toBeNull();
	});

	test('a clever-error name from the fullnode takes precedence over the table', () => {
		const e = decodeMoveAbort({
			MoveAbort: {
				abortCode: '3',
				location: { module: 'queue' },
				cleverError: { constantName: 'ESomethingElse' },
			},
		});
		expect(e?.abortName).toBe('ESomethingElse');
	});

	test('a decoded plain abort gets its readable text', () => {
		for (const [module, code] of [
			['queue', 3],
			['desk', 0],
			['expiry_market', 14],
			['lazer_price', 2],
			['protocol_config', 15],
			['pricing', 12],
			['pricing', 4],
		] as [string, number][]) {
			expect(describePredictError(plain(module, code)!)).not.toBeNull();
		}
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

// Delayed execution (DBU-885): readable text by `module::EName`, tolerant of unknown names.
describe('describePredictError', () => {
	test('names the placement, cutover and quote errors', () => {
		expect(
			describePredictError(new PredictMoveError('expiry_market', 20n, 'EInsufficientMarketCash')),
		).toBe("This market can't take an order this size right now.");
		expect(
			describePredictError(new PredictMoveError('protocol_config', 17n, 'ECutoverNotReached')),
		).toMatch(/watermark/);
		expect(
			describePredictError(new PredictMoveError('protocol_config', 15n, 'EOrderFlowNotAllowed')),
		).toMatch(/order-flow/);
		expect(
			describePredictError(new PredictMoveError('protocol_config', 3n, 'EPackageVersionDisabled')),
		).toMatch(/retired/);
		expect(
			describePredictError(new PredictMoveError('desk', 0n, 'EPackageVersionDisabled')),
		).toMatch(/order-flow package version is retired/);
		expect(
			describePredictError(new PredictMoveError('expiry_market', 13n, 'EDelayedExecutionRequired')),
		).toMatch(/queued order/);
		// A refused order names every cause admission checks, not only the order's own limits.
		expect(
			describePredictError(new PredictMoveError('expiry_market', 14n, 'EOrderFailsLimits')),
		).toMatch(/entry range.*minimum/);
		expect(
			describePredictError(new PredictMoveError('pricing', 12n, 'EBlockScholesPriceUnavailable')),
		).toMatch(/Try again/);
	});

	test("the queue's own checks are named by the companion's queue module", () => {
		for (const name of [
			'ERecordNotOpen',
			'ENotRecordOwner',
			'EQueueStuck',
			'EQueueFull',
			'EAccountOrderCap',
			'EPastCutoff',
			'EFeeNotCovered',
			'EBelowMinSell',
			'EMintCostCapRequired',
			'EWrongDesk',
			'EWrongMarket',
			'EMarketNotExpired',
		]) {
			expect(describePredictError(new PredictMoveError('queue', 0n, name))).not.toBeNull();
		}
		// They no longer abort from Predict's expiry_market.
		for (const name of ['EQueueStuck', 'ERecordNotOpen', 'EPastCutoff']) {
			expect(describePredictError(new PredictMoveError('expiry_market', 0n, name))).toBeNull();
		}
		for (const name of ['EFeedMissing', 'EPropertyNotRequested', 'EGenerationAfterEnvelope']) {
			expect(describePredictError(new PredictMoveError('lazer_price', 0n, name))).not.toBeNull();
		}
	});

	test('returns null for an unknown name, a nameless abort, or the wrong module', () => {
		expect(
			describePredictError(new PredictMoveError('expiry_market', 99n, 'ESomethingNew')),
		).toBeNull();
		expect(describePredictError(new PredictMoveError('expiry_market', 20n, null))).toBeNull();
		expect(
			describePredictError(new PredictMoveError('plp', 20n, 'EInsufficientMarketCash')),
		).toBeNull();
	});

	test('PredictPreflightError carries its code', () => {
		const e = new PredictPreflightError('market-cash', 'too big');
		expect(e).toBeInstanceOf(Error);
		expect(e).toMatchObject({
			name: 'PredictPreflightError',
			code: 'market-cash',
			message: 'too big',
		});
	});
});
