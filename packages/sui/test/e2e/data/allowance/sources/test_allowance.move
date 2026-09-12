// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

module allowance_test::test_allowance;

use std::internal;
use sui::allowance::{Self, AllowanceProposal, SpendPermit};

public struct App has drop {}

public fun issue<T>(proposal: AllowanceProposal<T>, ctx: &mut TxContext) {
    allowance::issue<T, App>(proposal, allowance::settings_permit(internal::permit<App>()), ctx);
}

// Custom authorization arguments are independent of the framework redemption call.
public fun authorize(approved_sender: address, enabled: bool, ctx: &TxContext): SpendPermit<App> {
    assert!(enabled && ctx.sender() == approved_sender, 0);
    allowance::spend_permit(internal::permit<App>())
}

// Models an opaque app call that spends a withdrawal without returning its balance to the PTB.
public fun spend_and_send<C>(
    allowance: &mut allowance::Allowance<sui::balance::Balance<C>>,
    withdrawal: allowance::AllowanceWithdrawal<sui::balance::Balance<C>>,
    clock: &sui::clock::Clock,
    recipient: address,
    ctx: &TxContext,
) {
    let balance = allowance::balance_spend(allowance, withdrawal, clock, ctx);
    sui::balance::send_funds(balance, recipient);
}
