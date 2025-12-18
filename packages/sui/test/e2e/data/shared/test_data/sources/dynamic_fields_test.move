// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

module test_data::dynamic_fields_test;

use sui::dynamic_field as dfield;
use sui::dynamic_object_field as dof;

public struct Test has key {
    id: UID,
}

public struct Test1 has key, store {
    id: UID,
}

public struct Test2 has key, store {
    id: UID,
}

/// Create a Test object with dynamic fields - public function for tests
/// Transfers the Test object with attached dynamic fields to the recipient
public fun create_test_with_fields(recipient: address, ctx: &mut TxContext) {
    let mut test = Test {
        id: object::new(ctx),
    };

    let test1 = Test1 {
        id: object::new(ctx),
    };

    let test2 = Test2 {
        id: object::new(ctx),
    };

    dfield::add(&mut test.id, object::id(&test1), test1);
    dof::add(&mut test.id, object::id(&test2), test2);

    transfer::transfer(test, recipient)
}
