// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from "@mysten/sui/bcs";
import { type Transaction } from "@mysten/sui/transactions";
import { normalizeMoveArguments, type RawTransactionArgument } from "./utils/index.js";
import * as object from "./deps/0x0000000000000000000000000000000000000000000000000000000000000002/object.js";
import * as object_bag from "./deps/0x0000000000000000000000000000000000000000000000000000000000000002/object_bag.js";
export function ObjectDisplay() {
    return bcs.struct("ObjectDisplay", ({
        id: object.UID(),
        inner: object_bag.ObjectBag()
    }));
}
export function PublisherKey() {
    return bcs.struct("PublisherKey", ({
        dummy_field: bcs.bool()
    }));
}
export function init(packageAddress: string) {
    function create(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0x0000000000000000000000000000000000000000000000000000000000000002::package::Publisher"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "display",
            function: "create",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function init_blob_display(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0x0000000000000000000000000000000000000000000000000000000000000002::package::Publisher"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "display",
            function: "init_blob_display",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function init_storage_display(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0x0000000000000000000000000000000000000000000000000000000000000002::package::Publisher"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "display",
            function: "init_storage_display",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function init_staked_wal_display(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0x0000000000000000000000000000000000000000000000000000000000000002::package::Publisher"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "display",
            function: "init_staked_wal_display",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    return { create, init_blob_display, init_storage_display, init_staked_wal_display };
}