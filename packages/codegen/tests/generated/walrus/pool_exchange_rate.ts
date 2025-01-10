import { bcs } from "@mysten/sui/bcs";
import { type Transaction } from "@mysten/sui/transactions";
import { normalizeMoveArguments, type RawTransactionArgument } from "../utils/index.ts";
export function PoolExchangeRate() {
    return bcs.struct("PoolExchangeRate", ({
        wal_amount: bcs.u128(),
        pool_token_amount: bcs.u128()
    }));
}
export function init(packageAddress: string) {
    function empty(options: {
        arguments: [
        ];
    }) {
        const argumentsTypes = [];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "pool_exchange_rate",
            function: "empty",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function ();
    new (options);
    {
        arguments: [
            RawTransactionArgument<number | bigint>,
            RawTransactionArgument<number | bigint>
        ], ;
    }
    {
        const argumentsTypes = [
            "u64",
            "u64"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "pool_exchange_rate",
            function: "new",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function get_wal_amount(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<number | bigint>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::pool_exchange_rate::PoolExchangeRate",
            "u64"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "pool_exchange_rate",
            function: "get_wal_amount",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function get_token_amount(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<number | bigint>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::pool_exchange_rate::PoolExchangeRate",
            "u64"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "pool_exchange_rate",
            function: "get_token_amount",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    return { empty, new: , get_wal_amount, get_token_amount };
}