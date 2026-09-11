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
