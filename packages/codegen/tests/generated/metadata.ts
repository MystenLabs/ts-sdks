import { bcs } from "@mysten/sui/bcs";
import { type Transaction } from "@mysten/sui/transactions";
import { normalizeMoveArguments, type RawTransactionArgument } from "./utils/index.ts";
import * as vec_map from "./deps/0x0000000000000000000000000000000000000000000000000000000000000002/vec_map.js";
import * as string from "./deps/0x0000000000000000000000000000000000000000000000000000000000000001/string.js";
export function Metadata() {
    return bcs.struct("Metadata", ({
        metadata: vec_map.VecMap(string.String(), string.String())
    }));
}
export function init(packageAddress: string) {
    function _new(options: {
        arguments: [
        ];
    }) {
        const argumentsTypes = [];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "metadata",
            function: "new",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function insert_or_update(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            `${packageAddress}::metadata::Metadata`,
            "0x0000000000000000000000000000000000000000000000000000000000000001::string::String",
            "0x0000000000000000000000000000000000000000000000000000000000000001::string::String"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "metadata",
            function: "insert_or_update",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function remove(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            `${packageAddress}::metadata::Metadata`,
            "0x0000000000000000000000000000000000000000000000000000000000000001::string::String"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "metadata",
            function: "remove",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    return { _new, insert_or_update, remove };
}