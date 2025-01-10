import { bcs } from "@mysten/sui/bcs";
import { type Transaction } from "@mysten/sui/transactions";
import { normalizeMoveArguments, type RawTransactionArgument } from "../utils/index.ts";
import * as vec_map from "./deps/0000000000000000000000000000000000000000000000000000000000000002/vec_map";
export function Metadata() {
    return bcs.struct("Metadata", ({
        metadata: vec_map.VecMap(bcs.string(), bcs.string())
    }));
}
export function init(packageAddress: string) {
    function ();
    new (options);
    {
        arguments: [], ;
    }
    {
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
            "0000000000000000000000000000000000000000000000000000000000000000::metadata::Metadata",
            "0000000000000000000000000000000000000000000000000000000000000001::string::String",
            "0000000000000000000000000000000000000000000000000000000000000001::string::String"
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
            "0000000000000000000000000000000000000000000000000000000000000000::metadata::Metadata",
            "0000000000000000000000000000000000000000000000000000000000000001::string::String"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "metadata",
            function: "remove",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    return { new: , insert_or_update, remove };
}