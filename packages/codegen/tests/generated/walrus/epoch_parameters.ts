import { bcs } from "@mysten/sui/bcs";
import { type Transaction } from "@mysten/sui/transactions";
import { normalizeMoveArguments, type RawTransactionArgument } from "../utils/index.ts";
export function EpochParams() {
    return bcs.struct("EpochParams", ({
        total_capacity_size: bcs.u64(),
        storage_price_per_unit_size: bcs.u64(),
        write_price_per_unit_size: bcs.u64()
    }));
}
export function init(packageAddress: string) {
    function ();
    new (options);
    {
        arguments: [
            RawTransactionArgument<number | bigint>,
            RawTransactionArgument<number | bigint>,
            RawTransactionArgument<number | bigint>
        ], ;
    }
    {
        const argumentsTypes = [
            "u64",
            "u64",
            "u64"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "epoch_parameters",
            function: "new",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function capacity(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::epoch_parameters::EpochParams"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "epoch_parameters",
            function: "capacity",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function storage_price(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::epoch_parameters::EpochParams"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "epoch_parameters",
            function: "storage_price",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function write_price(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::epoch_parameters::EpochParams"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "epoch_parameters",
            function: "write_price",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function epoch_params_for_testing(options: {
        arguments: [
        ];
    }) {
        const argumentsTypes = [];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "epoch_parameters",
            function: "epoch_params_for_testing",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    return { new: , capacity, storage_price, write_price, epoch_params_for_testing };
}