// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Protocol constants mirrored from `deepbook_predict::constants` (Move source is
// the source of truth). Values that interact with the packed-u256 order ID are
// `bigint`; plain decimal-scaling metadata is `number`.

/** Fixed-point scaling for prices/probabilities/percentages (1e9). */
export const FLOAT_SCALING = 1_000_000_000n;
/** Decimal exponent of `FLOAT_SCALING` (i.e. 1e9). */
export const FLOAT_SCALING_DECIMALS = 9;

/** Decimals of the DUSDC settlement asset (the pool's denomination). */
export const DUSDC_DECIMALS = 6;
/** Decimals of DEEP (used for LP staking). */
export const DEEP_DECIMALS = 6;

/** Minimum position quantity increment (`1_000_000` quote units = 1 contract). */
export const POSITION_LOT_SIZE = 10_000n;
/** Minimum mint-time net premium, excluding trading and builder fees. */
export const MIN_NET_PREMIUM = 1_000_000n;

/** Bit width of each strike tick field packed into an order ID. */
export const TICK_BITS = 30n;
/**
 * Positive-infinity sentinel tick and maximum finite-tick bound. As the higher
 * tick it is the open upper bound; finite ticks occupy `1..POS_INF_TICK - 1`, and
 * tick `0` is the negative-infinity sentinel as the lower tick.
 */
export const POS_INF_TICK = (1n << TICK_BITS) - 1n;
/** Negative-infinity sentinel lower tick. */
export const NEG_INF_TICK = 0n;
/** Granularity unit for market tick sizes; every tick_size is a multiple of this. */
export const MARKET_TICK_SIZE_UNIT = 10_000n;

/** `u64::MAX` — the sentinel for "uncapped" mint slippage guards (max_cost / max_probability). */
export const U64_MAX = (1n << 64n) - 1n;

/**
 * The Sui system `AccumulatorRoot` shared object, at the reserved address `0xacc` on
 * every network. Custody calls (`settle`, `deposit_funds`, `withdraw_funds`) read it.
 */
export const ACCUMULATOR_ROOT_ID = '0xacc';
