// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { PredictInputError } from './errors.js';

const TICK_BITS = 30n;

/** +inf sentinel tick: the upper bound of an UP range. */
export const POS_INF_TICK = (1n << TICK_BITS) - 1n;

export type Side = 'up' | 'down';

// Convert a raw binary-range strike to the `(lower_tick, higher_tick)` pair the
// `mint` entrypoint takes directly (there is no standalone packed range key).
// An UP order is `(strike, +inf)` -> lower_tick = strike/tick_size, higher_tick =
// POS_INF_TICK; a DOWN order is `(-inf, strike)` -> lower_tick = 0 (neg-inf),
// higher_tick = strike/tick_size.
export function binaryRangeTicks(
	strikeRaw: bigint,
	side: Side,
	tickSize: bigint,
): { lowerTick: bigint; higherTick: bigint } {
	// Anything not exactly 'up' used to fall through to DOWN, byte-identical to a real
	// down mint — no build error, no simulate error, no chain abort. `side` arrives from UI
	// state, JSON, or a DB column at runtime, where the literal type does not protect.
	if (side !== 'up' && side !== 'down') {
		throw new PredictInputError(`side must be 'up' or 'down', got ${JSON.stringify(side)}`);
	}
	const tick = strikeRaw / tickSize;
	if (tick * tickSize !== strikeRaw) {
		throw new PredictInputError(`strike ${strikeRaw} is not a whole tick multiple of ${tickSize}`);
	}
	if (tick <= 0n || tick >= POS_INF_TICK) {
		throw new PredictInputError(
			`strike tick ${tick} outside the finite tick domain (1..POS_INF_TICK-1)`,
		);
	}
	const isUp = side === 'up';
	return {
		lowerTick: isUp ? tick : 0n,
		higherTick: isUp ? POS_INF_TICK : tick,
	};
}

/**
 * Snap a strike in USD to a market's admission grid (`MarketSummary.admissionTickSize`), the step
 * every new mint boundary must be a whole multiple of. Use it on a form's bound inputs: `'down'`
 * for a lower bound and `'up'` for an upper bound keep a range from shrinking past what was typed,
 * and `'nearest'` (the default) suits a single strike. Exact: it rounds in the 1e9-scaled integers
 * the chain uses, not in floating point.
 */
export function snapStrike(
	price: number,
	admissionTickSize: number,
	mode: 'down' | 'up' | 'nearest' = 'nearest',
): number {
	if (!(Number.isFinite(price) && price > 0)) {
		throw new PredictInputError(`strike must be a positive number, got ${price}`);
	}
	if (!(Number.isFinite(admissionTickSize) && admissionTickSize > 0)) {
		throw new PredictInputError(`admissionTickSize must be positive, got ${admissionTickSize}`);
	}
	const step = BigInt(Math.round(admissionTickSize * 1e9));
	const raw = BigInt(Math.round(price * 1e9));
	const below = (raw / step) * step;
	const snapped =
		mode === 'down' || raw === below
			? below
			: mode === 'up'
				? below + step
				: raw - below < below + step - raw
					? below
					: below + step;
	if (snapped === 0n) {
		throw new PredictInputError(`strike ${price} snaps below the first ${admissionTickSize} step`);
	}
	return Number(snapped) / 1e9;
}
