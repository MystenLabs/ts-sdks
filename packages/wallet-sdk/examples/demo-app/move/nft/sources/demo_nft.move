// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// A demo NFT contract with Display configuration for the Sui demo app
module demo_nft::demo_nft;

use std::string::{Self, String};
use sui::display;
use sui::package;

/// An example NFT that can be minted by anyone
public struct DemoNFT has key, store {
    id: UID,
    name: String,
    description: String,
    image_url: String,
    creator: address,
}

/// One-Time-Witness for the module
public struct DEMO_NFT has drop {}

/// Module initializer called once on publish
fun init(otw: DEMO_NFT, ctx: &mut TxContext) {
    let keys = vector[
        string::utf8(b"name"),
        string::utf8(b"description"),
        string::utf8(b"image_url"),
        string::utf8(b"creator"),
        string::utf8(b"project_url"),
    ];

    let values = vector[
        string::utf8(b"{name}"),
        string::utf8(b"{description}"),
        string::utf8(b"{image_url}"),
        string::utf8(b"Created by {creator}"),
        string::utf8(b"https://sui-demo-app.vercel.app"),
    ];

    let publisher = package::claim(otw, ctx);
    let mut display = display::new_with_fields<DemoNFT>(
        &publisher,
        keys,
        values,
        ctx,
    );

    // Update the display with additional standard fields
    display.update_version();

    transfer::public_transfer(publisher, ctx.sender());
    transfer::public_transfer(display, ctx.sender());
}

/// Mint a new DemoNFT
public fun mint_nft(
    name: String,
    description: String,
    image_url: String,
    recipient: address,
    ctx: &mut TxContext,
) {
    let nft = DemoNFT {
        id: object::new(ctx),
        name,
        description,
        image_url,
        creator: ctx.sender(),
    };

    transfer::public_transfer(nft, recipient);
}

/// Public function to mint NFT with strings (for easier frontend integration)
public fun mint(
    name: String,
    description: String,
    image_url: String,
    ctx: &mut TxContext,
) {
    mint_nft(name, description, image_url, ctx.sender(), ctx)
}

// Getter functions for the NFT fields
public fun name(nft: &DemoNFT): &String {
    &nft.name
}

public fun description(nft: &DemoNFT): &String {
    &nft.description
}

public fun image_url(nft: &DemoNFT): &String {
    &nft.image_url
}

public fun creator(nft: &DemoNFT): address {
    nft.creator
}

/// Burn an NFT
public fun burn(nft: DemoNFT, _: &mut TxContext) {
    let DemoNFT { id, name: _, description: _, image_url: _, creator: _ } = nft;
    object::delete(id)
}
