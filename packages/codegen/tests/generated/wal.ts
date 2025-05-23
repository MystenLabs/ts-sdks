// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from "@mysten/sui/bcs";
import { type Transaction } from "@mysten/sui/transactions";
import { normalizeMoveArguments, type RawTransactionArgument } from "./utils/index.js";
import * as object from "./deps/0x0000000000000000000000000000000000000000000000000000000000000002/object.js";
export function WAL() {
    return bcs.struct("WAL", ({
        dummy_field: bcs.bool()
    }));
}
export function ProtectedTreasury() {
    return bcs.struct("ProtectedTreasury", ({
        id: object.UID()
    }));
}
export function TreasuryCapKey() {
    return bcs.struct("TreasuryCapKey", ({
        dummy_field: bcs.bool()
    }));
}
export function init(packageAddress: string) {
    function init(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            `${packageAddress}::wal::WAL`
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "wal",
            function: "init",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function total_supply(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            `${packageAddress}::wal::ProtectedTreasury`
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "wal",
            function: "total_supply",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function burn(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            `${packageAddress}::wal::ProtectedTreasury`,
            `0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "wal",
            function: "burn",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function borrow_cap(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            `${packageAddress}::wal::ProtectedTreasury`
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "wal",
            function: "borrow_cap",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function borrow_cap_mut(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            `${packageAddress}::wal::ProtectedTreasury`
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "wal",
            function: "borrow_cap_mut",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    return { init, total_supply, burn, borrow_cap, borrow_cap_mut };
}