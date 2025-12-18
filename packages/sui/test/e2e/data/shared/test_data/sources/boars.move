// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

module test_data::boars;

use std::string::{utf8, String};
use sui::display;
use sui::package;
use sui::url::{Self, Url};

/// For when a witness type passed is not an OTW.
const ENotOneTimeWitness: u64 = 0;

/// An OTW to use when creating a Publisher
public struct BOARS has drop {}

public struct Boar has key, store {
    id: UID,
    img_url: String,
    name: String,
    description: String,
    creator: Option<String>,
    price: Option<String>,
    metadata: Metadata,
    buyer: address,
    full_url: Url,
}

public struct Metadata has store {
    age: u64,
}

/// Shared Publisher object created during init
public struct SharedPublisher has key {
    id: UID,
    publisher: package::Publisher,
}

/// Shared Display object created during init
public struct SharedDisplay has key {
    id: UID,
    display: display::Display<Boar>,
}

fun init(otw: BOARS, ctx: &mut TxContext) {
    assert!(sui::types::is_one_time_witness(&otw), ENotOneTimeWitness);

    let pub = package::claim(otw, ctx);
    let mut display = display::new<Boar>(&pub, ctx);

    display::add_multiple(
        &mut display,
        vector[
            utf8(b"name"),
            utf8(b"description"),
            utf8(b"img_url"),
            utf8(b"creator"),
            utf8(b"price"),
            utf8(b"project_url"),
            utf8(b"age"),
            utf8(b"buyer"),
            utf8(b"full_url"),
            utf8(b"escape_syntax"),
            utf8(b"id"),
            utf8(b"bad_name"),
        ],
        vector[
            utf8(b"{name}"),
            utf8(b"Unique Boar from the Boars collection with {name} and {id}"),
            utf8(b"https://get-a-boar.com/{img_url}"),
            utf8(b"{creator}"),
            utf8(b"{price}"),
            utf8(b"https://get-a-boar.com/"),
            utf8(b"{metadata.age}"),
            utf8(b"{buyer}"),
            utf8(b"{full_url}"),
            utf8(b"\\{name\\}"),
            utf8(b"{idd}"),
            utf8(b"{namee}"),
        ],
    );

    display::update_version(&mut display);

    // Share Publisher and Display so tests can use them
    transfer::share_object(SharedPublisher {
        id: object::new(ctx),
        publisher: pub,
    });
    transfer::share_object(SharedDisplay {
        id: object::new(ctx),
        display,
    });
}

/// Create a new Boar object - public function for tests to create their own Boars
public fun create_boar(recipient: address, ctx: &mut TxContext) {
    let boar = Boar {
        id: object::new(ctx),
        img_url: utf8(b"first.png"),
        name: utf8(b"First Boar"),
        description: utf8(b"First Boar from the Boars collection!"),
        creator: option::some(utf8(b"Chris")),
        price: option::none(),
        metadata: Metadata {
            age: 10,
        },
        buyer: recipient,
        full_url: url::new_unsafe_from_bytes(
            b"https://get-a-boar.fullurl.com/",
        ),
    };
    transfer::transfer(boar, recipient)
}
