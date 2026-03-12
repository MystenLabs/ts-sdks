// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// A bear used for testing display v1 → v2 migration.
/// The v1 Display is set up in init. Tests are responsible for setting up v2
/// via display_registry, so the migration path can be exercised.
module test_data::migration_bear;

use std::string::{String, utf8};
use sui::display;
use sui::package;

public struct MigrationBear has key, store {
    id: UID,
    name: String,
}

public struct MIGRATION_BEAR has drop {}

fun init(otw: MIGRATION_BEAR, ctx: &mut TxContext) {
    let publisher = package::claim(otw, ctx);
    let keys = vector[utf8(b"name"), utf8(b"image_url"), utf8(b"description")];

    let values = vector[
        utf8(b"{name}"),
        utf8(
            b"https://images.unsplash.com/photo-1589656966895-2f33e7653819?q=80&w=1000&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cG9sYXIlMjBiZWFyfGVufDB8fDB8fHww",
        ),
        utf8(b"A bear for migration testing"),
    ];

    let mut display = display::new_with_fields<MigrationBear>(&publisher, keys, values, ctx);
    display::update_version(&mut display);

    sui::transfer::public_transfer(display, ctx.sender());
    sui::transfer::public_transfer(publisher, ctx.sender());
}

public fun new(name: String, ctx: &mut TxContext): MigrationBear {
    MigrationBear {
        id: object::new(ctx),
        name,
    }
}
