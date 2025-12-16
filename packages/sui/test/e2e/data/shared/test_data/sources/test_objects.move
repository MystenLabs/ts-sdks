// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

module test_data::test_objects;

use sui::dynamic_field;
use sui::event;

/// Simple owned object for testing
public struct SimpleObject has key, store {
    id: UID,
    value: u64,
}

/// Event emitted when an object is created
public struct ObjectCreated has copy, drop {
    object_id: ID,
    value: u64,
}

/// Event emitted when a value changes
public struct ValueChanged has copy, drop {
    old_value: u64,
    new_value: u64,
}

/// Object with dynamic fields for testing dynamic field queries
public struct ObjectWithDynamicFields has key {
    id: UID,
    name: vector<u8>,
}

/// Shared object for testing shared object queries
public struct SharedObject has key {
    id: UID,
    counter: u64,
}

/// Create a simple owned object and return it
public fun create_simple_object(value: u64, ctx: &mut TxContext): SimpleObject {
    let id = object::new(ctx);
    let object_id = object::uid_to_inner(&id);

    event::emit(ObjectCreated {
        object_id,
        value,
    });

    SimpleObject {
        id,
        value,
    }
}

/// Create a simple object with event emission (entry function)
entry fun create_object_with_event(value: u64, ctx: &mut TxContext) {
    let obj = create_simple_object(value, ctx);
    transfer::transfer(obj, ctx.sender());
}

/// Update the value of a simple object and emit event
public fun update_value(obj: &mut SimpleObject, new_value: u64) {
    event::emit(ValueChanged {
        old_value: obj.value,
        new_value,
    });
    obj.value = new_value;
}

/// Create object with dynamic fields
public fun create_object_with_dynamic_fields(name: vector<u8>, ctx: &mut TxContext) {
    let mut obj = ObjectWithDynamicFields {
        id: object::new(ctx),
        name,
    };

    // Add some dynamic fields
    dynamic_field::add(&mut obj.id, b"field_u64", 42u64);
    dynamic_field::add(&mut obj.id, b"field_bool", true);
    dynamic_field::add(&mut obj.id, b"field_address", ctx.sender());

    transfer::transfer(obj, ctx.sender());
}

/// Create a shared object
public fun create_shared_object(ctx: &mut TxContext) {
    let obj = SharedObject {
        id: object::new(ctx),
        counter: 0,
    };
    transfer::share_object(obj);
}

/// Increment shared object counter
public fun increment_shared(obj: &mut SharedObject) {
    obj.counter = obj.counter + 1;
}

/// Delete a simple object (for testing deletion)
public fun delete_simple_object(obj: SimpleObject) {
    let SimpleObject { id, value: _ } = obj;
    object::delete(id);
}

/// Entry function to create test data for a specific address
entry fun setup_test_data(recipient: address, ctx: &mut TxContext) {
    // Create simple object
    let obj1 = SimpleObject {
        id: object::new(ctx),
        value: 100,
    };
    transfer::transfer(obj1, recipient);

    // Create object with dynamic fields
    let mut obj2 = ObjectWithDynamicFields {
        id: object::new(ctx),
        name: b"test_object",
    };
    dynamic_field::add(&mut obj2.id, b"test_field", 999u64);
    transfer::transfer(obj2, recipient);
}

/// Function that always aborts - used for testing FailedTransaction handling
public fun abort_always() {
    abort 42
}
