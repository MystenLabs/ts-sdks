// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { projectCapacity, estimateWaitSecs, fetchGuardianInfo } from '../../src/guardian.js';
import { HashiGuardianError } from '../../src/errors.js';
import type { GuardianLimiterConfig, GuardianLimiterState } from '../../src/types.js';

const config: GuardianLimiterConfig = {
	refillRateSatsPerSec: 1_000n,
	maxBucketCapacitySats: 2_000_000n,
};

function state(overrides?: Partial<GuardianLimiterState>): GuardianLimiterState {
	return {
		numTokensAvailableSats: 0n,
		lastUpdatedAtSecs: 0n,
		nextSeq: 0n,
		...overrides,
	};
}

describe('projectCapacity', () => {
	it('refills linearly over time', () => {
		const s = state();
		expect(projectCapacity(config, s, 100n)).toBe(100_000n);
	});

	it('caps at maxBucketCapacitySats', () => {
		const s = state();
		expect(projectCapacity(config, s, 10_000n)).toBe(2_000_000n);
	});

	it('returns existing tokens when no time has elapsed', () => {
		const s = state({ numTokensAvailableSats: 500_000n, lastUpdatedAtSecs: 50n });
		expect(projectCapacity(config, s, 50n)).toBe(500_000n);
	});

	it('adds refill to existing tokens', () => {
		const s = state({ numTokensAvailableSats: 500_000n, lastUpdatedAtSecs: 50n });
		expect(projectCapacity(config, s, 150n)).toBe(600_000n);
	});

	it('clamps refill + existing to max', () => {
		const s = state({ numTokensAvailableSats: 1_999_000n, lastUpdatedAtSecs: 0n });
		expect(projectCapacity(config, s, 100n)).toBe(2_000_000n);
	});

	it('handles timestamp before lastUpdatedAt gracefully (no negative)', () => {
		const s = state({ lastUpdatedAtSecs: 100n });
		expect(projectCapacity(config, s, 50n)).toBe(0n);
	});

	it('handles already-full bucket', () => {
		const s = state({ numTokensAvailableSats: 2_000_000n, lastUpdatedAtSecs: 0n });
		expect(projectCapacity(config, s, 1_000n)).toBe(2_000_000n);
	});

	it('handles zero refill rate', () => {
		const zeroConfig = { ...config, refillRateSatsPerSec: 0n };
		const s = state({ numTokensAvailableSats: 500n });
		expect(projectCapacity(zeroConfig, s, 9999n)).toBe(500n);
	});
});

describe('estimateWaitSecs', () => {
	it('returns 0n when capacity already available', () => {
		const s = state({ numTokensAvailableSats: 1_000_000n });
		expect(estimateWaitSecs(config, s, 500_000n, 0n)).toBe(0n);
	});

	it('returns null when amount exceeds max bucket capacity', () => {
		const s = state();
		expect(estimateWaitSecs(config, s, 2_000_001n, 0n)).toBeNull();
	});

	it('computes wait from empty bucket', () => {
		const s = state();
		// Need 1_000_000 sats, refill rate 1_000/sec → 1_000 seconds
		expect(estimateWaitSecs(config, s, 1_000_000n, 0n)).toBe(1_000n);
	});

	it('uses ceiling division for fractional seconds', () => {
		const s = state();
		// Need 1_001 sats, refill rate 1_000/sec → ceil(1_001/1_000) = 2 seconds
		expect(estimateWaitSecs(config, s, 1_001n, 0n)).toBe(2n);
	});

	it('accounts for partial refill via elapsed time', () => {
		const s = state({ lastUpdatedAtSecs: 0n });
		// At nowSecs=500, available = 500_000. Need 600_000. Deficit = 100_000.
		// Wait = 100_000 / 1_000 = 100 seconds.
		expect(estimateWaitSecs(config, s, 600_000n, 500n)).toBe(100n);
	});

	it('returns null when refill rate is zero and deficit exists', () => {
		const zeroConfig = { ...config, refillRateSatsPerSec: 0n };
		const s = state({ numTokensAvailableSats: 100n });
		expect(estimateWaitSecs(zeroConfig, s, 200n, 0n)).toBeNull();
	});

	it('returns 0n when exact amount is available', () => {
		const s = state({ numTokensAvailableSats: 1_000_000n });
		expect(estimateWaitSecs(config, s, 1_000_000n, 0n)).toBe(0n);
	});

	it('returns 0n when refill at nowSecs makes amount exactly available', () => {
		const s = state({ lastUpdatedAtSecs: 0n });
		// At nowSecs=100, available = 100_000
		expect(estimateWaitSecs(config, s, 100_000n, 100n)).toBe(0n);
	});
});

