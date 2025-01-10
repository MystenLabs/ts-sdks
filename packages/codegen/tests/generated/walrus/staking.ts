import { bcs } from "@mysten/sui/bcs";
import { type Transaction } from "@mysten/sui/transactions";
import { normalizeMoveArguments, type RawTransactionArgument } from "../utils/index.ts";
import * as object from "./deps/0000000000000000000000000000000000000000000000000000000000000002/object";
import * as clock from "./deps/0000000000000000000000000000000000000000000000000000000000000002/clock";
import * as storage_node from "./deps/0000000000000000000000000000000000000000000000000000000000000000/storage_node";
import * as system from "./deps/0000000000000000000000000000000000000000000000000000000000000000/system";
import * as coin from "./deps/0000000000000000000000000000000000000000000000000000000000000002/coin";
import * as staked_wal from "./deps/0000000000000000000000000000000000000000000000000000000000000000/staked_wal";
export function Staking() {
    return bcs.struct("Staking", ({
        id: object.UID(),
        version: bcs.u64()
    }));
}
export function init(packageAddress: string) {
    function create(options: {
        arguments: [
            RawTransactionArgument<number | bigint>,
            RawTransactionArgument<number | bigint>,
            RawTransactionArgument<number>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "u64",
            "u64",
            "u16",
            "0000000000000000000000000000000000000000000000000000000000000002::clock::Clock"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking",
            function: "create",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function register_candidate(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>,
            RawTransactionArgument<string>,
            RawTransactionArgument<number[]>,
            RawTransactionArgument<number[]>,
            RawTransactionArgument<number[]>,
            RawTransactionArgument<number | bigint>,
            RawTransactionArgument<number | bigint>,
            RawTransactionArgument<number | bigint>,
            RawTransactionArgument<number | bigint>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking::Staking",
            "0000000000000000000000000000000000000000000000000000000000000001::string::String",
            "0000000000000000000000000000000000000000000000000000000000000001::string::String",
            "vector<u8>",
            "vector<u8>",
            "vector<u8>",
            "u64",
            "u64",
            "u64",
            "u64"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking",
            function: "register_candidate",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function withdraw_node(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking::Staking",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_node::StorageNodeCap"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking",
            function: "withdraw_node",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function set_next_commission(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>,
            RawTransactionArgument<number | bigint>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking::Staking",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_node::StorageNodeCap",
            "u64"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking",
            function: "set_next_commission",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function collect_commission(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking::Staking",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_node::StorageNodeCap"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking",
            function: "collect_commission",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function set_storage_price_vote(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>,
            RawTransactionArgument<number | bigint>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking::Staking",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_node::StorageNodeCap",
            "u64"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking",
            function: "set_storage_price_vote",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function set_write_price_vote(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>,
            RawTransactionArgument<number | bigint>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking::Staking",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_node::StorageNodeCap",
            "u64"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking",
            function: "set_write_price_vote",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function set_node_capacity_vote(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>,
            RawTransactionArgument<number | bigint>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking::Staking",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_node::StorageNodeCap",
            "u64"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking",
            function: "set_node_capacity_vote",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function set_next_public_key(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>,
            RawTransactionArgument<number[]>,
            RawTransactionArgument<number[]>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking::Staking",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_node::StorageNodeCap",
            "vector<u8>",
            "vector<u8>"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking",
            function: "set_next_public_key",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function set_name(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking::Staking",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_node::StorageNodeCap",
            "0000000000000000000000000000000000000000000000000000000000000001::string::String"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking",
            function: "set_name",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function set_network_address(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking::Staking",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_node::StorageNodeCap",
            "0000000000000000000000000000000000000000000000000000000000000001::string::String"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking",
            function: "set_network_address",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function set_network_public_key(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>,
            RawTransactionArgument<number[]>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking::Staking",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_node::StorageNodeCap",
            "vector<u8>"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking",
            function: "set_network_public_key",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function voting_end(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking::Staking",
            "0000000000000000000000000000000000000000000000000000000000000002::clock::Clock"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking",
            function: "voting_end",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function initiate_epoch_change(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking::Staking",
            "0000000000000000000000000000000000000000000000000000000000000000::system::System",
            "0000000000000000000000000000000000000000000000000000000000000002::clock::Clock"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking",
            function: "initiate_epoch_change",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function shard_transfer_failed(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>,
            RawTransactionArgument<string>,
            RawTransactionArgument<number[]>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking::Staking",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_node::StorageNodeCap",
            "0000000000000000000000000000000000000000000000000000000000000002::object::ID",
            "vector<u16>"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking",
            function: "shard_transfer_failed",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function epoch_sync_done(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>,
            RawTransactionArgument<number>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking::Staking",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_node::StorageNodeCap",
            "u32",
            "0000000000000000000000000000000000000000000000000000000000000002::clock::Clock"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking",
            function: "epoch_sync_done",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function stake_with_pool(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking::Staking",
            "0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0000000000000000000000000000000000000000000000000000000000000000::wal::WAL>",
            "0000000000000000000000000000000000000000000000000000000000000002::object::ID"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking",
            function: "stake_with_pool",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function request_withdraw_stake(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking::Staking",
            "0000000000000000000000000000000000000000000000000000000000000000::staked_wal::StakedWal"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking",
            function: "request_withdraw_stake",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function withdraw_stake(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking::Staking",
            "0000000000000000000000000000000000000000000000000000000000000000::staked_wal::StakedWal"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking",
            function: "withdraw_stake",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function inner_mut(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking::Staking"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking",
            function: "inner_mut",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function inner(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking::Staking"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking",
            function: "inner",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    return { create, register_candidate, withdraw_node, set_next_commission, collect_commission, set_storage_price_vote, set_write_price_vote, set_node_capacity_vote, set_next_public_key, set_name, set_network_address, set_network_public_key, voting_end, initiate_epoch_change, shard_transfer_failed, epoch_sync_done, stake_with_pool, request_withdraw_stake, withdraw_stake, inner_mut, inner };
}