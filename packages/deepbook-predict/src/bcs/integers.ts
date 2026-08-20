// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Replacement BCS integer types for the generated Move bindings (wired up in
// `sui-codegen.config.ts` under `bcsOverrides`).
//
// `@mysten/sui/bcs` parses the wide integers to decimal *strings*; these parse straight to bigint
// instead. Serialization still accepts what the plain types accept, so tx builders and test
// fixtures are unaffected.
//
// Representation only — deliberately no scaling. A field's Move type does not determine its
// scale (`order_events::OrderMinted.trading_fee` is a 1e6 amount while
// `config_events::MarketCreated.base_fee` is a rate), and the receipts intentionally expose
// exact bigints alongside their display numbers.

import { bcs } from '@mysten/sui/bcs';

const toBigInt = (value: string) => BigInt(value);

/** `u64` parsed as a bigint rather than a decimal string. */
export const U64 = bcs.u64().transform({
	input: (value: number | bigint | string) => value.toString(),
	output: toBigInt,
});

/** `u128` parsed as a bigint rather than a decimal string. */
export const U128 = bcs.u128().transform({
	input: (value: number | bigint | string) => value.toString(),
	output: toBigInt,
});

/** `u256` parsed as a bigint rather than a decimal string. */
export const U256 = bcs.u256().transform({
	input: (value: number | bigint | string) => value.toString(),
	output: toBigInt,
});
