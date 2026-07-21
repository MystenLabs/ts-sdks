// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { HashiGuardianError } from './errors.js';
import type { GuardianLimiterConfig, GuardianLimiterState, RawGuardianInfo } from './types.js';

/**
 * Project the token-bucket capacity (sats) forward to `timestampSecs`, mirroring
 * the guardian's Rust limiter: `min(available + elapsed * refillRate, max)`.
 * Timestamps are unix seconds; one at or before `lastUpdatedAtSecs` yields the
 * stored balance.
 */
export function projectCapacity(
	config: GuardianLimiterConfig,
	state: GuardianLimiterState,
	timestampSecs: bigint,
): bigint {
	const elapsed =
		timestampSecs > state.lastUpdatedAtSecs ? timestampSecs - state.lastUpdatedAtSecs : 0n;
	const refilled = elapsed * config.refillRateSatsPerSec;
	const projected = state.numTokensAvailableSats + refilled;
	return projected < config.maxBucketCapacitySats ? projected : config.maxBucketCapacitySats;
}

/**
 * Estimate the seconds until `amountSats` of capacity is available given the
 * current bucket. Returns `0n` if it is available now, or `null` if it can
 * never be satisfied in a single withdrawal — either the amount exceeds the
 * bucket's maximum capacity, or the refill rate is `0` and a deficit remains.
 */
export function estimateWaitSecs(
	config: GuardianLimiterConfig,
	state: GuardianLimiterState,
	amountSats: bigint,
	nowSecs: bigint,
): bigint | null {
	if (amountSats > config.maxBucketCapacitySats) return null;
	const available = projectCapacity(config, state, nowSecs);
	if (available >= amountSats) return 0n;
	const deficit = amountSats - available;
	if (config.refillRateSatsPerSec === 0n) return null;
	return (deficit + config.refillRateSatsPerSec - 1n) / config.refillRateSatsPerSec;
}

/** Curated JSON shape of `GET {origin}/info` — every `u64` arrives as a string. */
interface GuardianInfoJson {
	limiter?: {
		state?: { numTokensAvailableSats?: string; lastUpdatedAtSecs?: string; nextSeq?: string };
		config?: { refillRateSatsPerSec?: string; maxBucketCapacitySats?: string };
	} | null;
	gitRevision?: string;
	committeeEpoch?: string | null;
	btcPubkey?: string | null;
	signingPubKey?: string;
	signedAtMs?: string | null;
}

/**
 * Fetch and parse the guardian's read-only `/info` JSON. `origin` is the base
 * URL (no path — e.g. the on-chain `guardian_url`); `/info` is appended here.
 * `u64` strings are parsed to `bigint`, and `limiter` is `null` for an
 * unprovisioned guardian. Failures are wrapped in {@link HashiGuardianError}.
 */
export async function fetchGuardianInfo(origin: string): Promise<RawGuardianInfo> {
	const endpoint = `${origin.replace(/\/+$/, '')}/info`;

	let res: Response;
	try {
		// A simple GET with only the safelisted `Accept` header ⇒ no CORS preflight.
		res = await fetch(endpoint, { headers: { Accept: 'application/json' } });
	} catch (cause) {
		throw new HashiGuardianError(
			{ message: `Guardian endpoint unreachable: ${endpoint}`, code: 'unreachable', url: endpoint },
			{ cause },
		);
	}
	if (!res.ok) {
		throw new HashiGuardianError({
			message: `Guardian /info returned HTTP ${res.status}`,
			code: 'http-error',
			url: endpoint,
			status: res.status,
		});
	}

	let body: GuardianInfoJson;
	try {
		body = (await res.json()) as GuardianInfoJson;
	} catch (cause) {
		throw new HashiGuardianError(
			{
				message: 'Guardian /info returned a non-JSON body',
				code: 'malformed-response',
				url: endpoint,
			},
			{ cause },
		);
	}

	const u64 = (value: unknown, field: string): bigint => {
		if (typeof value !== 'string') {
			throw new HashiGuardianError({
				message: `Guardian /info field \`${field}\` must be a string, got ${typeof value}`,
				code: 'malformed-response',
				url: endpoint,
			});
		}
		try {
			return BigInt(value);
		} catch (cause) {
			throw new HashiGuardianError(
				{
					message: `Guardian /info field \`${field}\` is not an integer: ${JSON.stringify(value)}`,
					code: 'malformed-response',
					url: endpoint,
				},
				{ cause },
			);
		}
	};

	// Limiter is all-or-nothing: a partial limiter is malformed, never defaulted
	// to 0 (which would look like an empty bucket). Identity fields are lenient.
	const rawLimiter = body.limiter;
	const limiter =
		rawLimiter == null
			? null
			: {
					state: {
						numTokensAvailableSats: u64(
							rawLimiter.state?.numTokensAvailableSats,
							'limiter.state.numTokensAvailableSats',
						),
						lastUpdatedAtSecs: u64(
							rawLimiter.state?.lastUpdatedAtSecs,
							'limiter.state.lastUpdatedAtSecs',
						),
						nextSeq: u64(rawLimiter.state?.nextSeq, 'limiter.state.nextSeq'),
					},
					config: {
						refillRateSatsPerSec: u64(
							rawLimiter.config?.refillRateSatsPerSec,
							'limiter.config.refillRateSatsPerSec',
						),
						maxBucketCapacitySats: u64(
							rawLimiter.config?.maxBucketCapacitySats,
							'limiter.config.maxBucketCapacitySats',
						),
					},
				};

	return {
		limiter,
		gitRevision: body.gitRevision ?? '',
		committeeEpoch: body.committeeEpoch == null ? null : u64(body.committeeEpoch, 'committeeEpoch'),
		btcPubkey: body.btcPubkey ?? null,
		signingPubKey: body.signingPubKey ?? '',
		signedAtMs: body.signedAtMs == null ? null : u64(body.signedAtMs, 'signedAtMs'),
	};
}