const INFO_BODY = {
	limiter: {
		state: { numTokensAvailableSats: '500000', lastUpdatedAtSecs: '1720000000', nextSeq: '7' },
		config: { refillRateSatsPerSec: '1000', maxBucketCapacitySats: '2000000' },
	},
	gitRevision: 'abc123',
	committeeEpoch: '3',
	btcPubkey: 'deadbeef',
	signingPubKey: 'feedface',
	signedAtMs: '1720000000123',
};

function mockFetch(body: unknown, init?: { ok?: boolean; status?: number }) {
	return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
		ok: init?.ok ?? true,
		status: init?.status ?? 200,
		json: async () => body,
	} as Response);
}

describe('fetchGuardianInfo', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('parses a fully-initialized /info body (strings → bigint)', async () => {
		mockFetch(INFO_BODY);
		const info = await fetchGuardianInfo('https://g.example');
		expect(info).toEqual({
			limiter: {
				state: {
					numTokensAvailableSats: 500_000n,
					lastUpdatedAtSecs: 1_720_000_000n,
					nextSeq: 7n,
				},
				config: { refillRateSatsPerSec: 1_000n, maxBucketCapacitySats: 2_000_000n },
			},
			gitRevision: 'abc123',
			committeeEpoch: 3n,
			btcPubkey: 'deadbeef',
			signingPubKey: 'feedface',
			signedAtMs: 1_720_000_000_123n,
		});
	});

	it('appends /info, strips trailing slashes, and sends a preflight-free GET', async () => {
		const spy = mockFetch(INFO_BODY);
		await fetchGuardianInfo('https://g.example///');
		expect(spy).toHaveBeenCalledWith('https://g.example/info', {
			headers: { Accept: 'application/json' },
		});
	});

	it('returns limiter: null for an uninitialized guardian', async () => {
		mockFetch({ ...INFO_BODY, limiter: null, btcPubkey: null, committeeEpoch: null });
		const info = await fetchGuardianInfo('https://g.example');
		expect(info.limiter).toBeNull();
		expect(info.btcPubkey).toBeNull();
		expect(info.committeeEpoch).toBeNull();
		expect(info.gitRevision).toBe('abc123');
	});

	it('throws http-error on a non-2xx status', async () => {
		mockFetch(null, { ok: false, status: 503 });
		const err = await fetchGuardianInfo('https://g.example').catch((e) => e);
		expect(err).toBeInstanceOf(HashiGuardianError);
		expect(err.code).toBe('http-error');
		expect(err.status).toBe(503);
	});

	it('throws unreachable when fetch rejects', async () => {
		const cause = new TypeError('fetch failed');
		vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(cause);
		const err = await fetchGuardianInfo('https://g.example').catch((e) => e);
		expect(err).toBeInstanceOf(HashiGuardianError);
		expect(err.code).toBe('unreachable');
		expect(err.cause).toBe(cause);
	});

	it('throws malformed-response on a non-JSON body', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => {
				throw new SyntaxError('Unexpected token');
			},
		} as unknown as Response);
		const err = await fetchGuardianInfo('https://g.example').catch((e) => e);
		expect(err).toBeInstanceOf(HashiGuardianError);
		expect(err.code).toBe('malformed-response');
	});

	it('throws malformed-response on a partial limiter (never masks with 0)', async () => {
		mockFetch({
			...INFO_BODY,
			limiter: { state: INFO_BODY.limiter.state, config: { refillRateSatsPerSec: '1000' } },
		});
		const err = await fetchGuardianInfo('https://g.example').catch((e) => e);
		expect(err).toBeInstanceOf(HashiGuardianError);
		expect(err.code).toBe('malformed-response');
	});
});
