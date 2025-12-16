// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

#[allow(deprecated_usage)]
module test_data::test;

use sui::coin;
use sui::url;

public struct TEST has drop {}

fun init(witness: TEST, ctx: &mut TxContext) {
    let (treasury_cap, metadata) = coin::create_currency<TEST>(
        witness,
        2,
        b"TEST",
        b"Test Coin",
        b"Test coin metadata",
        option::some(url::new_unsafe_from_bytes(b"http://sui.io")),
        ctx,
    );

    transfer::public_share_object(metadata);
    transfer::public_share_object(treasury_cap)
}

/// Mint TEST coins to a recipient (for testing)
public fun mint(
    treasury_cap: &mut coin::TreasuryCap<TEST>,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext,
) {
    coin::mint_and_transfer(treasury_cap, amount, recipient, ctx)
}
