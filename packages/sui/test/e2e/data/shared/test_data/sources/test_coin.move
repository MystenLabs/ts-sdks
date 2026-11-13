// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

module test_data::test_coin;

use sui::coin::{Self, TreasuryCap};
use sui::token;

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

/// Shares a token policy for `TEST_COIN`. `sui::token` emits its `TokenPolicyCreated` event, so the
/// event's type comes from another package than the call that emitted it.
public fun share_token_policy(treasury_cap: &TreasuryCap<TEST_COIN>, ctx: &mut TxContext) {
    let (policy, policy_cap) = token::new_policy(treasury_cap, ctx);
    token::share_policy(policy);
    transfer::public_transfer(policy_cap, ctx.sender());
}
