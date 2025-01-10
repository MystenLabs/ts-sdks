import { bcs } from "@mysten/sui/bcs";
import { type Transaction } from "@mysten/sui/transactions";
import { normalizeMoveArguments, type RawTransactionArgument } from "../utils/index.ts";
import * as object from "./deps/0000000000000000000000000000000000000000000000000000000000000002/object";
import * as object_table from "./deps/0000000000000000000000000000000000000000000000000000000000000002/object_table";
import * as active_set from "./deps/0000000000000000000000000000000000000000000000000000000000000000/active_set";
import * as committee from "./deps/0000000000000000000000000000000000000000000000000000000000000000/committee";
import * as epoch_parameters from "./deps/0000000000000000000000000000000000000000000000000000000000000000/epoch_parameters";
import * as balance from "./deps/0000000000000000000000000000000000000000000000000000000000000002/balance";
import * as clock from "./deps/0000000000000000000000000000000000000000000000000000000000000002/clock";
import * as storage_node from "./deps/0000000000000000000000000000000000000000000000000000000000000000/storage_node";
import * as priority_queue from "./deps/0000000000000000000000000000000000000000000000000000000000000002/priority_queue";
import * as coin from "./deps/0000000000000000000000000000000000000000000000000000000000000002/coin";
import * as staked_wal from "./deps/0000000000000000000000000000000000000000000000000000000000000000/staked_wal";
export function StakingInnerV1() {
    return bcs.struct("StakingInnerV1", ({
        id: object.UID(),
        n_shards: bcs.u16(),
        epoch_duration: bcs.u64(),
        first_epoch_start: bcs.u64(),
        pools: object_table.ObjectTable(),
        epoch: bcs.u32(),
        active_set: active_set.ActiveSet(),
        next_committee: bcs.option(committee.Committee()),
        committee: committee.Committee(),
        previous_committee: committee.Committee(),
        next_epoch_params: bcs.option(epoch_parameters.EpochParams()),
        epoch_state: EpochState(),
        leftover_rewards: balance.Balance()
    }));
}
export function EpochState() {
    return bcs.enum("EpochState", ({
        EpochChangeSync: bcs.u16(),
        EpochChangeDone: bcs.u64(),
        NextParamsSelected: bcs.u64()
    }));
}
export function init(packageAddress: string) {
    function ();
    new (options);
    {
        arguments: [
            RawTransactionArgument<number | bigint>,
            RawTransactionArgument<number | bigint>,
            RawTransactionArgument<number>,
            RawTransactionArgument<string>
        ], ;
    }
    {
        const argumentsTypes = [
            "u64",
            "u64",
            "u16",
            "0000000000000000000000000000000000000000000000000000000000000002::clock::Clock"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "new",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function create_pool(options: {
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
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1",
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
            module: "staking_inner",
            function: "create_pool",
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
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_node::StorageNodeCap"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "withdraw_node",
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
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_node::StorageNodeCap"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "collect_commission",
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
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000002::clock::Clock"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "voting_end",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function calculate_votes(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "calculate_votes",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function quorum_above(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<number>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000002::priority_queue::PriorityQueue<u64>",
            "u16"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "quorum_above",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function quorum_below(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<number>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000002::priority_queue::PriorityQueue<u64>",
            "u16"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "quorum_below",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function take_threshold_value(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<number | bigint>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000002::priority_queue::PriorityQueue<u64>",
            "u64"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "take_threshold_value",
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
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_node::StorageNodeCap",
            "u64"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "set_next_commission",
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
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_node::StorageNodeCap",
            "u64"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
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
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_node::StorageNodeCap",
            "u64"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
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
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_node::StorageNodeCap",
            "u64"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
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
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_node::StorageNodeCap",
            "vector<u8>",
            "vector<u8>"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
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
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_node::StorageNodeCap",
            "0000000000000000000000000000000000000000000000000000000000000001::string::String"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
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
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_node::StorageNodeCap",
            "0000000000000000000000000000000000000000000000000000000000000001::string::String"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
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
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_node::StorageNodeCap",
            "vector<u8>"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "set_network_public_key",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function set_withdrawing(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000002::object::ID"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "set_withdrawing",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function destroy_empty_pool(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000002::object::ID"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "destroy_empty_pool",
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
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0000000000000000000000000000000000000000000000000000000000000000::wal::WAL>",
            "0000000000000000000000000000000000000000000000000000000000000002::object::ID"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
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
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000000::staked_wal::StakedWal"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
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
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000000::staked_wal::StakedWal"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "withdraw_stake",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function select_committee(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "select_committee",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function apportionment(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "apportionment",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function dhondt(options: {
        arguments: [
            RawTransactionArgument<number | bigint[]>,
            RawTransactionArgument<number>,
            RawTransactionArgument<number | bigint[]>
        ];
    }) {
        const argumentsTypes = [
            "vector<u64>",
            "u16",
            "vector<u64>"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "dhondt",
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
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000002::clock::Clock",
            "0000000000000000000000000000000000000000000000000000000000000002::balance::Balance<0000000000000000000000000000000000000000000000000000000000000000::wal::WAL>"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "initiate_epoch_change",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function advance_epoch(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000002::balance::Balance<0000000000000000000000000000000000000000000000000000000000000000::wal::WAL>"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "advance_epoch",
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
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_node::StorageNodeCap",
            "u32",
            "0000000000000000000000000000000000000000000000000000000000000002::clock::Clock"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "epoch_sync_done",
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
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_node::StorageNodeCap",
            "0000000000000000000000000000000000000000000000000000000000000002::object::ID",
            "vector<u16>"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "shard_transfer_failed",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function next_committee(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "next_committee",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function next_epoch_params(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "next_epoch_params",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function epoch(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "epoch",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function committee(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "committee",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function previous_committee(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "previous_committee",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function next_bls_committee(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "next_bls_committee",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function has_pool(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000002::object::ID"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "has_pool",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function new_walrus_context(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::staking_inner::StakingInnerV1"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "new_walrus_context",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function is_quorum(options: {
        arguments: [
            RawTransactionArgument<number>,
            RawTransactionArgument<number>
        ];
    }) {
        const argumentsTypes = [
            "u16",
            "u16"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "staking_inner",
            function: "is_quorum",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    return { new: , create_pool, withdraw_node, collect_commission, voting_end, calculate_votes, quorum_above, quorum_below, take_threshold_value, set_next_commission, set_storage_price_vote, set_write_price_vote, set_node_capacity_vote, set_next_public_key, set_name, set_network_address, set_network_public_key, set_withdrawing, destroy_empty_pool, stake_with_pool, request_withdraw_stake, withdraw_stake, select_committee, apportionment, dhondt, initiate_epoch_change, advance_epoch, epoch_sync_done, shard_transfer_failed, next_committee, next_epoch_params, epoch, committee, previous_committee, next_bls_committee, has_pool, new_walrus_context, is_quorum };
}