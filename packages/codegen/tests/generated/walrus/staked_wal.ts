import { bcs } from "@mysten/sui/bcs";
import { type Transaction } from "@mysten/sui/transactions";
import { normalizeMoveArguments, type RawTransactionArgument } from "../utils/index.ts";
import * as object from "./deps/0000000000000000000000000000000000000000000000000000000000000002/object";
import * as balance from "./deps/0000000000000000000000000000000000000000000000000000000000000002/balance";
export function StakedWal() {
    return bcs.struct("StakedWal", ({
        id: object.UID(),
        state: StakedWalState(),
        node_id: bcs.Address,
        principal: balance.Balance(),
        activation_epoch: bcs.u32()
    }));
}
export function StakedWalState() {
    return bcs.enum("StakedWalState", ({
        Staked: null,
        Withdrawing: bcs.tuple([bcs.u32(), bcs.u64()])
    }));
}
export function init(packageAddress: string) {
    function mint(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>,
            RawTransactionArgument<number>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000002::object::ID",
            "0000000000000000000000000000000000000000000000000000000000000002::balance::Balance<0000000000000000000000000000000000000000000000000000000000000000::wal::WAL>",
            "u32"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staked_wal",
            function: "mint",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function into_balance(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staked_wal::StakedWal"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staked_wal",
            function: "into_balance",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function set_withdrawing(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<number>,
            RawTransactionArgument<number | bigint>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staked_wal::StakedWal",
            "u32",
            "u64"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staked_wal",
            function: "set_withdrawing",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function node_id(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staked_wal::StakedWal"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staked_wal",
            function: "node_id",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function value(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staked_wal::StakedWal"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staked_wal",
            function: "value",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function activation_epoch(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staked_wal::StakedWal"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staked_wal",
            function: "activation_epoch",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function is_staked(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staked_wal::StakedWal"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staked_wal",
            function: "is_staked",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function is_withdrawing(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staked_wal::StakedWal"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staked_wal",
            function: "is_withdrawing",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function withdraw_epoch(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staked_wal::StakedWal"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staked_wal",
            function: "withdraw_epoch",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function pool_token_amount(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staked_wal::StakedWal"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staked_wal",
            function: "pool_token_amount",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function join(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staked_wal::StakedWal",
            "0000000000000000000000000000000000000000000000000000000000000000::staked_wal::StakedWal"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staked_wal",
            function: "join",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function split(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<number | bigint>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staked_wal::StakedWal",
            "u64"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staked_wal",
            function: "split",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function destroy_zero(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staked_wal::StakedWal"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staked_wal",
            function: "destroy_zero",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    return { mint, into_balance, set_withdrawing, node_id, value, activation_epoch, is_staked, is_withdrawing, withdraw_epoch, pool_token_amount, join, split, destroy_zero };
}