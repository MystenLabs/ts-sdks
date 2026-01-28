// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

module test_data::test_coin;

use sui::coin::{Self, TreasuryCap};

/// Custom coin type for testing - one-time witness must match module name in uppercase
public struct TEST_COIN has drop {}

#[allow(deprecated_usage)]
/// Module initializer creates the test currency and shares treasury cap
fun init(witness: TEST_COIN, ctx: &mut TxContext) {
    let (treasury, metadata) = coin::create_currency(
        witness,
        6,
        b"TEST",
        b"Test Coin",
        b"A test coin for SDK testing",
        option::none(),
        ctx,
    );
    transfer::public_freeze_object(metadata);
    transfer::public_share_object(treasury)
}

/// Public mint function for testing - returns coin to be transferred
public fun mint(
    treasury_cap: &mut TreasuryCap<TEST_COIN>,
    amount: u64,
    ctx: &mut TxContext,
): coin::Coin<TEST_COIN> {
    coin::mint(treasury_cap, amount, ctx)
}
