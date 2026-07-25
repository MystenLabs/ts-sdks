// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

module test_data::random_coin;

use sui::coin::Coin;
use sui::random::{Self, Random};

#[allow(lint(public_random))]
public fun play<T>(coin: Coin<T>, random: &Random, ctx: &mut TxContext): Coin<T> {
    let mut generator = random::new_generator(random, ctx);
    let _ = random::generate_bool(&mut generator);
    coin
}
