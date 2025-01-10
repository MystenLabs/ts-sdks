import { bcs } from "@mysten/sui/bcs";
import { type Transaction } from "@mysten/sui/transactions";
import { normalizeMoveArguments, type RawTransactionArgument } from "../utils/index.ts";
import * as object from "./deps/0000000000000000000000000000000000000000000000000000000000000002/object";
import * as blob from "./deps/0000000000000000000000000000000000000000000000000000000000000000/blob";
import * as balance from "./deps/0000000000000000000000000000000000000000000000000000000000000002/balance";
import * as coin from "./deps/0000000000000000000000000000000000000000000000000000000000000002/coin";
import * as system from "./deps/0000000000000000000000000000000000000000000000000000000000000000/system";
export function SharedBlob() {
    return bcs.struct("SharedBlob", ({
        id: object.UID(),
        blob: blob.Blob(),
        funds: balance.Balance()
    }));
}
export function init(packageAddress: string) {
    function ();
    new (options);
    {
        arguments: [
            RawTransactionArgument<string>
        ], ;
    }
    {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::blob::Blob"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "shared_blob",
            function: "new",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function fund(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::shared_blob::SharedBlob",
            "0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0000000000000000000000000000000000000000000000000000000000000000::wal::WAL>"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "shared_blob",
            function: "fund",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function extend(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>,
            RawTransactionArgument<number>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::shared_blob::SharedBlob",
            "0000000000000000000000000000000000000000000000000000000000000000::system::System",
            "u32"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "shared_blob",
            function: "extend",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    return { new: , fund, extend };
}