import { bcs } from "@mysten/sui/bcs";
import { type Transaction } from "@mysten/sui/transactions";
import { normalizeMoveArguments, type RawTransactionArgument } from "../utils/index.ts";
import * as vec_map from "./deps/0000000000000000000000000000000000000000000000000000000000000002/vec_map";
export function WalrusContext() {
    return bcs.struct("WalrusContext", ({
        epoch: bcs.u32(),
        committee_selected: bcs.bool(),
        committee: vec_map.VecMap(bcs.Address, bcs.vector(bcs.u16()))
    }));
}
export function init(packageAddress: string) {
    function ();
    new (options);
    {
        arguments: [
            RawTransactionArgument<number>,
            RawTransactionArgument<boolean>,
            RawTransactionArgument<string>
        ], ;
    }
    {
        const argumentsTypes = [
            "u32",
            "bool",
            "0000000000000000000000000000000000000000000000000000000000000002::vec_map::VecMap<0000000000000000000000000000000000000000000000000000000000000002::object::ID, vector<u16>>"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "walrus_context",
            function: "new",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function epoch(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::walrus_context::WalrusContext"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "walrus_context",
            function: "epoch",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function committee_selected(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::walrus_context::WalrusContext"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "walrus_context",
            function: "committee_selected",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function committee(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::walrus_context::WalrusContext"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "walrus_context",
            function: "committee",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    return { new: , epoch, committee_selected, committee };
}